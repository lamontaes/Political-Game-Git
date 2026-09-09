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
let port = Number(process.env.PG_PORT ?? process.env.PLAYWRIGHT_PORT ?? 5173);
let host = "127.0.0.1";
let seed = process.env.PG_SEED ?? "dev-lab2-review";
const forwardedArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === "--seed") {
    if (!rawArgs[i + 1]) throw new Error("--seed requires a value");
    seed = rawArgs[++i];
    continue;
  }
  if (arg.startsWith("--seed=")) {
    seed = arg.slice(7);
    continue;
  }
  if (arg === "--port") {
    if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith("-")) {
      i++;
      port = Number(rawArgs[i]);
    }
    continue;
  }
  if (arg.startsWith("--port=")) {
    port = Number(arg.slice("--port=".length));
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

if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid server port");

if (!["127.0.0.1", "localhost", "::1"].includes(host))
  throw new Error("Local review provenance requires a loopback host");

console.log("POLITICAL GAME DEV SERVER\n");
console.log(`Workspace: ${process.cwd()}`);
console.log(`Branch: ${runCmd("git branch --show-current")}`);
console.log(`Commit: ${runCmd("git rev-parse HEAD")}`);
console.log(`Host: ${host}`);
console.log(`Requested Port: ${port}`);
console.log(`Launcher PID: ${process.pid}\n`);
console.log(
  `Review: http://${host}:${port}/review.html?seed=${encodeURIComponent(seed)}`,
);
console.log(`Identity: http://${host}:${port}/__dev/identity`);

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
    env: { ...process.env, PG_LOCAL_REVIEW: "1" },
  });
} else {
  throw new Error(
    "Vite is not installed. Install dependencies before launching.",
  );
}

console.log(
  `Owned Vite PID: ${child.pid}; workspace: ${process.cwd()}; port: ${port}`,
);

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
        if (child.exitCode === null && child.signalCode === null) {
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
