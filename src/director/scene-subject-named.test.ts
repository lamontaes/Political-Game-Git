import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";

// A scene that stages the person as a participant cites a record that names
// them in that role, and each kind is checked on its own: a filing scene only
// for the candidate the filing record names, a race-lost scene only for a
// person the result names who is not its winner, a hearing scene only for a
// speaker the public comment record names. A person who only heard of it
// through a tie has no such scene. Places are drawn in turn (bounded) until
// one has all three kinds in a year; every full resident is watched.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const KINDS = ["filing", "race-lost", "public-hearing"] as const;
const RECORD: Record<(typeof KINDS)[number], string> = {
  filing: "candidate-filed",
  "race-lost": "election-result",
  "public-hearing": "public-comment",
};
const ATTEMPTS = 6;

it(`filing, race-lost and hearing scenes are each staged only for the person their record names (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < ATTEMPTS; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "scene-subject-named");
    const label = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    for (const person of core.people.values())
      if (person.alive && person.id.startsWith("person_"))
        director.watch(core, person.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const seen: Record<string, string[]> = {
      filing: [],
      "race-lost": [],
      "public-hearing": [],
    };
    for (const [personId, book] of director.ledger.people)
      for (const entry of book.schedule)
        for (const bound of entry.bindings) {
          const kind = KINDS.find((k) => k === bound.typeKey);
          if (!kind) continue;
          const moment = book.momentsById.get(entry.momentId)!;
          const record = core.durableLog.get(moment.causeId);
          const where = `${label}, ${personId}, ${kind}, ${moment.causeId}`;
          expect(record?.kind, where).toBe(RECORD[kind]);
          expect(record?.personIds, where).toContain(personId);
          if (kind === "race-lost")
            expect(record?.facts?.winnerId, where).not.toBe(personId);
          seen[kind]!.push(`${personId}@${moment.causeId}`);
        }
    const missing = KINDS.filter((k) => !seen[k]!.length);
    if (!missing.length) {
      for (const k of KINDS)
        expect(seen[k]!.length, `${label}, ${k}`).toBeGreaterThan(0);
      return;
    }
    tried.push(`${label} lacks ${missing.join("+")}`);
  }
  throw new Error(
    `no place had a filing, race-lost and hearing scene in a year: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
