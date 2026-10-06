import {
  createLawConsequenceRegistry,
  LAW_CONSEQUENCE_REGISTRATIONS,
} from "./law-consequence-registry";
import { validateLawConsequences } from "./law-consequence-validation";
import { MissingLawConsequenceTerm } from "./law-consequence-integrity-gap";
import { createStableId } from "./ids";
import { recordById } from "./history-index";
import { recordWorldEvent } from "./world";
import type {
  LawConsequenceContext,
  AnyLawConsequenceKindRegistration,
} from "./law-consequence-types";
import { appropriationFromEnactedMeasure } from "./governing/program-governing";
import { openProgramMattersForAllOffices } from "./governing/state-governing";
import {
  applyEnactedDuties,
  clauseOrigins,
  ENACTED_DUTY_RESEARCH_QUESTION,
  enactedDutiesOf,
} from "./enacted-duties";
import {
  applyFamilyAppropriations,
  appropriatedAgainst,
  isAuthorizationCeiling,
  isFamilyAppropriation,
} from "./enacted-appropriations";
import {
  applyEnactedEligibility,
  enactedEligibilityOf,
  isPurposeSection,
} from "./enacted-eligibility";
import { programLastDay, programTermChangeOf } from "./enacted-program-terms";
import { enactedRuleChanges } from "./enacted-rule-changes";
import { draftLineageComponents } from "./legislation-draft-lineage";
import { programFamilies } from "./legislation-program-families";
import type { ClauseDimension } from "./legislation-content-contracts";
import { currentMeasureProvisions } from "./legislative-politics";
import { municipalRulePackById } from "./municipal-rule-registry";
import { stateKeyForJurisdictionSlug } from "./life-places";
import { isTerritoryUsps } from "./state-reference";
import { adoptEnactedTaxPolicy } from "./tax-policy";
import { taxActivationReadiness } from "./tax-policy-activation";
import type {
  EntityId,
  IsoDate,
  LegislativeProvisionRecord,
  LegislativeProvisionEffectIntent,
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

export type LawLevelOfGovernment = "federal" | "state" | "territory" | "local";

/** A delivered program outturn with every field needed for grounded prose. */
export interface DeliveredServiceFact {
  readonly serviceLabel: string;
  readonly unitLabel: string;
  readonly placeLabel: string;
  readonly deliveredAt: IsoDate;
  readonly restoredUnits: number | null;
}

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
      /** Exact delivery facts from new, labeled outturn records. */
      readonly deliveredServices: readonly DeliveredServiceFact[];
    }
  | {
      /** A rule the game reads (seats, terms, qualifications) that the law changed. */
      readonly kind: "rule-change";
      readonly status: "scheduled" | "in-effect";
      readonly field: string;
      readonly officeKey: string;
      readonly operativeAt: IsoDate;
      readonly operativeBasis:
        "enacted-date" | "state-rule" | "estimated-state-rule" | "game-default";
    }
  | {
      /**
       * A duty the law places on a class of body, and what the bodies within
       * its reach did by its compliance date.
       */
      readonly kind: "duty";
      readonly status: "scheduled" | "in-effect";
      readonly heading: string;
      readonly coveredLabel: string;
      readonly coverage:
        "classes" | "unrecorded-test" | "conditional" | "unknown";
      readonly operativeAt: IsoDate;
      readonly complyBy: IsoDate;
      readonly enforcerLabel: string | null;
      readonly penaltyLabel: string | null;
      readonly complied: number;
      readonly complianceUnknown: number;
      readonly coverageUnknown: number;
      /** Who is covered, or whether they complied, awaits this research. */
      readonly researchQuestionId: string;
    }
  | {
      /**
       * A sum the law authorizes without providing it: a ceiling a later law
       * can appropriate against, or a yearly cap on what may be spent.
       */
      readonly kind: "authorization";
      readonly heading: string;
      readonly ceilingMinorUnits: number;
      readonly annual: boolean;
      /** Appropriated by later enacted laws written against this one. */
      readonly appropriatedAgainstMinorUnits: number;
    }
  | {
      /** A program's end date the law set, extended or brought by repeal. */
      readonly kind: "program-term";
      readonly change: "sunset" | "extension" | "repeal";
      /** What the law acts on, as the bill names it. */
      readonly heading: string;
      readonly lastDay: IsoDate;
      /** Whether a later enacted law has since set a different date. */
      readonly superseded: boolean;
      readonly status: "in-force" | "ended";
    }
  | {
      /** Who the law says qualifies for, or is subject to, what it does. */
      readonly kind: "eligibility";
      readonly heading: string;
      readonly coveredLabel: string;
      readonly subject:
        "bodies" | "households" | "people" | "places" | "structures";
      readonly coverage:
        "classes" | "unrecorded-test" | "conditional" | "unknown";
      /** Bodies on record that meet it; null when the world cannot say. */
      readonly qualifying: number | null;
      /** Bodies on record in the class whose size or place is not known. */
      readonly unknown: number;
      readonly researchQuestionId: string;
    }
  | {
      /**
       * A clause the game has no rule for yet. The law is still law; the
       * world records that this part has no implemented causal rule until the
       * named research answer arrives.
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
  /** Typed clause intents and whether an admitted writer recorded their effect. */
  readonly hasTypedOperativeEffect: boolean;
  readonly operativeEffectOutcomes: readonly {
    readonly provisionId: EntityId;
    readonly provisionKey: string;
    readonly effectKind: LegislativeProvisionEffectIntent["kind"];
    readonly status: "applied" | "refused";
    readonly refusalReason: string | null;
  }[];
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
  // Every enacted amount has one saved program authority, transit included.
  const previousAppropriations = new Set(
    (next.history.publicProgramRecords ?? [])
      .filter((record) => record.kind === "appropriation")
      .map((record) => record.id),
  );
  next = appropriationFromEnactedMeasure(next, measureId);
  // A family's own appropriating section, e.g. "There is appropriated to a
  // service line replacement fund a sum not to exceed ...". A generic
  // "amount provided" clause is not one, so nothing is written twice.
  next = applyFamilyAppropriations(next, measureId);
  const newAppropriations = new Set(
    (next.history.publicProgramRecords ?? [])
      .filter(
        (record) =>
          record.kind === "appropriation" &&
          !previousAppropriations.has(record.id),
      )
      .map((record) => record.id),
  );
  if (newAppropriations.size > 0)
    next = openProgramMattersForAllOffices(next, newAppropriations);
  // A section that places a duty on a class of body.
  next = applyEnactedDuties(next, measureId);
  // A section that says who qualifies for, or is subject to, the Act.
  next = applyEnactedEligibility(next, measureId);
  return applyLawConsequences(next, {
    onDate: next.currentDate,
    activity: "effective",
    activityId: enactment.id,
    subjectIds: [],
    governingLawId: measureId,
  });
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

  // Spending authority, the same for every program.
  {
    const appropriations = (world.history.publicProgramRecords ?? []).filter(
      (row): row is PublicProgramAppropriationRecord =>
        row.kind === "appropriation" && row.sourceMeasureId === measureId,
    );
    const hasExplicitEffectIntents = provisions.some(
      (provision) => provision.operativeEffect !== undefined,
    );
    if (appropriations.length > 0)
      for (const provision of provisions)
        if (
          isMoneyClause(provision) &&
          (!hasExplicitEffectIntents ||
            provision.operativeEffect?.kind === "public-program-appropriation")
        )
          consumed.add(provision.id);
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

  // Duties the law places on bodies.
  for (const { duty, findings } of enactedDutiesOf(world, measureId)) {
    consumed.add(duty.provisionId);
    const count = (outcome: string) =>
      findings.filter((row) => row.outcome === outcome).length;
    lines.push({
      kind: "duty",
      status: duty.complyBy <= world.currentDate ? "in-effect" : "scheduled",
      heading: duty.heading,
      coveredLabel: duty.coverage.coveredLabel,
      coverage: duty.coverage.kind,
      operativeAt: duty.operativeAt,
      complyBy: duty.complyBy,
      enforcerLabel: duty.enforcerLabel,
      penaltyLabel: duty.penaltyLabel,
      complied: count("complied"),
      complianceUnknown: count("compliance-unknown"),
      coverageUnknown: count("coverage-unknown"),
      researchQuestionId: ENACTED_DUTY_RESEARCH_QUESTION,
    });
  }

  // A program's life: an end date set, extended or brought by repeal.
  const term = programTermChangeOf(world, measureId);
  if (term) {
    consumed.add(term.provisionId);
    const current = programLastDay(world, term.target);
    const superseded = current !== null && current.measureId !== measureId;
    const lastDay = superseded ? current!.lastDay : term.lastDay;
    lines.push({
      kind: "program-term",
      change: term.kind,
      heading:
        provisions.find((row) => row.id === term.provisionId)?.heading ?? "",
      lastDay: term.lastDay,
      superseded,
      status: world.currentDate > lastDay ? "ended" : "in-force",
    });
  }

  // Sums the law authorizes without providing. A later law is written
  // against the whole Act, so its ceilings are read as one sum, as the docket
  // reads them; a yearly cap is read on its own.
  const origins = clauseOrigins(world, measureId);
  const ceilings = provisions.filter(
    (provision) =>
      !consumed.has(provision.id) &&
      origins.get(provision.provisionKey)?.lever === "money" &&
      isAuthorizationCeiling(provision),
  );
  for (const provision of ceilings) consumed.add(provision.id);
  const whole = ceilings.filter((row) => row.fiscalPeriod !== "annual");
  if (whole.length > 0)
    lines.push({
      kind: "authorization",
      heading: whole.map((row) => row.heading).join(" and "),
      ceilingMinorUnits: whole.reduce(
        (sum, row) => sum + row.fiscalExposureMinorUnits!,
        0,
      ),
      annual: false,
      appropriatedAgainstMinorUnits: appropriatedAgainst(world, measureId),
    });
  for (const provision of ceilings)
    if (provision.fiscalPeriod === "annual")
      lines.push({
        kind: "authorization",
        heading: provision.heading,
        ceilingMinorUnits: provision.fiscalExposureMinorUnits!,
        annual: true,
        appropriatedAgainstMinorUnits: 0,
      });

  // Who the law applies to.
  for (const reading of enactedEligibilityOf(world, measureId)) {
    consumed.add(reading.record.provisionId);
    lines.push({
      kind: "eligibility",
      heading: reading.record.heading,
      coveredLabel: reading.record.coverage.coveredLabel,
      subject: reading.record.subject,
      coverage: reading.record.coverage.kind,
      qualifying: reading.qualifying,
      unknown: reading.unknown,
      researchQuestionId: ENACTED_DUTY_RESEARCH_QUESTION,
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
    // A purpose section says why the Act exists and names no one.
    if (
      known?.dimension === "timing" ||
      known?.dimension === "authority-reference" ||
      (known?.dimension === "eligibility-scope" &&
        isPurposeSection(provision.provisionKey))
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
    level: levelOfGovernment(world, measure),
    enactedOn: enactment.resolvedAt,
    effectiveAt: enactment.effectiveAt,
    hasTypedOperativeEffect: provisions.some(
      (provision) => provision.operativeEffect !== undefined,
    ),
    operativeEffectOutcomes: operativeEffectOutcomes(
      world,
      measureId,
      provisions,
    ),
    lines,
  };
}

function operativeEffectOutcomes(
  world: World,
  measureId: EntityId,
  provisions: readonly LegislativeProvisionRecord[],
): EnactedLawEffects["operativeEffectOutcomes"] {
  const appropriations = (world.history.publicProgramRecords ?? []).filter(
    (record): record is PublicProgramAppropriationRecord =>
      record.kind === "appropriation" && record.sourceMeasureId === measureId,
  );
  const matchedAppropriationIds = new Set<EntityId>();
  return provisions.flatMap<
    EnactedLawEffects["operativeEffectOutcomes"][number]
  >((provision) => {
    const effect = provision.operativeEffect;
    if (!effect) return [];
    if (effect.kind === "tax-policy") {
      const proposal = world.history.taxProposals?.find(
        (row) =>
          row.measureId === measureId && row.levyProvisionId === provision.id,
      );
      if (!proposal)
        return [
          {
            provisionId: provision.id,
            provisionKey: provision.provisionKey,
            effectKind: effect.kind,
            status: "refused" as const,
            refusalReason:
              "No tax proposal is linked to this typed tax provision.",
          },
        ];
      if (
        world.history.taxPolicies?.some((row) => row.proposalId === proposal.id)
      )
        return [
          {
            provisionId: provision.id,
            provisionKey: provision.provisionKey,
            effectKind: effect.kind,
            status: "applied" as const,
            refusalReason: null,
          },
        ];
      const readiness = taxActivationReadiness(world, proposal.id);
      return [
        {
          provisionId: provision.id,
          provisionKey: provision.provisionKey,
          effectKind: effect.kind,
          status: "refused" as const,
          refusalReason:
            readiness.kind === "unavailable"
              ? readiness.reason
              : "No enacted tax-policy version is recorded.",
        },
      ];
    }

    const appropriation = appropriations.find(
      (record) =>
        !matchedAppropriationIds.has(record.id) &&
        record.jurisdictionId === provision.applicationScope.jurisdictionId &&
        record.amount.minorUnits === provision.fiscalExposureMinorUnits,
    );
    if (appropriation) {
      matchedAppropriationIds.add(appropriation.id);
      return [
        {
          provisionId: provision.id,
          provisionKey: provision.provisionKey,
          effectKind: effect.kind,
          status: "applied" as const,
          refusalReason: null,
        },
      ];
    }
    return [
      {
        provisionId: provision.id,
        provisionKey: provision.provisionKey,
        effectKind: effect.kind,
        status: "refused" as const,
        refusalReason:
          "No spending authority matching the typed amount and jurisdiction was recorded.",
      },
    ];
  });
}

function isMoneyClause(provision: LegislativeProvisionRecord): boolean {
  return (
    provision.provisionKey === "amount-provided" ||
    provision.provisionKey.endsWith(":amount-provided") ||
    isFamilyAppropriation(provision)
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
  const deliveredServices: DeliveredServiceFact[] = [];
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
    if (
      row.kind === "capacity-outturn" &&
      commitmentIds.has(row.commitmentId)
    ) {
      restored += row.restoredUnits ?? 0;
      if (
        row.serviceLabel?.trim() &&
        row.unitLabel?.trim() &&
        row.placeLabel?.trim()
      )
        deliveredServices.push({
          serviceLabel: row.serviceLabel,
          unitLabel: row.unitLabel,
          placeLabel: row.placeLabel,
          deliveredAt: row.recordedAt,
          restoredUnits: row.restoredUnits,
        });
    }
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
    deliveredServices,
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
  measure: { readonly jurisdictionId: EntityId; readonly rulePackId: string },
): LawLevelOfGovernment {
  if (measure.rulePackId === "us-congress-v1") return "federal";
  if (municipalRulePackById(measure.rulePackId)) return "local";
  const jurisdiction = world.jurisdictions[measure.jurisdictionId];
  if (!jurisdiction) return "local";
  if (["us-federal", "united-states", "us"].includes(jurisdiction.slug))
    return "federal";
  const stateKey = stateKeyForJurisdictionSlug(jurisdiction.slug);
  if (!stateKey) return "local";
  return isTerritoryUsps(stateKey.slice(3)) ? "territory" : "state";
}

/** Shared dispatch for starting and enacted laws. Resolvers retain canonical origin. */
export function applyLawConsequences(
  world: World,
  context: LawConsequenceContext,
  registrations: readonly AnyLawConsequenceKindRegistration[] = LAW_CONSEQUENCE_REGISTRATIONS,
): World {
  const registry = createLawConsequenceRegistry([
    ...LAW_CONSEQUENCE_REGISTRATIONS,
    ...registrations.filter(
      (entry) => !LAW_CONSEQUENCE_REGISTRATIONS.includes(entry),
    ),
  ]);
  let next = world;
  for (const id of world.policyCatalog.propositionOrder) {
    const proposition = world.policyCatalog.propositions[id];
    if (
      context.standingAppropriationId ||
      !proposition ||
      (context.questionKey && proposition.stableKey !== context.questionKey)
    )
      continue;
    const rows = (proposition.consequences ?? []).filter(
      (row) => row.when === context.activity,
    );
    const errors = validateLawConsequences(rows, registry.capabilities);
    if (errors.length) throw new Error(errors.join("; "));
    for (const row of rows) {
      if (row.onward?.length)
        throw new Error(
          `Consequence ${row.id}: missing saved-parent onward dispatch capability`,
        );
      const registration = registry.handlers.get(row.kind);
      if (!registration)
        throw new Error(
          `Consequence ${row.id}: missing kind capability '${row.kind}'`,
        );
      let resolved;
      try {
        resolved = registration.resolve(next, row, {
          ...context,
          questionKey: proposition.stableKey,
        });
      } catch (error) {
        if (!(error instanceof MissingLawConsequenceTerm)) throw error;
        const stableKey = `law-term-gap:${error.law.measureId}:${row.id}:${error.personId}:${error.termKey}:${context.activityId}:${context.onDate}`;
        if (
          !recordById(
            next.history.events,
            createStableId("event", `${next.id}:${stableKey}`),
          )
        ) {
          next = recordWorldEvent(next, {
            stableKey,
            type: "law.consequence-integrity-gap",
            occurredAt: context.onDate,
            recordedAt: next.currentDate,
            jurisdictionId: error.jurisdictionId,
            involvedEntityIds: [error.personId],
            participants: [],
            personFactConstraints: [],
            visibility: "private",
            tags: [
              "law:missing-final-term",
              error.questionKey,
              error.law.measureId,
              error.rowId,
              `term:${error.termKey}`,
              `unit:${error.unit}`,
            ],
            summary:
              "The pay adjustment could not be calculated because its saved law has no matching numeric term.",
            context: {
              location: null,
              socialContext: null,
              pressure: null,
              choice: null,
              motivation: null,
              immediateReaction: null,
            },
          });
        }
        continue;
      }
      for (const input of resolved) {
        if (
          input.row.id !== row.id ||
          input.questionKey !== proposition.stableKey ||
          input.activityId !== context.activityId
        )
          throw new Error(
            `Consequence ${row.id}: resolver returned inconsistent cause identity`,
          );
        if (
          context.governingLawId &&
          input.law.measureId !== context.governingLawId
        )
          continue;
        if (
          input.effectiveAt > context.onDate ||
          input.law.operativeAt > context.onDate
        )
          continue;
        next = registration.apply(next, input);
      }
    }
  }
  if (!context.questionKey) {
    for (const registration of registry.handlers.values()) {
      if (!registration.resolveSavedRules) continue;
      for (const input of registration.resolveSavedRules(next, context)) {
        const { row, authority } = input;
        const errors = validateLawConsequences([row], registry.capabilities);
        if (errors.length) throw new Error(errors.join("; "));
        if (row.onward?.length)
          throw new Error(
            `Consequence ${row.id}: unsupported standing onward dispatch`,
          );
        if (
          row.kind !== registration.kind ||
          row.when !== context.activity ||
          input.activityId !== context.activityId ||
          !context.subjectIds.includes(input.subject.id)
        )
          throw new Error(
            `Consequence ${row.id}: inconsistent saved authority`,
          );
        if (
          input.value.type === "amount" &&
          !registration.units.includes(input.value.unit)
        )
          throw new Error(
            `Consequence ${row.id}: unsupported saved authority unit`,
          );
        if (input.effectiveAt > context.onDate) continue;
        if (authority.kind === "enacted-typed-tax-policy") {
          if (
            row.kind !== "tax" ||
            context.activity !== "assessment" ||
            context.origin === "in-force-at-start" ||
            context.standingAppropriationId ||
            (context.governingLawId &&
              authority.measureId !== context.governingLawId)
          )
            continue;
          // The tax registration re-resolves the saved policy/base/enactment and compares the entire result before the common assessment writer runs.
          next = registration.apply(next, input);
          continue;
        }
        if (
          authority.kind === "enacted-hourly-pay-rule" ||
          authority.kind === "enacted-annual-office-pay-rule"
        ) {
          if (
            row.kind !== "pay" ||
            context.activity !== "payroll" ||
            context.standingAppropriationId ||
            (context.governingLawId &&
              authority.measureId !== context.governingLawId)
          )
            continue;
          next = registration.apply(next, input);
          continue;
        }
        if (context.governingLawId || context.origin === "enacted") continue;
        if (
          context.standingAppropriationId &&
          context.standingAppropriationId !== authority.appropriationId
        )
          continue;
        const saved = (next.history.publicProgramRecords ?? []).find(
          (record) => record.id === authority.appropriationId,
        );
        if (
          authority.kind !== "standing-program-appropriation" ||
          row.kind !== "service-delivered" ||
          context.activity !== "service" ||
          saved?.kind !== "appropriation" ||
          saved.sourceMeasureId != null ||
          saved.basis.kind !== "sourced" ||
          !saved.basis.note.trim() ||
          saved.recordedAt > context.onDate ||
          authority.programKey !== saved.programKey ||
          authority.jurisdictionId !== saved.jurisdictionId ||
          input.jurisdictionId !== saved.jurisdictionId ||
          authority.accountOrganizationId !== saved.accountOrganizationId ||
          authority.availableFrom !== saved.availableFrom ||
          authority.availableThrough !== saved.availableThrough ||
          authority.sourceBasis.kind !== saved.basis.kind ||
          authority.sourceBasis.note !== saved.basis.note ||
          JSON.stringify(authority.publicGovernmentIdentity) !==
            JSON.stringify(saved.publicGovernmentIdentity) ||
          !input.sourceRecordIds.includes(saved.id) ||
          !input.sourceRecordIds.includes(saved.eventId)
        )
          throw new Error(
            `Consequence ${row.id}: inconsistent standing appropriation`,
          );
        if (
          input.effectiveAt < saved.availableFrom ||
          input.effectiveAt > saved.availableThrough
        )
          continue;
        next = registration.apply(next, input);
      }
    }
  }
  return next;
}
