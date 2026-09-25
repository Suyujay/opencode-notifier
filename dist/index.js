// src/index.ts
import { basename, join as join4 } from "path";
import { tmpdir as tmpdir2 } from "os";
import { readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";

// src/config.ts
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

// node_modules/is-wsl/index.js
import process2 from "node:process";
import os from "node:os";
import fs3 from "node:fs";

// node_modules/is-inside-container/index.js
import fs2 from "node:fs";

// node_modules/is-docker/index.js
import fs from "node:fs";
var isDockerCached;
function hasDockerEnv() {
  try {
    fs.statSync("/.dockerenv");
    return true;
  } catch {
    return false;
  }
}
function hasDockerCGroup() {
  try {
    return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
  } catch {
    return false;
  }
}
function isDocker() {
  if (isDockerCached === undefined) {
    isDockerCached = hasDockerEnv() || hasDockerCGroup();
  }
  return isDockerCached;
}

// node_modules/is-inside-container/index.js
var cachedResult;
var hasContainerEnv = () => {
  try {
    fs2.statSync("/run/.containerenv");
    return true;
  } catch {
    return false;
  }
};
function isInsideContainer() {
  if (cachedResult === undefined) {
    cachedResult = hasContainerEnv() || isDocker();
  }
  return cachedResult;
}

// node_modules/is-wsl/index.js
var isWsl = () => {
  if (process2.platform !== "linux") {
    return false;
  }
  if (os.release().toLowerCase().includes("microsoft")) {
    if (isInsideContainer()) {
      return false;
    }
    return true;
  }
  try {
    if (fs3.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft")) {
      return !isInsideContainer();
    }
  } catch {}
  if (fs3.existsSync("/proc/sys/fs/binfmt_misc/WSLInterop") || fs3.existsSync("/run/WSL")) {
    return !isInsideContainer();
  }
  return false;
};
var is_wsl_default = process2.env.__IS_WSL_TEST__ ? isWsl : isWsl();

// src/config.ts
var DEFAULT_EVENT_CONFIG = {
  sound: true,
  notification: true,
  command: true,
  bell: false
};
var DEFAULT_CONFIG = {
  sound: true,
  notification: true,
  bell: false,
  timeout: 5,
  showProjectName: true,
  showFullPath: false,
  showSessionTitle: false,
  showIcon: true,
  customIconPath: null,
  suppressWhenFocused: true,
  enableOnDesktop: false,
  notificationSystem: "osascript",
  suppressGhosttySound: false,
  linux: {
    grouping: false
  },
  windows: {
    appID: "opencode"
  },
  minDuration: 0,
  command: {
    enabled: false,
    path: "",
    minDuration: 0
  },
  events: {
    permission: { ...DEFAULT_EVENT_CONFIG },
    complete: { ...DEFAULT_EVENT_CONFIG },
    subagent_complete: { ...DEFAULT_EVENT_CONFIG, sound: false, notification: false },
    error: { ...DEFAULT_EVENT_CONFIG },
    question: { ...DEFAULT_EVENT_CONFIG },
    interrupted: { ...DEFAULT_EVENT_CONFIG },
    user_cancelled: { ...DEFAULT_EVENT_CONFIG, sound: false, notification: false },
    plan_exit: { ...DEFAULT_EVENT_CONFIG },
    session_started: { ...DEFAULT_EVENT_CONFIG, notification: false },
    user_message: { ...DEFAULT_EVENT_CONFIG, notification: false },
    client_connected: { ...DEFAULT_EVENT_CONFIG, notification: false }
  },
  messages: {
    permission: "Session needs permission: {sessionTitle}",
    complete: "Session has finished: {sessionTitle}",
    subagent_complete: "Subagent task completed: {sessionTitle}",
    error: "Session encountered an error: {sessionTitle}",
    question: "Session has a question: {sessionTitle}",
    interrupted: "Session was interrupted: {sessionTitle}",
    user_cancelled: "Session was cancelled by user: {sessionTitle}",
    plan_exit: "Plan ready for review: {sessionTitle}",
    session_started: "Session started: {sessionTitle}",
    user_message: "User sent a message: {sessionTitle}",
    client_connected: "OpenCode connected"
  },
  sounds: {
    permission: null,
    complete: null,
    subagent_complete: null,
    error: null,
    question: null,
    interrupted: null,
    user_cancelled: null,
    plan_exit: null,
    session_started: null,
    user_message: null,
    client_connected: null
  },
  volumes: {
    permission: 1,
    complete: 1,
    subagent_complete: 1,
    error: 1,
    question: 1,
    interrupted: 1,
    user_cancelled: 1,
    plan_exit: 1,
    session_started: 1,
    user_message: 1,
    client_connected: 1
  }
};
function getConfigPath() {
  if (process.env.OPENCODE_NOTIFIER_CONFIG_PATH) {
    return process.env.OPENCODE_NOTIFIER_CONFIG_PATH;
  }
  return join(homedir(), ".config", "opencode", "opencode-notifier.json");
}
function getStatePath() {
  const configPath = getConfigPath();
  return join(dirname(configPath), "opencode-notifier-state.json");
}
function parseEventConfig(userEvent, defaultConfig) {
  if (userEvent === undefined) {
    return defaultConfig;
  }
  if (typeof userEvent === "boolean") {
    return {
      sound: userEvent,
      notification: userEvent,
      command: userEvent,
      bell: defaultConfig.bell
    };
  }
  return {
    sound: userEvent.sound ?? defaultConfig.sound,
    notification: userEvent.notification ?? defaultConfig.notification,
    command: userEvent.command ?? defaultConfig.command,
    bell: userEvent.bell ?? defaultConfig.bell
  };
}
function parseVolume(value, defaultVolume) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultVolume;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
function loadConfig() {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }
  try {
    const fileContent = readFileSync(configPath, "utf-8");
    const userConfig = JSON.parse(fileContent);
    const globalSound = userConfig.sound ?? DEFAULT_CONFIG.sound;
    const globalNotification = userConfig.notification ?? DEFAULT_CONFIG.notification;
    const globalBell = userConfig.bell ?? DEFAULT_CONFIG.bell;
    const defaultWithGlobal = {
      sound: globalSound,
      notification: globalNotification,
      command: true,
      bell: globalBell
    };
    const userCommand = userConfig.command ?? {};
    const commandArgs = Array.isArray(userCommand.args) ? userCommand.args.filter((arg) => typeof arg === "string") : undefined;
    const commandMinDuration = typeof userCommand.minDuration === "number" && Number.isFinite(userCommand.minDuration) && userCommand.minDuration > 0 ? userCommand.minDuration : 0;
    return {
      sound: globalSound,
      notification: globalNotification,
      bell: globalBell,
      timeout: typeof userConfig.timeout === "number" && userConfig.timeout > 0 ? userConfig.timeout : DEFAULT_CONFIG.timeout,
      showProjectName: userConfig.showProjectName ?? DEFAULT_CONFIG.showProjectName,
      showFullPath: userConfig.showFullPath ?? DEFAULT_CONFIG.showFullPath,
      showSessionTitle: userConfig.showSessionTitle ?? DEFAULT_CONFIG.showSessionTitle,
      showIcon: userConfig.showIcon ?? DEFAULT_CONFIG.showIcon,
      customIconPath: userConfig.customIconPath ?? DEFAULT_CONFIG.customIconPath,
      suppressWhenFocused: userConfig.suppressWhenFocused ?? DEFAULT_CONFIG.suppressWhenFocused,
      enableOnDesktop: typeof userConfig.enableOnDesktop === "boolean" ? userConfig.enableOnDesktop : DEFAULT_CONFIG.enableOnDesktop,
      notificationSystem: userConfig.notificationSystem === "node-notifier" ? "node-notifier" : userConfig.notificationSystem === "ghostty" ? "ghostty" : "osascript",
      suppressGhosttySound: typeof userConfig.suppressGhosttySound === "boolean" ? userConfig.suppressGhosttySound : DEFAULT_CONFIG.suppressGhosttySound,
      linux: {
        grouping: typeof userConfig.linux?.grouping === "boolean" ? userConfig.linux.grouping : DEFAULT_CONFIG.linux.grouping
      },
      windows: {
        appID: typeof userConfig.windows?.appID === "string" && userConfig.windows.appID.length > 0 ? userConfig.windows.appID : DEFAULT_CONFIG.windows.appID
      },
      minDuration: typeof userConfig.minDuration === "number" && Number.isFinite(userConfig.minDuration) && userConfig.minDuration >= 0 ? userConfig.minDuration : DEFAULT_CONFIG.minDuration,
      command: {
        enabled: typeof userCommand.enabled === "boolean" ? userCommand.enabled : DEFAULT_CONFIG.command.enabled,
        path: typeof userCommand.path === "string" ? userCommand.path : DEFAULT_CONFIG.command.path,
        args: commandArgs,
        minDuration: commandMinDuration
      },
      events: {
        permission: parseEventConfig(userConfig.events?.permission ?? userConfig.permission, defaultWithGlobal),
        complete: parseEventConfig(userConfig.events?.complete ?? userConfig.complete, defaultWithGlobal),
        subagent_complete: parseEventConfig(userConfig.events?.subagent_complete ?? userConfig.subagent_complete, { sound: false, notification: false, command: true, bell: false }),
        error: parseEventConfig(userConfig.events?.error ?? userConfig.error, defaultWithGlobal),
        question: parseEventConfig(userConfig.events?.question ?? userConfig.question, defaultWithGlobal),
        interrupted: parseEventConfig(userConfig.events?.interrupted ?? userConfig.interrupted, defaultWithGlobal),
        user_cancelled: parseEventConfig(userConfig.events?.user_cancelled ?? userConfig.user_cancelled, { sound: false, notification: false, command: true, bell: false }),
        plan_exit: parseEventConfig(userConfig.events?.plan_exit ?? userConfig.plan_exit, defaultWithGlobal),
        session_started: parseEventConfig(userConfig.events?.session_started ?? userConfig.session_started, { ...defaultWithGlobal, notification: false }),
        user_message: parseEventConfig(userConfig.events?.user_message ?? userConfig.user_message, { ...defaultWithGlobal, notification: false }),
        client_connected: parseEventConfig(userConfig.events?.client_connected ?? userConfig.client_connected, { ...defaultWithGlobal, notification: false })
      },
      messages: {
        permission: userConfig.messages?.permission ?? DEFAULT_CONFIG.messages.permission,
        complete: userConfig.messages?.complete ?? DEFAULT_CONFIG.messages.complete,
        subagent_complete: userConfig.messages?.subagent_complete ?? DEFAULT_CONFIG.messages.subagent_complete,
        error: userConfig.messages?.error ?? DEFAULT_CONFIG.messages.error,
        question: userConfig.messages?.question ?? DEFAULT_CONFIG.messages.question,
        interrupted: userConfig.messages?.interrupted ?? DEFAULT_CONFIG.messages.interrupted,
        user_cancelled: userConfig.messages?.user_cancelled ?? DEFAULT_CONFIG.messages.user_cancelled,
        plan_exit: userConfig.messages?.plan_exit ?? DEFAULT_CONFIG.messages.plan_exit,
        session_started: userConfig.messages?.session_started ?? DEFAULT_CONFIG.messages.session_started,
        user_message: userConfig.messages?.user_message ?? DEFAULT_CONFIG.messages.user_message,
        client_connected: userConfig.messages?.client_connected ?? DEFAULT_CONFIG.messages.client_connected
      },
      sounds: {
        permission: userConfig.sounds?.permission ?? DEFAULT_CONFIG.sounds.permission,
        complete: userConfig.sounds?.complete ?? DEFAULT_CONFIG.sounds.complete,
        subagent_complete: userConfig.sounds?.subagent_complete ?? DEFAULT_CONFIG.sounds.subagent_complete,
        error: userConfig.sounds?.error ?? DEFAULT_CONFIG.sounds.error,
        question: userConfig.sounds?.question ?? DEFAULT_CONFIG.sounds.question,
        interrupted: userConfig.sounds?.interrupted ?? DEFAULT_CONFIG.sounds.interrupted,
        user_cancelled: userConfig.sounds?.user_cancelled ?? DEFAULT_CONFIG.sounds.user_cancelled,
        plan_exit: userConfig.sounds?.plan_exit ?? DEFAULT_CONFIG.sounds.plan_exit,
        session_started: userConfig.sounds?.session_started ?? DEFAULT_CONFIG.sounds.session_started,
        user_message: userConfig.sounds?.user_message ?? DEFAULT_CONFIG.sounds.user_message,
        client_connected: userConfig.sounds?.client_connected ?? DEFAULT_CONFIG.sounds.client_connected
      },
      volumes: {
        permission: parseVolume(userConfig.volumes?.permission, DEFAULT_CONFIG.volumes.permission),
        complete: parseVolume(userConfig.volumes?.complete, DEFAULT_CONFIG.volumes.complete),
        subagent_complete: parseVolume(userConfig.volumes?.subagent_complete, DEFAULT_CONFIG.volumes.subagent_complete),
        error: parseVolume(userConfig.volumes?.error, DEFAULT_CONFIG.volumes.error),
        question: parseVolume(userConfig.volumes?.question, DEFAULT_CONFIG.volumes.question),
        interrupted: parseVolume(userConfig.volumes?.interrupted, DEFAULT_CONFIG.volumes.interrupted),
        user_cancelled: parseVolume(userConfig.volumes?.user_cancelled, DEFAULT_CONFIG.volumes.user_cancelled),
        plan_exit: parseVolume(userConfig.volumes?.plan_exit, DEFAULT_CONFIG.volumes.plan_exit),
        session_started: parseVolume(userConfig.volumes?.session_started, DEFAULT_CONFIG.volumes.session_started),
        user_message: parseVolume(userConfig.volumes?.user_message, DEFAULT_CONFIG.volumes.user_message),
        client_connected: parseVolume(userConfig.volumes?.client_connected, DEFAULT_CONFIG.volumes.client_connected)
      }
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
function isEventSoundEnabled(config, event) {
  return config.events[event].sound;
}
function isEventNotificationEnabled(config, event) {
  return config.events[event].notification;
}
function isEventCommandEnabled(config, event) {
  return config.events[event].command;
}
function isEventBellEnabled(config, event) {
  return config.events[event].bell;
}
function getMessage(config, event) {
  return config.messages[event];
}
function getSoundPath(config, event) {
  return config.sounds[event];
}
function getSoundVolume(config, event) {
  return config.volumes[event];
}
function getIconPath(config) {
  if (!config.showIcon) {
    return;
  }
  try {
    let iconPath;
    if (config.customIconPath) {
      iconPath = config.customIconPath;
    } else {
      const __filename2 = fileURLToPath(import.meta.url);
      const __dirname2 = dirname(__filename2);
      iconPath = join(__dirname2, "..", "logos", "opencode-logo-dark.png");
    }
    if (is_wsl_default || existsSync(iconPath)) {
      return iconPath;
    }
  } catch {}
  return;
}
function interpolateMessage(message, context) {
  let result = message;
  const sessionTitle = context.sessionTitle || "";
  result = result.replaceAll("{sessionTitle}", sessionTitle);
  const agentName = context.agentName || "";
  result = result.replaceAll("{agentName}", agentName);
  const projectName = context.projectName || "";
  result = result.replaceAll("{projectName}", projectName);
  const timestamp = context.timestamp || "";
  result = result.replaceAll("{timestamp}", timestamp);
  const turn = context.turn != null ? String(context.turn) : "";
  result = result.replaceAll("{turn}", turn);
  result = result.replace(/\s*[:\-|]\s*$/, "").trim();
  result = result.replace(/\s{2,}/g, " ");
  return result;
}

// src/notify.ts
import os2 from "os";
import { execFile, spawn } from "child_process";
import notifier from "node-notifier";
var DEBOUNCE_MS = 1000;
var platform = os2.type();
var platformNotifier;
if (platform === "Windows_NT" || is_wsl_default) {
  const { WindowsToaster } = notifier;
  platformNotifier = new WindowsToaster({ withFallback: false });
} else if (platform === "Linux" || platform.match(/BSD$/)) {
  const { NotifySend } = notifier;
  platformNotifier = new NotifySend({ withFallback: false });
} else if (platform !== "Darwin") {
  platformNotifier = notifier;
}
var LINUX_FOCUS_ACTION_KEY = "focus-terminal";
var LINUX_FOCUS_ACTION_LABEL = "Jump to terminal";
var lastNotificationTime = {};
var lastLinuxNotificationId = null;
var linuxNotifySendSupportsReplace = null;
function sanitizeGhosttyField(value) {
  return value.replace(/[;\u0000-\u001f\u007f-\u009f]/g, "");
}
function formatGhosttyNotificationSequence(title, message, env = process.env) {
  const escapedTitle = sanitizeGhosttyField(title);
  const escapedMessage = sanitizeGhosttyField(message);
  const payload = `\x1B]9;${escapedTitle}: ${escapedMessage}\x07`;
  if (env.TMUX) {
    return `\x1BPtmux;\x1B${payload}\x1B\\`;
  }
  return payload;
}
function detectNotifySendCapabilities() {
  return new Promise((resolve) => {
    execFile("notify-send", ["--version"], (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }
      const match = stdout.match(/(\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        resolve(major > 0 || major === 0 && minor >= 8);
        return;
      }
      resolve(false);
    });
  });
}
function sendLinuxNotificationDirect(title, message, timeout, iconPath, grouping = true, onAction) {
  return new Promise((resolve) => {
    if (onAction) {
      sendLinuxNotificationWithActions(title, message, timeout, iconPath, grouping, onAction).then(() => resolve()).catch(() => resolve());
      return;
    }
    const args = [];
    args.push("--app-name", "opencode");
    if (iconPath) {
      args.push("--icon", iconPath);
    }
    args.push("--expire-time", String(timeout * 1000));
    if (grouping && lastLinuxNotificationId !== null) {
      args.push("--replace-id", String(lastLinuxNotificationId));
    }
    if (grouping) {
      args.push("--print-id");
    }
    args.push("--", title, message);
    execFile("notify-send", args, (error, stdout) => {
      if (!error && grouping && stdout) {
        const id = parseInt(stdout.trim(), 10);
        if (!isNaN(id)) {
          lastLinuxNotificationId = id;
        }
      }
      resolve();
    });
  });
}
async function sendLinuxNotificationWithActions(title, message, timeout, iconPath, grouping = true, onAction) {
  const args = ["--app-name", "opencode"];
  if (iconPath) {
    args.push("--icon", iconPath);
  }
  args.push("--expire-time", String(timeout * 1000));
  if (grouping && lastLinuxNotificationId !== null) {
    args.push("--replace-id", String(lastLinuxNotificationId));
  }
  args.push("--print-id");
  args.push("--action", `${LINUX_FOCUS_ACTION_KEY}=${LINUX_FOCUS_ACTION_LABEL}`);
  args.push("--", title, message);
  return new Promise((resolve) => {
    const child = spawn("notify-send", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    const consumeStdout = () => {
      const lines = stdout.split(/\r?\n/);
      stdout = lines.pop() ?? "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }
        const parsed = parseNotifySendOutputLine(line);
        if (!parsed) {
          continue;
        }
        if (parsed.type === "id") {
          if (grouping) {
            lastLinuxNotificationId = parsed.id;
          }
          continue;
        }
        if (onAction) {
          if (parsed.action === "focus") {
            onAction("focus");
          } else if (parsed.action === "close") {
            onAction("close");
          }
        }
      }
    };
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
      consumeStdout();
    });
    child.on("close", () => {
      if (stdout.trim().length > 0) {
        stdout += `
`;
        consumeStdout();
      }
      resolve();
    });
    child.on("error", () => {
      resolve();
    });
  });
}
function parseNotifySendOutputLine(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  if (/^\d+$/.test(trimmed)) {
    const id = parseInt(trimmed, 10);
    if (!isNaN(id)) {
      return { type: "id", id };
    }
  }
  if (trimmed === LINUX_FOCUS_ACTION_KEY) {
    return { type: "action", action: "focus" };
  }
  if (trimmed === "close") {
    return { type: "action", action: "close" };
  }
  return null;
}
function buildOsascriptNotificationArgs(title, message) {
  return [
    "-e",
    `on run argv
 display notification (item 1 of argv) with title (item 2 of argv)
end run`,
    message,
    title
  ];
}
async function sendNotification(title, message, timeout, iconPath, notificationSystem = "osascript", linuxGrouping = true, onClick, windowsAppID) {
  const now = Date.now();
  if (lastNotificationTime[message] && now - lastNotificationTime[message] < DEBOUNCE_MS) {
    return;
  }
  lastNotificationTime[message] = now;
  if (notificationSystem === "ghostty") {
    return new Promise((resolve) => {
      const sequence = formatGhosttyNotificationSequence(title, message);
      process.stdout.write(sequence, () => {
        resolve();
      });
    });
  }
  if (platform === "Darwin") {
    if (notificationSystem === "node-notifier") {
      return new Promise((resolve) => {
        const notificationOptions = {
          title,
          message,
          timeout,
          icon: iconPath
        };
        notifier.notify(notificationOptions, () => {
          resolve();
        });
      });
    }
    return new Promise((resolve) => {
      execFile("osascript", buildOsascriptNotificationArgs(title, message), () => {
        resolve();
      });
    });
  }
  if ((platform === "Linux" || platform.match(/BSD$/)) && !is_wsl_default) {
    if (!process.env.DBUS_SESSION_BUS_ADDRESS)
      return;
    if (onClick) {
      if (linuxGrouping) {
        if (linuxNotifySendSupportsReplace === null) {
          linuxNotifySendSupportsReplace = await detectNotifySendCapabilities();
        }
        if (linuxNotifySendSupportsReplace) {
          return sendLinuxNotificationDirect(title, message, timeout, iconPath, true, () => onClick());
        }
      }
      return sendLinuxNotificationDirect(title, message, timeout, iconPath, false, () => onClick());
    }
    if (linuxGrouping) {
      if (linuxNotifySendSupportsReplace === null) {
        linuxNotifySendSupportsReplace = await detectNotifySendCapabilities();
      }
      if (linuxNotifySendSupportsReplace) {
        return sendLinuxNotificationDirect(title, message, timeout, iconPath, true);
      }
    }
  }
  return new Promise((resolve) => {
    const notificationOptions = {
      title,
      message,
      timeout,
      icon: iconPath,
      appName: windowsAppID ?? "opencode"
    };
    platformNotifier.notify(notificationOptions, (err, response, metadata) => {
      if (onClick && metadata?.activationType === "default") {
        onClick();
      }
      resolve();
    });
  });
}

// src/sound.ts
import { platform as platform2 } from "os";
import { join as join2, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { existsSync as existsSync2 } from "fs";
import { spawn as spawn2 } from "child_process";
var __dirname2 = dirname2(fileURLToPath2(import.meta.url));
var DEBOUNCE_MS2 = 1000;
var FULL_VOLUME_PERCENT = 100;
var FULL_VOLUME_PULSE = 65536;
var lastSoundTime = {};
function getBundledSoundPath(event) {
  const soundFilename = `${event}.wav`;
  const possiblePaths = [
    join2(__dirname2, "..", "sounds", soundFilename),
    join2(__dirname2, "sounds", soundFilename)
  ];
  for (const path of possiblePaths) {
    if (existsSync2(path)) {
      return path;
    }
  }
  return join2(__dirname2, "..", "sounds", soundFilename);
}
function getSoundFilePath(event, customPath) {
  if (customPath && existsSync2(customPath)) {
    return customPath;
  }
  const bundledPath = getBundledSoundPath(event);
  if (existsSync2(bundledPath)) {
    return bundledPath;
  }
  return null;
}
async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn2(command, args, {
      stdio: "ignore",
      detached: false,
      windowsHide: true
    });
    proc.on("error", (err) => {
      reject(err);
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
  });
}
function normalizeVolume(volume) {
  if (!Number.isFinite(volume)) {
    return 1;
  }
  if (volume < 0) {
    return 0;
  }
  if (volume > 1) {
    return 1;
  }
  return volume;
}
function toPercentVolume(volume) {
  return Math.round(volume * FULL_VOLUME_PERCENT);
}
function toPulseVolume(volume) {
  return Math.round(volume * FULL_VOLUME_PULSE);
}
async function playOnLinux(soundPath, volume) {
  const percentVolume = toPercentVolume(volume);
  const pulseVolume = toPulseVolume(volume);
  const players = [
    { command: "paplay", args: [`--volume=${pulseVolume}`, soundPath] },
    { command: "aplay", args: [soundPath] },
    {
      command: "mpv",
      args: [
        "--no-video",
        "--no-terminal",
        "--script-opts=autoload-disabled=yes",
        "--keep-open=no",
        "--idle=no",
        `--volume=${percentVolume}`,
        soundPath
      ]
    },
    { command: "ffplay", args: ["-nodisp", "-autoexit", "-loglevel", "quiet", "-volume", `${percentVolume}`, soundPath] }
  ];
  for (const player of players) {
    try {
      await runCommand(player.command, player.args);
      return;
    } catch {
      continue;
    }
  }
}
async function playOnMac(soundPath, volume) {
  await runCommand("afplay", ["-v", `${volume}`, soundPath]);
}
async function playOnWindows(soundPath) {
  const script = `(New-Object Media.SoundPlayer '${soundPath.replace(/'/g, "''")}').PlaySync()`;
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  await runCommand("powershell", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded]);
}
async function playSound(event, customPath, volume) {
  const now = Date.now();
  if (lastSoundTime[event] && now - lastSoundTime[event] < DEBOUNCE_MS2) {
    return;
  }
  lastSoundTime[event] = now;
  const soundPath = getSoundFilePath(event, customPath);
  const normalizedVolume = normalizeVolume(volume);
  if (!soundPath) {
    return;
  }
  const os3 = platform2();
  try {
    switch (os3) {
      case "darwin":
        await playOnMac(soundPath, normalizedVolume);
        break;
      case "linux":
        await playOnLinux(soundPath, normalizedVolume);
        break;
      case "win32":
        await playOnWindows(soundPath);
        break;
      default:
        break;
    }
  } catch {}
}

