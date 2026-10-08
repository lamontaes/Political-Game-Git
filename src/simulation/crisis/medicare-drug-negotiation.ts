import { ageOnDate } from "../dates";
import { recordedLawAt, recordLawExposure } from "../law-exposure";
import { isPersonAliveAt } from "../vitality-integrity";
import type { EntityId, IsoDate, World } from "../types";

export const MEDICARE_DRUG_NEGOTIATION_QUESTION_KEY =
  "us-federal-positions:health.medicare-drug-price-negotiation";

export const MEDICARE_DRUG_NEGOTIATION_ESTIMATE_SOURCE =
  "CMS, Negotiated Prices for Initial Price Applicability Year 2026 (2024): $1.5 billion estimated savings; HHS ASPE, Medicare Part D Out-of-Pocket Spending (2024): 52.4 million enrollees used as the enrollment denominator. Age 65+ is an enrollment proxy; individual enrollment and drug use are not recorded.";

/**
 * Estimated monthly savings spread across Part D enrollees: CMS's $1.5 billion
 * 2026 estimate divided by 52.4 million enrollees and twelve months.
 * PLACEHOLDER(research: per-person-medicare-drug-negotiation-savings): actual
 * enrollment, covered-drug use and individual savings are not in person records.
 */
export const MEDICARE_DRUG_NEGOTIATION_MONTHLY_SAVINGS_MINOR = Math.round(
  (1_500_000_000 / 52_400_000 / 12) * 100,
);

/** Land the enacted national drug-price effect on named age-eligible people. */
export function recordMedicareDrugNegotiationSavings(
  world: World,
  input: {
    readonly measureId: EntityId;
    readonly onDate: IsoDate;
    readonly sourceRecordId: EntityId;
  },
): World {
  if (!recordedLawAt(world, input.measureId, input.onDate)) return world;

  let next = world;
  const cutoff = {
    asOfDate: input.onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (
      !person ||
      ageOnDate(person.birthDate, input.onDate) < 65 ||
      !isPersonAliveAt(world, personId, cutoff)
    )
      continue;
    next = recordLawExposure(next, {
      stableKey: `medicare-drug-negotiation:${input.sourceRecordId}:${personId}`,
      personId,
      measureId: input.measureId,
      sectionKey: MEDICARE_DRUG_NEGOTIATION_QUESTION_KEY,
      channel: "benefit",
      direction: "gain",
      amount: {
        minorUnits: MEDICARE_DRUG_NEGOTIATION_MONTHLY_SAVINGS_MINOR,
        currency: "USD",
      },
      cadence: "monthly",
      sourceRecordId: input.sourceRecordId,
      estimatedFrom: MEDICARE_DRUG_NEGOTIATION_ESTIMATE_SOURCE,
    });
  }
  return next;
}
