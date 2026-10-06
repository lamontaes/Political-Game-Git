import { createStableId } from "../../../ids";
import { recordById } from "../../../history-index";
import { organizationProfileAt, workStatusAt } from "../../../life-queries";
import { lawEffectStamp } from "../../../law-effect-stamp";
import { recordWorldEvent } from "../../../world";
import { lawInForce } from "../../../governing/law-in-force";
import {
  readFinalEnactedLawCategories,
  readFinalEnactedLawTerm,
} from "../../../governing/final-law-term-query";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../../../law-consequence-types";
import type { EntityId, IsoDate, World } from "../../../types";
import {
  DEVELOPMENT_INCENTIVE_AWARD_ROW,
  DEVELOPMENT_INCENTIVE_QUESTION,
} from "./rows";

export {
  DEVELOPMENT_INCENTIVE_AWARD_ROW,
  DEVELOPMENT_INCENTIVE_QUESTION,
} from "./rows";

export const DEVELOPMENT_INCENTIVE_AWARD_EVENT =
  "business.incentive-award" as const;
const CAP_TERM_KEY = "cap";
const DISCLOSURE_TERM_KEY = "disclosure";
const DISCLOSURE_PREDICATE = "business.incentive-award-disclosure";
const CAP_UNIT = "usd-per-award" as const;

export type DevelopmentIncentiveAwardVerification =
  | "verified"
  | "governing-law-unavailable"
  | "law-does-not-cap-awards"
  | "operative-terms-unavailable"
  | "award-value-unavailable"
  | "award-exceeds-cap"
  | "required-disclosure-absent";

export type DevelopmentIncentiveAwardOutcome =
  | {
      readonly status: "recorded" | "duplicate";
      readonly eventId: EntityId;
      readonly verification: DevelopmentIncentiveAwardVerification;
    }
  | {
      readonly status:
        | "missing-organization"
        | "invalid-award-value"
        | "invalid-linked-work-record";
    };

export interface RecordDevelopmentIncentiveAwardInput {
  /** A stable key for the actual award/document in the source jurisdiction. */
  readonly sourceKey: string;
  /** Source citation or document locator, stored without altering its wording. */
  readonly sourceReference: string;
  readonly organizationId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly awardedAt: IsoDate;
  /** Actual award value in USD cents; null means the source did not report it. */
  readonly amountMinor: number | null;
  /** Disclosure fields actually supplied with the underlying award record. */
  readonly disclosedFields: readonly string[];
  /** Optional named connection, accepted only through an active recorded job. */
  readonly linkedWorkRelationshipId?: EntityId | null;
}

interface OperativeAwardTerms {
  readonly law: NonNullable<ReturnType<typeof lawInForce>>;
  readonly capDollars: number;
  readonly capSourceRecordIds: readonly EntityId[];
  readonly requiredDisclosureFields: readonly string[];
  readonly disclosureSourceRecordIds: readonly EntityId[];
}

function propositionId(world: World): EntityId | null {
  return (
    Object.values(world.policyCatalog.propositions).find(
      (row) => row.stableKey === DEVELOPMENT_INCENTIVE_QUESTION,
    )?.id ?? null
  );
}

function operativeAwardTerms(
  world: World,
  jurisdictionId: EntityId,
  onDate: IsoDate,
): OperativeAwardTerms | null {
  const proposition = propositionId(world);
  if (!proposition) return null;
  const law = lawInForce(world, jurisdictionId, proposition, onDate);
  if (!law || law.answer !== "yes") return null;
  const cap = readFinalEnactedLawTerm(world, law, {
    questionKey: DEVELOPMENT_INCENTIVE_QUESTION,
    termKey: CAP_TERM_KEY,
    unit: CAP_UNIT,
    onDate,
  });
  const disclosures = readFinalEnactedLawCategories(world, law, {
    questionKey: DEVELOPMENT_INCENTIVE_QUESTION,
    termKey: DISCLOSURE_TERM_KEY,
    onDate,
  });
  if (
    !cap ||
    !Number.isSafeInteger(cap.value) ||
    cap.value < 0 ||
    !Number.isSafeInteger(cap.value * 100) ||
    !disclosures ||
    new Set(disclosures.values).size !== disclosures.values.length
  )
    return null;
  return {
    law,
    capDollars: cap.value,
    capSourceRecordIds: cap.sourceRecordIds,
    requiredDisclosureFields: disclosures.values,
    disclosureSourceRecordIds: disclosures.sourceRecordIds,
  };
}

