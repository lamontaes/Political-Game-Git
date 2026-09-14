/* global process */
import { spawn } from "node:child_process";

const owned = new WeakSet();

export function spawnOwnedCommand(command, args, options = {}) {
  const child = spawn(command, args, { ...options, detached: true });
  owned.add(child);
  child.once("close", () => owned.delete(child));
  return child;
}

/** Cancellation reaches only this worker's freshly spawned process group.
 * No PID/name/port input is accepted from the renderer, and no other worker
 * is discovered or shut down. SIGTERM refusal is not replaced by force-kill. */
export function stopOwnedCommand(child) {
  if (!child || !owned.has(child) || !child.pid) return false;
  try {
    process.kill(-child.pid, "SIGTERM");
    return true;
  } catch {
    return child.kill("SIGTERM");
  }
}
