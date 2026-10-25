/**
 * Pool item core-moves-caps-and-minimum-age-as-cause. The moves engine reads
 * no cap or cutoff: who decides alone is the place's age of majority, a
 * relative in town or closeness to kin elsewhere counts a little less than
 * the one before but never stops counting, and what a home costs pushes
 * against the household's income and its own cash net of its debts. A
 * one-year played world in a place drawn from all 56; set GOLDEN_PATH_SEED
 * to reproduce the draw.
 */
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  MOVES_PARAMETERS,
  departuresSeen,
  holdsOf,
  pushesOf,
  watchDepartures,
} from "./modules/moves";
import { coreAPI } from "./state";
import type { CoreState, PersonId, PersonState } from "./types";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const YEAR_DAYS = 365;
const DRAWS = 6;
const GONE = ["movesMinimumAge", "movesKinHoldCap", "movesHousingCostShareCap"];
/** Older than any place's age of majority in the research table. */
const GROWN = 22;
/** One draw's budget: building and playing a year of a drawn town. */
const DRAW_MS = 600_000;

it("reads no cap or cutoff parameter", () => {
  const source = readFileSync(
    new URL("./modules/moves.ts", import.meta.url),
    "utf8",
  );
  for (const key of GONE) {
    expect(MOVES_PARAMETERS[key], key).toBeUndefined();
    expect(source.includes(key), key).toBe(false);
  }
});

/** Grown relatives of a person living in town: older than any place's age of majority, so the kin hold counts each one. */
function grownRelativesInTown(
  core: CoreState,
  person: PersonState,
): PersonId[] {
  return [...person.familyIds]
    .filter((id) => {
      const other = core.people.get(id);
      return (
        other?.alive &&
        other.placeId === person.placeId &&
        ageOnDate(other.birthDate, core.date) >= GROWN
      );
    })
    .sort();
}

/** Whether a household has no open job and no income award among its members. */
function noIncome(core: CoreState, householdId: string): boolean {
  return (core.households.get(householdId)?.memberIds ?? []).every((id) => {
    const person = core.people.get(id);
    const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
    const awards = [
      ...(core.finance.incomeContractsByPerson.get(id) ?? []),
    ].some((row) => !core.finance.contracts.get(row)?.endedAt);
    return !(job && job.endsAt === undefined) && !awards;
  });
}

it(
  `kin holds slide with every relative, and a household with no income is pushed by its own records, in a played year (base ${base})`,
  () => {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const seed = createHash("sha256").update(`${base}:${draw}`).digest("hex");
      const place = drawPlace(seed, "moves-causes");
      const where = `${place.name} (${place.key}), seed ${place.seed}, base ${base}`;
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      watchDepartures(core);
      advanceCore(core, addDays(makeIsoDate(core.date), YEAR_DAYS));
      const api = coreAPI(core);
      const living = [...core.people.values()]
        .filter((p) => p.alive)
        .sort((a, b) => a.id.localeCompare(b.id));
      // Someone with five grown relatives in town, read with and without the fifth.
      const big = living.find((p) => grownRelativesInTown(core, p).length >= 5);
      // A household with a home to pay for and no income, read from its records.
      const unpaid = living
        .filter((p) => noIncome(core, p.householdId))
        .map((p) => ({ p, push: pushesOf(api, p) }))
        .find(({ push }) => push.parts.housingCost !== undefined);
      if (!big || !unpaid) {
        tried.push(
          `${where}: ${big ? "" : "nobody with five grown relatives in town; "}${unpaid ? "" : "no household with a home and no income"}`,
        );
        continue;
      }
      const grown = grownRelativesInTown(core, big);
      const elsewhere = [...big.familyIds].filter((id) => !grown.includes(id));
      const kinWith = (relatives: readonly PersonId[]) =>
        holdsOf(api, { ...big, familyIds: [...elsewhere, ...relatives] }).kin!;
      const withFive = kinWith(grown.slice(0, 5));
      const withFour = kinWith(grown.slice(0, 4));
      const accounts = api.accounts();
      const own = (core.households.get(unpaid.p.householdId)?.memberIds ?? [])
        .filter((id) => core.people.get(id)?.alive)
        .map((id) => accounts.main(id));
      // Every departure's kin hold is the sliding hold for a whole number of relatives.
      const perRelative = MOVES_PARAMETERS.movesKinHold!.value;
      const decay = MOVES_PARAMETERS.movesKinHoldDecay!.value;
      const levels = Array.from(
        { length: 40 },
        (_, n) => (perRelative * (1 - decay ** n)) / (1 - decay),
      );
      const departures = departuresSeen(core);
      for (const row of departures) {
        const kin = -(row.reasons["hold:kin"] ?? 0);
        expect(
          levels.some((level) => Math.abs(level - kin) < 1e-9),
          `${where}: ${row.id} kin hold ${kin}`,
        ).toBe(true);
      }
      process.stdout.write(
        `MOVES CAUSES ${where}: ${big.id} kin hold with five grown relatives in town (${grown.slice(0, 5).join(", ")}) ${withFive.toFixed(4)}, with four ${withFour.toFixed(4)}; ${unpaid.p.id} (${unpaid.p.householdId}, no income) housing push ${unpaid.push.parts.housingCost!.toFixed(4)} read from ${unpaid.push.reads.housingCost!.join(", ")}; ${departures.length} departures, each kin hold on the sliding scale\n`,
      );
      expect(withFive, `${where}: ${big.id}`).toBeGreaterThan(withFour);
      expect(unpaid.push.parts.housingCost!, where).toBeGreaterThan(0);
      for (const id of own)
        expect(
          unpaid.push.reads.housingCost,
          `${where}: ${unpaid.p.id}'s housing push reads ${id}`,
        ).toContain(id);
      return;
    }
    throw new Error(
      `no drawn place in ${DRAWS} draws had both cases: ${tried.join("; ")}`,
    );
  },
  DRAWS * DRAW_MS,
);
