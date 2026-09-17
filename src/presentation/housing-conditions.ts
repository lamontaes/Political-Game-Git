import {
  assessAffordability,
  householdMembershipsAt,
  makeIsoDate,
} from "../simulation";
import type { EntityId, IsoDate, MoneyAmount, World } from "../simulation";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../simulation/macro-economy";

/**
 * Housing conditions, kept apart on purpose.
 *
 * CRUNCH47 C1: housing availability reads the represented supply and demand,
 * and a household's affordability is read separately, because adequate
 * aggregate supply can coexist with a household that cannot afford a
 * particular home. Nothing here merges the two into a single verdict, and
 * nothing infers a shortage from a price or a price from a shortage.
 *
 * Where an input is not represented, this says so rather than substituting a
 * number: the compiled sources carry no local housing stock, so a local layer
 * has no supply figure at all and the national ratio is labeled as national.
 */
export type HousingScope = "national" | "local-unavailable";

export interface HousingSupplyView {
  readonly scope: HousingScope;
  readonly asOfMonth: string | null;
  /** Modeled supply ÷ demand; 1 is authored neutral, never a shortage. */
  readonly supplyDemandRatio: number | null;
  readonly classification: "shortage" | "adequate" | "surplus" | null;
  /** Counts only where a recorded source supplies them. */
  readonly supplyUnits: number | null;
  readonly demandHouseholds: number | null;
  readonly basis: string;
}

export interface HouseholdAffordabilityView {
  readonly householdId: EntityId | null;
  /** The resource model's own status; never merged with the ratio above. */
  readonly status: "available" | "strained" | "blocked" | null;
  readonly remainingAfterProposalMinorUnits: number | null;
  readonly reasonKeys: readonly string[];
  readonly basis: string;
}

export interface HousingConditionsView {
  readonly asOf: IsoDate;
  readonly supply: HousingSupplyView;
  readonly affordability: HouseholdAffordabilityView;
  /** Inputs this World does not represent, named rather than guessed. */
  readonly missingInputs: readonly string[];
}

/**
 * What the World can actually say about housing for one person today.
 * Pure: it reads records and writes nothing.
 */
export function projectHousingConditions(
  world: World,
  personId: EntityId,
  proposedHousingCost: MoneyAmount | null = null,
): HousingConditionsView {
  const asOf = makeIsoDate(world.currentDate);
  const person = world.people[personId];
  if (!person) throw new Error("Housing conditions need an existing person.");
  const missingInputs: string[] = [];

  const local = macroConditionsAt(
    world,
    macroScopeForJurisdiction(person.homeJurisdictionId),
    asOf,
  );
  const national = macroConditionsAt(world, "national", asOf);
  const housing = national?.housing ?? null;
  if (local && local.housing === null) {
    missingInputs.push(
      "local housing stock: no compiled local supply or demand source, so only the national ratio exists",
    );
  }
  if (!national) {
    missingInputs.push(
      "macro housing conditions: this save records no economic history",
    );
  }
  const supply: HousingSupplyView = {
    scope: local && local.housing === null ? "local-unavailable" : "national",
    asOfMonth: national?.key ?? null,
    supplyDemandRatio: housing?.supplyDemandRatio ?? null,
    classification: housing?.classification ?? null,
    supplyUnits: housing?.supplyUnits ?? null,
    demandHouseholds: housing?.demandHouseholds ?? null,
    basis:
      housing === null
        ? "No represented housing supply or demand."
        : "Modeled national supply and demand; a ratio of 1 is the authored neutral, not a shortage.",
  };

  const membership = householdMembershipsAt(world, personId).at(-1) ?? null;
  const householdId = membership?.household.id ?? null;
  let affordability: HouseholdAffordabilityView = {
    householdId,
    status: null,
    remainingAfterProposalMinorUnits: null,
    reasonKeys: [],
    basis:
      householdId === null
        ? "This person is not recorded in a household."
        : "No proposed housing cost was given, so nothing was assessed.",
  };
  if (householdId !== null && proposedHousingCost !== null) {
    const assessment = assessAffordability(
      world,
      { kind: "household", householdId },
      proposedHousingCost,
      { cadenceKind: "schedule:monthly" },
    );
    affordability = {
      householdId,
      status: assessment.status,
      remainingAfterProposalMinorUnits:
        assessment.remainingAfterProposal.minorUnits,
      reasonKeys: assessment.reasonKeys,
      basis:
        "This household's own recorded balance and scheduled obligations, not the aggregate ratio above.",
    };
  }
  if (householdId === null) {
    missingInputs.push(
      "household affordability: no recorded household for this person",
    );
  }
  return { asOf, supply, affordability, missingInputs };
}
