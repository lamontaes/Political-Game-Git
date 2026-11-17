/**
 * A party stands a nominee in a state or federal race the town doesn't vote in
 * where its chance of taking the seat covers what standing one costs, so a
 * seat one side cannot realistically win is the other's uncontested and a
 * competitive seat draws both (CTO Nov 17, 12:47Z on #9747; History's family 9c
 * plan). In the played world, in places drawn from all 56 (NATION_SEED
 * replays): after the first general election, every counted outside race has a
 * major party's votes exactly where that party's chance covers its cost, and
 * across the places some races were uncontested and some drawn by both. Places
 * with no counted outside races are named and passed over.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { partyFieldsNominee } from "./modules/candidacy";
import { racesOf } from "./modules/voting";
import { coreAPI } from "./state";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");
// A month before the general election, played to ten days after it.
const OPENING = "2026-10-12";
const AFTER_ELECTION = makeIsoDate("2026-11-13");
const DRAWS = 8;
const WANT_PLACES = 3;

describe(`parties stand nominees where their chance covers the cost (seed ${seed})`, () => {
  it(
    "leaves a lopsided seat uncontested and draws both sides to a close one",
    { timeout: 3_600_000 },
    () => {
      setBookkeeping(false);
      const passed: string[] = [];
      let checked = 0;
      let oneSided = 0;
      let twoSided = 0;
      for (let at = 0; at < DRAWS && checked < WANT_PLACES; at += 1) {
        const place = drawPlace(`${seed}:${at}`, "outside-races-field");
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        let world: ReturnType<typeof buildBenchWorld>;
        try {
          world = buildBenchWorld(place.seed, OPENING, {
            twoLevel: true,
            placeKey: place.key,
          });
        } catch (error) {
          if ((error as Error).name !== "NoPlayerHereError") throw error;
          passed.push(`${where}: no one to play`);
          continue;
        }
        const { core } = world;
        const api = coreAPI(core);
        advanceCore(core, AFTER_ELECTION);
        const counted = racesOf(api).filter(
          (race) => race.votes && race.date >= "2026-11-01",
        );
        if (!counted.length) {
          passed.push(`${where}: no counted outside race`);
          continue;
        }
        checked += 1;
        for (const race of counted) {
          const { republican, democratic } = race.votes!;
          const right = partyFieldsNominee(api, 1, race.lean);
          const left = partyFieldsNominee(api, -1, race.lean);
          if (right || left) {
            expect(
              republican > 0,
              `${where}: ${race.id} (lean ${race.lean}) right votes`,
            ).toBe(right);
            expect(
              democratic > 0,
              `${where}: ${race.id} (lean ${race.lean}) left votes`,
            ).toBe(left);
          }
          if (republican > 0 && democratic > 0) twoSided += 1;
          else oneSided += 1;
        }
      }
      if (checked < WANT_PLACES)
        throw new Error(
          `only ${checked} of ${WANT_PLACES} drawn places had counted outside races (seed ${seed}); passed over: ${passed.join("; ")}`,
        );
      expect(oneSided, "races left to one side").toBeGreaterThan(0);
      expect(twoSided, "races drawing both sides").toBeGreaterThan(0);
    },
  );
});
