import type { Plugin, PluginInput, PluginModule } from "@opencode-ai/plugin"
import { basename } from "path"
import { readFileSync, writeFileSync } from "fs"
import {
  loadConfig,
  isEventSoundEnabled,
  isEventNotificationEnabled,
  isEventCommandEnabled,
  isEventBellEnabled,
  getMessage,
  getSoundPath,
  getSoundVolume,
  getIconPath,
  interpolateMessage,
  getStatePath,
} from "./config"
import type { EventType, NotifierConfig } from "./config"
import { sendNotification } from "./notify"
import { playSound } from "./sound"
import { ringBell } from "./bell"
import { runCommand } from "./command"
import { isTerminalFocused, focusTerminal, captureStartupWindowId, isKDEJumpBackSupported } from "./focus"
import { shouldSuppressPermissionAlert, prunePermissionAlertState } from "./permission-dedupe"

const IDLE_COMPLETE_DELAY_MS = 350

export function isCLIClient(clientEnv?: string): boolean {
  return !clientEnv || clientEnv === "cli"
}

const pendingIdleTimers = new Map<string, ReturnType<typeof setTimeout>>()
const sessionIdleSequence = new Map<string, number>()
const sessionErrorSuppressionAt = new Map<string, number>()
const sessionLastBusyAt = new Map<string, number>()
const subagentSessionIds = new Set<string>()

// Minimal session API surface the notifier needs. V1 wraps the legacy SDK
// client; V2 wraps the plugin context. This keeps all event logic identical.
export interface SessionClient {
  listMessages(sessionID: string): Promise<Array<{ role?: string; created?: number }>>
  getSession(sessionID: string): Promise<{ title: string | null; parentID: string | null }>
  isPermissionPending(permissionID: string, sessionID: string | null): Promise<boolean>
}

function v1SessionClient(client: PluginInput["client"]): SessionClient {
  return {
    async listMessages(sessionID: string) {
      const response = await client.session.messages({ path: { id: sessionID } })
      const messages = (response as any)?.data ?? []
      if (!Array.isArray(messages)) return []
      return messages.map((msg: any) => {
        const info = msg?.info ?? {}
        const time = info?.time ?? {}
        return {
          role: typeof info.role === "string" ? info.role : undefined,
          created: typeof time.created === "number" ? time.created : undefined,
        }
      })
    },
    async getSession(sessionID: string) {
      try {
        const response = await client.session.get({ path: { id: sessionID } })
        const data = (response as any)?.data ?? {}
        return {
          title: typeof data.title === "string" ? data.title : null,
          parentID: typeof data.parentID === "string" ? data.parentID : null,
        }
      } catch {
        return { title: null, parentID: null }
      }
    },
    async isPermissionPending(permissionID: string) {
      return isPermissionStillPending(client, permissionID)
    },
  }
}

function v2SessionClient(ctx: any): SessionClient {
  return {
    async listMessages(sessionID: string) {
      try {
        const messages = await ctx.session.context({ sessionID })
        const list = Array.isArray(messages) ? messages : []
        return list.map((msg: any) => {
          const info = msg?.info ?? msg ?? {}
          const time = info?.time ?? {}
          const created =
            typeof time.created === "number"
              ? time.created
              : typeof time.start === "number"
                ? time.start
                : undefined
          return {
            role: typeof info.role === "string" ? info.role : undefined,
            created,
          }
        })
      } catch {
        return []
      }
    },
    async getSession(sessionID: string) {
      try {
        const res = await ctx.session.get({ sessionID })
        const data = (res as any)?.data ?? res ?? {}
        return {
          title: typeof data.title === "string" ? data.title : null,
          parentID: typeof data.parentID === "string" ? data.parentID : null,
        }
      } catch {
        return { title: null, parentID: null }
      }
    },
    async isPermissionPending(permissionID: string, sessionID: string | null) {
      try {
        const pending = sessionID
          ? await ctx.permission.list({ sessionID })
          : await ctx.permission.list()
        const list = Array.isArray(pending)
          ? pending
          : Array.isArray((pending as any)?.data)
            ? (pending as any).data
            : Array.isArray((pending as any)?.requests)
              ? (pending as any).requests
              : null
        if (!list) return true
        return list.some((p: any) => p?.id === permissionID || p?.requestID === permissionID)
      } catch {
        return true
      }
    },
  }
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : null
}

