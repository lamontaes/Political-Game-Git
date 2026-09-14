/* global process */
import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import {
  spawnOwnedCommand,
  stopOwnedCommand,
} from "../private-controller/owned-process.mjs";

test("cancellation refuses arbitrary PID objects or unowned workers", () => {
  let called = false;
  assert.equal(stopOwnedCommand(null), false);
  assert.equal(
    stopOwnedCommand({
      pid: process.pid,
      kill: () => {
        called = true;
      },
    }),
    false,
  );
  assert.equal(called, false);
});

test("cancellation settles only a controlled owned Node process group with SIGTERM", async () => {
  const child = spawnOwnedCommand(
    process.execPath,
    ["-e", "process.stdout.write('ready\\n'); setInterval(() => {}, 1000);"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const closed = once(child, "close");
  await once(child.stdout, "data");
  assert.equal(stopOwnedCommand(child), true);
  const [code, signal] = await closed;
  assert.equal(code, null);
  assert.equal(signal, "SIGTERM");
  assert.equal(stopOwnedCommand(child), false);
});
