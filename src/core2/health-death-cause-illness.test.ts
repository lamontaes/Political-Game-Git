/**
 * A person who dies ill dies of the illness on their record, not of an unnamed
 * cause. Three drawn places each play three years in results mode; every full
 * person's death that follows a recorded condition (and is not the overdose of
 * someone with the substance-use condition) names that condition as its cause,
 * by the case's own record, and a death with no condition on record takes its
 * cause from the place's age-band shares (`assignDeathCause`). The causes the
 * deaths took are printed beside each other for the place. Set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import {
  DEATH_CAUSE_IDS,
  OVERDOSE_CAUSE,
  SUBSTANCE_CONDITION,
} from "./death-cause";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { healthReport } from "./modules/health";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const PLACES = 3;
const YEARS = 3;
const DAYS_PER_YEAR = 365;
/** Draws made to find places that lose enough people for the check to mean something. */
const MAX_DRAWS = 12;

it(`a death follows the illness on the person's record (seed ${seed})`, () => {
  let proven = 0;
  const passedOver: string[] = [];
  for (let draw = 0; draw < MAX_DRAWS && proven < PLACES; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "death-cause-illness");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    advanceCore(core, addDays(makeIsoDate(core.date), YEARS * DAYS_PER_YEAR), {
      results: true,
    });
    const report = healthReport(core);
    const died = report.cases.filter((row) => row.deathEventId);
    const ill = died.filter(
      (row) =>
        row.conditionKey &&
        !(report.conditionsByPerson.get(row.personId) ?? []).includes(
          SUBSTANCE_CONDITION,
        ),
    );
    if (ill.length === 0) {
      passedOver.push(
        `${where}: ${died.length} deaths, none after a condition`,
      );
      continue;
    }
    proven += 1;
    const tally: Record<string, number> = {};
    for (const row of died) {
      const cause = report.causeOfDeath.get(row.personId) ?? "(none)";
      tally[cause] = (tally[cause] ?? 0) + 1;
    }
    console.log(
      `${where}: ${died.length} deaths, ${ill.length} after a recorded condition; causes ${JSON.stringify(tally)}`,
    );
    for (const row of ill)
      expect(
        report.causeOfDeath.get(row.personId),
        `${where}: ${row.personId}, death ${row.deathEventId}`,
      ).toBe(row.conditionKey);
    // Every other death took a cause from the shares: a cause the data names, or none of them.
    for (const row of died) {
      if (ill.includes(row)) continue;
      const cause = report.causeOfDeath.get(row.personId);
      expect(
        cause !== undefined &&
          (DEATH_CAUSE_IDS.includes(cause) ||
            cause === OVERDOSE_CAUSE ||
            Boolean(row.conditionKey)),
        `${where}: ${row.personId} cause ${cause}`,
      ).toBe(true);
    }
  }
  if (passedOver.length) console.log(`passed over: ${passedOver.join("; ")}`);
  expect(proven, `places proven; passed over: ${passedOver.join("; ")}`).toBe(
    PLACES,
  );
}, 3_600_000);
