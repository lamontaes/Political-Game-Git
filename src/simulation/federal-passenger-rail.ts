/**
 * A federal law that pays to expand passenger rail, reaching the riders in
 * every place Amtrak serves.
 *
 * A yes from Congress to "should the federal government pay to expand
 * passenger rail?" funds the new and improved routes Amtrak's own plan asks
 * Congress to pay for (Amtrak Connects US, 2021): 20 million more riders a
 * year on the 32 million of fiscal year 2019, 62.5% more, over 15 years. No
 * added rider arrives before the first added service: 30 months, the time
 * from the 2021 infrastructure law to the Borealis's added Chicago to Twin
 * Cities train in May 2024. From then the plan's riders grow in a straight
 * line until year 15, the same share in every place Amtrak serves, for as
 * long as the law stays in force. A later law answering no ends the
 * expansion the day it takes effect.
 *
 * This is the plan's projection. The outcome web reads it as the cause
 * `federal.rail-expansion-pct` (`outcome-web/index.ts`), and the link to
 * Amtrak's riders scales it by how far rail forecasts come true
 * (`data/research/federal/passenger-rail-fy2024.json`).
 */
import railData from "../../data/research/federal/passenger-rail-fy2024.json" with { type: "json" };
import { daysBetween } from "./dates";
import { lawInForce } from "./governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { IsoDate, World } from "./types";

export const EXPAND_PASSENGER_RAIL_QUESTION =
  "us-federal-positions:transport-water.expand-passenger-rail";

/** Percent more riders Amtrak's plan projects once it is fully built. */
export const RAIL_PLAN_RISE_PCT = railData.plan.projectedRisePct;

/** Months from the law to the first added service. */
export const RAIL_FIRST_SERVICE_MONTHS = railData.plan.firstServiceMonths;

/** Years from the law to the plan's full build-out. */
export const RAIL_PLAN_FULL_YEARS = railData.plan.fullYears;

const DAYS_PER_YEAR = 365.25;

/**
 * Percent more intercity rail riders the plan projects by this date: 0 with
 * no federal expansion law in force, and 0 until the first added service.
 */
export function railExpansionPct(world: World, onDate: IsoDate): number {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === EXPAND_PASSENGER_RAIL_QUESTION,
  );
  if (!proposition) return 0;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    onDate,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted" || law.answer !== "yes") return 0;
  const years =
    Math.max(0, daysBetween(law.operativeAt, onDate)) / DAYS_PER_YEAR;
  const firstYears = RAIL_FIRST_SERVICE_MONTHS / 12;
  const built = Math.min(
    1,
    Math.max(0, (years - firstYears) / (RAIL_PLAN_FULL_YEARS - firstYears)),
  );
  return RAIL_PLAN_RISE_PCT * built;
}
