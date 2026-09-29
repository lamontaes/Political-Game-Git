import { currentPresidentOf } from "./crisis/offices";
import { majorPartyOf } from "./statewide-electorate";
import { macroConditionsAt } from "./macro-economy/readers";
import { macroStartingConditions } from "./world-setup/conditions";
import { observationsAcrossSeriesAt } from "./world-metrics";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { IsoDate, World } from "./types";

/** Mean two-party midterm loss, 1950–2022, retained as the neutral calibration. */
export const MIDTERM_PENALTY_POINTS = 3.6;
/** Gallup's historical presidential job-approval average, not an in-world poll. */
export const PRESIDENTIAL_APPROVAL_AVERAGE = 53;

/**
 * GAME PROFILE: smooth political responses, not empirical causal coefficients.
 * Gallup's 2002/2010 readings (63%/45% approval) and the observed midterm range
 * (+2.3/−9.0 two-party vote points) bound the calibration. The economy is the
 * saved national growth, unemployment and inflation, not a random mood.
 * No estimate from this module is shown as a poll or written by a screen.
 */
export const MIDTERM_MOOD_PROFILE = {
  approvalWeight: 0.45,
  growthWeight: 0.6,
  unemploymentWeight: 0.35,
  inflationWeight: 0.2,
  approvalEconomicWeight: 2,
  weakestShiftPoints: -9,
  strongestShiftPoints: 2.3,
} as const;

export function midtermPresidentPartyShift(input: {
  readonly approvalPct: number;
  readonly growthChange: number;
  readonly unemploymentChange: number;
  readonly inflationChange: number;
}): number {
  const p = MIDTERM_MOOD_PROFILE;
  const impulse =
    (input.approvalPct - PRESIDENTIAL_APPROVAL_AVERAGE) * p.approvalWeight +
    input.growthChange * p.growthWeight -
    input.unemploymentChange * p.unemploymentWeight -
    input.inflationChange * p.inflationWeight;
  const range = p.strongestShiftPoints - p.weakestShiftPoints;
  const neutralShare = (-MIDTERM_PENALTY_POINTS - p.weakestShiftPoints) / range;
  const neutralLogOdds = Math.log(neutralShare / (1 - neutralShare));
  // Logistic bounds keep every marginal input effective; no outcome flips at
  // an approval or economic cutoff. At neutral inputs this is the prior mean.
  return (
    p.weakestShiftPoints +
    range / (1 + Math.exp(-(neutralLogOdds + impulse / (range / 4))))
  );
}

export function presidentialStandingForMidterm(world: World, asOf: IsoDate) {
  const president = currentPresidentOf(world);
  const current = macroConditionsAt(world, "national", asOf);
  const start = macroStartingConditions(world)?.initial;
  const growthChange =
    current && start ? current.growthPct - start.realGrowthAnnualPct : 0;
  const unemploymentChange =
    current && start ? current.unemploymentPct - start.unemploymentPct : 0;
  const inflationChange =
    current && start ? current.inflationPct - start.inflation12mPct : 0;
  // Read a saved approval observation only if it belongs to this President.
  // Candidate support and presidential vote share are different quantities.
  const definition = Object.values(world.metricCatalog.definitions).find(
    (d) =>
      d.stableKey === "politics.presidential-job-approval" &&
      d.tags.includes(`person:${president?.personId}`),
  );
  const cutoff = {
    asOfDate: asOf > world.currentDate ? world.currentDate : asOf,
    historySequenceExclusive: world.history.nextSequence,
  };
  const observed = definition
    ? observationsAcrossSeriesAt(
        world,
        definition.id,
        { jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id, segmentKey: null },
        cutoff,
      )
        .filter(
          (row) =>
            row.value.kind === "quantity" &&
            row.value.quantity.unit === "rate:share",
        )
        .sort((a, b) => {
          const end = (row: typeof a) =>
            row.referencePeriod.kind === "point"
              ? row.referencePeriod.at
              : row.referencePeriod.endsAt;
          return end(a).localeCompare(end(b)) || a.sequence - b.sequence;
        })
        .at(-1)
    : null;
  const economicPull = growthChange - unemploymentChange - inflationChange;
  const meanLogOdds = Math.log(
    PRESIDENTIAL_APPROVAL_AVERAGE / (100 - PRESIDENTIAL_APPROVAL_AVERAGE),
  );
  const estimate =
    100 /
    (1 +
      Math.exp(
        -(
          meanLogOdds +
          (economicPull * MIDTERM_MOOD_PROFILE.approvalEconomicWeight) / 25
        ),
      ));
  const approvalPct =
    observed?.value.kind === "quantity"
      ? (100 * observed.value.quantity.numerator) /
        observed.value.quantity.denominator
      : estimate;
  return {
    approvalPct,
    basis: observed ? "observed-poll" : "estimated-from-average",
    growthChange,
    unemploymentChange,
    inflationChange,
  } as const;
}

/** The same national conditions reach Congressional and state midterms. */
export function nationalMoodDemocraticShift(
  world: World,
  electionDate: IsoDate,
): number {
  const year = Number(electionDate.slice(0, 4));
  if (year % 2 !== 0 || year % 4 === 0) return 0;
  const president = currentPresidentOf(world);
  if (!president) return 0;
  const party = majorPartyOf(world, president.personId, electionDate);
  const shift =
    midtermPresidentPartyShift(
      presidentialStandingForMidterm(world, electionDate),
    ) / 100;
  return party === "democratic" ? shift : party === "republican" ? -shift : 0;
}
