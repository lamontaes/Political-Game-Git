/* global process */
/**
 * The desktop app keeps its life across quit and reopen
 * (core-played-game-saves-and-continues, part 3). The play server's host
 * (play-api-host.mjs) is started as the app starts it, a life is begun and
 * played two days, the host is stopped as quitting the app stops it, and a
 * new host started on the same save folder offers that life on the title and
 * loads it to the same player, day and card. The host runs the bench's
 * handler from source (tsx) in place of the packaged bundle.
 */
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { utilityFork } from "../play-api-client.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const HOST = path.join(here, "..", "play-api-host.mjs");
const HANDLER = path.join(here, "..", "..", "src", "bench", "handler.ts");
// Pinned (pinned-tests): this seed draws Opal, Wyoming.
const SEED = "save-continue-1";

/** A play-api root whose bundle is the bench's handler from source. */
function sourceRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "ocd-play-api-src-"));
  writeFileSync(
    path.join(root, "play-api.mjs"),
    `export * from ${JSON.stringify(pathToFileURL(HANDLER).href)};\n`,
  );
  return root;
}

/** One host process, as the app forks it, with a request function. */
function startHost(root, saveDir) {
  const child = fork(HOST, [], {
    execArgv: ["--import", "tsx"],
    env: { ...process.env, OCD_PLAY_API_ROOT: root, OCD_SAVE_DIR: saveDir },
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
  const ask = async (method, pathAndQuery) => {
    const id = next++;
    const reply = await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.send({ id, method, url: `http://bench${pathAndQuery}` });
    });
    const body = JSON.parse(String(reply.body));
    assert.ok(
      reply.status < 400,
      `${method} ${pathAndQuery}: ${String(reply.body).slice(0, 300)}`,
    );
    return body;
  };
  /** Quit: the app stops the host, which saves the life first. */
  const quit = () =>
    new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill("SIGTERM");
    });
  return { ask, quit };
}

test("the app's play server is given the app's save folder", () => {
  const forks = [];
  const fake = {
    fork: (hostPath, args, options) => {
      forks.push(options);
      return { postMessage() {}, on() {}, kill() {} };
    },
  };
  utilityFork(fake, { saveDir: () => "/user-data/saves" })("host", "/root");
  assert.equal(forks[0].env.OCD_SAVE_DIR, "/user-data/saves");
});

test(
  `a life survives quitting and reopening the app, seed ${SEED}`,
  {
    // 45 s alone and 33 s beside the other desktop tests (Nov 15): twice the slower.
    timeout: 90_000,
  },
  async () => {
    const root = sourceRoot();
    const saveDir = mkdtempSync(path.join(tmpdir(), "ocd-app-saves-"));
    const first = startHost(root, saveDir);
    await first.ask("POST", `/api/newlife?seed=${SEED}`);
    for (let day = 0; day < 2; day += 1) {
      const { packet } = await first.ask("POST", "/api/advance?mode=day");
      if (
        packet?.pauseId &&
        packet.kind !== "complete" &&
        packet.kind !== "choice"
      )
        await first.ask(
          "POST",
          `/api/resume?pauseId=${encodeURIComponent(packet.pauseId)}`,
        );
    }
    const played = (await first.ask("GET", "/api/title")).life;
    const card = await first.ask(
      "GET",
      `/api/card?id=${encodeURIComponent(played.personId)}`,
    );
    await first.quit();
    assert.equal(readdirSync(saveDir).length, 1, "one save file for the life");

    const second = startHost(root, saveDir);
    try {
      const title = await second.ask("GET", "/api/title");
      assert.deepEqual(
        [title.life.personId, title.life.date, title.life.playing],
        [played.personId, played.date, false],
      );
      assert.deepEqual(
        title.saves.map((life) => life.saveId),
        [title.life.saveId],
      );
      const loaded = await second.ask(
        "POST",
        `/api/load?save=${encodeURIComponent(title.life.saveId)}`,
      );
      assert.deepEqual(
        [loaded.personId, loaded.date],
        [played.personId, played.date],
      );
      assert.deepEqual(
        await second.ask(
          "GET",
          `/api/card?id=${encodeURIComponent(played.personId)}`,
        ),
        card,
        "the player's card is the same after reopening",
      );
    } finally {
      await second.quit();
    }
  },
);
