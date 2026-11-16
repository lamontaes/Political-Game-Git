/**
 * After a restart the title offers the saved life, and loading it returns the
 * same day, player and household (core-played-game-saves-and-continues,
 * part 2). A life is started through the bench's own request, played a few
 * days with a counted person's card opened (which fills them in); the bench
 * is emptied as a restart leaves it; the title's Continue and Saved games
 * name that life from its save; POST /api/load replays it, and the world's
 * snapshot matches the played one field by field. The life is played as the
 * desktop app plays it, with developer routes off, and once presses one (a
 * town build, refused and recorded): the load replays with the setting the
 * loading request has, so the developer route stays refused.
 */
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { countedResidents } from "../core2/electorate";
import { snapshotWorld } from "../core2/snapshot";
import { benchRequest, benchWorld, emptyBench } from "./handler";

// Pinned (pinned-tests): this seed draws Opal, Wyoming. Alone the test takes
// about 37 seconds and 56 beside the other save tests (the world is built
// twice: played, then loaded).
const SEED = "save-continue-1";
const DAYS = 4;

// The installed game's setting (desktop/play-api-host.mjs): developer routes off.
const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: false,
  });
  expect(
    reply.status,
    `${method} ${path}: ${String(reply.body).slice(0, 300)}`,
  ).toBeLessThan(400);
  return JSON.parse(String(reply.body)) as Record<string, unknown>;
};

/** A day forward, as the player takes it: a pause the day stops on is stopped, as the Stop control does. */
const day = async () => {
  const packet = (await ask("POST", "/api/advance?mode=day")).packet as
    { kind?: string; pauseId?: string } | undefined;
  if (packet?.pauseId && packet.kind !== "complete" && packet.kind !== "choice")
    await ask(
      "POST",
      `/api/resume?pauseId=${encodeURIComponent(packet.pauseId)}`,
    );
};

/** The world's snapshot as a hash of each part, so a difference is named. */
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const parts = () => {
  const snap = snapshotWorld(benchWorld().core!) as unknown as {
    date: string;
    world: {
      core: Record<string, unknown>;
      modules: [string, unknown][];
      parts: unknown;
    };
  };
  const out = new Map<string, string>([["date", snap.date]]);
  for (const [key, value] of Object.entries(snap.world.core))
    out.set(`core.${key}`, hash(JSON.stringify(value)));
  for (const [id, store] of snap.world.modules)
    out.set(`module.${id}`, hash(JSON.stringify(store)));
  out.set("parts", hash(JSON.stringify(snap.world.parts)));
  return out;
};

/** The player and their household by person record id. */
const household = () => {
  const { core, player } = benchWorld();
  const me = core!.people.get(player!.personId!)!;
  return [...core!.people.values()]
    .filter((person) => person.householdId === me.householdId)
    .map((person) => person.id)
    .sort();
};

interface TitleLife {
  saveId: string;
  playing: boolean;
  personId: string;
  name: string;
  date: string;
  placeName: string;
}

it(`after a restart, Continue and Saved games load the same life, seed ${SEED}`, async () => {
  process.env.OCD_SAVE_DIR = mkdtempSync(join(tmpdir(), "save-continue-"));
  await ask("POST", `/api/newlife?seed=${SEED}`);
  for (let n = 0; n < DAYS; n += 1) await day();
  // A counted person's card fills them in: a read that changes the world.
  const core = benchWorld().core!;
  const counted = countedResidents(core).find(
    (voter) => !core.people.has(voter.id),
  );
  expect(counted, "a counted resident to open").toBeTruthy();
  await ask("GET", `/api/card?id=${counted!.id}`);
  // A developer route, refused in the installed game: recorded, never run.
  const refused = await benchRequest(
    "POST",
    new URL(`/api/build?seed=${SEED}-other`, "http://bench"),
    { developer: false },
  );
  expect(refused.status, "a developer route is refused").toBe(404);
  await day();
  const played = parts();
  const date = core.date;
  const personId = benchWorld().player!.personId!;
  const home = household();

  // A restart: the server holds nothing; the save is on disk.
  emptyBench();
  const title = (await ask("GET", "/api/title")) as unknown as {
    life: TitleLife | null;
    saves: TitleLife[];
  };
  expect(title.life?.personId, "Continue is the saved player").toBe(personId);
  expect(title.life?.date).toBe(date);
  expect(title.life?.playing, "not in play until loaded").toBe(false);
  expect(title.life?.name.trim()).not.toBe("");
  expect(
    title.saves.map((life) => [life.saveId, life.personId, life.date]),
    "Saved games lists the one life",
  ).toEqual([[title.life!.saveId, personId, date]]);

  const started = performance.now();
  const loaded = (await ask(
    "POST",
    `/api/load?save=${encodeURIComponent(title.life!.saveId)}`,
  )) as unknown as TitleLife;
  const seconds = (performance.now() - started) / 1000;
  expect([loaded.personId, loaded.date]).toEqual([personId, date]);
  expect(household(), "the same household by person id").toEqual(home);
  const again = parts();
  expect(
    [...new Set([...played.keys(), ...again.keys()])].filter(
      (key) => played.get(key) !== again.get(key),
    ),
    "fields that differ after loading",
  ).toEqual([]);

  // Loaded, the title continues it in play, and the save is still one file.
  const after = (await ask("GET", "/api/title")) as unknown as {
    life: TitleLife;
    saves: TitleLife[];
  };
  expect([after.life.playing, after.life.saveId]).toEqual([
    true,
    title.life!.saveId,
  ]);
  expect(after.saves.length).toBe(1);
  process.stdout.write(
    `save-continue seed ${SEED} (${loaded.placeName}): ${DAYS + 1} days played to ${date}, household ${home.length}, loaded in ${seconds.toFixed(1)} s.\n`,
  );
}, 120_000);
