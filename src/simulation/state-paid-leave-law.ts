/**
 * The employee's premium for a state paid family and medical leave program,
 * withheld from a paycheck while the program's law is in force.
 *
 * The question is "Should the state run a paid family and medical leave
 * program?" (`labor-workforce.paid-family-leave`). Fifteen places begin with a
 * program in the starting-law file; their 2026 premiums are read from each
 * program's own pages (`state-paid-leave-premiums-2026.json`). A law enacted
 * in play governs over the program a place began with:
 * 1. a "no" ends the premium where a program was collecting;
 * 2. a "yes" where there was none starts one.
 *
 * Game rules, labeled:
 * - A program the place began with collects from the date its own pages give,
 *   even where a law enacted in play re-adopts it earlier; one adopted in
 *   play collects from the law's effective date.
 * - A law enacted in play always comes after the start, so it governs over
 *   the program a place began with, including one dated to start later.
 * - A premium that was not read (Rhode Island's pages refuse the container;
 *   Virginia sets its rate in 2027), or a program adopted in play, is
 *   ESTIMATED FROM AVERAGE: the average employee share of the programs read,
 *   ranked by sourced Census region and household-income distance with the
 *   approved reciprocal-rank estimation rule, on wages up to the Social
 *   Security wage base ($184,500 in
 *   2026), the cap most of the read programs use.
 * - Only the employee's share is withheld here. The employer's share, and the
 *   small-employer exemptions most programs give it, need the employer's full
 *   headcount, which a fictional employer does not have in the world.
 */
import premiums from "../../data/research/money/state-paid-leave-premiums-2026.json" with { type: "json" };
import { lawInForce, lawInForceAtStart } from "./governing/law-in-force";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import { rankedPaidLeaveEstimate } from "./paid-leave-estimates";
import type { EntityId, IsoDate, World } from "./types";

export const PAID_LEAVE_QUESTION =
  "us-policy-positions:labor-workforce.paid-family-leave";

/** The Social Security wage base for 2026, which most programs cap at. */
const COMMON_WAGE_CAP_DOLLARS = 184_500;
/** Far enough ahead that every starting law the file dates is operative. */
const ANY_START = "2100-01-01" as IsoDate;

interface PremiumPlace {
  readonly status: string;
  readonly employeePercent: number | null;
  readonly wageCapDollars: number | null;
  readonly contributionsBeginAt: string | null;
  readonly sourceUrl: string | null;
}

const PLACES = premiums.places as unknown as Readonly<
  Record<string, PremiumPlace>
>;

export type PaidLeavePremium =
  /** No program collects from this paycheck and no law in play ended one. */
  | { readonly kind: "none" }
  /** A law enacted in play ended the premium a program was collecting. */
  | { readonly kind: "ended"; readonly lawMeasureIds: readonly EntityId[] }
  | {
      readonly kind: "premium";
      /** Employee share of wages, in millionths (0.44% is 4,400). */
      readonly employeeRatePerMillion: number;
      /** Calendar-year wages above which nothing more is owed; null: none. */
      readonly annualWageCapMinor: number | null;
      readonly sourceUrl: string | null;
      readonly lawMeasureIds?: readonly EntityId[];
      readonly estimatedFromAverage?: string;
    };

/** The premium on a paycheck paid on `paidAt` to a resident of `stateKey`. */
export function paidLeavePremium(
  world: World,
  stateKey: string,
  paidAt: IsoDate,
): PaidLeavePremium {
  const state = chiefExecutiveJurisdiction(stateKey.slice(3));
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === PAID_LEAVE_QUESTION);
  if (!state || !proposition) return { kind: "none" };
  const place = PLACES[stateKey];
  // A law enacted in play governs over the program the place began with,
  // even one dated to start later.
  const law = lawInForce(
    world,
    state.id,
    proposition.id,
    paidAt,
    "enacted-only",
  );
  const began =
    lawInForceAtStart(world, state.id, proposition.id, ANY_START) === "yes";
  // The program a place began with collects from its own date, whether it
  // runs under its starting law or a law enacted in play re-adopts it.
  const collecting =
    began && collectsFrom(world, state.id, proposition.id, place, paidAt);
  if (law) {
    if (law.answer === "no")
      return collecting
        ? { kind: "ended", lawMeasureIds: [law.measureId] }
        : { kind: "none" };
    if (!began)
      return {
        ...estimatedPremium(world, stateKey),
        lawMeasureIds: [law.measureId],
      };
    if (!collecting) return { kind: "none" };
    return {
      ...(readPremium(place) ?? estimatedPremium(world, stateKey)),
      lawMeasureIds: [law.measureId],
    };
  }
  if (!collecting) return { kind: "none" };
  return readPremium(place) ?? estimatedPremium(world, stateKey);
}

/**
 * Whether the program a place began with collects on `paidAt`: from the date
 * its pages give, or from the starting law's own date where none was read.
 */
function collectsFrom(
  world: World,
  stateJurisdictionId: EntityId,
  propositionId: EntityId,
  place: PremiumPlace | undefined,
  paidAt: IsoDate,
): boolean {
  if (place?.contributionsBeginAt) return place.contributionsBeginAt <= paidAt;
  return (
    lawInForceAtStart(world, stateJurisdictionId, propositionId, paidAt) ===
    "yes"
  );
}

function readPremium(
  place: PremiumPlace | undefined,
): Extract<PaidLeavePremium, { kind: "premium" }> | null {
  if (place?.status !== "read" || place.employeePercent === null) return null;
  return {
    kind: "premium",
    employeeRatePerMillion: Math.round(place.employeePercent * 10_000),
    annualWageCapMinor:
      place.wageCapDollars === null ? null : place.wageCapDollars * 100,
    sourceUrl: place.sourceUrl,
  };
}

function estimatedPremium(
  _world: World,
  stateKey: string,
): Extract<PaidLeavePremium, { kind: "premium" }> {
  const { percent, references, method } = rankedPaidLeaveEstimate(
    stateKey,
    "employee-premium",
  );
  return {
    kind: "premium",
    employeeRatePerMillion: Math.round(percent * 10_000),
    annualWageCapMinor: COMMON_WAGE_CAP_DOLLARS * 100,
    sourceUrl: null,
    estimatedFromAverage:
      `ESTIMATED FROM AVERAGE: the average employee premium of the ${references.length} state paid leave programs read, ` +
      `${percent.toFixed(3)}% of wages using ${method}, ` +
      `on wages up to $${COMMON_WAGE_CAP_DOLLARS.toLocaleString("en-US")} a year, the cap most of them use. ` +
      "Source: each program's 2026 premium page (state-paid-leave-premiums-2026.json).",
  };
}

/** The premium on the wages of one paycheck, half up to the cent. */
export function premiumOn(
  wagesMinor: number,
  paidEarlierThisYearMinor: number,
  premium: Extract<PaidLeavePremium, { kind: "premium" }>,
): { readonly taxableMinor: number; readonly premiumMinor: number } {
  const taxableMinor =
    premium.annualWageCapMinor === null
      ? wagesMinor
      : Math.min(
          wagesMinor,
          Math.max(0, premium.annualWageCapMinor - paidEarlierThisYearMinor),
        );
  const numerator =
    BigInt(taxableMinor) * BigInt(premium.employeeRatePerMillion);
  return {
    taxableMinor,
    premiumMinor: Number((numerator * 2n + 1_000_000n) / 2_000_000n),
  };
}
