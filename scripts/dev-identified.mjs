/* global console, process */
import { execSync, spawn } from "child_process";

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

const args = process.argv.slice(2);
let port = 5173;
let host = "127.0.0.1";

const portIdx = args.findIndex((a) => a === "--port");
if (portIdx !== -1 && args[portIdx + 1]) {
  port = parseInt(args[portIdx + 1], 10) || 5173;
}
const hostIdx = args.findIndex((a) => a === "--host");
if (hostIdx !== -1 && args[hostIdx + 1]) {
  host = args[hostIdx + 1];
}

console.log("POLITICAL GAME DEV SERVER\n");
console.log(`Workspace: ${process.cwd()}`);
console.log(`Branch: ${runCmd("git branch --show-current")}`);
console.log(`Commit: ${runCmd("git rev-parse HEAD")}`);
console.log(`Host: ${host}`);
console.log(`Requested Port: ${port}`);
console.log(`Launcher PID: ${process.pid}\n`);

const viteArgs = [
  "vite",
  "--host",
  host,
  "--port",
  port.toString(),
  "--strictPort",
];

// Forward any additional arguments that are not --host or --port (and their values)
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--host" || arg === "--port") {
    i++; // skip the value too
    continue;
  }
  viteArgs.push(arg);
}

const child = spawn("npx", viteArgs, { stdio: "inherit" });

child.on("error", (err) => {
  console.error("Failed to start Vite dev server:", err);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