// src/bell.ts
var lastBellTime = 0;
var BELL_DEBOUNCE_MS = 500;
function ringBell(now = Date.now()) {
  if (!process.stdout.isTTY) {
    return Promise.resolve();
  }
  if (now - lastBellTime < BELL_DEBOUNCE_MS) {
    return Promise.resolve();
  }
  lastBellTime = now;
  return new Promise((resolve) => {
    process.stdout.write("\x07", () => {
      resolve();
    });
  });
}

// src/command.ts
import { spawn as spawn3 } from "child_process";
function substituteTokens(value, event, message, sessionTitle, agentName, projectName, timestamp, turn) {
  let result = value.replaceAll("{event}", event).replaceAll("{message}", message);
  result = result.replaceAll("{sessionTitle}", sessionTitle || "");
  result = result.replaceAll("{agentName}", agentName || "");
  result = result.replaceAll("{projectName}", projectName || "");
  result = result.replaceAll("{timestamp}", timestamp || "");
  result = result.replaceAll("{turn}", turn != null ? String(turn) : "");
  return result;
}
function runCommand2(config, event, message, sessionTitle, agentName, projectName, timestamp, turn) {
  if (!config.command.enabled || !config.command.path) {
    return;
  }
  const args = (config.command.args ?? []).map((arg) => substituteTokens(arg, event, message, sessionTitle, agentName, projectName, timestamp, turn));
  const command = substituteTokens(config.command.path, event, message, sessionTitle, agentName, projectName, timestamp, turn);
  const proc = spawn3(command, args, {
    shell: false,
    stdio: "ignore",
    detached: true,
    windowsHide: true
  });
  proc.on("error", () => {});
  proc.unref();
}

