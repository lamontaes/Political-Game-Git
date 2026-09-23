import { appropriationFromEnactedMeasure } from "./governing/program-governing";
import { enactedRuleChanges } from "./enacted-rule-changes";
import { draftLineageComponents } from "./legislation-draft-lineage";
import { programFamilies } from "./legislation-program-families";
import type { ClauseDimension } from "./legislation-content-contracts";
import { currentMeasureProvisions } from "./legislative-politics";
import { stateKeyForJurisdictionSlug } from "./life-places";
import { adoptEnactedTaxPolicy } from "./tax-policy";
import { taxActivationReadiness } from "./tax-policy-activation";
import {
  TRANSIT_FAMILY_KEY,
  TRANSIT_VARIANT_KEY,
} from "./legislation-transit-families";
import { resolveTransitFunding } from "./transit-funding";
import type {
  EntityId,
  IsoDate,
  LegislativeProvisionRecord,
  PublicProgramAppropriationRecord,
  World,
} from "./types";

/**
 * What an enacted law changed in the world, and what it could not change yet.
 *
 * The owner's rule (ChatGPT memo #515, decision 2): a passed law first changes
 * a specific law, tax or budget record, and its effects reach people when that
 * rule reaches them — at the next collection, when money is committed and
 * paid, when a rule is next read. This module is the one place every
 * enactment passes through on the way to those records, and the one place
 * that reads the chain back.
 *
 * The chain, per ChatGPT's answer to `policy-effect-model-state-and-local`:
 * passage → effective rule → covered activity or base → actual tax, payment
 * or service → scoped aggregate response. Nothing here invents a magnitude.
 * A clause the game has no rule for is reported as exactly that, and the
 * question of what it should do is filed with research
 * (`law-clause-effects-by-family`, `law-economic-incidence-by-provision`).
 */

export const ENACTED_LAW_EFFECTS_VERSION = "enacted-law-effects/v1";

/** Research questions the "not modeled" lines point at. Never shown to a player. */
export const LAW_EFFECT_RESEARCH_QUESTIONS = {
  clauses: "law-clause-effects-by-family",
  economicIncidence: "law-economic-incidence-by-provision",
} as const;

export type LawLevelOfGovernment = "federal" | "state" | "local";

export type LawEffectLine =
  | {
      /** A tax the law levies, and what it has collected so far. */
      readonly kind: "tax";
      readonly status: "scheduled" | "in-effect" | "refused";
      readonly effectiveAt: IsoDate | null;
      readonly baseLabel: string;
      readonly collectedMinorUnits: number;
      readonly collections: number;
      readonly blockedCollections: number;
      readonly reason: string | null;
    }
  | {
      /** Spending authority the law created, and how far it got toward people. */
      readonly kind: "appropriation";
      readonly status: "scheduled" | "available" | "expired";
      readonly programKey: string;
      readonly amountMinorUnits: number;
      readonly availableFrom: IsoDate;
      readonly availableThrough: IsoDate;
      readonly committedMinorUnits: number;
      readonly paidMinorUnits: number;
      readonly failedPayments: number;
      /** Units of service returned to use by work this money paid for. */
      readonly unitsRestored: number;
    }
  | {
      /** The pinned transit program, which reads its own enacted clause. */
      readonly kind: "transit";
      readonly status: "available" | "unavailable";
      readonly reason: string | null;
      readonly amountMinorUnits: number | null;
    }
  | {
      /** A rule the game reads (seats, terms, qualifications) that the law changed. */
      readonly kind: "rule-change";
      readonly status: "scheduled" | "in-effect";
      readonly field: string;
      readonly officeKey: string;
      readonly operativeAt: IsoDate;
      readonly operativeBasis: "enacted-date" | "game-default";
    }
  | {
      /**
       * A clause the game has no rule for yet. The law is still law; the
       * world simply does not know what this part does. PLACEHOLDER until the
       * research answer arrives.
       */
      readonly kind: "not-modeled";
      readonly heading: string;
      readonly dimension: ClauseDimension | null;
      /** What the program is meant to change, as its family declares it. */
      readonly intendedOutcome: string | null;
      readonly researchQuestionId: string;
    }
  | {
      /** The law carries no operative text at all, so nothing can change. */
      readonly kind: "no-operative-text";
      readonly researchQuestionId: string;
    };

