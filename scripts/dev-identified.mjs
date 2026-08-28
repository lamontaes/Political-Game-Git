/* global console, process, setTimeout, clearTimeout, URL */
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function runCmd(cmd) {
  try {
    return execSync(cmd, {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "unavailable";
  }
}

function resolveViteBin() {
  try {
    const vitePkgUrl = import.meta.resolve("vite");
    const binPath = fileURLToPath(new URL("../../bin/vite.js", vitePkgUrl));
    if (fs.existsSync(binPath)) {
      return binPath;
    }
  } catch {
    // Fallback to local node_modules path
  }
  const localBin = path.resolve(
    process.cwd(),
    "node_modules",
    "vite",
    "bin",
    "vite.js",
  );
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  return null;
}

const rawArgs = process.argv.slice(2);
let port = 5173;
let host = "127.0.0.1";
const forwardedArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === "--port") {
    if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith("-")) {
      i++;
      port = parseInt(rawArgs[i], 10) || 5173;
    }
    continue;
  }
  if (arg.startsWith("--port=")) {
    port = parseInt(arg.slice("--port=".length), 10) || 5173;
    continue;
  }
  if (arg === "--host") {
    if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith("-")) {
      i++;
      host = rawArgs[i];
    } else {
      host = "0.0.0.0";
    }
    continue;
  }
  if (arg.startsWith("--host=")) {
    host = arg.slice("--host=".length);
    continue;
  }
  if (arg === "--strictPort") {
    continue;
  }
  forwardedArgs.push(arg);
}

console.log("POLITICAL GAME DEV SERVER\n");
console.log(`Workspace: ${process.cwd()}`);
console.log(`Branch: ${runCmd("git branch --show-current")}`);
console.log(`Commit: ${runCmd("git rev-parse HEAD")}`);
console.log(`Host: ${host}`);
console.log(`Requested Port: ${port}`);
console.log(`Launcher PID: ${process.pid}\n`);

const viteArgs = [
  "--host",
  host,
  "--port",
  port.toString(),
  "--strictPort",
  ...forwardedArgs,
];

const viteBin = resolveViteBin();
let child;
if (viteBin) {
  child = spawn(process.execPath, [viteBin, ...viteArgs], {
    stdio: "inherit",
  });
} else {
  child = spawn("npx", ["vite", ...viteArgs], {
    stdio: "inherit",
  });
}

let isShuttingDown = false;
let killEscalationTimer = null;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (child && !child.killed) {
    try {
      child.kill(signal);
    } catch {
      // Child may have already exited
    }

    killEscalationTimer = setTimeout(() => {
      try {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      } catch {
        // ignore
      }
      process.exit(1);
    }, 5000);
    killEscalationTimer.unref();
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("exit", () => {
  if (child && !child.killed) {
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
  }
});

child.on("error", (err) => {
  console.error("Failed to start Vite dev server:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (killEscalationTimer) {
    clearTimeout(killEscalationTimer);
  }
  if (signal === "SIGINT") {
    process.exit(130);
  } else if (signal === "SIGTERM") {
    process.exit(143);
  } else {
    process.exit(code ?? 0);
  }
});
