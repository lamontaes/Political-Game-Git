/**
 * The played life is saved through saves.ts and replays into the same world
 * (core-played-game-saves-and-continues, part 1). A drawn life is started
 * through the bench's own request, played a few days, and a counted person's
 * card opened (which fills them in); the save written on advance is read
 * back, the bench is emptied, the save replayed, and the replayed world's
 * snapshot matches the played one field by field. A save whose version is
 * changed by hand still replays and says what it was made under.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { countedResidents } from "../core2/electorate";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { snapshotWorld } from "../core2/snapshot";
import type { SaveV1 } from "../core2/saves";
import { benchRequest, benchWorld, lifeSavePath, replayLife } from "./handler";

const seed = process.env.BENCH_SEED ?? randomUUID();
const DAYS = Number(process.env.SAVE_LIFE_DAYS ?? 4);

let made = 0;
const ask = async (method: string, path: string) => {
  made += 1;
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  expect(
    reply.status,
    `${method} ${path}: ${String(reply.body).slice(0, 300)}`,
  ).toBeLessThan(400);
  return reply;
};

/** A day forward, as the player takes it: a pause the day stops on is stopped, as the Stop control does. */
const day = async () => {
  const reply = await ask("POST", "/api/advance?mode=day");
  const packet = (
    JSON.parse(String(reply.body)) as {
      packet?: { kind?: string; pauseId?: string };
    }
  ).packet;
  if (packet?.pauseId && packet.kind !== "complete" && packet.kind !== "choice")
    await ask(
      "POST",
      `/api/resume?pauseId=${encodeURIComponent(packet.pauseId)}`,
    );
};

/** The world's snapshot as a hash of each part, so a difference is named. */
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const parts = () => {
  const core = benchWorld().core!;
  const snap = snapshotWorld(core) as unknown as {
    date: string;
    world: {
      core: Record<string, unknown>;
      modules: [string, unknown][];
      parts: unknown;
    };
  };
  const out = new Map<string, string>();
  out.set("date", snap.date);
  for (const [key, value] of Object.entries(snap.world.core))
    out.set(`core.${key}`, hash(JSON.stringify(value)));
  for (const [id, store] of snap.world.modules)
    out.set(`module.${id}`, hash(JSON.stringify(store)));
  out.set("parts", hash(JSON.stringify(snap.world.parts)));
  return out;
};

const differing = (a: Map<string, string>, b: Map<string, string>) =>
  [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k));

it(`a played life saves and replays into the same world, seed ${seed}`, async () => {
  process.env.OCD_SAVE_PATH = join(
    mkdtempSync(join(tmpdir(), "save-life-")),
    "life.json",
  );
  await ask("POST", `/api/newlife?seed=${seed}`);
  const placeId = `${corePlaceByJurisdictionId(benchWorld().placeId as never)?.displayName ?? "?"} (${benchWorld().placeId})`;
  for (let n = 0; n < DAYS; n += 1) await day();
  // A counted person's card fills them in: a read that changes the world.
  const core = benchWorld().core!;
  const counted = countedResidents(core).find(
    (voter) => !core.people.has(voter.id),
  );
  expect(counted, `a counted resident to open, in ${placeId}`).toBeTruthy();
  await ask("GET", `/api/card?id=${counted!.id}`);
  await day();
  const played = parts();
  const save = JSON.parse(readFileSync(lifeSavePath(), "utf8")) as SaveV1;
  expect(save.commands.length, "the save holds the life's requests").toBe(made);
  expect(
    save.commands.some((c) =>
      (c.payload as { url: string }).url.startsWith("/api/card"),
    ),
    "the card that filled someone in is recorded",
  ).toBe(true);
  expect(
    save.snapshot,
    "no snapshot: the save is its requests",
  ).toBeUndefined();

  const replayed = await replayLife(save);
  expect(replayed.skipped).toEqual([]);
  expect(replayed.upgradedFrom).toBeUndefined();
  const again = parts();
  expect(
    differing(played, again),
    `fields that differ after replay, seed ${seed}`,
  ).toEqual([]);

  // A save made under another version still replays, and says so.
  const older = { ...save, coreApiVersion: "0.0.0-older" };
  const upgraded = await replayLife(older);
  expect(upgraded.upgradedFrom).toBe("0.0.0-older");
  expect(upgraded.skipped).toEqual([]);
  expect(differing(played, parts())).toEqual([]);
  process.stdout.write(
    `save-life seed ${seed} (${placeId}): ${save.commands.length} requests saved (${JSON.stringify(save).length} bytes), replayed with ${played.size} fields equal; a save marked 0.0.0-older replayed with upgradedFrom set.\n`,
  );
}, 1_800_000);