export interface EnactedLawEffects {
  readonly version: typeof ENACTED_LAW_EFFECTS_VERSION;
  readonly measureId: EntityId;
  readonly designation: string;
  readonly shortTitle: string;
  readonly level: LawLevelOfGovernment;
  readonly enactedOn: IsoDate;
  readonly effectiveAt: IsoDate | null;
  readonly lines: readonly LawEffectLine[];
}

/* -------------------------------------------------------------------------- */
/* Writing: the one step every enactment passes through                        */
/* -------------------------------------------------------------------------- */

/**
 * Turns one enacted measure into the records it changes: a tax policy, spending
 * authority. Idempotent — each writer dedupes on its own key — so the clock,
 * the player's bill route and a city council can all call it, and a save
 * reloaded mid-way writes nothing twice. A measure that is not enacted writes
 * nothing.
 *
 * Every enactment route calls this rather than its own subset: before it
 * existed the player's route adopted taxes but never appropriations, the
 * clock adopted appropriations but never taxes, and a council ordinance
 * adopted neither.
 */
export function applyEnactedLawEffects(
  world: World,
  measureId: EntityId,
): World {
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  );
  if (!enactment) return world;
  let next = world;
  const proposal = next.history.taxProposals?.find(
    (row) => row.measureId === measureId,
  );
  // Unsupported amended text stays enacted law; it does not roll the
  // enactment back or silently install the old tax effect.
  if (proposal && taxActivationReadiness(next, proposal.id).kind === "ready")
    next = adoptEnactedTaxPolicy(next, proposal.id);
  // The pinned transit program reads its own enacted clause when service is
  // requested (`transit-funding.ts`). A second, generic spending authority
  // from the same clause would let a governor commit the same money twice.
  if (!isPinnedTransitMeasure(next, measureId))
    next = appropriationFromEnactedMeasure(next, measureId);
  return next;
}

/** Applies {@link applyEnactedLawEffects} to every enactment new since `before`. */
export function applyNewlyEnactedLawEffects(
  before: World,
  after: World,
): World {
  if (before === after) return after;
  const previous = new Set(
    (before.history.legislativeEnactments ?? []).map((row) => row.id),
  );
  let next = after;
  for (const enactment of after.history.legislativeEnactments ?? []) {
    if (previous.has(enactment.id) || enactment.outcome !== "enacted") continue;
    next = applyEnactedLawEffects(next, enactment.measureId);
  }
  return next;
}

function isPinnedTransitMeasure(world: World, measureId: EntityId): boolean {
  return draftLineageComponents(world, measureId).some(
    (lineage) =>
      lineage.familyKey === TRANSIT_FAMILY_KEY &&
      lineage.variantKey === TRANSIT_VARIANT_KEY,
  );
}

/* -------------------------------------------------------------------------- */
/* Reading: whether and how each effect took place                             */
/* -------------------------------------------------------------------------- */

/** Every enacted law in the world with what it changed, newest first. */
export function enactedLawsWithEffects(
  world: World,
): readonly EnactedLawEffects[] {
  return (world.history.legislativeEnactments ?? [])
    .filter((row) => row.outcome === "enacted")
    .slice()
    .sort(
      (a, b) =>
        b.resolvedAt.localeCompare(a.resolvedAt) || b.sequence - a.sequence,
    )
    .map((row) => enactedLawEffects(world, row.measureId))
    .filter((row): row is EnactedLawEffects => row !== null);
}