function getNestedRecord(root: unknown, ...path: string[]): UnknownRecord | null {
  let current: unknown = root
  for (const key of path) {
    const record = asRecord(current)
    if (!record || !(key in record)) {
      return null
    }
    current = record[key]
  }
  return asRecord(current)
}

function getStringField(record: UnknownRecord | null, key: string): string | null {
  if (!record) {
    return null
  }
  const value = record[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

let globalTurnCount: number | null = null

function loadTurnCount(): number {
  try {
    const content = readFileSync(getStatePath(), "utf-8")
    const state = JSON.parse(content)
    if (typeof state.turn === "number" && Number.isFinite(state.turn) && state.turn >= 0) {
      return state.turn
    }
  } catch {}
  return 0
}

function saveTurnCount(count: number): void {
  try {
    writeFileSync(getStatePath(), JSON.stringify({ turn: count }))
  } catch {}
}

function incrementTurnCount(): number {
  if (globalTurnCount === null) {
    globalTurnCount = loadTurnCount()
  }
  globalTurnCount++
  saveTurnCount(globalTurnCount)
  return globalTurnCount
}

// Memory cleanup: Remove old session entries every 5 minutes to prevent leaks
const cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000 // 5 minutes ago

  // Clean up sessionIdleSequence (use last access time stored separately if needed)
  for (const [sessionID] of sessionIdleSequence) {
    // If not in pendingIdleTimers, it's likely stale
    if (!pendingIdleTimers.has(sessionID)) {
      sessionIdleSequence.delete(sessionID)
      // Also remove from subagent tracking if stale
      subagentSessionIds.delete(sessionID)
    }
  }

  // Clean up sessionErrorSuppressionAt
  for (const [sessionID, timestamp] of sessionErrorSuppressionAt) {
    if (timestamp < cutoff) {
      sessionErrorSuppressionAt.delete(sessionID)
    }
  }

  // Clean up sessionLastBusyAt
  for (const [sessionID, timestamp] of sessionLastBusyAt) {
    if (timestamp < cutoff) {
      sessionLastBusyAt.delete(sessionID)
    }
  }

  prunePermissionAlertState(cutoff)
}, 5 * 60 * 1000)
cleanupInterval.unref()

function getNotificationTitle(config: NotifierConfig, projectName: string | null): string {
  if (config.showProjectName && projectName) {
    return `OpenCode (${projectName})`
  }
  return "OpenCode"
}

function formatTimestamp(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, "0")
  const m = String(now.getMinutes()).padStart(2, "0")
  const s = String(now.getSeconds()).padStart(2, "0")
  return `${h}:${m}:${s}`
}

export function extractAgentNameFromSessionTitle(sessionTitle: unknown): string {
  if (typeof sessionTitle !== "string" || sessionTitle.length === 0) {
    return ""
  }

  const match = sessionTitle.match(/\s*\(@([^\s)]+)\s+subagent\)\s*$/)
  return match ? match[1] : ""
}

function shouldResolveAgentNameForEvent(config: NotifierConfig, eventType: EventType): boolean {
  if (getMessage(config, eventType).includes("{agentName}")) {
    return true
  }

  if (!config.command.enabled || !isEventCommandEnabled(config, eventType)) {
    return false
  }

  if (config.command.path.includes("{agentName}")) {
    return true
  }

  return (config.command.args ?? []).some((arg) => arg.includes("{agentName}"))
}

