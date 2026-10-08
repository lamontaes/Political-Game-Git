import { MINIMUM_WAGE_PAY_ROWS } from "./law-consequences/pay-rows";
import {
  RENT_STABILIZATION_QUESTION,
  RENT_STABILIZATION_ROW,
  RENT_COVERAGE_VALUES,
} from "./law-consequences/rent-stabilization-row";
import type { LawConsequenceRow } from "./law-consequence-types";
import {
  TUITION_FREEZE_QUESTION,
  TUITION_FREEZE_ROW,
} from "./law-consequences/tuition-freeze-row";
import { TAX_TERMS_POLICY_PACK } from "./policy-pack-tax-terms";
import {
  COVERAGE_ELIGIBILITY_ROWS,
  COVERAGE_EFFECTIVE_ELIGIBILITY_ROWS,
} from "./law-consequences/coverage-eligibility-rows";
import { SERVICE_DELIVERED_LAW_ROWS } from "./law-consequences/service-delivered-data";
import { DEVELOPMENT_INCENTIVE_AWARD_ROW } from "./law-consequences/modules/lw08-development-incentive-cap/rows";
import {
  SNAP_PARTICIPATION_ROW,
  SNAP_WORK_REQUIREMENT_QUESTION,
} from "./law-consequences/modules/snap-participation/rows";
import { LW17_PERSON_LANDING_ROWS } from "./law-consequences/lw17-person-landing-rows";
import {
  loadPolicyPacks,
  type PolicyPack,
  type PolicyRegistry,
} from "./policy-packs";
import { US_STATE_AND_LOCAL_POLICY_PACK } from "./policy-pack-us-state-and-local";
import { US_POLICY_POSITIONS_PACK } from "./policy-pack-us-policy-positions";
import { US_FEDERAL_POLICY_PACK } from "./policy-pack-us-federal";
import { US_FEDERAL_POSITIONS_PACK } from "./policy-pack-us-federal-positions";

const statutoryWageTaxRows: Readonly<
  Record<string, readonly LawConsequenceRow[]>
> = Object.fromEntries(
  [
    {
      key: "us-policy-positions:fiscal.adopt-income-tax",
      attributes: {
        level: "state-statute",
        taxKey: "{authority}:wage-income-tax",
      },
    },
    {
      key: "us-policy-positions:fiscal.graduated-income-tax",
      attributes: {
        level: "state-statute",
        taxKey: "{authority}:wage-income-tax",
      },
    },
    {
      key: "us-federal-positions:tax.raise-top-income-tax-rate",
      attributes: {
        level: "federal-statute",
        taxKey: "us-federal:income-tax-withholding",
        authority: "US",
      },
    },
  ].map(({ key, attributes }) => [
    key,
    (["assessment", "payment"] as const).map((when): LawConsequenceRow => ({
      id: `${key}:saved-statutory-${when}`,
      kind: "tax",
      when,
      who: { selector: "recorded-tax-base-payer", predicates: [] },
      what: "attribute-saved-statutory-tax",
      attributes,
      amount: { op: "record", key: "enacted-tax-assessment", unit: "minor" },
      conditions: [],
      lag: { days: 0, sourceIds: [] },
      onRepeal: "preserve-completed",
      evidence: {
        sourceIds: [
          "src/simulation/statutory-tax.ts",
          "src/simulation/statutory-tax-law-attribution.ts",
        ],
        population:
          "The named payer on the saved wage-tax liability or payment allocation.",
        scope:
          "An actual adopted law identified by the statutory wage-tax record.",
        why: "The statutory writer has already applied the wage rule; these rows attribute that existing result without reassessing or paying again.",
        uncertainty:
          "Absent historical law bindings remain unavailable; this row supplies no starting-law mapping or tax amount.",
      },
    })),
  ]),
);

/**
 * The policy packs this build loads.
 *
 * One place, so "what is this government about?" is a list rather than a search
 * through the tree, and so the load report has a single owner. Content arrives
 * by being added here and nowhere else; a mod loader would later append to the
 * same list and change nothing.
 *
 * The first pack is the vocabulary of American state, county and municipal
 * government, read from named sources. It says what these governments are
 * about; it does not say how often any question comes up, because no source
 * measures that on one basis across the three levels. A build that loads
 * nothing still produces the empty catalog, which is what keeps a pack a
 * decision rather than a compiled-in assumption.
 */
