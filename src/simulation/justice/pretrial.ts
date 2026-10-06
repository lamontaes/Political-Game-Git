import moneyBail from "../../../data/research/justice/money-bail-2026.json" with { type: "json" };
import {
  readFinalEnactedLawTerm,
  type FinalEnactedLawTerm,
} from "../governing/final-law-term-query";
import { eventById } from "../event-index";
import { recordsByStringField } from "../history-index";
import { stableHash } from "../ids";
import { spreadOf } from "../sample-spread";
import {
  comparableAmountApplicabilityKey,
  comparableAmountApplicabilitiesMatch,
  type ComparableAmountApplicability,
  type LawAmountUnit,
} from "../law-consequence-types";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import {
  censusRegionOf,
  censusRegionStates,
} from "../world-setup/census-regions";
import { lawInForce, type LawInForce } from "../governing/law-in-force";
import { resourcePositionAt } from "../resource-queries";
import { money } from "../resources";
import { ensureStartingPersonalMoney } from "../starting-money";
import type { EntityId, World } from "../types";

/**
 * Before trial: what the law in force says about money bail, what bail the
 * court sets, and whether the defendant has the money to pay it.
 *
 * The question "Should release before trial be decided without money bail?"
 * is answered for every place by the starting law
 * (`data/research/laws/starting-law-2026.json`), and an enacted law changes
 * the answer from its effective date. Where the answer is no, the court sets
 * money bail and the defendant goes home only if they can pay. Where it is
 * yes, nobody is held for want of money; a judge may hold a defendant only
 * where the law allows it (see `evaluateDetention`).
 */

export const PRETRIAL_VERSION = "justice-pretrial-v1";

export const END_CASH_BAIL_QUESTION =
  "us-policy-positions:justice-public-safety.end-cash-bail";

/**
 * The research estimate and its dollar conversion are data (`data/research/justice/money-bail-2026.json`) with their
 * sources: the median bail for the charge (Bureau of Justice Statistics, NCJ
 * 243777, table 16) in 2025 dollars. This is not legal authority.
 * The supported court route posts an operative or saved amount in full cash. A commercial premium is not a court deposit; state
 * deposit exceptions require separately researched current authority.
 */
const BAIL_2009_DOLLARS: Readonly<Record<string, number>> =
  moneyBail.bail2009Dollars;
const CPI_2009 = moneyBail.cpiU["2009"];
const CPI_2025 = moneyBail.cpiU["2025"];

/** Research estimate only, never authority for a new court cash-bail charge. */
export function estimatedBailMinorUnits(offenseKey: string): number {
  const dollars2009 =
    BAIL_2009_DOLLARS[offenseKey] ?? BAIL_2009_DOLLARS.default!;
  return Math.round((dollars2009 * CPI_2025) / CPI_2009) * 100;
}

/** Offense-specific adopted amount, in USD minor units; no schedule is inferred. */
export function bailMinorUnits(
  world: World,
  input: {
    readonly venueJurisdictionId: EntityId | null;
    readonly offenseKey: string;
  },
): number | null {
  if (pretrialLawAt(world, input.venueJurisdictionId) !== "money-bail")
    return null;
  const term = pretrialLawTermAt(world, input.venueJurisdictionId, {
    questionKey: END_CASH_BAIL_QUESTION,
    termKey: `cash-bail:${input.offenseKey}`,
    unit: "minor",
  });
  return term && Number.isSafeInteger(term.value) && term.value > 0
    ? term.value
    : null;
}