async function handleEvent(
  config: NotifierConfig,
  eventType: EventType,
  projectName: string | null,
  elapsedSeconds?: number | null,
  sessionTitle?: string | null,
  sessionID?: string | null,
  agentName?: string | null
): Promise<void> {
  if (config.suppressWhenFocused && isTerminalFocused()) {
    return
  }

  if (
    (eventType === "complete" || eventType === "subagent_complete") &&
    typeof elapsedSeconds === "number" &&
    Number.isFinite(elapsedSeconds) &&
    elapsedSeconds < config.minDuration
  ) {
    return
  }

  const promises: Promise<void>[] = []

  const timestamp = formatTimestamp()
  const turn = incrementTurnCount()

  const rawMessage = getMessage(config, eventType)
  const message = interpolateMessage(rawMessage, {
    sessionTitle: config.showSessionTitle ? sessionTitle : null,
    agentName,
    projectName,
    timestamp,
    turn,
  })

  const notificationEnabled = isEventNotificationEnabled(config, eventType)
  if (notificationEnabled) {
    const title = getNotificationTitle(config, projectName)
    const iconPath = getIconPath(config)
    const onNotificationClick = isKDEJumpBackSupported() ? () => void focusTerminal() : undefined
    promises.push(sendNotification(title, message, config.timeout, iconPath, config.notificationSystem, config.linux.grouping, onNotificationClick, config.windows.appID))
  }

  if (isEventSoundEnabled(config, eventType)) {
    const customSoundPath = getSoundPath(config, eventType)
    const ghosttyOnMac = process.platform === "darwin" && config.notificationSystem === "ghostty" && notificationEnabled && config.suppressGhosttySound
    if (!ghosttyOnMac) {
      const soundVolume = getSoundVolume(config, eventType)
      promises.push(playSound(eventType, customSoundPath, soundVolume))
    }
  }

  if (isEventBellEnabled(config, eventType)) {
    promises.push(ringBell())
  }

  const minDuration = config.command?.minDuration
  const shouldSkipCommand =
    !isEventCommandEnabled(config, eventType) ||
    (typeof minDuration === "number" &&
      Number.isFinite(minDuration) &&
      minDuration > 0 &&
      typeof elapsedSeconds === "number" &&
      Number.isFinite(elapsedSeconds) &&
      elapsedSeconds < minDuration)

  if (!shouldSkipCommand) {
    runCommand(config, eventType, message, sessionTitle, agentName, projectName, timestamp, turn)
  }

  await Promise.allSettled(promises)
}

function getSessionIDFromEvent(event: unknown): string | null {
  const properties = getNestedRecord(event, "properties")
  return getStringField(properties, "sessionID")
}

export function getPermissionIDFromEvent(event: unknown): string | null {
  const properties = getNestedRecord(event, "properties")
  const id = getStringField(properties, "id")
  if (id) {
    return id
  }
  const request = getNestedRecord(event, "properties", "request")
  return getStringField(request, "id")
}

// Grace period letting an auto-approved request resolve before we check the
// pending list. The permission.asked event always fires first (even when the
// TUI/CLI auto-replies), so without this wait every request would look pending.
export const PERMISSION_PENDING_GRACE_MS = 300

// True when the request is still awaiting approval. Fails open: any lookup
// failure means "unknown", and unknown must notify rather than stay silent.
export async function isPermissionStillPending(client: unknown, permissionID: string): Promise<boolean> {
  try {
    // The v1 SDK client type exposes no permission.list API, so go through
    // the raw HTTP client like the rest of this file goes through (event as any).
    const inner = (client as any)?._client || (client as any)?.session?._client
    if (!inner || typeof inner.get !== "function") {
      return true
    }
    const listResponse = await inner.get({ url: "/permission" })
    const body = listResponse?.data ?? listResponse
    const pendingList = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : null
    if (!pendingList) {
      return true
    }
    return pendingList.some((p: { id?: string }) => p?.id === permissionID)
  } catch {
    return true
  }
}

interface SessionLifecycleInfo {
  id: string | null
  title: string | null
  parentID: string | null
}

function getSessionLifecycleInfo(event: unknown): SessionLifecycleInfo {
  const info = getNestedRecord(event, "properties", "info")
  return {
    id: getStringField(info, "id"),
    title: getStringField(info, "title"),
    parentID: getStringField(info, "parentID"),
  }
}

interface MessageUpdatedInfo {
  role: string | null
  sessionID: string | null
}

function getMessageUpdatedInfo(event: unknown): MessageUpdatedInfo {
  const info = getNestedRecord(event, "properties", "info")
  return {
    role: getStringField(info, "role"),
    sessionID: getStringField(info, "sessionID"),
  }
}

function clearPendingIdleTimer(sessionID: string): void {
  const timer = pendingIdleTimers.get(sessionID)
  if (!timer) {
    return
  }

  clearTimeout(timer)
  pendingIdleTimers.delete(sessionID)
}

function bumpSessionIdleSequence(sessionID: string): number {
  const nextSequence = (sessionIdleSequence.get(sessionID) ?? 0) + 1
  sessionIdleSequence.set(sessionID, nextSequence)
  return nextSequence
}

