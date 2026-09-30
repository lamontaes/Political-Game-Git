import finances from "../../../data/research/money/state-local-finances-2022.json" with { type: "json" };
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import { drawnLinkSize } from "../outcome-web";
import { lawEffectStamp } from "../law-effect-stamp";
import type { PublicBudgetGovernment } from "./store";
import type { EntityId, IsoDate, World } from "../types";
import { propositionIdFor } from "./fiscal";
import { PARKS_DEDICATION_QUESTION, SPENDING_QUESTION_EFFECTS } from "./rules";

/**
 * DEDICATED PARKS FUNDING: what the parks line gains or loses, as a share of
 * what the place spends on parks.
 *
 * The money is the state law's cost table (`SPENDING_QUESTION_EFFECTS`,
 * `lawSpendingForMonth`): a dedication that was not in force when the game
 * began adds the same dollars per resident to the state's parks line every
 * month it stands, and a repeal of one the game began with takes them away.
 * Park access moves with the size of that change against the whole parks
 * budget the place's residents live under, state and local together, the
 * base the research fitted access on (Census Bureau 2022 finances, fiscal 2022
 * dollars per 2023 resident). A place the Census file does not carry
 * (the territories) reads the national figure, ESTIMATED FROM AVERAGE.
 */

const PLACES = finances.places as unknown as Readonly<
  Record<
    string,
    {
      readonly stateAndLocalPerResident?: {
        readonly parksAndRecreation: number;
      };
    }
  >
>;

/** State and local parks spending per resident where the law began, in dollars. */
export function parksSpendingPerResident(placeKey: string): number {
  return (
    PLACES[placeKey]?.stateAndLocalPerResident?.parksAndRecreation ??
    PLACES.US!.stateAndLocalPerResident!.parksAndRecreation
  );
}

/** Existing researched dedication yields: fiscal-2022 dollars per 2023 resident. */
export const PARKS_ANNUAL_PER_RESIDENT = {
  low: 53_900_000 / 6_208_038,
  high: 56_600_000 / 5_753_048,
} as const;

/** One stable world/state dedication amount; not an invented tax-base rate. */
export function parksAnnualPerResident(
  world: World,
  jurisdictionId: EntityId,
): number {
  return drawnLinkSize(
    world,
    {
      key: "direct:parks-dedication-annual-per-resident",
      size:
        (PARKS_ANNUAL_PER_RESIDENT.low + PARKS_ANNUAL_PER_RESIDENT.high) / 2,
      range: [PARKS_ANNUAL_PER_RESIDENT.low, PARKS_ANNUAL_PER_RESIDENT.high],
      evidence: "researched",
    },
    jurisdictionId,
  );
}

/** The state's actual incremental parks budget amount and its governing law. */
export function parksBudgetChange(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
) {
  if (government.level !== "state") return null;
  const propositionId = propositionIdFor(world, PARKS_DEDICATION_QUESTION);
  if (!propositionId) return null;
  const law = lawInForce(
    world,
    government.lawJurisdictionId,
    propositionId,
    month,
  );
  const began = lawInForceAtStart(
    world,
    government.lawJurisdictionId,
    propositionId,
    month,
  );
  if (
    !law ||
    (law.answer !== "yes" && law.answer !== "no") ||
    (began !== "yes" && began !== "no") ||
    began === law.answer
  )
    return null;
  const annualPerResident = parksAnnualPerResident(
    world,
    government.lawJurisdictionId,
  );
  const dollars =
    ((annualPerResident * government.population) / 12) *
    (law.answer === "yes" ? 1 : -1);
  return {
    law,
    dollars,
    stamp: lawEffectStamp(law, {
      effectKind: "parks-spending",
      questionKey: PARKS_DEDICATION_QUESTION,
      jurisdictionId: government.lawJurisdictionId,
      appliedAt: month,
      sourceRecordIds: [government.lawJurisdictionId],
    }),
  };
}

/**
 * The percent the parks line has been moved by the law in force on `asOf`,
 * against what the place spends on parks: 0 while the law is where the place
 * began, positive after a dedication, negative after a repeal.
 */
export function parksLawAddedPct(
  world: World,
  jurisdictionId: EntityId,
  placeKey: string,
  asOf: IsoDate,
): number {
  const effect = SPENDING_QUESTION_EFFECTS.find(
    (row) => row.questionKey === PARKS_DEDICATION_QUESTION,
  );
  const propositionId = propositionIdFor(world, PARKS_DEDICATION_QUESTION);
  if (!effect || !propositionId) return 0;
  const now = lawInForce(world, jurisdictionId, propositionId, asOf)?.answer;
  const began = lawInForceAtStart(world, jurisdictionId, propositionId, asOf);
  const perResident =
    began === "no" && now === "yes"
      ? parksAnnualPerResident(world, jurisdictionId)
      : began === "yes" && now === "no"
        ? -parksAnnualPerResident(world, jurisdictionId)
        : null;
  return perResident === null
    ? 0
    : (perResident / parksSpendingPerResident(placeKey)) * 100;
}
