import { ageOnDate, daysBetween } from "../dates";
import { recordById } from "../history-index";
import { readFinalEnactedLawTerm } from "../governing/final-law-term-query";
import type { LawInForce } from "../governing/law-in-force";
import { evaluateLawAmount } from "../law-consequence-amount";
import type { FinalEnactedLawTerm } from "../governing/final-law-term-query";
import type { LawConsequenceRow } from "../law-consequence-types";
import type { IsoDate, ResourceFlow, World } from "../types";

export const RENT_CAP_CONSEQUENCE: LawConsequenceRow = {
  id: "housing-land-use.rent-stabilization:renewal-cap",
  kind: "price-cost",
  when: "renewal",
  who: { selector: "person-price-flows", predicates: [] },
  what: "set-resource-flow-price",
  amount: {
    op: "minimum",
    operands: [
      { op: "record", key: "current-flow-minor", unit: "minor" },
      {
        op: "sum",
        operands: [
          { op: "record", key: "prior-flow-minor", unit: "minor" },
          {
            op: "product",
            left: { op: "record", key: "prior-flow-minor", unit: "minor" },
            right: { op: "record", key: "rental-cap-ratio", unit: "ratio" },
          },
        ],
      },
    ],
  },
  conditions: [
    {
      capability: "price-flow-basis",
      parameters: { basisKind: "housing:rent" },
    },
    { capability: "housing-rent-cap", parameters: { termKey: "cap" } },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: ["data/research/laws/rent-cap-terms-2026.json"],
    population:
      "Recorded rental contracts covered by the operative rule's own terms",
    scope:
      "Adopted cap expression and building/exemption coverage in one terms record",
    why: "The final rule caps the saved renewal; no catalog percentage is law.",
    uncertainty:
      "Absent property, notice or statutory index evidence does not establish coverage.",
  },
};

export interface RentalCapReading {
  readonly term: FinalEnactedLawTerm;
  readonly coverage: "covered" | "exempt" | "unresolved";
  readonly ratio: number | null;
  readonly sourceRecordIds: readonly World["history"]["dwellings"][number]["id"][];
}

/** Reads a coherent final rule and recognized facts, never an estimated structure age. */
export function rentalCapForFlow(
  world: World,
  flow: ResourceFlow,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate,
): RentalCapReading | null {
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey,
    termKey: "cap",
    unit: "ratio",
    onDate,
  });
  if (!term?.rentalPriceRule) return null;
  const rule = term.rentalPriceRule;
  const empty = (coverage: RentalCapReading["coverage"]): RentalCapReading => ({
    term,
    coverage,
    ratio: null,
    sourceRecordIds: term.sourceRecordIds,
  });
  if (
    (rule.from && onDate < rule.from) ||
    (rule.through && onDate > rule.through)
  )
    return empty("unresolved");
  if (flow.basisReference.kind !== "housing") return empty("unresolved");
  const tenure = recordById(
    world.history.housingTenures,
    flow.basisReference.housingTenureId,
  );
  const dwelling =
    tenure && recordById(world.history.dwellings, tenure.dwellingId);
  if (!dwelling) return empty("unresolved");
  const coverage = rule.coverage;
  if (
    coverage.dwellingClassifications &&
    !coverage.dwellingClassifications.includes(dwelling.classification)
  )
    return empty("exempt");
  const facts = dwelling.rentalRegulationFacts;
  if (coverage.minimumBuildingAgeYears !== undefined) {
    if (!facts?.certificateOfOccupancyDate) return empty("unresolved");
    // A notice-dependent statute measures age on its actual saved notice date.
    const ageDate =
      coverage.noticeDays !== undefined ? facts.rentIncreaseNoticeDate : onDate;
    if (!ageDate) return empty("unresolved");
    if (
      ageOnDate(facts.certificateOfOccupancyDate, ageDate) <
      coverage.minimumBuildingAgeYears
    )
      return empty("exempt");
  }
  if (coverage.maximumFacilitySpaces !== undefined) {
    if (facts?.facilitySpaces === undefined) return empty("unresolved");
    if (facts.facilitySpaces > coverage.maximumFacilitySpaces)
      return empty("exempt");
  }
  if (
    coverage.noticeDays !== undefined &&
    (!facts?.rentIncreaseNoticeDate ||
      daysBetween(facts.rentIncreaseNoticeDate, onDate) < coverage.noticeDays)
  )
    return empty("unresolved");
  for (const exemption of coverage.exemptions) {
    const known = facts?.exemptions[exemption];
    if (known === undefined) return empty("unresolved");
    if (known) return empty("exempt");
  }
  const index = rule.index;
  if (
    index &&
    (index.publishedAt > onDate ||
      onDate < index.from ||
      onDate > index.through ||
      !index.source)
  )
    return empty("unresolved");
  let amount;
  try {
    amount = evaluateLawAmount(rule.cap, {
      term: {},
      capacity: {},
      exposure: {},
      record: index
        ? {
            "statutory-index-change": {
              value: index.changeRatio,
              unit: "ratio",
            },
          }
        : {},
    });
  } catch {
    return empty("unresolved");
  }
  if (amount.unit !== "ratio" || amount.value < 0) return empty("unresolved");
  return {
    term,
    coverage: "covered",
    ratio: amount.value,
    sourceRecordIds: [...term.sourceRecordIds, tenure!.id, dwelling.id],
  };
}
