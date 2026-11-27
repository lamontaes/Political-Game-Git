/* global process */
/**
 * Dev mode is part of the installed game (owner, Nov 26: "dev mode is a part of the game... It just has
 * different permissions"). The play server is bundled as the app bundles it (scripts/build-play-api.mjs)
 * and its host (play-api-host.mjs) is started as the app starts it, with developer routes off. Dev mode's
 * routes then answer only after the page has told the server the in-game setting is on; its views are in
 * the bundle; a control's body reaches its route; and what dev mode writes goes in the saves folder and
 * is not mistaken for a life.
 */
import assert from "node:assert/strict";
import { fork, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.join(here, "..");
const HOST = path.join(desktop, "play-api-host.mjs");
const BUNDLE_ROOT = path.join(desktop, "staged", "play-api");
const VIEWS = path.join(desktop, "..", "src", "bench", "dev-views");
const UI = path.join(desktop, "..", "src", "bench", "ui");
// Pinned (pinned-tests): a fixed seed only so the two runs of this test are the same town.
const SEED = "dev-mode-installed-1";

function startHost(saveDir) {
  const child = fork(HOST, [], {
    env: {
      ...process.env,
      OCD_PLAY_API_ROOT: BUNDLE_ROOT,
      OCD_SAVE_DIR: saveDir,
    },
    stdio: ["ignore", "ignore", "inherit", "ipc"],
  });
  const pending = new Map();
  let next = 0;
  child.on("message", ({ id, reply, error }) => {
    const waiting = pending.get(id);
    pending.delete(id);
    if (error !== undefined) waiting?.reject(new Error(error));
    else waiting?.resolve(reply);
  });
  /** One request, as app-protocol.mjs sends it: the method, the URL and a POST's body. */
  const ask = async (method, pathAndQuery, input) => {
    const id = next++;
    const reply = await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.send({
        id,
        method,
        url: `http://bench${pathAndQuery}`,
        body: input === undefined ? "" : JSON.stringify(input),
      });
    });
    return { status: reply.status, value: JSON.parse(String(reply.body)) };
  };
  const quit = () =>
    new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill("SIGTERM");
    });
  return { ask, quit };
}

test(
  `dev mode answers in the packaged play server once the setting is on, seed ${SEED}`,
  { timeout: 180_000 },
  async () => {
    const built = spawnSync(
      process.execPath,
      [path.join(desktop, "scripts", "build-play-api.mjs")],
      { encoding: "utf8" },
    );
    assert.equal(built.status, 0, built.stderr);
    const saveDir = mkdtempSync(path.join(tmpdir(), "ocd-dev-saves-"));
    const host = startHost(saveDir);
    try {
      // Off until the setting is on: the installed game is a game first.
      const refused = await host.ask("GET", "/api/dev/views");
      assert.equal(refused.status, 403);
      assert.match(refused.value.error, /dev mode/i);

      assert.deepEqual((await host.ask("POST", "/api/devmode?on=1")).value, {
        on: true,
      });

      // Every view in the folder is in the bundle, and each one's page part is a file the client carries.
      const views = await host.ask("GET", "/api/dev/views");
      assert.equal(views.status, 200);
      const files = readdirSync(VIEWS).filter(
        (file) => /^[a-z-]+\.ts$/.test(file) && !file.endsWith(".test.ts"),
      );
      const named = views.value.map((view) => view.name);
      for (const file of files) {
        const name = file.replace(/\.ts$/, "");
        const hasPart = /client:/.test(
          readFileSync(path.join(VIEWS, file), "utf8"),
        );
        if (hasPart)
          assert.ok(named.includes(name), `${name} is in the bundle's views`);
      }
      for (const view of views.value)
        assert.ok(existsSync(path.join(UI, view.client)), view.client);

      // A town, then a control with a body: the date moves one day through dev mode's own advance.
      assert.equal(
        (await host.ask("POST", `/api/newlife?seed=${SEED}`)).status,
        200,
      );
      const before = (await host.ask("GET", "/api/dev/state")).value;
      const advanced = await host.ask("POST", "/api/dev/advance", {
        step: "day",
      });
      assert.equal(advanced.status, 200, JSON.stringify(advanced.value));
      const after = (await host.ask("GET", "/api/dev/state")).value;
      assert.notEqual(after.date, before.date, "the control's body reached it");

      // What dev mode writes goes in the saves folder's dev-mode folder, which the title never lists as a life.
      const proof = await host.ask("POST", "/api/dev/proof/save", {});
      assert.equal(proof.status, 200, JSON.stringify(proof.value));
      assert.deepEqual(readdirSync(path.join(saveDir, "dev-mode", "proofs")), [
        proof.value.name,
      ]);
      const compared = await host.ask(
        "GET",
        `/api/dev/proof/compare?name=${encodeURIComponent(proof.value.name)}`,
      );
      assert.equal(compared.value.same, true);
      assert.equal(
        (await host.ask("GET", "/api/dev/proof/compare?name=../../x")).status,
        400,
      );
      const title = (await host.ask("GET", "/api/title")).value;
      assert.equal(title.saves.length, 1, "one life, not the proofs folder");

      // Off again: the routes close, the world is untouched.
      await host.ask("POST", "/api/devmode?on=0");
      assert.equal((await host.ask("GET", "/api/dev/state")).status, 403);

      // The developer's build route is still not the installed game's.
      assert.equal((await host.ask("POST", "/api/build")).status, 404);
    } finally {
      await host.quit();
    }
  },
);