function hasCurrentSessionIdleSequence(sessionID: string, sequence: number): boolean {
  return sessionIdleSequence.get(sessionID) === sequence
}

function markSessionError(sessionID: string | null): void {
  if (!sessionID) {
    return
  }

  sessionErrorSuppressionAt.set(sessionID, Date.now())
  bumpSessionIdleSequence(sessionID)
  clearPendingIdleTimer(sessionID)
}

function markSessionBusy(sessionID: string): void {
  const now = Date.now()
  sessionLastBusyAt.set(sessionID, now)
  sessionErrorSuppressionAt.delete(sessionID)
  bumpSessionIdleSequence(sessionID)
  clearPendingIdleTimer(sessionID)
}

function shouldSuppressSessionIdle(sessionID: string, consume: boolean = true): boolean {
  const errorAt = sessionErrorSuppressionAt.get(sessionID)
  if (errorAt === undefined) {
    return false
  }

  const busyAt = sessionLastBusyAt.get(sessionID)
  if (typeof busyAt === "number" && busyAt > errorAt) {
    sessionErrorSuppressionAt.delete(sessionID)
    return false
  }

  if (consume) {
    sessionErrorSuppressionAt.delete(sessionID)
  }
  return true
}

async function getElapsedSinceLastPrompt(
  api: SessionClient,
  sessionID: string,
  nowMs: number = Date.now()
): Promise<number | null> {
  try {
    const messages = await api.listMessages(sessionID)

    let lastUserMessageTime: number | null = null
    for (const msg of messages) {
      if (msg.role === "user" && typeof msg.created === "number") {
        if (lastUserMessageTime === null || msg.created > lastUserMessageTime) {
          lastUserMessageTime = msg.created
        }
      }
    }

    if (lastUserMessageTime !== null) {
      return (nowMs - lastUserMessageTime) / 1000
    }
  } catch {
  }

  return null
}

async function processSessionIdle(
  api: SessionClient,
  config: NotifierConfig,
  projectName: string | null,
  event: unknown,
  sessionID: string,
  sequence: number,
  idleReceivedAtMs: number
): Promise<void> {
  if (!hasCurrentSessionIdleSequence(sessionID, sequence)) {
    return
  }

  if (shouldSuppressSessionIdle(sessionID)) {
    return
  }

  // Fast path: if we already know this is a subagent from in-memory tracking,
  // skip the API call and go straight to subagent_complete
  if (subagentSessionIds.has(sessionID)) {
    await handleEventWithElapsedTime(api, config, "subagent_complete", projectName, event, idleReceivedAtMs, null)
    return
  }

  const sess = await api.getSession(sessionID)

  if (!hasCurrentSessionIdleSequence(sessionID, sequence)) {
    return
  }

  if (shouldSuppressSessionIdle(sessionID)) {
    return
  }

  if (!sess.parentID) {
    await handleEventWithElapsedTime(api, config, "complete", projectName, event, idleReceivedAtMs, sess.title)
    return
  }

  // Update in-memory set now that we confirmed it's a child via API
  subagentSessionIds.add(sessionID)
  await handleEventWithElapsedTime(api, config, "subagent_complete", projectName, event, idleReceivedAtMs, sess.title)
}

function scheduleSessionIdle(
  api: SessionClient,
  config: NotifierConfig,
  projectName: string | null,
  event: unknown,
  sessionID: string
): void {
  clearPendingIdleTimer(sessionID)
  const sequence = bumpSessionIdleSequence(sessionID)
  const idleReceivedAtMs = Date.now()

  const timer = setTimeout(() => {
    pendingIdleTimers.delete(sessionID)
    void processSessionIdle(api, config, projectName, event, sessionID, sequence, idleReceivedAtMs).catch(() => undefined)
  }, IDLE_COMPLETE_DELAY_MS)

  pendingIdleTimers.set(sessionID, timer)
}