export const POLICY_PACKS: readonly PolicyPack[] = [
  // Order matters: the positions pack references this one's issues by
  // qualified key, and the loader resolves domains, then issues, then
  // principles, then propositions, so the vocabulary has to be registered
  // before the stances that point at it. The positions pack declares its own
  // principles, so it resolves those against itself in the same pass.
  US_STATE_AND_LOCAL_POLICY_PACK,
  {
    ...US_POLICY_POSITIONS_PACK,
    propositions: US_POLICY_POSITIONS_PACK.propositions?.map((row) => {
      const key = `${US_POLICY_POSITIONS_PACK.pack}:${row.key}`;
      const coverage = [
        COVERAGE_ELIGIBILITY_ROWS[key],
        COVERAGE_EFFECTIVE_ELIGIBILITY_ROWS[key],
      ].filter((consequence) => consequence !== undefined);
      const justice = LW17_PERSON_LANDING_ROWS[key] ?? [];
      const pay = MINIMUM_WAGE_PAY_ROWS[key];
      const service = [
        ...(SERVICE_DELIVERED_LAW_ROWS[key] ?? []),
        ...(statutoryWageTaxRows[key] ?? []),
      ];
      const rent = key === RENT_STABILIZATION_QUESTION;
      const tuition = key === TUITION_FREEZE_QUESTION;
      const snap = key === SNAP_WORK_REQUIREMENT_QUESTION;
      const developmentIncentive =
        key ===
        "us-policy-positions:business-commerce.cap-development-incentives";
      if (
        coverage.length === 0 &&
        justice.length === 0 &&
        !pay &&
        service.length === 0 &&
        !rent &&
        !tuition &&
        !snap &&
        !developmentIncentive
      )
        return row;
      return {
        ...row,
        ...(rent
          ? {
              parameters: row.parameters?.map((parameter) =>
                parameter.key === "coverage"
                  ? { ...parameter, allowedValues: RENT_COVERAGE_VALUES }
                  : parameter,
              ),
            }
          : {}),
        consequences: [
          ...(row.consequences ?? []),
          ...(rent ? [RENT_STABILIZATION_ROW] : []),
          ...(tuition ? [TUITION_FREEZE_ROW] : []),
          ...(snap ? [SNAP_PARTICIPATION_ROW] : []),
          ...(developmentIncentive ? [DEVELOPMENT_INCENTIVE_AWARD_ROW] : []),
          ...coverage,
          ...justice,
          ...(pay ? [pay] : []),
          ...service,
        ],
      };
    }),
  },
  // Federal government, in its own namespace. It references nothing in the
  // packs above and nothing above references it, so its place here decides
  // only where its rows sit in the catalog order: after, so every id the
  // state and local catalog already had keeps its position.
  US_FEDERAL_POLICY_PACK,
  // Positions on federal questions. Last, because it points into both packs
  // above: the federal issues and the principles the state and local
  // positions declare.
  {
    ...US_FEDERAL_POSITIONS_PACK,
    propositions: US_FEDERAL_POSITIONS_PACK.propositions?.map((row) => {
      const key = `${US_FEDERAL_POSITIONS_PACK.pack}:${row.key}`;
      const pay = MINIMUM_WAGE_PAY_ROWS[key];
      const service = [
        ...(SERVICE_DELIVERED_LAW_ROWS[key] ?? []),
        ...(statutoryWageTaxRows[key] ?? []),
      ];
      return service.length === 0 && !pay
        ? row
        : {
            ...row,
            consequences: [
              ...(row.consequences ?? []),
              ...(pay ? [pay] : []),
              ...service,
            ],
          };
    }),
  },
  TAX_TERMS_POLICY_PACK,
];

let cached: PolicyRegistry | null = null;

/** Loaded once. Pure from the caller's side: the same registry every time. */
export function loadedPolicyRegistry(): PolicyRegistry {
  cached ??= loadPolicyPacks(POLICY_PACKS);
  return cached;
}