/** The saved charge is authoritative for payment, including preserved old saves. */
export function recordedChargeBailMinorUnits(
  world: World,
  chargedEventId: EntityId,
): number | null {
  const charged = eventById(world, chargedEventId);
  if (
    !charged ||
    charged.type !== "justice.charged" ||
    charged.occurredAt > world.currentDate
  )
    return null;
  const tags = charged.tags.filter((tag) =>
    tag.startsWith("justice.cash-bail-amount:"),
  );
  if (tags.length !== 1) return null;
  const amount = Number(tags[0]!.slice("justice.cash-bail-amount:".length));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

/** Read the existing statistical region; territories without one stay unknown. */
function courtRegion(world: World, jurisdictionId: EntityId | null) {
  const jurisdiction = jurisdictionId
    ? world.jurisdictions[jurisdictionId]
    : undefined;
  const stateKey = jurisdictionId
    ? (lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ??
      (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null))
    : null;
  const usps = stateKey?.slice(3);
  return usps && censusRegionStates().includes(usps)
    ? censusRegionOf(usps)
    : null;
}

/** Dev provenance accompanies an amount; it is never a claim of court authority. */
export function newChargeBailAmount(
  world: World,
  input: Parameters<typeof bailMinorUnits>[1] & {
    readonly courtId: string;
    readonly applicability?: Extract<
      ComparableAmountApplicability,
      { kind: "court-charge-cohort" }
    >;
  },
): {
  readonly amount: number;
  readonly provenanceTags: readonly string[];
} | null {
  const court = world.judiciary?.courts[input.courtId];
  if (!court || court.createdAt > world.currentDate) return null;
  if (pretrialLawAt(world, input.venueJurisdictionId) !== "money-bail")
    return null;
  const operative = bailMinorUnits(world, input);
  if (operative !== null)
    return {
      amount: operative,
      provenanceTags: ["justice.bail-basis:operative-law"],
    };

  const applicability = input.applicability;
  if (applicability) {
    if (
      comparableAmountApplicabilityKey(applicability) === null ||
      applicability.courtLevelKey !== court.level ||
      (applicability.courtKey !== null &&
        applicability.courtKey !== input.courtId) ||
      applicability.offenseKey !== input.offenseKey ||
      applicability.region !== courtRegion(world, court.jurisdictionId)
    )
      return null;
  }

  // An exact offense key is narrower than an offense class. Charges do not
  // record felony/misdemeanor classes, so no broader class is inferred here.
  const candidates = recordsByStringField(
    world.history.events,
    "type",
    "justice.charged",
  ).flatMap((charge) => {
    if (
      charge.occurredAt > world.currentDate ||
      charge.recordedAt > world.currentDate ||
      charge.sequence >= world.history.nextSequence ||
      !charge.tags.includes(`justice.offense:${input.offenseKey}`)
    )
      return [];
    if (applicability) {
      const tags = charge.tags.filter((tag) =>
        tag.startsWith("justice.bail-applicability:"),
      );
      if (tags.length !== 1) return [];
      try {
        const recorded = JSON.parse(
          tags[0]!.slice("justice.bail-applicability:".length),
        ) as ComparableAmountApplicability;
        if (!comparableAmountApplicabilitiesMatch(applicability, recorded))
          return [];
      } catch {
        return [];
      }
    }
    const courtTags = charge.tags.filter((tag) =>
      tag.startsWith("justice.court:"),
    );
    if (courtTags.length !== 1) return [];
    const donorCourtId = courtTags[0]!.slice("justice.court:".length);
    const donorCourt = world.judiciary?.courts[donorCourtId];
    if (
      !donorCourt ||
      donorCourt.level !== court.level ||
      donorCourt.createdAt > charge.occurredAt
    )
      return [];
    if (
      applicability &&
      ((applicability.courtKey !== null &&
        applicability.courtKey !== donorCourtId) ||
        applicability.region !== courtRegion(world, donorCourt.jurisdictionId))
    )
      return [];
    const amount = recordedChargeBailMinorUnits(world, charge.id);
    return amount === null ? [] : [{ charge, courtId: donorCourtId, amount }];
  });
  const local = candidates.filter((donor) => donor.courtId === input.courtId);
  const donors = (local.length ? local : candidates).sort((a, b) =>
    a.charge.id.localeCompare(b.charge.id),
  );
  if (!donors.length) return null; // No actual sample can be averaged at this boundary.
  const values = donors.map((donor) => donor.amount);
  const { mean, standardDeviation } = spreadOf(values);
  // A stable world/court circumstance spreads a modeled amount within the
  // observed donor bounds; it never selects detention or a person's action.
  const position =
    Number.parseInt(
      stableHash(
        `${world.id}:cash-bail/v1:${input.courtId}:${input.offenseKey}`,
      ).slice(0, 8),
      16,
    ) / 0xffffffff;
  const amount = Math.round(
    Math.max(
      Math.min(...values),
      Math.min(
        Math.max(...values),
        mean + (2 * position - 1) * standardDeviation,
      ),
    ),
  );
  return {
    amount,
    provenanceTags: [
      "justice.bail-basis:similar-charges/v1",
      "justice.bail-estimate:ESTIMATED FROM AVERAGE",
      `justice.bail-donor-mean:${mean}`,
      `justice.bail-donor-spread:${standardDeviation}`,
      ...(applicability
        ? [`justice.bail-applicability:${JSON.stringify(applicability)}`]
        : []),
      ...donors.map((donor) => `justice.bail-donor:${donor.charge.id}`),
    ],
  };
}

/** Full cash deposit; commercial premiums are not court deposits. */
export function bailDueMinorUnits(
  world: World,
  input: Parameters<typeof bailMinorUnits>[1],
): number | null {
  return bailMinorUnits(world, input);
}

/** The catalog's proposition whose stable key ends with `suffix`. */
export function propositionIdByKey(
  world: World,
  suffix: string,
): EntityId | null {
  for (const [id, proposition] of Object.entries(
    world.policyCatalog.propositions,
  ))
    if (proposition.stableKey.endsWith(suffix)) return id as EntityId;
  return null;
}

/**
 * How the law in force where the case is tried answers the cash bail
 * question: "money-bail" where the court sets bail, "no-money-bail" where
 * release is decided without it, or null where no law answers it.
 */
export function pretrialLawAt(
  world: World,
  venueJurisdictionId: EntityId | null,
): "money-bail" | "no-money-bail" | null {
  const law = pretrialGoverningLawAt(world, venueJurisdictionId);
  if (!law) return null;
  return law.answer === "yes" ? "no-money-bail" : "money-bail";
}

/** Reads an adopted pretrial term only under the law currently in force there. */
export function pretrialLawTermAt(
  world: World,
  venueJurisdictionId: EntityId | null,
  input: {
    readonly questionKey: string;
    readonly termKey: string;
    readonly unit: LawAmountUnit;
  },
): FinalEnactedLawTerm | null {
  const law = pretrialGoverningLawAt(world, venueJurisdictionId);
  return law ? readFinalEnactedLawTerm(world, law, input) : null;
}

/** Exact operative law for attribution on the defendant's saved consequence. */
export function pretrialGoverningLawAt(
  world: World,
  venueJurisdictionId: EntityId | null,
): LawInForce | null {
  if (!venueJurisdictionId) return null;
  const propositionId = propositionIdByKey(world, END_CASH_BAIL_QUESTION);
  if (!propositionId) return null;
  return lawInForce(world, venueJurisdictionId, propositionId);
}

/**
 * The money a person has on hand today, in cents, read without changing the
 * saved world. A life whose money the game does not track has none it can
 * spend, the same as a candidate's own money reads.
 */
export function moneyOnHandMinorUnits(
  world: World,
  personId: EntityId,
): number {
  const opened = ensureStartingPersonalMoney(world, personId).world;
  const currency = money(0, "USD").currency;
  return (
    resourcePositionAt(opened, { kind: "person", personId }, currency)
      ?.liquidBalance.minorUnits ?? 0
  );
}
