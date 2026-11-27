/**
 * A town opens with one business of each kind its workers fill, and its
 * businesses after that are the ones the founding engine opens where the
 * town's own demand outgrows what one business serves (owner, Nov 17:
 * "Stop pegging things to real numbers. Everything comes from the
 * simulation."). Played in three places drawn from all 56 on a seed nobody
 * chose (NATION_SEED replays), a year each: at the opening no kind has a
 * count dealt from a table or the county's real establishments, and after
 * the year the towns' mixes differ for their own reasons (record ids of the
 * foundings named).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { TOWN_WORKPLACE_BY_KEY } from "./town-workplaces";
import type { CoreState } from "./types";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 3;

/** The town's open businesses by kind, from the books. */
function mix(core: CoreState, placeId: string) {
  const counts = new Map<string, number>();
  for (const [id, book] of core.finance.businesses) {
    if (book.closedAt || core.organizations.get(id)?.placeId !== placeId)
      continue;
    counts.set(book.kindId, (counts.get(book.kindId) ?? 0) + 1);
  }
  return counts;
}

describe(`a town's businesses come from its own demand (seed ${seed})`, () => {
  it(
    "opens with one business of a kind and founds more where demand outgrows it",
    { timeout: 1_800_000 },
    () => {
      const ends: string[] = [];
      let founded = 0;
      for (let at = 0; at < DRAWS; at += 1) {
        const place = drawPlace(`${seed}:${at}`, "town-businesses");
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const core = world.core;
        const town = core.people.get(core.playerId!)!.placeId;
        const opening = mix(core, town);
        // Every kind of workplace the opening deals is one organization.
        for (const workplace of TOWN_WORKPLACE_BY_KEY.values()) {
          const dealt = [...core.organizations.values()].filter(
            (org) =>
              org.placeId === town &&
              org.classification === workplace.classification,
          );
          expect(
            dealt.length,
            `${place.name} (${place.key}), seed ${place.seed}: ${workplace.key} opened with ${dealt.length}, dealt rather than founded`,
          ).toBeLessThanOrEqual(1);
        }
        advanceCore(core, addDays(makeIsoDate(core.date), 365));
        const after = mix(core, town);
        const added = [...after].filter(
          ([kind, count]) => count > (opening.get(kind) ?? 0),
        );
        founded += added.length;
        ends.push(
          `${place.name} (${place.key}), seed ${place.seed}: ${JSON.stringify(Object.fromEntries([...after].sort()))}`,
        );
      }
      process.stdout.write(
        `town businesses after a year: ${ends.join("; ")}\n`,
      );
      expect(founded, "some kind was founded past its first").toBeGreaterThan(
        0,
      );
      expect(
        new Set(ends.map((row) => row.split(": ")[1])).size,
      ).toBeGreaterThan(1);
    },
  );
});
