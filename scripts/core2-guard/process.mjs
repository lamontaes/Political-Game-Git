/* global process, setTimeout, clearTimeout */
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import policies from "./policies.json" with { type: "json" };

/** Bound command time and captured output; kill the entire POSIX command group. */
export function runCommand(command, { cwd, env = {}, milliseconds }) {
  if (!(milliseconds > 0))
    return Promise.resolve({
      code: null,
      timedOut: true,
      milliseconds: 0,
      output: "Deadline exhausted",
    });
  return new Promise((resolve) => {
    const started = performance.now();
    let output = "",
      timedOut = false,
      settled = false;
    const child =
      typeof command === "string"
        ? spawn(command, {
            cwd,
            env: { ...process.env, ...env },
            shell: true,
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
          })
        : spawn(command[0], command.slice(1), {
            cwd,
            env: { ...process.env, ...env },
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
          });
    const capture = (chunk) => {
      output = (output + chunk.toString()).slice(-policies.logBytes);
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") capture(String(error));
      }
    }, milliseconds);
    const finish = (code, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code,
        timedOut,
        milliseconds: performance.now() - started,
        output,
        ...(error ? { error: String(error) } : {}),
      });
    };
    child.on("error", (error) => finish(null, error));
    child.on("close", (code) => finish(code));
  });
}
