import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";

// A scene that stages the person as a participant (a candidate filing, a loser,
// a speaker at a hearing) cites a record that names them. A person who only
// heard of it through a tie has no such scene. Places are drawn in turn until
// one has such scenes in a year; every full resident is watched.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const PARTICIPANT = new Set(["filing", "race-lost", "public-hearing"]);

it(`filing, race-lost and hearing scenes are staged only for people the record names (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 4; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "scene-subject-named");
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
    let seen = 0;
    for (const [personId, book] of director.ledger.people)
      for (const entry of book.schedule)
        for (const bound of entry.bindings) {
          if (!PARTICIPANT.has(bound.typeKey)) continue;
          seen += 1;
          const moment = book.momentsById.get(entry.momentId)!;
          expect(
            core.durableLog.get(moment.causeId)?.personIds,
            `${place.name}, seed ${seed}:${life}, ${personId}, ${bound.typeKey}, ${moment.causeId}`,
          ).toContain(personId);
        }
    if (seen) return;
    tried.push(place.name);
  }
  throw new Error(
    `no participant scene in a year in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
