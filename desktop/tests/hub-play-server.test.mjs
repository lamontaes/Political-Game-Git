/* global process, URL */
/**
 * The hub answers New game: its play view's /api requests reach the same
 * play server the packaged game runs (play-api-host.mjs through
 * play-api-client.mjs), not a "Not found" page. This starts that worker on a
 * bundled play server, exactly as the hub does for a staged build, and asks it
 * for a new life.
 */
import assert from "node:assert/strict";
import { fork, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createPlayApi } from "../play-api-client.mjs";

const desktopRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root = path.join(desktopRoot, "staged", "play-api");

function nodeFork(hostPath, playRoot) {
  const child = fork(hostPath, [], {
    env: { ...process.env, OCD_PLAY_API_ROOT: playRoot },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  return {
    send: (message) => child.send(message),
    on: (event, listener) => child.on(event, listener),
    kill: () => child.kill(),
  };
}

test(
  "the hub's main-game view gets a new life from its play server",
  {
    timeout: 300_000,
  },
  async () => {
    if (!existsSync(path.join(root, "play-api.mjs"))) {
      const built = spawnSync(
        process.execPath,
        [path.join(desktopRoot, "scripts", "build-play-api.mjs")],
        { cwd: path.dirname(desktopRoot), stdio: "inherit" },
      );
      assert.equal(built.status, 0, "the play server bundles");
    }
    const playApi = createPlayApi({ root, fork: nodeFork });
    try {
      const reply = await playApi(
        "POST",
        new URL("app://game/api/newlife?seed=hub-smoke&date=2026-01-01"),
      );
      assert.equal(reply.status, 200, String(reply.body).slice(0, 300));
      JSON.parse(String(reply.body));
    } finally {
      playApi.stop();
    }
  },
);

test("the hub hands its play views' requests to the shared play server", () => {
  const hub = readFileSync(
    path.join(desktopRoot, "private-controller", "main.mjs"),
    "utf8",
  );
  assert.match(hub, /from "\.\.\/play-api-client\.mjs"/);
  assert.match(
    hub,
    /serveAppRequest\(root, request, playApis\.get\(id\)\?\.api\)/,
  );
  const worker = readFileSync(
    path.join(desktopRoot, "private-controller", "private-update-worker.mjs"),
    "utf8",
  );
  assert.match(worker, /playApiDir: path\.join\(stagedRoot, "play-api"\)/);
});