async function handleEventWithElapsedTime(
  api: SessionClient,
  config: NotifierConfig,
  eventType: EventType,
  projectName: string | null,
  event: unknown,
  elapsedReferenceNowMs?: number,
  preloadedSessionTitle?: string | null
): Promise<void> {
  const sessionID = getSessionIDFromEvent(event)
  const commandMinDuration = config.command?.minDuration
  const shouldLookupElapsedForCommand =
    !!config.command?.enabled &&
    typeof config.command?.path === "string" &&
    config.command.path.length > 0 &&
    typeof commandMinDuration === "number" &&
    Number.isFinite(commandMinDuration) &&
    commandMinDuration > 0

  const shouldLookupElapsedForNotification =
    typeof config.minDuration === "number" &&
    Number.isFinite(config.minDuration) &&
    config.minDuration > 0

  const shouldLookupElapsed = shouldLookupElapsedForCommand || shouldLookupElapsedForNotification

  let elapsedSeconds: number | null = null
  if (shouldLookupElapsed) {
    if (sessionID) {
      elapsedSeconds = await getElapsedSinceLastPrompt(api, sessionID, elapsedReferenceNowMs)
    }
  }

  let sessionTitle: string | null = preloadedSessionTitle ?? null
  const shouldLookupSessionInfo = sessionID && !sessionTitle && (config.showSessionTitle || shouldResolveAgentNameForEvent(config, eventType))
  if (shouldLookupSessionInfo) {
    const info = await api.getSession(sessionID)
    sessionTitle = info.title
  }

  const agentName = extractAgentNameFromSessionTitle(sessionTitle)

  await handleEvent(config, eventType, projectName, elapsedSeconds, sessionTitle, sessionID, agentName)
}

async function handleServerEvent(
  api: SessionClient,
  projectName: string | null,
  isCLI: boolean,
  event: any
): Promise<void> {
  const config = loadConfig()

  // Track subagent sessions from session lifecycle events
  if (event.type === "session.created") {
    const info = getSessionLifecycleInfo(event)
    if (info.parentID && info.id) {
      subagentSessionIds.add(info.id)
    } else {
      // Non-subagent session started
      await handleEvent(config, "session_started", projectName, null, info.title, info.id, null)
    }
  }

  if (event.type === "session.updated") {
    const info = getSessionLifecycleInfo(event)
    if (info.parentID && info.id) {
      subagentSessionIds.add(info.id)
    }
  }

  if (event.type === "session.deleted") {
    const info = getSessionLifecycleInfo(event)
    if (info.id) {
      subagentSessionIds.delete(info.id)
    }
  }

  if ((event as any).type === "permission.asked") {
    const sessionID = getSessionIDFromEvent(event)
    const permissionID = getPermissionIDFromEvent(event)
    let stillPending = true
    if (permissionID) {
      // Auto-approved requests are resolved immediately, so wait briefly
      // and only notify when the request is still pending.
      await new Promise((resolve) => setTimeout(resolve, PERMISSION_PENDING_GRACE_MS))
      stillPending = await api.isPermissionPending(permissionID, sessionID)
    }
    // Claim the shared dedupe window only when a notification is actually
    // about to fire: a silently skipped auto-approved request must not mute a
    // real one arriving within the same second.
    if (stillPending && !shouldSuppressPermissionAlert(sessionID)) {
      await handleEventWithElapsedTime(api, config, "permission", projectName, event)
    }
  }

  if (event.type === "session.idle") {
    const sessionID = getSessionIDFromEvent(event)
    if (sessionID) {
      if (isCLI) {
        // CLI sessions (opencode run) exit soon after going idle.
        // Process completion directly to avoid losing the notification
        // when the process terminates before the debounce timer fires.
        const idleReceivedAtMs = Date.now()
        const sequence = bumpSessionIdleSequence(sessionID)
        await processSessionIdle(api, config, projectName, event, sessionID, sequence, idleReceivedAtMs)
      } else {
        scheduleSessionIdle(api, config, projectName, event, sessionID)
      }
    } else {
      await handleEventWithElapsedTime(api, config, "complete", projectName, event)
    }
  }

  if (event.type === "session.status" && event.properties.status.type === "busy") {
    markSessionBusy(event.properties.sessionID)
  }

  if (event.type === "session.error") {
    const sessionID = getSessionIDFromEvent(event)
    markSessionError(sessionID)
    const eventType: EventType = event.properties.error?.name === "MessageAbortedError" ? "user_cancelled" : "error"
    let sessionTitle: string | null = null
    if (sessionID && config.showSessionTitle) {
      const info = await api.getSession(sessionID)
      sessionTitle = info.title
    }
    await handleEventWithElapsedTime(api, config, eventType, projectName, event, undefined, sessionTitle)
  }

  if (event.type === "message.updated") {
    const info = getMessageUpdatedInfo(event)
    if (info.role === "user") {
      const sessionID = info.sessionID
      // Only fire for non-subagent sessions
      if (!sessionID || !subagentSessionIds.has(sessionID)) {
        await handleEvent(config, "user_message", projectName, null, null, sessionID, null)
      }
    }
  }
}