function rowIsSupported(row: LawConsequenceRow): boolean {
  return (
    row.id === DEVELOPMENT_INCENTIVE_AWARD_ROW.id &&
    row.kind === "business-incentive" &&
    row.when === "application" &&
    row.who.selector === "recorded-business-incentive-award" &&
    row.what === "record-capped-development-incentive-award" &&
    row.amount?.op === "term" &&
    row.amount.key === CAP_TERM_KEY &&
    row.amount.unit === CAP_UNIT &&
    row.conditions.length === 1 &&
    row.conditions[0]?.capability === DISCLOSURE_PREDICATE &&
    row.conditions[0].parameters.termKey === DISCLOSURE_TERM_KEY
  );
}

/**
 * Append the sourced award fact even when the rule cannot be verified. Only an
 * award with an actual value, final cap term and all final disclosure
 * categories receives the operative-law stamp; unknown remains unknown.
 */
export function recordDevelopmentIncentiveAward(
  world: World,
  input: RecordDevelopmentIncentiveAwardInput,
): {
  readonly world: World;
  readonly outcome: DevelopmentIncentiveAwardOutcome;
} {
  if (
    !world.history.organizations.some((row) => row.id === input.organizationId)
  )
    return { world, outcome: { status: "missing-organization" } };
  const organizationProfile = organizationProfileAt(
    world,
    input.organizationId,
    {
      asOfDate: input.awardedAt,
      historySequenceExclusive: world.history.nextSequence,
    },
  );
  if (
    !organizationProfile ||
    organizationProfile.closed ||
    !(
      organizationProfile.classification.startsWith("enterprise:") ||
      organizationProfile.classification === "sector:business"
    )
  )
    return { world, outcome: { status: "missing-organization" } };
  if (
    !input.sourceKey.trim() ||
    !input.sourceReference.trim() ||
    input.awardedAt > world.currentDate ||
    (input.amountMinor !== null &&
      (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0))
  )
    return { world, outcome: { status: "invalid-award-value" } };

  let linkedPersonId: EntityId | null = null;
  if (input.linkedWorkRelationshipId) {
    const relationship = world.history.workRelationships.find(
      (row) => row.id === input.linkedWorkRelationshipId,
    );
    const status = workStatusAt(world, input.linkedWorkRelationshipId, {
      asOfDate: input.awardedAt,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (
      !relationship ||
      relationship.organizationId !== input.organizationId ||
      relationship.startedAt > input.awardedAt ||
      !relationship.kind.startsWith("employment:") ||
      status?.status !== "active"
    )
      return { world, outcome: { status: "invalid-linked-work-record" } };
    linkedPersonId = relationship.personId;
  }

  if (!rowIsSupported(DEVELOPMENT_INCENTIVE_AWARD_ROW))
    throw new Error("Development incentive consequence row is not supported.");
  const stableKey = `business-incentive-award:${input.jurisdictionId}:${input.sourceKey}`;
  const previous = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (previous)
    return {
      world,
      outcome: {
        status: "duplicate",
        eventId: previous.id,
        verification:
          (previous.tags
            .find((tag) =>
              tag.startsWith("business.incentive-award.verification:"),
            )
            ?.slice("business.incentive-award.verification:".length) as
            DevelopmentIncentiveAwardVerification | undefined) ??
          "governing-law-unavailable",
      },
    };

  const proposition = propositionId(world);
  const law = proposition
    ? lawInForce(world, input.jurisdictionId, proposition, input.awardedAt)
    : null;
  const terms =
    law?.answer === "yes"
      ? operativeAwardTerms(world, input.jurisdictionId, input.awardedAt)
      : null;
  let verification: DevelopmentIncentiveAwardVerification;
  if (!law) verification = "governing-law-unavailable";
  else if (law.answer !== "yes") verification = "law-does-not-cap-awards";
  else if (!terms) verification = "operative-terms-unavailable";
  else if (input.amountMinor === null) verification = "award-value-unavailable";
  else if (input.amountMinor > terms.capDollars * 100)
    verification = "award-exceeds-cap";
  else if (
    terms.requiredDisclosureFields.some(
      (field) => !input.disclosedFields.includes(field),
    )
  )
    verification = "required-disclosure-absent";
  else verification = "verified";

  const eventId = createStableId("event", `${world.id}:${stableKey}`);
  const sourceRecordIds = [
    eventId,
    ...(input.linkedWorkRelationshipId ? [input.linkedWorkRelationshipId] : []),
    ...(terms?.capSourceRecordIds ?? []),
    ...(terms?.disclosureSourceRecordIds ?? []),
  ];
  const stamp =
    verification === "verified" && terms
      ? lawEffectStamp(terms.law, {
          effectKind: "business-incentive",
          questionKey: DEVELOPMENT_INCENTIVE_QUESTION,
          jurisdictionId: input.jurisdictionId,
          appliedAt: input.awardedAt,
          sourceRecordIds,
        })
      : null;
  if (verification === "verified" && !stamp)
    verification = "governing-law-unavailable";

  const disclosedFields = [...new Set(input.disclosedFields)];
  const next = recordWorldEvent(world, {
    stableKey,
    type: DEVELOPMENT_INCENTIVE_AWARD_EVENT,
    occurredAt: input.awardedAt,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      input.jurisdictionId,
      input.organizationId,
      ...(linkedPersonId ? [linkedPersonId] : []),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `business.incentive-award.source:${input.sourceReference}`,
      `business.incentive-award.organization:${input.organizationId}`,
      ...(input.amountMinor === null
        ? ["business.incentive-award.amount-unknown:true"]
        : [`business.incentive-award.amount-minor:${input.amountMinor}`]),
      `business.incentive-award.verification:${verification}`,
      ...(verification === "verified" && terms
        ? [`business.incentive-award.cap-usd:${terms.capDollars}`]
        : []),
      ...disclosedFields.map(
        (field) => `business.incentive-award.disclosure:${field}`,
      ),
      ...(linkedPersonId
        ? [
            `business.incentive-award.linked-person:${linkedPersonId}`,
            `business.incentive-award.work-relationship:${input.linkedWorkRelationshipId}`,
          ]
        : []),
      ...(terms?.capSourceRecordIds ?? []).map(
        (id) => `business.incentive-award.cap-source:${id}`,
      ),
      ...(terms?.disclosureSourceRecordIds ?? []).map(
        (id) => `business.incentive-award.disclosure-source:${id}`,
      ),
    ],
    summary:
      verification === "verified"
        ? "A jurisdiction records a development incentive award under its operative cap and disclosure rule."
        : "A jurisdiction records a sourced development incentive award whose compliance with the operative cap and disclosure rule is not established.",
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label:
          world.jurisdictions[input.jurisdictionId]?.name ??
          "the issuing jurisdiction",
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
    ...(stamp ? { lawEffectStamps: [stamp] } : {}),
  });
  if (verification === "verified") {
    const registration = DEVELOPMENT_INCENTIVE_REGISTRATION;
    const resolved = registration.resolve(
      next,
      DEVELOPMENT_INCENTIVE_AWARD_ROW,
      {
        activity: "application",
        activityId: eventId,
        onDate: input.awardedAt,
        subjectIds: [input.organizationId],
        questionKey: DEVELOPMENT_INCENTIVE_QUESTION,
        governingLawId: terms?.law.measureId,
      },
    );
    if (resolved.length !== 1)
      throw new Error("Recorded incentive award did not resolve through LW08.");
    for (const consequence of resolved) registration.apply(next, consequence);
  }
  return {
    world: next,
    outcome: { status: "recorded", eventId, verification },
  };
}

/** Read award facts and retain only person links proved by dated work records. */
export function developmentIncentiveAwardsForJurisdiction(
  world: World,
  jurisdictionId: EntityId,
  asOfDate: IsoDate = world.currentDate,
) {
  return world.history.events
    .filter(
      (event) =>
        event.type === DEVELOPMENT_INCENTIVE_AWARD_EVENT &&
        event.jurisdictionId === jurisdictionId &&
        event.occurredAt <= asOfDate,
    )
    .map((event) => {
      const organizationId = event.tags
        .find((tag) => tag.startsWith("business.incentive-award.organization:"))
        ?.slice("business.incentive-award.organization:".length) as
        EntityId | undefined;
      const amountTag = event.tags.find((tag) =>
        tag.startsWith("business.incentive-award.amount-minor:"),
      );
      const amountMinor = amountTag
        ? Number(
            amountTag.slice("business.incentive-award.amount-minor:".length),
          )
        : null;
      const workId = event.tags
        .find((tag) =>
          tag.startsWith("business.incentive-award.work-relationship:"),
        )
        ?.slice("business.incentive-award.work-relationship:".length) as
        EntityId | undefined;
      const relationship = workId
        ? world.history.workRelationships.find((row) => row.id === workId)
        : undefined;
      const activeStatus = relationship
        ? workStatusAt(world, relationship.id, {
            asOfDate: event.occurredAt,
            historySequenceExclusive: world.history.nextSequence,
          })
        : undefined;
      const linkedPersonId =
        organizationId &&
        relationship?.organizationId === organizationId &&
        relationship.startedAt <= event.occurredAt &&
        relationship.kind.startsWith("employment:") &&
        activeStatus?.status === "active"
          ? relationship.personId
          : null;
      return {
        event,
        organizationId,
        amountMinor,
        verification: event.tags
          .find((tag) =>
            tag.startsWith("business.incentive-award.verification:"),
          )
          ?.slice("business.incentive-award.verification:".length) as
          DevelopmentIncentiveAwardVerification | undefined,
        linkedPersonId,
        linkedWorkRelationshipId: linkedPersonId ? relationship?.id : null,
      };
    })
    .filter(
      (row) =>
        row.organizationId &&
        row.event.involvedEntityIds.includes(row.organizationId) &&
        (row.amountMinor === null ||
          (Number.isSafeInteger(row.amountMinor) && row.amountMinor >= 0)),
    );
}

function resolveDevelopmentIncentiveAward(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (!rowIsSupported(row))
    throw new Error("Missing development-incentive row capability.");
  if (context.activity !== "application" || row.when !== context.activity)
    return [];
  const event = recordById(world.history.events, context.activityId);
  if (
    !event ||
    event.type !== DEVELOPMENT_INCENTIVE_AWARD_EVENT ||
    event.occurredAt !== context.onDate ||
    !event.jurisdictionId ||
    !event.lawEffectStamps?.some(
      (entry) =>
        entry.effectKind === "business-incentive" &&
        entry.questionKey === DEVELOPMENT_INCENTIVE_QUESTION &&
        entry.jurisdictionId === event.jurisdictionId,
    )
  )
    return [];
  const organizationId = event.tags
    .find((tag) => tag.startsWith("business.incentive-award.organization:"))
    ?.slice("business.incentive-award.organization:".length) as
    EntityId | undefined;
  const amountMinor = Number(
    event.tags
      .find((tag) => tag.startsWith("business.incentive-award.amount-minor:"))
      ?.slice("business.incentive-award.amount-minor:".length),
  );
  const proposition = propositionId(world);
  if (
    !organizationId ||
    !event.involvedEntityIds.includes(organizationId) ||
    !Number.isSafeInteger(amountMinor) ||
    amountMinor < 0 ||
    !proposition
  )
    return [];
  const terms = operativeAwardTerms(
    world,
    event.jurisdictionId,
    context.onDate,
  );
  if (
    !terms ||
    terms.law.measureId !== event.lawEffectStamps[0]?.governingLawKey
  )
    return [];
  const disclosedFields = event.tags
    .filter((tag) => tag.startsWith("business.incentive-award.disclosure:"))
    .map((tag) => tag.slice("business.incentive-award.disclosure:".length));
  if (
    amountMinor > terms.capDollars * 100 ||
    terms.requiredDisclosureFields.some(
      (field) => !disclosedFields.includes(field),
    )
  )
    return [];
  if (context.subjectIds.length && !context.subjectIds.includes(organizationId))
    return [];
  return [
    {
      row,
      law: terms.law,
      questionKey: DEVELOPMENT_INCENTIVE_QUESTION,
      jurisdictionId: event.jurisdictionId,
      subject: { kind: "organization", id: organizationId },
      activityId: event.id,
      effectiveAt: event.occurredAt,
      sourceRecordIds: [
        event.id,
        ...terms.capSourceRecordIds,
        ...terms.disclosureSourceRecordIds,
      ],
      value: {
        type: "amount",
        value: terms.capDollars,
        unit: CAP_UNIT,
        currency: "USD",
      },
    },
  ];
}

function applyDevelopmentIncentiveAward(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  const verified = resolveDevelopmentIncentiveAward(world, resolved.row, {
    activity: "application",
    activityId: resolved.activityId,
    onDate: resolved.effectiveAt,
    subjectIds: [resolved.subject.id],
    questionKey: resolved.questionKey,
    governingLawId: resolved.law.measureId,
  });
  if (
    !verified.some(
      (candidate) => JSON.stringify(candidate) === JSON.stringify(resolved),
    )
  )
    throw new Error(
      "Development incentive award resolution is stale or unsupported.",
    );
  // The award event is the append-only consequence record; its law stamp and
  // source tags were written atomically after the cap/disclosure checks.
  return world;
}

export const DEVELOPMENT_INCENTIVE_REGISTRATION: LawConsequenceKindRegistration =
  {
    kind: "business-incentive",
    owner: "Session26",
    selectors: ["recorded-business-incentive-award"],
    actions: ["record-capped-development-incentive-award"],
    predicates: [DISCLOSURE_PREDICATE],
    units: [CAP_UNIT],
    resolve: resolveDevelopmentIncentiveAward,
    apply: applyDevelopmentIncentiveAward,
  };

export const lawConsequenceLw08DevelopmentIncentiveCapRegistrations = [
  DEVELOPMENT_INCENTIVE_REGISTRATION,
] as const;