/** What one enacted law changed. Null if the measure is not law. Read-only. */
export function enactedLawEffects(
  world: World,
  measureId: EntityId,
): EnactedLawEffects | null {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === measureId,
  );
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  );
  if (!measure || !enactment) return null;

  const lines: LawEffectLine[] = [];
  const provisions = currentMeasureProvisions(world, measureId);
  const consumed = new Set<EntityId>();

  // Tax.
  const proposal = world.history.taxProposals?.find(
    (row) => row.measureId === measureId,
  );
  if (proposal) {
    consumed.add(proposal.levyProvisionId);
    for (const provision of provisions)
      if (provision.provisionKey === "tax-levy") consumed.add(provision.id);
    lines.push(taxLine(world, proposal.id, proposal.terms.baseLabel));
  }

  // Transit (pinned program), or generic spending authority.
  if (isPinnedTransitMeasure(world, measureId)) {
    const resolution = resolveTransitFunding(world, measureId);
    for (const provision of provisions)
      if (isMoneyClause(provision)) consumed.add(provision.id);
    lines.push(
      resolution.kind === "available"
        ? {
            kind: "transit",
            status: "available",
            reason: null,
            amountMinorUnits: resolution.mandate.amount.minorUnits,
          }
        : {
            kind: "transit",
            status: "unavailable",
            reason: resolution.reason,
            amountMinorUnits: null,
          },
    );
  } else {
    const appropriations = (world.history.publicProgramRecords ?? []).filter(
      (row): row is PublicProgramAppropriationRecord =>
        row.kind === "appropriation" && row.sourceMeasureId === measureId,
    );
    if (appropriations.length > 0)
      for (const provision of provisions)
        if (isMoneyClause(provision)) consumed.add(provision.id);
    for (const appropriation of appropriations)
      lines.push(appropriationLine(world, appropriation));
  }

  // Rules the game reads.
  for (const change of enactedRuleChanges(world)) {
    if (change.measureId !== measureId) continue;
    lines.push({
      kind: "rule-change",
      status:
        change.operativeAt <= world.currentDate ? "in-effect" : "scheduled",
      field: change.field,
      officeKey: change.officeKey,
      operativeAt: change.operativeAt,
      operativeBasis: change.operativeBasis,
    });
  }

  // Everything else the law says, that no system reads yet.
  const clauseIndex = clauseDimensions(world, measureId);
  for (const provision of provisions) {
    if (consumed.has(provision.id)) continue;
    const known = clauseIndex.get(provision.provisionKey);
    // A timing clause says when the rest applies; it is not an effect itself.
    // An appropriation amount the game did not adopt (a city, Congress) is
    // reported below like any other unread clause.
    // Naming the program acted upon identifies the law; it changes nothing.
    if (
      known?.dimension === "timing" ||
      known?.dimension === "authority-reference"
    )
      continue;
    lines.push({
      kind: "not-modeled",
      heading: provision.heading,
      dimension: known?.dimension ?? null,
      intendedOutcome: known?.intendedOutcome ?? null,
      researchQuestionId: LAW_EFFECT_RESEARCH_QUESTIONS.clauses,
    });
  }

  if (lines.length === 0)
    lines.push({
      kind: "no-operative-text",
      researchQuestionId: LAW_EFFECT_RESEARCH_QUESTIONS.clauses,
    });

  return {
    version: ENACTED_LAW_EFFECTS_VERSION,
    measureId,
    designation: enactment.actDesignation ?? measure.designation,
    shortTitle: measure.shortTitle,
    level: levelOfGovernment(world, measure.jurisdictionId),
    enactedOn: enactment.resolvedAt,
    effectiveAt: enactment.effectiveAt,
    lines,
  };
}

function isMoneyClause(provision: LegislativeProvisionRecord): boolean {
  return (
    provision.provisionKey === "amount-provided" ||
    provision.provisionKey.endsWith(":amount-provided")
  );
}