// src/focus.ts
import { execFileSync, execSync } from "child_process";
import { accessSync, constants, mkdtempSync, readFileSync as readFileSync2, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { delimiter, join as join3 } from "path";
var LINUX_TERMINAL_APPS = new Set([
  "ghostty",
  "konsole",
  "gnome-terminal",
  "xterm",
  "urxvt",
  "alacritty",
  "kitty",
  "wezterm",
  "wezterm-gui",
  "tilix",
  "terminator",
  "xfce4-terminal",
  "lxterminal",
  "mate-terminal",
  "deepin-terminal",
  "foot",
  "footclient"
]);
var MAC_TERMINAL_APP_NAMES = new Set([
  "terminal",
  "iterm2",
  "ghostty",
  "wezterm-gui",
  "alacritty",
  "kitty",
  "hyper",
  "warp",
  "tabby",
  "cursor",
  "visual studio code",
  "code",
  "code insiders",
  "zed",
  "rio"
]);
function execWithTimeout(command, timeoutMs = 500) {
  try {
    return execSync(command, { timeout: timeoutMs, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}
function execFileWithTimeout(command, args, timeoutMs = 500) {
  try {
    return execFileSync(command, args, { timeout: timeoutMs, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true }).trim();
  } catch {
    return null;
  }
}
function isNumericWindowId(value) {
  return /^\d+$/.test(value);
}
function isSafeCompositorWindowId(value) {
  return /^[A-Za-z0-9._:-]+$/.test(value);
}
function firstNumericWindowId(output) {
  if (!output)
    return null;
  const value = output.split(/\s+/).find((part) => isNumericWindowId(part));
  return value ?? null;
}
function getHyprlandActiveWindowId() {
  const output = execWithTimeout("hyprctl activewindow -j");
  if (!output)
    return null;
  try {
    const data = JSON.parse(output);
    return typeof data?.address === "string" && isSafeCompositorWindowId(data.address) ? data.address : null;
  } catch {
    return null;
  }
}
function findFocusedWindowId(node) {
  if (node.focused === true && typeof node.id === "number") {
    return String(node.id);
  }
  if (Array.isArray(node.nodes)) {
    for (const child of node.nodes) {
      const id = findFocusedWindowId(child);
      if (id !== null)
        return id;
    }
  }
  if (Array.isArray(node.floating_nodes)) {
    for (const child of node.floating_nodes) {
      const id = findFocusedWindowId(child);
      if (id !== null)
        return id;
    }
  }
  return null;
}
function getSwayActiveWindowId() {
  const output = execWithTimeout("swaymsg -t get_tree", 1000);
  if (!output)
    return null;
  try {
    const tree = JSON.parse(output);
    return findFocusedWindowId(tree);
  } catch {
    return null;
  }
}
function getNiriActiveWindowId() {
  const output = execWithTimeout("niri msg --json focused-window", 1000);
  if (!output)
    return null;
  try {
    const data = JSON.parse(output);
    return typeof data?.id === "number" ? String(data.id) : null;
  } catch {
    return null;
  }
}
function parseWezTermFocusedPaneId(output) {
  try {
    const data = JSON.parse(output);
    if (!Array.isArray(data))
      return null;
    for (const client of data) {
      if (typeof client?.focused_pane_id === "number") {
        return String(client.focused_pane_id);
      }
    }
    return null;
  } catch {
    return null;
  }
}
function getLinuxWaylandActiveWindowId() {
  const env = process.env;
  if (env.HYPRLAND_INSTANCE_SIGNATURE)
    return getHyprlandActiveWindowId();
  if (env.NIRI_SOCKET)
    return getNiriActiveWindowId();
  if (env.SWAYSOCK)
    return getSwayActiveWindowId();
  if (env.KDE_SESSION_VERSION)
    return firstNumericWindowId(execWithTimeout("kdotool getactivewindow"));
  if (isGnomeLikeSession(env))
    return getGnomeAtspiActiveWindowKey();
  return null;
}
var ATSPI_ACTIVE_BIT_INDEX = 1;
var ATSPI_TERMINAL_PATH_MARKERS = ["mitchellh/ghostty"];
var ATSPI_TERMINAL_APP_ALIASES = new Set([
  "gnome-terminal-server"
]);
var GNOME_LIKE_DESKTOPS = new Set(["gnome", "ubuntu", "pop"]);
function isGnomeLikeSession(env = process.env) {
  const desktop = `${env.XDG_CURRENT_DESKTOP ?? ""} ${env.DESKTOP_SESSION ?? ""}`.toLowerCase();
  return desktop.split(/[:;\s]+/).some((token) => GNOME_LIKE_DESKTOPS.has(token));
}
function getLinuxFocusBackendName(env = process.env) {
  if (env.HYPRLAND_INSTANCE_SIGNATURE)
    return "hyprland";
  if (env.NIRI_SOCKET)
    return "niri";
  if (env.SWAYSOCK)
    return "sway";
  if (env.KDE_SESSION_VERSION)
    return "kde";
  if (isGnomeLikeSession(env))
    return "gnome-atspi";
  if (env.DISPLAY)
    return "x11";
  if (env.WAYLAND_DISPLAY)
    return "wayland-unsupported";
  return "none";
}
function parseAtspiString(output) {
  if (!output)
    return null;
  const match = output.match(/'((?:[^'\\]|\\.)*)'/);
  if (!match)
    return null;
  try {
    return JSON.parse(`"${match[1].replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`);
  } catch {
    return match[1];
  }
}
function parseAtspiObjectRefs(output) {
  if (!output)
    return [];
  const refs = [];
  const re = /\('([^']+)',\s*(?:objectpath\s+)?'([^']+)'\)/g;
  let match;
  while ((match = re.exec(output)) !== null) {
    refs.push({ bus: match[1], path: match[2] });
  }
  return refs;
}
function parseAtspiStateActive(output) {
  if (!output)
    return null;
  const match = output.match(/uint32\s+(\d+)/);
  if (!match)
    return null;
  const firstWord = Number(match[1]) >>> 0;
  return (firstWord >>> ATSPI_ACTIVE_BIT_INDEX & 1) === 1;
}
function isAtspiTerminalWindow(appName, windowPath) {
  if (ATSPI_TERMINAL_PATH_MARKERS.some((marker) => windowPath.toLowerCase().includes(marker))) {
    return true;
  }
  if (!appName)
    return false;
  const normalized = appName.trim().toLowerCase();
  return LINUX_TERMINAL_APPS.has(normalized) || ATSPI_TERMINAL_APP_ALIASES.has(normalized);
}
var ATSPI_ROLES = new Set(["window", "frame", "dialog"]);
function isAtspiWindowRoleAccepted(role) {
  return role !== null && ATSPI_ROLES.has(role);
}
function callAtspi(address, dest, path, method, args = [], timeoutMs = 500) {
  return execFileWithTimeout("gdbus", [
    "call",
    "--address",
    address,
    "--dest",
    dest,
    "--object-path",
    path,
    "--method",
    method,
    ...args
  ], timeoutMs);
}
var cachedAtspiAddress = null;
var ATSPI_ADDRESS_CACHE_TTL_MS = 1e4;
function getAtspiBusAddress() {
  const now = Date.now();
  if (cachedAtspiAddress && now - cachedAtspiAddress.at < ATSPI_ADDRESS_CACHE_TTL_MS) {
    return cachedAtspiAddress.address;
  }
  cachedAtspiAddress = null;
  const output = execFileWithTimeout("gdbus", [
    "call",
    "--session",
    "--dest",
    "org.a11y.Bus",
    "--object-path",
    "/org/a11y/bus",
    "--method",
    "org.a11y.Bus.GetAddress"
  ], 1000);
  const address = parseAtspiString(output);
  if (address) {
    cachedAtspiAddress = { address, at: now };
  }
  return address;
}
function getAtspiWindowRole(address, ref) {
  const output = callAtspi(address, ref.bus, ref.path, "org.a11y.atspi.Accessible.GetRoleName");
  return parseAtspiString(output);
}
function isAtspiWindowActive(address, ref) {
  const output = callAtspi(address, ref.bus, ref.path, "org.a11y.atspi.Accessible.GetState");
  return parseAtspiStateActive(output);
}
function getAtspiTerminalWindowRefs(address) {
  const refs = [];
  const rootOutput = callAtspi(address, "org.a11y.atspi.Registry", "/org/a11y/atspi/accessible/root", "org.a11y.atspi.Accessible.GetChildren", [], 1000);
  for (const app of parseAtspiObjectRefs(rootOutput)) {
    const appName = parseAtspiString(callAtspi(address, app.bus, "/org/a11y/atspi/accessible/root", "org.freedesktop.DBus.Properties.Get", ["org.a11y.atspi.Accessible", "Name"]));
    const childrenOutput = callAtspi(address, app.bus, app.path, "org.a11y.atspi.Accessible.GetChildren");
    for (const child of parseAtspiObjectRefs(childrenOutput)) {
      if (!isAtspiTerminalWindow(appName, child.path))
        continue;
      const role = getAtspiWindowRole(address, child)?.toLowerCase() ?? null;
      if (isAtspiWindowRoleAccepted(role)) {
        refs.push(child);
      }
    }
  }
  return refs;
}
function getGnomeAtspiActiveWindowKey() {
  try {
    const address = getAtspiBusAddress();
    if (!address)
      return null;
    for (const ref of getAtspiTerminalWindowRefs(address)) {
      if (isAtspiWindowActive(address, ref) === true) {
        return `atspi:${ref.bus}@${ref.path}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}
function debugFocusState(message) {
  if (process.env.OPENCODE_NOTIFIER_DEBUG) {
    console.error(`[opencode-notifier] ${message}`);
  }
}
var WINDOWS_TERMINAL_WINDOW_CLASSES = new Set([
  "cascadia_hosting_window_class",
  "consolewindowclass",
  "windowsterminalwindowclass"
]);
var WINDOWS_TERMINAL_PROCESS_NAMES = new Set([
  "windowsterminal",
  "windowsterminalpreview",
  "conhost",
  "alacritty",
  "wezterm",
  "wezterm-gui",
  "kitty",
  "hyper",
  "cursor",
  "code",
  "code - insiders"
]);
function getWindowsActiveWindowInfo() {
  const script = `
$p=Add-Type -Name NFI -Namespace OpenCodeNotifier -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetClassName(IntPtr h,System.Text.StringBuilder b,int n);[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);' -PassThru;
$h=$p::GetForegroundWindow();
if(!$h){return}
$sb=New-Object System.Text.StringBuilder 256;
$p::GetClassName($h,$sb,256)|Out-Null;
$c=$sb.ToString();
$procId=0;
$p::GetWindowThreadProcessId($h,[ref]$procId)|Out-Null;
$pn='';
try{$pn=(Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName}catch{}
Write-Output "$c|$pn"
`.trim().replace(/\n/g, "; ");
  let output = execFileWithTimeout("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], 5000);
  if (!output)
    output = execFileWithTimeout("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], 1000);
  if (!output)
    return null;
  const line = output.split(`
`).map((l) => l.trim()).find((l) => l.length > 0 && !l.startsWith("#<"));
  if (!line)
    return null;
  const sep = line.indexOf("|");
  if (sep === -1)
    return null;
  const className = line.substring(0, sep) || null;
  const processName = line.substring(sep + 1) || null;
  return { className, processName };
}
function getMacOSActiveWindowId() {
  return execWithTimeout(`osascript -e 'tell application "System Events" to return id of window 1 of (first application process whose frontmost is true)'`);
}
function getMacOSFrontmostAppName() {
  const lsappinfo = execWithTimeout(`lsappinfo info -only name \`lsappinfo front\` | sed 's/.*="\\([^"]*\\)".*/\\1/'`);
  if (lsappinfo)
    return lsappinfo;
  return execWithTimeout(`osascript -e 'tell application "System Events" to return name of first application process whose frontmost is true'`);
}
function normalizeMacAppName(value) {
  return value.trim().toLowerCase().replace(/\.app$/i, "").replace(/\s+/g, " ");
}
function getExpectedMacTerminalAppNames(env) {
  const expected = new Set;
  const termProgram = typeof env.TERM_PROGRAM === "string" ? normalizeMacAppName(env.TERM_PROGRAM) : "";
  if (env.TMUX && (termProgram === "tmux" || termProgram === "screen" || termProgram.length === 0)) {
    return new Set(MAC_TERMINAL_APP_NAMES);
  }
  if (termProgram === "apple_terminal") {
    expected.add("terminal");
  } else if (termProgram === "iterm" || termProgram === "iterm2") {
    expected.add("iterm2");
  } else if (termProgram === "vscode") {
    expected.add("visual studio code");
    expected.add("code");
    expected.add("code insiders");
  } else if (termProgram === "warpterminal") {
    expected.add("warp");
  } else if (termProgram === "wezterm") {
    expected.add("wezterm-gui");
  } else if (termProgram.length > 0) {
    expected.add(termProgram);
  }
  if (expected.size > 0) {
    return expected;
  }
  return new Set(MAC_TERMINAL_APP_NAMES);
}
function buildOsascriptActivateAppArgs(appName) {
  const escapedAppName = appName.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").replaceAll("\\", "\\\\").replaceAll('"', "\\\"");
  return [
    "-e",
    `tell application "${escapedAppName}" to activate`
  ];
}
function isMacTerminalAppFocused(frontmostAppName, env = process.env) {
  if (!frontmostAppName) {
    return false;
  }
  const normalizedFrontmost = normalizeMacAppName(frontmostAppName);
  if (!normalizedFrontmost) {
    return false;
  }
  const expectedApps = getExpectedMacTerminalAppNames(env);
  return expectedApps.has(normalizedFrontmost);
}
function getActiveWindowId() {
  const platform3 = process.platform;
  if (platform3 === "darwin")
    return getMacOSActiveWindowId();
  if (platform3 === "linux") {
    if (process.env.WAYLAND_DISPLAY)
      return getLinuxWaylandActiveWindowId();
    if (process.env.DISPLAY)
      return firstNumericWindowId(execWithTimeout("xdotool getactivewindow"));
    return null;
  }
  if (platform3 === "win32")
    return null;
  return null;
}
var cachedWindowId = getActiveWindowId();
var cachedWindowTitleValue;
function getCachedWindowTitle() {
  if (cachedWindowTitleValue !== undefined) {
    return cachedWindowTitleValue;
  }
  cachedWindowTitleValue = process.platform === "linux" && !!process.env.KDE_SESSION_VERSION && cachedWindowId ? getWindowTitleFromKdotool(cachedWindowId) : null;
  return cachedWindowTitleValue;
}
function isTmuxPaneFocused(tmuxPane, probeResult) {
  if (!tmuxPane)
    return false;
  if (!probeResult)
    return false;
  const [sessionAttached, windowActive, paneActive] = probeResult.split(" ");
  return Number(sessionAttached) > 0 && windowActive === "1" && paneActive === "1";
}
function isLinuxTerminalFocused(params) {
  const { cachedWindowId: cachedWindowId2, currentWindowId, wezTermPaneActive, tmuxPaneActive } = params;
  if (!cachedWindowId2) {
    if (!wezTermPaneActive)
      return false;
    if (tmuxPaneActive !== null)
      return tmuxPaneActive;
    return false;
  }
  if (currentWindowId !== cachedWindowId2)
    return false;
  if (!wezTermPaneActive)
    return false;
  if (tmuxPaneActive !== null)
    return tmuxPaneActive;
  return true;
}
function isWindowsTerminalFocused(params) {
  const { className, processName } = params;
  const classLower = className?.toLowerCase() ?? "";
  const processLower = processName?.toLowerCase() ?? "";
  return WINDOWS_TERMINAL_WINDOW_CLASSES.has(classLower) || WINDOWS_TERMINAL_PROCESS_NAMES.has(processLower);
}
function isTmuxPaneActive() {
  const tmuxPane = process.env.TMUX_PANE ?? null;
  const result = execFileWithTimeout("tmux", ["display-message", "-t", tmuxPane ?? "", "-p", "#{session_attached} #{window_active} #{pane_active}"]);
  return isTmuxPaneFocused(tmuxPane, result);
}
function isWezTermPaneActive() {
  const weztermPane = process.env.WEZTERM_PANE ?? null;
  if (!weztermPane)
    return true;
  const output = execFileWithTimeout("wezterm", ["cli", "list-clients", "--format", "json"], 1000);
  if (!output)
    return false;
  const focusedPaneId = parseWezTermFocusedPaneId(output);
  if (!focusedPaneId)
    return false;
  return focusedPaneId === weztermPane;
}
function isTerminalFocused() {
  try {
    if (process.platform === "darwin") {
      const frontmostAppName = getMacOSFrontmostAppName();
      if (!isMacTerminalAppFocused(frontmostAppName, process.env)) {
        return false;
      }
      if (!isWezTermPaneActive()) {
        return false;
      }
      if (process.env.TMUX) {
        return isTmuxPaneActive();
      }
      return true;
    }
    if (process.platform === "win32") {
      const info = getWindowsActiveWindowInfo();
      return isWindowsTerminalFocused({
        className: info?.className ?? null,
        processName: info?.processName ?? null
      });
    }
    const tmuxPaneActive = process.env.TMUX ? isTmuxPaneActive() : null;
    const currentWindowId = getActiveWindowId();
    const focused = isLinuxTerminalFocused({
      cachedWindowId,
      currentWindowId,
      wezTermPaneActive: isWezTermPaneActive(),
      tmuxPaneActive
    });
    debugFocusState(`linux focus: backend=${getLinuxFocusBackendName()} session=${process.env.XDG_SESSION_TYPE ?? "?"} desktop=${process.env.XDG_CURRENT_DESKTOP ?? process.env.DESKTOP_SESSION ?? "?"} cached=${cachedWindowId ?? "null"} current=${currentWindowId ?? "null"} tmux=${String(tmuxPaneActive)} focused=${focused}`);
    return focused;
  } catch {
    return false;
  }
}
function getWindowIdFromXdotool(searchTerm) {
  return firstNumericWindowId(execFileWithTimeout("xdotool", ["search", "--classname", searchTerm]));
}
function getWindowIdFromKdotool(searchTerm) {
  return firstNumericWindowId(execFileWithTimeout("kdotool", ["search", "--classname", searchTerm]));
}
function getWindowTitleFromKdotool(windowId) {
  if (!isNumericWindowId(windowId))
    return null;
  return execFileWithTimeout("kdotool", ["getwindowname", windowId]);
}
var cachedKDEJumpBackSupport = null;
function isKDEJumpBackSupported() {
  if (process.platform !== "linux" || !process.env.KDE_SESSION_VERSION) {
    return false;
  }
  if (cachedKDEJumpBackSupport !== null) {
    return cachedKDEJumpBackSupport;
  }
  cachedKDEJumpBackSupport = execFileWithTimeout("kdotool", ["--help"], 1000) !== null;
  return cachedKDEJumpBackSupport;
}
function getWindowClassX11(windowId) {
  if (!isNumericWindowId(windowId))
    return null;
  const output = execFileWithTimeout("xprop", ["-id", windowId, "WM_CLASS"]);
  if (!output)
    return null;
  const matches = [...output.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  return matches[1] ?? matches[0] ?? null;
}
function getWaylandAppId(windowId) {
  if (process.env.HYPRLAND_INSTANCE_SIGNATURE) {
    const output = execWithTimeout(`hyprctl clients -j`);
    if (!output)
      return null;
    try {
      const clients = JSON.parse(output);
      for (const client of clients) {
        if (String(client.address) === windowId) {
          return client.class?.toLowerCase() || client.initialClass?.toLowerCase() || null;
        }
      }
    } catch {
      return null;
    }
  }
  if (process.env.SWAYSOCK) {
    const output = execWithTimeout(`swaymsg -t get_tree`, 1000);
    if (!output)
      return null;
    try {
      const tree = JSON.parse(output);
      const findWindow = (node) => {
        if (String(node.id) === windowId) {
          return node.app_id?.toLowerCase() || node.window_properties?.class?.toLowerCase() || null;
        }
        if (Array.isArray(node.nodes)) {
          for (const child of node.nodes) {
            const result = findWindow(child);
            if (result)
              return result;
          }
        }
        if (Array.isArray(node.floating_nodes)) {
          for (const child of node.floating_nodes) {
            const result = findWindow(child);
            if (result)
              return result;
          }
        }
        return null;
      };
      return findWindow(tree);
    } catch {
      return null;
    }
  }
  if (process.env.NIRI_SOCKET) {
    const output = execWithTimeout(`niri msg --json windows`);
    if (!output)
      return null;
    try {
      const windows = JSON.parse(output);
      for (const window of windows) {
        if (String(window.id) === windowId) {
          return window.app_id?.toLowerCase() || null;
        }
      }
    } catch {
      return null;
    }
  }
  return null;
}
function getTerminalWindowId() {
  if (process.platform !== "linux")
    return null;
  const term = process.env.TERM_PROGRAM?.toLowerCase() || "";
  const desktopSession = process.env.DESKTOP_SESSION?.toLowerCase() || "";
  const isKDE = process.env.KDE_SESSION_VERSION || desktopSession.includes("plasma");
  if (process.env.WAYLAND_DISPLAY) {
    const cachedId = cachedWindowId;
    if (cachedId) {
      const appId = getWaylandAppId(cachedId);
      if (appId && LINUX_TERMINAL_APPS.has(appId)) {
        return cachedId;
      }
    }
    if (isKDE) {
      return cachedId || "kde-wayland";
    }
    return cachedId;
  }
  if (process.env.DISPLAY) {
    const cachedId = cachedWindowId;
    if (cachedId) {
      const windowClass = getWindowClassX11(cachedId);
      if (windowClass && LINUX_TERMINAL_APPS.has(windowClass.toLowerCase())) {
        return cachedId;
      }
    }
    for (const app of LINUX_TERMINAL_APPS) {
      const id = isKDE ? getWindowIdFromKdotool(app) : getWindowIdFromXdotool(app);
      if (id)
        return id;
    }
  }
  return null;
}
function focusLinuxWindowX11(windowId) {
  if (!isNumericWindowId(windowId))
    return;
  try {
    execFileSync("xdotool", ["windowactivate", windowId], { timeout: 1000, stdio: "ignore" });
  } catch {}
}
function findTerminalPid() {
  try {
    let currentPid = process.pid;
    while (currentPid > 1) {
      try {
        const statContent = readFileSync2(`/proc/${currentPid}/stat`, "utf-8");
        const match = statContent.match(/^\d+\s+\([^)]+\)\s+\S\s+(\d+)/);
        if (!match)
          break;
        const ppid = parseInt(match[1], 10);
        const cmdline = readFileSync2(`/proc/${ppid}/comm`, "utf-8").trim();
        if (cmdline.match(/ghostty|konsole|gnome-terminal|xterm|alacritty|kitty|wezterm|terminator|tilix|foot/i)) {
          return ppid;
        }
        currentPid = ppid;
      } catch {
        break;
      }
    }
    return process.ppid;
  } catch {
    return process.ppid;
  }
}
var cachedQdbusBinary;
var QDBUS_CANDIDATES = ["qdbus-qt6", "qdbus6", "qdbus-qt5", "qdbus5", "qdbus"];
function isExecutableOnPath(name) {
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir)
      continue;
    const full = join3(dir, name);
    try {
      accessSync(full, constants.X_OK);
      if (statSync(full).isFile())
        return true;
    } catch {}
  }
  return false;
}
function findQdbusBinary(candidates = QDBUS_CANDIDATES, isExecutable = isExecutableOnPath) {
  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return null;
}
function resolveQdbusBinary() {
  if (cachedQdbusBinary !== undefined) {
    return cachedQdbusBinary;
  }
  cachedQdbusBinary = findQdbusBinary();
  return cachedQdbusBinary;
}
function focusKDEWithKWinScript() {
  try {
    const pinnedWindowId = process.env.OPENCODE_NOTIFIER_WINDOW_ID?.trim() || null;
    if (pinnedWindowId && isNumericWindowId(pinnedWindowId)) {
      try {
        execFileSync("kdotool", ["windowactivate", pinnedWindowId], { timeout: 1500, stdio: "ignore" });
        return;
      } catch {}
    }
    if (cachedWindowId && isNumericWindowId(cachedWindowId)) {
      try {
        execFileSync("kdotool", ["windowactivate", cachedWindowId], { timeout: 1500, stdio: "ignore" });
        return;
      } catch {}
    }
    const terminalPid = findTerminalPid();
    const currentPid = process.pid;
    const termProgram = (process.env.TERM_PROGRAM || "terminal").toLowerCase();
    const cwd = process.cwd().toLowerCase();
    const cwdBase = cwd.split("/").filter(Boolean).pop() || "";
    const cachedTitle = (getCachedWindowTitle() || "").toLowerCase();
    const scriptContent = `
function activateTargetWindow(window) {
    // Jump to the window's desktop/activity first, then activate.
    // This works more reliably on Plasma than moving windows between desktops.
    try {
        if (window.desktops && window.desktops.length > 0) {
            workspace.currentDesktop = window.desktops[0];
        } else if (typeof window.desktop === "number" && window.desktop > 0) {
            workspace.currentDesktop = window.desktop;
        }
    } catch (e) {}

    try {
        if (window.activities && window.activities.length > 0 && typeof workspace.currentActivity !== "undefined") {
            workspace.currentActivity = window.activities[0];
        }
    } catch (e) {}

    try { window.minimized = false; } catch (e) {}

    try { workspace.activeWindow = window; } catch (e) {}
    try {
        if (typeof workspace.activateWindow === "function") {
            workspace.activateWindow(window);
        }
    } catch (e) {}
    try { window.active = true; } catch (e) {}

    // Nudge stacking so KWin treats this like an explicit user jump.
    try {
        window.keepAbove = true;
        window.keepAbove = false;
    } catch (e) {}
}

function isLikelyTerminal(window) {
    var resourceClass = (window.resourceClass || "").toLowerCase();
    var resourceName = (window.resourceName || "").toLowerCase();
    var caption = (window.caption || "").toLowerCase();

    return resourceClass.indexOf("ghostty") !== -1 ||
           resourceName.indexOf("ghostty") !== -1 ||
           caption.indexOf("ghostty") !== -1 ||
           resourceClass.indexOf("konsole") !== -1 ||
           resourceName.indexOf("konsole") !== -1 ||
           caption.indexOf("konsole") !== -1 ||
           resourceClass.indexOf("terminal") !== -1 ||
           resourceName.indexOf("terminal") !== -1;
}

function findAndActivateTerminal() {
    var allWindows = workspace.windowList();
    var terminalPid = ${terminalPid};
    var termProgramHint = ${JSON.stringify(termProgram)};
    var cwdHint = ${JSON.stringify(cwd)};
    var cwdBaseHint = ${JSON.stringify(cwdBase)};
    var cachedTitleHint = ${JSON.stringify(cachedTitle)};

    function contains(haystack, needle) {
        return !!needle && needle.length > 0 && haystack.indexOf(needle) !== -1;
    }

    function windowScore(window) {
        var resourceClass = (window.resourceClass || "").toLowerCase();
        var resourceName = (window.resourceName || "").toLowerCase();
        var caption = (window.caption || "").toLowerCase();
        var score = 0;

        if (window.pid === terminalPid) score += 30;
        if (contains(caption, "opencode")) score += 60;
        if (contains(caption, cachedTitleHint)) score += 50;
        if (contains(caption, cwdBaseHint)) score += 35;
        if (contains(caption, cwdHint)) score += 20;
        if (contains(resourceClass, termProgramHint) || contains(resourceName, termProgramHint) || contains(caption, termProgramHint)) score += 20;
        if (isLikelyTerminal(window)) score += 10;
        if (window.minimized === true) score -= 5;

        return score;
    }

    var bestWindow = null;
    var bestScore = -1;

    for (var i = 0; i < allWindows.length; i++) {
        var candidate = allWindows[i];
        var score = windowScore(candidate);
        if (score > bestScore) {
            bestWindow = candidate;
            bestScore = score;
        }
    }

    // Require enough confidence to avoid jumping to unrelated terminals.
    if (bestWindow && bestScore >= 30) {
        activateTargetWindow(bestWindow);
        return true;
    }

    return false;
}

findAndActivateTerminal();
`;
    const pluginName = `opencode-focus-${currentPid}`;
    let scriptDirectory = null;
    let scriptPath = null;
    let scriptLoaded = false;
    const cleanupScript = () => {
      if (!scriptPath || !scriptDirectory)
        return;
      try {
        rmSync(scriptPath, { force: true });
      } catch {}
      try {
        rmSync(scriptDirectory, { recursive: true, force: true });
      } catch {}
    };
    const qdbus = resolveQdbusBinary();
    if (!qdbus) {
      throw new Error("qdbus not found");
    }
    try {
      scriptDirectory = mkdtempSync(join3(tmpdir(), "opencode-focus-"));
      scriptPath = join3(scriptDirectory, "script.kwinscript");
      writeFileSync(scriptPath, scriptContent, { encoding: "utf-8", mode: 384, flag: "wx" });
      execFileSync(qdbus, ["org.kde.KWin", "/Scripting", "org.kde.kwin.Scripting.loadScript", scriptPath, pluginName], { encoding: "utf-8", timeout: 2000, stdio: "ignore" });
      scriptLoaded = true;
      execFileSync(qdbus, ["org.kde.KWin", "/Scripting", "org.kde.kwin.Scripting.start"], {
        timeout: 2000,
        stdio: "ignore"
      });
      cleanupScript();
      setTimeout(() => {
        try {
          execFileSync(qdbus, ["org.kde.KWin", "/Scripting", "org.kde.kwin.Scripting.unloadScript", pluginName], {
            timeout: 500,
            stdio: "ignore"
          });
        } catch {}
      }, 1000);
    } catch {
      if (scriptLoaded) {
        try {
          execFileSync(qdbus, ["org.kde.KWin", "/Scripting", "org.kde.kwin.Scripting.unloadScript", pluginName], {
            timeout: 500,
            stdio: "ignore"
          });
        } catch {}
      }
      cleanupScript();
      throw new Error("Unable to activate the terminal through KWin");
    }
  } catch {
    try {
      const cachedId = cachedWindowId;
      if (cachedId && isNumericWindowId(cachedId)) {
        execFileSync("xdotool", ["windowactivate", cachedId], { timeout: 1000, stdio: "ignore" });
      }
    } catch {}
  }
}
function focusLinuxWindowHyprland(windowId) {
  if (!isSafeCompositorWindowId(windowId))
    return;
  try {
    execFileSync("hyprctl", ["dispatch", "focuswindow", `address:${windowId}`], { timeout: 1000, stdio: "ignore" });
  } catch {}
}
function focusLinuxWindowSway(windowId) {
  if (!isNumericWindowId(windowId))
    return;
  try {
    execFileSync("swaymsg", [`[con_id=${windowId}] focus`], { timeout: 1000, stdio: "ignore" });
  } catch {}
}
function focusLinuxWindowNiri(windowId) {
  if (!isNumericWindowId(windowId))
    return;
  try {
    execFileSync("niri", ["msg", "action", "focus-window", "--id", windowId], { timeout: 1000, stdio: "ignore" });
  } catch {}
}
function captureStartupWindowId() {
  if (!isKDEJumpBackSupported()) {
    return;
  }
  const existing = process.env.OPENCODE_NOTIFIER_WINDOW_ID?.trim();
  if (existing) {
    return;
  }
  const detected = execWithTimeout("kdotool getactivewindow", 1000);
  if (detected && /^\d+$/.test(detected)) {
    process.env.OPENCODE_NOTIFIER_WINDOW_ID = detected;
  }
}
async function focusTerminal() {
  if (process.platform === "darwin") {
    try {
      const frontmostAppName = getMacOSFrontmostAppName();
      if (frontmostAppName && isMacTerminalAppFocused(frontmostAppName, process.env)) {
        return;
      }
      const expectedApps = getExpectedMacTerminalAppNames(process.env);
      for (const app of expectedApps) {
        try {
          execFileSync("osascript", buildOsascriptActivateAppArgs(app), { timeout: 1000, stdio: "ignore" });
          return;
        } catch {}
      }
      execFileSync("osascript", buildOsascriptActivateAppArgs("Terminal"), { timeout: 1000, stdio: "ignore" });
    } catch {}
    return;
  }
  if (process.platform === "linux") {
    const env = process.env;
    if (env.KDE_SESSION_VERSION) {
      focusKDEWithKWinScript();
      return;
    }
    const windowId = getTerminalWindowId();
    if (!windowId)
      return;
    if (env.HYPRLAND_INSTANCE_SIGNATURE) {
      focusLinuxWindowHyprland(windowId);
    } else if (env.SWAYSOCK) {
      focusLinuxWindowSway(windowId);
    } else if (env.NIRI_SOCKET) {
      focusLinuxWindowNiri(windowId);
    } else if (env.DISPLAY) {
      focusLinuxWindowX11(windowId);
    }
  }
}

// src/permission-dedupe.ts
var PERMISSION_DEDUPE_WINDOW_MS = 1000;
var sessionLastPermissionAt = new Map;
var globalLastPermissionAt = 0;
function shouldSuppressPermissionAlert(sessionID, now = Date.now()) {
  const sessionLastAt = sessionID ? sessionLastPermissionAt.get(sessionID) : undefined;
  const latestSeen = Math.max(globalLastPermissionAt, sessionLastAt ?? 0);
  const isDuplicate = latestSeen > 0 && now - latestSeen < PERMISSION_DEDUPE_WINDOW_MS;
  if (isDuplicate) {
    return true;
  }
  globalLastPermissionAt = now;
  if (sessionID) {
    sessionLastPermissionAt.set(sessionID, now);
  }
  return false;
}
function prunePermissionAlertState(cutoffMs) {
  for (const [sessionID, timestamp] of sessionLastPermissionAt) {
    if (timestamp < cutoffMs) {
      sessionLastPermissionAt.delete(sessionID);
    }
  }
  if (globalLastPermissionAt < cutoffMs) {
    globalLastPermissionAt = 0;
  }
}

// src/index.ts
var IDLE_COMPLETE_DELAY_MS = 350;
function isCLIClient(clientEnv) {
  return !clientEnv || clientEnv === "cli";
}
var pendingIdleTimers = new Map;
var sessionIdleSequence = new Map;
var sessionErrorSuppressionAt = new Map;
var sessionLastBusyAt = new Map;
var subagentSessionIds = new Set;
function asRecord(value) {
  return value !== null && typeof value === "object" ? value : null;
}
function getNestedRecord(root, ...path) {
  let current = root;
  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) {
      return null;
    }
    current = record[key];
  }
  return asRecord(current);
}
function getStringField(record, key) {
  if (!record) {
    return null;
  }
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
var globalTurnCount = null;
function loadTurnCount() {
  try {
    const content = readFileSync3(getStatePath(), "utf-8");
    const state = JSON.parse(content);
    if (typeof state.turn === "number" && Number.isFinite(state.turn) && state.turn >= 0) {
      return state.turn;
    }
  } catch {}
  return 0;
}
function saveTurnCount(count) {
  try {
    writeFileSync2(getStatePath(), JSON.stringify({ turn: count }));
  } catch {}
}
function incrementTurnCount() {
  if (globalTurnCount === null) {
    globalTurnCount = loadTurnCount();
  }
  globalTurnCount++;
  saveTurnCount(globalTurnCount);
  return globalTurnCount;
}
var cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [sessionID] of sessionIdleSequence) {
    if (!pendingIdleTimers.has(sessionID)) {
      sessionIdleSequence.delete(sessionID);
      subagentSessionIds.delete(sessionID);
    }
  }
  for (const [sessionID, timestamp] of sessionErrorSuppressionAt) {
    if (timestamp < cutoff) {
      sessionErrorSuppressionAt.delete(sessionID);
    }
  }
  for (const [sessionID, timestamp] of sessionLastBusyAt) {
    if (timestamp < cutoff) {
      sessionLastBusyAt.delete(sessionID);
    }
  }
  prunePermissionAlertState(cutoff);
}, 5 * 60 * 1000);
cleanupInterval.unref();
function getNotificationTitle(config, projectName) {
  if (config.showProjectName && projectName) {
    return `OpenCode (${projectName})`;
  }
  return "OpenCode";
}
function formatTimestamp() {
  const now = new Date;
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function extractAgentNameFromSessionTitle(sessionTitle) {
  if (typeof sessionTitle !== "string" || sessionTitle.length === 0) {
    return "";
  }
  const match = sessionTitle.match(/\s*\(@([^\s)]+)\s+subagent\)\s*$/);
  return match ? match[1] : "";
}
function shouldResolveAgentNameForEvent(config, eventType) {
  if (getMessage(config, eventType).includes("{agentName}")) {
    return true;
  }
  if (!config.command.enabled || !isEventCommandEnabled(config, eventType)) {
    return false;
  }
  if (config.command.path.includes("{agentName}")) {
    return true;
  }
  return (config.command.args ?? []).some((arg) => arg.includes("{agentName}"));
}
async function handleEvent(config, eventType, projectName, elapsedSeconds, sessionTitle, sessionID, agentName) {
  if (config.suppressWhenFocused && isTerminalFocused()) {
    return;
  }
  if ((eventType === "complete" || eventType === "subagent_complete") && typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds) && elapsedSeconds < config.minDuration) {
    return;
  }
  const promises = [];
  const timestamp = formatTimestamp();
  const turn = incrementTurnCount();
  const rawMessage = getMessage(config, eventType);
  const message = interpolateMessage(rawMessage, {
    sessionTitle: config.showSessionTitle ? sessionTitle : null,
    agentName,
    projectName,
    timestamp,
    turn
  });
  const notificationEnabled = isEventNotificationEnabled(config, eventType);
  if (notificationEnabled) {
    const title = getNotificationTitle(config, projectName);
    const iconPath = getIconPath(config);
    const onNotificationClick = isKDEJumpBackSupported() ? () => void focusTerminal() : undefined;
    promises.push(sendNotification(title, message, config.timeout, iconPath, config.notificationSystem, config.linux.grouping, onNotificationClick, config.windows.appID));
  }
  if (isEventSoundEnabled(config, eventType)) {
    const customSoundPath = getSoundPath(config, eventType);
    const ghosttyOnMac = process.platform === "darwin" && config.notificationSystem === "ghostty" && notificationEnabled && config.suppressGhosttySound;
    if (!ghosttyOnMac) {
      const soundVolume = getSoundVolume(config, eventType);
      promises.push(playSound(eventType, customSoundPath, soundVolume));
    }
  }
  if (isEventBellEnabled(config, eventType)) {
    promises.push(ringBell());
  }
  const minDuration = config.command?.minDuration;
  const shouldSkipCommand = !isEventCommandEnabled(config, eventType) || typeof minDuration === "number" && Number.isFinite(minDuration) && minDuration > 0 && typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds) && elapsedSeconds < minDuration;
  if (!shouldSkipCommand) {
    runCommand2(config, eventType, message, sessionTitle, agentName, projectName, timestamp, turn);
  }
  await Promise.allSettled(promises);
}
function getSessionIDFromEvent(event) {
  const properties = getNestedRecord(event, "properties");
  return getStringField(properties, "sessionID");
}
function getPermissionIDFromEvent(event) {
  const properties = getNestedRecord(event, "properties");
  const id = getStringField(properties, "id");
  if (id) {
    return id;
  }
  const request = getNestedRecord(event, "properties", "request");
  return getStringField(request, "id");
}
var PERMISSION_PENDING_GRACE_MS = 300;
async function isPermissionStillPending(client, permissionID) {
  try {
    const inner = client?._client || client?.session?._client;
    if (!inner || typeof inner.get !== "function") {
      return true;
    }
    const listResponse = await inner.get({ url: "/permission" });
    const body = listResponse?.data ?? listResponse;
    const pendingList = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : null;
    if (!pendingList) {
      return true;
    }
    return pendingList.some((p) => p?.id === permissionID);
  } catch {
    return true;
  }
}
function getSessionLifecycleInfo(event) {
  const info = getNestedRecord(event, "properties", "info");
  return {
    id: getStringField(info, "id"),
    title: getStringField(info, "title"),
    parentID: getStringField(info, "parentID")
  };
}
function getMessageUpdatedInfo(event) {
  const info = getNestedRecord(event, "properties", "info");
  return {
    role: getStringField(info, "role"),
    sessionID: getStringField(info, "sessionID")
  };
}
function clearPendingIdleTimer(sessionID) {
  const timer = pendingIdleTimers.get(sessionID);
  if (!timer) {
    return;
  }
  clearTimeout(timer);
  pendingIdleTimers.delete(sessionID);
}
function bumpSessionIdleSequence(sessionID) {
  const nextSequence = (sessionIdleSequence.get(sessionID) ?? 0) + 1;
  sessionIdleSequence.set(sessionID, nextSequence);
  return nextSequence;
}
function hasCurrentSessionIdleSequence(sessionID, sequence) {
  return sessionIdleSequence.get(sessionID) === sequence;
}
function markSessionError(sessionID) {
  if (!sessionID) {
    return;
  }
  sessionErrorSuppressionAt.set(sessionID, Date.now());
  bumpSessionIdleSequence(sessionID);
  clearPendingIdleTimer(sessionID);
}
function markSessionBusy(sessionID) {
  const now = Date.now();
  sessionLastBusyAt.set(sessionID, now);
  sessionErrorSuppressionAt.delete(sessionID);
  bumpSessionIdleSequence(sessionID);
  clearPendingIdleTimer(sessionID);
}
function shouldSuppressSessionIdle(sessionID, consume = true) {
  const errorAt = sessionErrorSuppressionAt.get(sessionID);
  if (errorAt === undefined) {
    return false;
  }
  const busyAt = sessionLastBusyAt.get(sessionID);
  if (typeof busyAt === "number" && busyAt > errorAt) {
    sessionErrorSuppressionAt.delete(sessionID);
    return false;
  }
  if (consume) {
    sessionErrorSuppressionAt.delete(sessionID);
  }
  return true;
}
async function getElapsedSinceLastPrompt(client, sessionID, nowMs = Date.now()) {
  try {
    const lastUserMessageTime = await client.lastUserMessageAt(sessionID);
    if (lastUserMessageTime !== null) {
      return (nowMs - lastUserMessageTime) / 1000;
    }
  } catch {}
  return null;
}
async function getSessionInfo(client, sessionID) {
  try {
    return await client.sessionInfo(sessionID);
  } catch {
    return { isChild: false, title: null, directory: null };
  }
}
async function processSessionIdle(client, config, projectName, sessionID, sequence, idleReceivedAtMs) {
  if (!hasCurrentSessionIdleSequence(sessionID, sequence)) {
    return;
  }
  if (shouldSuppressSessionIdle(sessionID)) {
    return;
  }
  if (subagentSessionIds.has(sessionID)) {
    await handleEventWithElapsedTime(client, config, "subagent_complete", projectName, sessionID, idleReceivedAtMs, null);
    return;
  }
  const sessionInfo = await getSessionInfo(client, sessionID);
  if (!hasCurrentSessionIdleSequence(sessionID, sequence)) {
    return;
  }
  if (shouldSuppressSessionIdle(sessionID)) {
    return;
  }
  if (!sessionInfo.isChild) {
    await handleEventWithElapsedTime(client, config, "complete", projectName, sessionID, idleReceivedAtMs, sessionInfo.title);
    return;
  }
  subagentSessionIds.add(sessionID);
  await handleEventWithElapsedTime(client, config, "subagent_complete", projectName, sessionID, idleReceivedAtMs, sessionInfo.title);
}
function scheduleSessionIdle(client, config, projectName, sessionID) {
  clearPendingIdleTimer(sessionID);
  const sequence = bumpSessionIdleSequence(sessionID);
  const idleReceivedAtMs = Date.now();
  const timer = setTimeout(() => {
    pendingIdleTimers.delete(sessionID);
    processSessionIdle(client, config, projectName, sessionID, sequence, idleReceivedAtMs).catch(() => {
      return;
    });
  }, IDLE_COMPLETE_DELAY_MS);
  pendingIdleTimers.set(sessionID, timer);
}
async function handleEventWithElapsedTime(client, config, eventType, projectName, sessionID, elapsedReferenceNowMs, preloadedSessionTitle) {
  const commandMinDuration = config.command?.minDuration;
  const shouldLookupElapsedForCommand = !!config.command?.enabled && typeof config.command?.path === "string" && config.command.path.length > 0 && typeof commandMinDuration === "number" && Number.isFinite(commandMinDuration) && commandMinDuration > 0;
  const shouldLookupElapsedForNotification = typeof config.minDuration === "number" && Number.isFinite(config.minDuration) && config.minDuration > 0;
  const shouldLookupElapsed = shouldLookupElapsedForCommand || shouldLookupElapsedForNotification;
  let elapsedSeconds = null;
  if (shouldLookupElapsed) {
    if (sessionID) {
      elapsedSeconds = await getElapsedSinceLastPrompt(client, sessionID, elapsedReferenceNowMs);
    }
  }
  let sessionTitle = preloadedSessionTitle ?? null;
  const shouldLookupSessionInfo = sessionID && !sessionTitle && (config.showSessionTitle || shouldResolveAgentNameForEvent(config, eventType));
  if (shouldLookupSessionInfo) {
    const info = await getSessionInfo(client, sessionID);
    sessionTitle = info.title;
  }
  const agentName = extractAgentNameFromSessionTitle(sessionTitle);
  await handleEvent(config, eventType, projectName, elapsedSeconds, sessionTitle, sessionID, agentName);
}
var SESSION_LOCATIONS = new Map;
var DEDUPE_WINDOW_MS = 5000;
function dedupePath() {
  return join4(tmpdir2(), "opencode-notifier-fired.json");
}
function claimFired(key, windowMs = DEDUPE_WINDOW_MS) {
  const now = Date.now();
  let table = {};
  try {
    const parsed = JSON.parse(readFileSync3(dedupePath(), "utf-8"));
    if (parsed !== null && typeof parsed === "object")
      table = parsed;
  } catch {
    table = {};
  }
  const last = table[key];
  if (typeof last === "number" && now - last < windowMs)
    return false;
  table[key] = now;
  for (const [k, ts] of Object.entries(table)) {
    if (typeof ts !== "number" || now - ts > 60000)
      delete table[k];
  }
  try {
    writeFileSync2(dedupePath(), JSON.stringify(table));
  } catch {}
  return true;
}
function projectNameFor(directory) {
  if (!directory)
    return null;
  return loadConfig().showFullPath ? directory : basename(directory);
}
function dedupeKey(event) {
  const sessionID = "sessionID" in event ? event.sessionID ?? "global" : "global";
  return `${event.type}:${sessionID}`;
}
function createNotifierRuntime(client, directory, clientEnv) {
  captureStartupWindowId();
  if (clientEnv && clientEnv !== "cli") {
    const config = loadConfig();
    if (!config.enableOnDesktop)
      return null;
  }
  const getConfig = () => loadConfig();
  const isCLI = isCLIClient(clientEnv);
  const instanceProjectName = projectNameFor(directory);
  const rememberLocation = (sessionID, locationDirectory) => {
    if (sessionID && locationDirectory)
      SESSION_LOCATIONS.set(sessionID, locationDirectory);
  };
  const resolveProjectName = async (sessionID) => {
    if (!sessionID)
      return instanceProjectName;
    const known = SESSION_LOCATIONS.get(sessionID);
    if (known)
      return projectNameFor(known);
    try {
      const info = await client.sessionInfo(sessionID);
      if (info.directory) {
        SESSION_LOCATIONS.set(sessionID, info.directory);
        return projectNameFor(info.directory);
      }
    } catch {}
    return instanceProjectName;
  };
  if (isCLI) {
    handleEvent(getConfig(), "client_connected", instanceProjectName, null);
  } else {
    setTimeout(() => {
      handleEvent(getConfig(), "client_connected", instanceProjectName, null);
    }, 100);
  }
  const dispatch = async (event) => {
    const config = getConfig();
    if (!claimFired(dedupeKey(event)))
      return;
    if (event.type === "session.created") {
      rememberLocation(event.sessionID, event.directory ?? null);
    }
    const sessionID = "sessionID" in event ? event.sessionID : null;
    const projectName = await resolveProjectName(sessionID ?? null);
    switch (event.type) {
      case "session.created": {
        if (event.parentID && event.sessionID) {
          subagentSessionIds.add(event.sessionID);
        } else {
          await handleEvent(config, "session_started", projectName, null, event.title, event.sessionID, null);
        }
        return;
      }
      case "session.updated": {
        if (event.parentID && event.sessionID) {
          subagentSessionIds.add(event.sessionID);
        }
        return;
      }
      case "session.deleted": {
        if (event.sessionID) {
          subagentSessionIds.delete(event.sessionID);
        }
        return;
      }
      case "permission.asked": {
        const { sessionID: sessionID2, permissionID } = event;
        let stillPending = true;
        if (permissionID) {
          await new Promise((resolve) => setTimeout(resolve, PERMISSION_PENDING_GRACE_MS));
          stillPending = await client.permissionPending(sessionID2, permissionID);
        }
        if (stillPending && !shouldSuppressPermissionAlert(sessionID2)) {
          await handleEventWithElapsedTime(client, config, "permission", projectName, sessionID2);
        }
        return;
      }
      case "permission.ask": {
        if (!shouldSuppressPermissionAlert(null)) {
          await handleEvent(config, "permission", projectName, null);
        }
        return;
      }
      case "session.idle": {
        const sessionID2 = event.sessionID;
        if (sessionID2) {
          if (isCLI) {
            const idleReceivedAtMs = Date.now();
            const sequence = bumpSessionIdleSequence(sessionID2);
            await processSessionIdle(client, config, projectName, sessionID2, sequence, idleReceivedAtMs);
          } else {
            scheduleSessionIdle(client, config, projectName, sessionID2);
          }
        } else {
          await handleEventWithElapsedTime(client, config, "complete", projectName, null);
        }
        return;
      }
      case "session.busy": {
        markSessionBusy(event.sessionID);
        return;
      }
      case "session.error": {
        markSessionError(event.sessionID);
        const eventType = event.userCancelled ? "user_cancelled" : "error";
        let sessionTitle = null;
        if (event.sessionID && config.showSessionTitle) {
          const info = await getSessionInfo(client, event.sessionID);
          sessionTitle = info.title;
        }
        await handleEventWithElapsedTime(client, config, eventType, projectName, event.sessionID, undefined, sessionTitle);
        return;
      }
      case "message.user": {
        const sessionID2 = event.sessionID;
        if (!sessionID2 || !subagentSessionIds.has(sessionID2)) {
          await handleEvent(config, "user_message", projectName, null, null, sessionID2, null);
        }
        return;
      }
      case "tool.before": {
        if (event.tool === "question") {
          await handleEvent(config, "question", projectName, null);
        }
        if (event.tool === "plan_exit") {
          await handleEvent(config, "plan_exit", projectName, null);
        }
        return;
      }
    }
  };
  return { dispatch };
}
function normalizeV1Event(event) {
  const events = [];
  const type = getStringField(asRecord(event), "type");
  if (type === "session.created") {
    const info = getSessionLifecycleInfo(event);
    events.push({ type: "session.created", sessionID: info.id, parentID: info.parentID, title: info.title });
  }
  if (type === "session.updated") {
    const info = getSessionLifecycleInfo(event);
    events.push({ type: "session.updated", sessionID: info.id, parentID: info.parentID });
  }
  if (type === "session.deleted") {
    const info = getSessionLifecycleInfo(event);
    events.push({ type: "session.deleted", sessionID: info.id });
  }
  if (type === "permission.asked") {
    events.push({
      type: "permission.asked",
      sessionID: getSessionIDFromEvent(event),
      permissionID: getPermissionIDFromEvent(event)
    });
  }
  if (type === "session.idle") {
    events.push({ type: "session.idle", sessionID: getSessionIDFromEvent(event) });
  }
  if (type === "session.status") {
    const status = getNestedRecord(event, "properties", "status");
    const sessionID = getStringField(getNestedRecord(event, "properties"), "sessionID");
    if (getStringField(status, "type") === "busy" && sessionID) {
      events.push({ type: "session.busy", sessionID });
    }
  }
  if (type === "session.error") {
    const error = getNestedRecord(event, "properties", "error");
    events.push({
      type: "session.error",
      sessionID: getSessionIDFromEvent(event),
      userCancelled: getStringField(error, "name") === "MessageAbortedError"
    });
  }
  if (type === "message.updated") {
    const info = getMessageUpdatedInfo(event);
    if (info.role === "user") {
      events.push({ type: "message.user", sessionID: info.sessionID });
    }
  }
  return events;
}
function normalizeV2Event(event) {
  const events = [];
  const record = asRecord(event);
  const type = getStringField(record, "type");
  const data = getNestedRecord(event, "data") ?? {};
  if (type === "session.created") {
    events.push({
      type: "session.created",
      sessionID: getStringField(data, "sessionID"),
      parentID: getStringField(data, "parentID"),
      title: getStringField(data, "title"),
      directory: getStringField(getNestedRecord(data, "location"), "directory")
    });
  }
  if (type === "session.deleted") {
    events.push({ type: "session.deleted", sessionID: getStringField(data, "sessionID") });
  }
  if (type === "permission.asked") {
    events.push({
      type: "permission.asked",
      sessionID: getStringField(data, "sessionID"),
      permissionID: getStringField(data, "id")
    });
  }
  if (type === "session.execution.started") {
    const sessionID = getStringField(data, "sessionID");
    if (sessionID) {
      events.push({ type: "session.busy", sessionID });
    }
  }
  if (type === "session.execution.succeeded") {
    events.push({ type: "session.idle", sessionID: getStringField(data, "sessionID") });
  }
  if (type === "session.execution.failed") {
    events.push({ type: "session.error", sessionID: getStringField(data, "sessionID"), userCancelled: false });
  }
  if (type === "session.execution.interrupted") {
    const reason = getStringField(data, "reason");
    if (reason === "user" || reason === "inactivity") {
      events.push({
        type: "session.error",
        sessionID: getStringField(data, "sessionID"),
        userCancelled: reason === "user"
      });
    }
  }
  if (type === "session.inbox.enqueued") {
    const item = getNestedRecord(event, "data", "item");
    if (getStringField(item, "type") === "user") {
      events.push({ type: "message.user", sessionID: getStringField(data, "sessionID") });
    }
  }
  return events;
}
function createV1SessionClient(client) {
  return {
    async lastUserMessageAt(sessionID) {
      const response = await client.session.messages({ path: { id: sessionID } });
      const messages = response.data ?? [];
      let lastUserMessageTime = null;
      for (const msg of messages) {
        const info = msg.info;
        if (info.role === "user" && typeof info.time?.created === "number") {
          if (lastUserMessageTime === null || info.time.created > lastUserMessageTime) {
            lastUserMessageTime = info.time.created;
          }
        }
      }
      return lastUserMessageTime;
    },
    async sessionInfo(sessionID) {
      const response = await client.session.get({ path: { id: sessionID } });
      return {
        isChild: !!response.data?.parentID,
        title: typeof response.data?.title === "string" ? response.data.title : null,
        directory: null
      };
    },
    permissionPending(_sessionID, permissionID) {
      return isPermissionStillPending(client, permissionID);
    }
  };
}
function createV2SessionClient(ctx) {
  return {
    async lastUserMessageAt(sessionID) {
      const messages = await ctx.session.context({ sessionID });
      let lastUserMessageTime = null;
      for (const msg of messages ?? []) {
        if (msg.type === "user" && typeof msg.time?.created === "number") {
          if (lastUserMessageTime === null || msg.time.created > lastUserMessageTime) {
            lastUserMessageTime = msg.time.created;
          }
        }
      }
      return lastUserMessageTime;
    },
    async sessionInfo(sessionID) {
      const info = await ctx.session.get({ sessionID });
      return {
        isChild: !!info?.parentID,
        title: typeof info?.title === "string" ? info.title : null,
        directory: typeof info?.location?.directory === "string" ? info.location.directory : null
      };
    },
    async permissionPending(sessionID, permissionID) {
      if (!sessionID)
        return true;
      try {
        const pending = await ctx.permission.list({ sessionID });
        if (!Array.isArray(pending))
          return true;
        return pending.some((p) => p?.id === permissionID);
      } catch {
        return true;
      }
    }
  };
}
var NotifierPlugin = async ({ client, directory }) => {
  const runtime = createNotifierRuntime(createV1SessionClient(client), directory ?? null, process.env.OPENCODE_CLIENT);
  if (!runtime)
    return {};
  return {
    event: async ({ event }) => {
      for (const normalized of normalizeV1Event(event)) {
        await runtime.dispatch(normalized);
      }
    },
    "permission.ask": async () => {
      await runtime.dispatch({ type: "permission.ask" });
    },
    "tool.execute.before": async (input) => {
      await runtime.dispatch({ type: "tool.before", tool: input.tool });
    }
  };
};
function isV2Context(ctx) {
  const record = asRecord(ctx);
  return typeof asRecord(record?.event)?.subscribe === "function" && typeof asRecord(record?.tool)?.hook === "function" && typeof asRecord(record?.session)?.get === "function";
}
var NotifierPluginV2 = {
  id: "opencode-notifier",
  async setup(ctx) {
    if (!isV2Context(ctx))
      return;
    const runtime = createNotifierRuntime(createV2SessionClient(ctx), ctx.location?.directory ?? null, process.env.OPENCODE_CLIENT);
    if (!runtime)
      return;
    const controller = new AbortController;
    (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          for (const normalized of normalizeV2Event(event)) {
            await runtime.dispatch(normalized);
          }
        }
      } catch {}
    })();
    await ctx.tool.hook("execute.before", (event) => {
      runtime.dispatch({ type: "tool.before", tool: event.tool });
    });
    return () => controller.abort();
  }
};
var pluginModule = {
  id: "opencode-notifier",
  setup: NotifierPluginV2.setup,
  server: NotifierPlugin
};
var src_default = pluginModule;
export {
  NotifierPlugin,
  NotifierPluginV2,
  PERMISSION_PENDING_GRACE_MS,
  src_default as default,
  extractAgentNameFromSessionTitle,
  getPermissionIDFromEvent,
  isCLIClient,
  isPermissionStillPending,
  isV2Context,
  normalizeV1Event,
  normalizeV2Event
};
