import { MINIMUM_WAGE_PAY_ROWS } from "./law-consequences/pay-rows";
import {
  RENT_STABILIZATION_QUESTION,
  RENT_STABILIZATION_ROW,
  RENT_COVERAGE_VALUES,
} from "./law-consequences/rent-stabilization-row";
import { STATUTORY_WAGE_TAX_ROWS } from "./law-consequences/statutory-wage-tax-rows";
import {
  TUITION_FREEZE_QUESTION,
  TUITION_FREEZE_ROW,
} from "./law-consequences/tuition-freeze-row";
import { TAX_TERMS_POLICY_PACK } from "./policy-pack-tax-terms";
import { COVERAGE_ELIGIBILITY_ROWS } from "./law-consequences/coverage-eligibility-rows";
import { SERVICE_DELIVERED_LAW_ROWS } from "./law-consequences/service-delivered-data";
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
      const justice = LW17_PERSON_LANDING_ROWS[key] ?? [];
      const coverage = COVERAGE_ELIGIBILITY_ROWS[key];
      const pay = MINIMUM_WAGE_PAY_ROWS[key];
      const service = [
        ...(SERVICE_DELIVERED_LAW_ROWS[key] ?? []),
        ...(STATUTORY_WAGE_TAX_ROWS[key] ?? []),
      ];
      const rent = key === RENT_STABILIZATION_QUESTION;
      const tuition = key === TUITION_FREEZE_QUESTION;
      if (
        justice.length === 0 &&
        !coverage &&
        !pay &&
        service.length === 0 &&
        !rent &&
        !tuition
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
          ...(coverage ? [coverage] : []),
          ...(pay ? [pay] : []),
          ...service,
          ...justice,
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
        ...(STATUTORY_WAGE_TAX_ROWS[key] ?? []),
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

/** For a test that wants a registry built from something other than the build's. */
export function resetLoadedPolicyRegistry(): void {
  cached = null;
}