function taxLine(
  world: World,
  proposalId: EntityId,
  baseLabel: string,
): LawEffectLine {
  const policies = (world.history.taxPolicies ?? []).filter(
    (row) => row.proposalId === proposalId,
  );
  if (policies.length === 0) {
    const readiness = taxActivationReadiness(world, proposalId);
    return {
      kind: "tax",
      status: "refused",
      effectiveAt: null,
      baseLabel,
      collectedMinorUnits: 0,
      collections: 0,
      blockedCollections: 0,
      reason: readiness.reason,
    };
  }
  const policyIds = new Set(policies.map((row) => row.id));
  const assessmentIds = new Set(
    (world.history.taxAssessments ?? [])
      .filter((row) => policyIds.has(row.policyId))
      .map((row) => row.id),
  );
  let collected = 0;
  let count = 0;
  let blocked = 0;
  for (const row of world.history.taxCollections ?? []) {
    if (!assessmentIds.has(row.assessmentId)) continue;
    if (row.status === "blocked") blocked += 1;
    else {
      count += 1;
      collected += row.transferredAmount.minorUnits;
    }
  }
  const effectiveAt = policies[0]!.effectiveAt;
  return {
    kind: "tax",
    status: effectiveAt <= world.currentDate ? "in-effect" : "scheduled",
    effectiveAt,
    baseLabel,
    collectedMinorUnits: collected,
    collections: count,
    blockedCollections: blocked,
    reason: null,
  };
}

function appropriationLine(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
): LawEffectLine {
  const records = world.history.publicProgramRecords ?? [];
  let committed = 0;
  let paid = 0;
  let failed = 0;
  let restored = 0;
  const commitmentIds = new Set<EntityId>();
  for (const row of records) {
    if (row.kind !== "commitment" || row.appropriationId !== appropriation.id)
      continue;
    commitmentIds.add(row.id);
    for (const installment of row.installments)
      committed += installment.amount.minorUnits;
  }
  for (const row of records) {
    if (row.kind === "installment" && commitmentIds.has(row.commitmentId)) {
      if (row.status === "failed") failed += 1;
      else {
        const commitment = records.find((r) => r.id === row.commitmentId);
        const plan =
          commitment?.kind === "commitment"
            ? commitment.installments[row.installmentIndex]
            : undefined;
        paid += plan?.amount.minorUnits ?? 0;
      }
    }
    if (row.kind === "capacity-outturn" && commitmentIds.has(row.commitmentId))
      restored += row.restoredUnits ?? 0;
  }
  const status =
    world.currentDate < appropriation.availableFrom
      ? "scheduled"
      : world.currentDate > appropriation.availableThrough
        ? "expired"
        : "available";
  return {
    kind: "appropriation",
    status,
    programKey: appropriation.programKey,
    amountMinorUnits: appropriation.amount.minorUnits,
    availableFrom: appropriation.availableFrom,
    availableThrough: appropriation.availableThrough,
    committedMinorUnits: committed,
    paidMinorUnits: paid,
    failedPayments: failed,
    unitsRestored: restored,
  };
}

/** The clause dimension and family intent behind each provision key the law was compiled from. */
function clauseDimensions(
  world: World,
  measureId: EntityId,
): Map<string, { dimension: ClauseDimension; intendedOutcome: string }> {
  const index = new Map<
    string,
    { dimension: ClauseDimension; intendedOutcome: string }
  >();
  const families = programFamilies();
  for (const lineage of draftLineageComponents(world, measureId)) {
    const family = families.find((row) => row.familyKey === lineage.familyKey);
    const variant = family?.variants.find(
      (row) => row.variantKey === lineage.variantKey,
    );
    if (!family || !variant) continue;
    for (const clause of variant.clauses) {
      const key =
        lineage.componentKey === undefined
          ? clause.provisionKey
          : `${lineage.componentKey}:${clause.provisionKey}`;
      index.set(key, {
        dimension: clause.dimension,
        intendedOutcome: family.intendedOutcome.statement,
      });
    }
  }
  return index;
}

function levelOfGovernment(
  world: World,
  jurisdictionId: EntityId,
): LawLevelOfGovernment {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  if (!jurisdiction) return "local";
  if (["united-states", "us"].includes(jurisdiction.slug)) return "federal";
  return stateKeyForJurisdictionSlug(jurisdiction.slug) ? "state" : "local";
}