export const NotifierPlugin: Plugin = async ({ client, directory }) => {
  captureStartupWindowId()

  const clientEnv = process.env.OPENCODE_CLIENT
  if (clientEnv && clientEnv !== "cli") {
    const config = loadConfig()
    if (!config.enableOnDesktop) return {}
  }

  const getConfig = () => loadConfig()
  const projectName = directory ? (getConfig().showFullPath ? directory : basename(directory)) : null

  // Fire client_connected after the plugin is fully initialized.
  // There is no SDK event that reliably signals client connection from a plugin's
  // perspective, so we approximate it with a short delay after plugin startup.
  // Config is read at fire-time so that any user overrides are respected.
  // CLI sessions skip the delay since the process may exit before it fires.
  const isCLI = isCLIClient(clientEnv)
  if (isCLI) {
    void handleEvent(getConfig(), "client_connected", projectName, null)
  } else {
    setTimeout(() => {
      void handleEvent(getConfig(), "client_connected", projectName, null)
    }, 100)
  }

  const api = v1SessionClient(client)

  return {
    event: async ({ event }) => {
      await handleServerEvent(api, projectName, isCLI, event)
    },
    "permission.ask": async () => {
      const config = getConfig()
      if (!shouldSuppressPermissionAlert(null)) {
        await handleEvent(config, "permission", projectName, null)
      }
    },
    "tool.execute.before": async (input) => {
      const config = getConfig()
      if (input.tool === "question") {
        await handleEvent(config, "question", projectName, null)
      }
      if (input.tool === "plan_exit") {
        await handleEvent(config, "plan_exit", projectName, null)
      }
    },
  }
}

// OpenCode v2 entrypoint. Same behavior as the v1 plugin above, driven by the
// v2 plugin context instead of the legacy SDK client. A plain object is enough:
// the v2 loader accepts any default export with an id and a setup function,
// so no @opencode/plugin dependency is needed.
let v2SetupDone = false

async function setupV2(ctx: any): Promise<() => void> {
  if (v2SetupDone) return () => {}
  v2SetupDone = true

  captureStartupWindowId()

  const clientEnv = process.env.OPENCODE_CLIENT
  if (clientEnv && clientEnv !== "cli") {
    if (!loadConfig().enableOnDesktop) return () => {}
  }

  const directory =
    typeof ctx?.location?.directory === "string" && ctx.location.directory.length > 0
      ? ctx.location.directory
      : null
  const projectName = directory ? (loadConfig().showFullPath ? directory : basename(directory)) : null

  const api = v2SessionClient(ctx)
  const isCLI = isCLIClient(clientEnv)
  if (isCLI) {
    void handleEvent(loadConfig(), "client_connected", projectName, null)
  } else {
    setTimeout(() => {
      void handleEvent(loadConfig(), "client_connected", projectName, null)
    }, 100)
  }

  // question / plan_exit detection. The v2 permission.asked event already covers
  // the v1 "permission.ask" hook, so only the tool hook is ported.
  try {
    await ctx.tool.hook("execute.before", (hookEvent: any) => {
      const config = loadConfig()
      const tool = hookEvent?.tool
      if (tool === "question") {
        void handleEvent(config, "question", projectName, null)
      }
      if (tool === "plan_exit") {
        void handleEvent(config, "plan_exit", projectName, null)
      }
    })
  } catch {
    // Hook domain unavailable; the event stream still covers idle/error/permission.
  }

  const controller = new AbortController()
  void (async () => {
    try {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        try {
          await handleServerEvent(api, projectName, isCLI, event)
        } catch {
          // Never break the event stream on a single bad event.
        }
      }
    } catch {
      // Aborted on unload.
    }
  })()

  return () => controller.abort()
}

const pluginModule = {
  id: "opencode-notifier",
  setup: setupV2,
  server: NotifierPlugin,
}

export default pluginModule as unknown as PluginModule
