import { ageOnDate } from "./dates";
import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { makeIsoDate } from "./dates";
import { appendedList, recordById } from "./history-index";
import { createStableId } from "./ids";
import { lawInForce, type LawInForce } from "./governing/law-in-force";
import { countyRowOfficerForJurisdiction } from "./justice/county-offices";
import { latestLawPermission } from "./law-consequences/permission-records";
import { concealedCarryPermitRuleAt } from "./crime/offenders";
import { isPersonAliveAt } from "./vitality";
import { applyLawConsequences } from "./enacted-law-effects";
import type {
  PermitApplicationRecord,
  PermitReviewRecord,
  PermitRule,
  PermitStatusRecord,
} from "./permit-types";
import type { DecisionContext, EntityId, World } from "./types";

// These optional families are the narrow shared-integration payload. Readers
// remain compatible with old worlds; no second World/schema is introduced.
interface PermitHistory {
  readonly nextSequence: number;
  readonly permitApplications?: readonly PermitApplicationRecord[];
  readonly permitReviews?: readonly PermitReviewRecord[];
  readonly permitStatuses?: readonly PermitStatusRecord[];
}
export function permitApplications(
  world: World,
): readonly PermitApplicationRecord[] {
  const history: PermitHistory = world.history;
  return history.permitApplications ?? [];
}
export function permitStatuses(world: World): readonly PermitStatusRecord[] {
  const history: PermitHistory = world.history;
  return history.permitStatuses ?? [];
}
export function permitReviews(world: World): readonly PermitReviewRecord[] {
  const history: PermitHistory = world.history;
  return history.permitReviews ?? [];
}

function recordPermitReview(
  world: World,
  application: PermitApplicationRecord,
  rule: PermitRule,
): World {
  const stableKey = `permit-review/v1:${application.id}`;
  const prior = permitReviews(world).find((row) => row.stableKey === stableKey);
  if (prior) return world;
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const seated = countyRowOfficerForJurisdiction(
    world,
    rule.jurisdictionId,
    "sheriff",
  );
  const sheriff =
    seated &&
    seated.personId !== application.personId &&
    world.people[seated.personId] &&
    isPersonAliveAt(world, seated.personId, cutoff)
      ? seated
      : null;
  const ruleAnswer = concealedCarryPermitRuleAt(
    world,
    application.personId,
    rule.jurisdictionId,
    application.appliedAt,
  );
  const age = ageOnDate(
    world.people[application.personId]!.birthDate,
    application.appliedAt,
  );
  let outcome: PermitReviewRecord["outcome"];
  let reasonKey: PermitReviewRecord["reasonKey"];
  if (!seated) {
    outcome = "unavailable";
    reasonKey = "sheriff-not-recorded";
  } else if (!sheriff) {
    outcome = "unavailable";
    reasonKey = "sheriff-unavailable";
  } else if (ruleAnswer === "unknown") {
    outcome = "unavailable";
    reasonKey = "permission-record-missing";
  } else if (ruleAnswer === "prohibited") {
    outcome = "ineligible";
    reasonKey = "law-prohibits-permit";
  } else if (age < rule.minimumAgeYears) {
    outcome = "ineligible";
    reasonKey = "below-recorded-minimum-age";
  } else {
    outcome = "eligible";
    reasonKey = "meets-recorded-rule";
  }
  const permission = latestLawPermission(
    world,
    { kind: "person", id: application.personId },
    application.questionKey,
    application.appliedAt,
  );
  const sourceRecordIds = [
    application.id,
    ...(permission?.lawEffectStamps[0]?.governingLawKey ===
    application.governingLawKey
      ? [permission.id]
      : []),
    ...(sheriff ? [sheriff.participationId] : []),
  ];
  const review: PermitReviewRecord = {
    id: createStableId("decision", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    applicationId: application.id,
    reviewerPersonId: sheriff?.personId ?? null,
    reviewerParticipationId: sheriff?.participationId ?? null,
    lawMeasureId: application.governingLawKey,
    ruleSourceUrl: rule.sourceUrl,
    minimumAgeYears: rule.minimumAgeYears,
    outcome,
    reasonKey,
    sourceRecordIds: [...new Set(sourceRecordIds)],
  };
  return {
    ...world,
    history: {
      ...world.history,
      permitReviews: appendedList(permitReviews(world), [review]),
      nextSequence: world.history.nextSequence + 1,
    },
  };
}
export interface PermitApplicationResult {
  readonly world: World;
  readonly status: "unsupported" | "undecided" | "declined" | "applied";
  readonly applicationId: EntityId | null;
}

/** An application is a saved choice, never permission or automatic issuance. */
export function applyForPermit(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly law: LawInForce | null;
    readonly rule: PermitRule;
    readonly decision: DecisionContext;
  },
): PermitApplicationResult {
  const prior = permitApplications(world).find(
    (row) => row.stableKey === input.stableKey,
  );
  if (prior) {
    if (
      prior.personId !== input.personId ||
      prior.permitKind !== input.rule.permitKind
    )
      throw new Error(
        "Permit application key already names a different application.",
      );
    return { world, status: "applied", applicationId: prior.id };
  }
  const unsupported = {
    world,
    status: "unsupported",
    applicationId: null,
  } as const;
  const person = world.people[input.personId];
  const law = input.law;
  if (
    !person ||
    !law ||
    (law.answer !== "yes" && law.answer !== "no") ||
    !input.rule.sourceUrl.trim() ||
    !Number.isSafeInteger(input.rule.minimumAgeYears) ||
    input.rule.minimumAgeYears < 0
  )
    return unsupported;
  const question = Object.values(world.policyCatalog.propositions).find(
    (q) => q.stableKey === input.rule.questionKey,
  );
  if (!question) return unsupported;
  const actualLaw = lawInForce(
    world,
    input.rule.jurisdictionId,
    question.id,
    world.currentDate,
  );
  if (!actualLaw || actualLaw.measureId !== law.measureId) return unsupported;
  const authority = world.history.organizations.find(
    (row) =>
      row.stableKey === input.rule.issuingAuthorityOrganizationKey &&
      row.formedAt <= world.currentDate,
  );
  if (!authority) return unsupported;
  const decision = input.decision;
  if (
    decision.actorPersonId !== person.id ||
    decision.subject.entityId !== authority.id ||
    decision.subject.key !== input.rule.permitKind ||
    decision.randomness !== "none" ||
    decision.retention !== "durable" ||
    decision.cutoff.asOfDate !== world.currentDate ||
    decision.cutoff.historySequenceExclusive !== world.history.nextSequence ||
    decision.options.length !== 2 ||
    !decision.options.some((o) => o.key === "apply") ||
    !decision.options.some((o) => o.key === "wait")
  )
    throw new Error(
      "Permit application requires the actual applicant's current no-dice apply/wait decision.",
    );
  const existingTrace = world.history.decisionTraces.find(
    (row) => row.stableKey === `${decision.stableKey}:trace`,
  );
  if (existingTrace) {
    if (
      existingTrace.context.actorPersonId !== person.id ||
      existingTrace.context.subject.entityId !== authority.id ||
      existingTrace.context.subject.key !== input.rule.permitKind
    )
      throw new Error(
        "Permit decision key already names a different decision.",
      );
    if (
      isSelectedDecision(existingTrace) &&
      existingTrace.selectedOptionKey === "apply"
    )
      throw new Error(
        "Selected permit application has no saved application record.",
      );
    return {
      world,
      status: isSelectedDecision(existingTrace) ? "declined" : "undecided",
      applicationId: null,
    };
  }
  // An absence of recorded motives is not a decision to submit. The existing
  // engine must not turn its option-order fallback into an application.
  if (!decision.considerations.length)
    return { world, status: "undecided", applicationId: null };
  if (decision.considerations.some((factor) => !factor.sourceRefs.length))
    throw new Error("Permit motives require actual saved source evidence.");
  const evaluated = evaluateDecision(world, decision);
  let next = recordDurableDecisionTrace(world, evaluated);
  const trace = next.history.decisionTraces.at(-1)!;
  if (!isSelectedDecision(evaluated))
    return { world: next, status: "undecided", applicationId: null };
  if (evaluated.selectedOptionKey !== "apply")
    return { world: next, status: "declined", applicationId: null };
  const record: PermitApplicationRecord = {
    id: createStableId(
      "decision",
      `${world.id}:permit-application:${input.stableKey}`,
    ),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    recordedAt: next.currentDate,
    personId: person.id,
    issuingAuthorityOrganizationId: authority.id,
    permitKind: input.rule.permitKind,
    governingLawKey: law.measureId,
    questionKey: input.rule.questionKey,
    jurisdictionId: input.rule.jurisdictionId,
    appliedAt: next.currentDate,
    decisionTraceId: trace.id,
    ruleSourceUrl: input.rule.sourceUrl,
    sourceRecordIds: [
      trace.id,
      authority.id,
      ...(law.origin === "enacted" ? [law.measureId] : []),
    ],
  };
  const history = {
    ...next.history,
    permitApplications: appendedList(permitApplications(next), [record]),
    nextSequence: next.history.nextSequence + 1,
  };
  next = { ...next, history };
  next = applyLawConsequences(next, {
    onDate: next.currentDate,
    activity: "application",
    activityId: record.id,
    subjectIds: [person.id],
    governingLawId: law.measureId,
    questionKey: input.rule.questionKey,
  });
  next = recordPermitReview(next, record, input.rule);
  return { world: next, status: "applied", applicationId: record.id };
}

export function assertPermitIntegrity(world: World, ids: Set<EntityId>): void {
  let sequence = -1;
  for (const row of permitApplications(world)) {
    if (
      ids.has(row.id) ||
      row.id !==
        createStableId(
          "decision",
          `${world.id}:permit-application:${row.stableKey}`,
        ) ||
      !Number.isSafeInteger(row.sequence) ||
      row.sequence >= world.history.nextSequence
    )
      throw new Error(
        "Permit application has an invalid identity or sequence.",
      );
    ids.add(row.id);
    const authority = recordById(
      world.history.organizations,
      row.issuingAuthorityOrganizationId,
    );
    makeIsoDate(row.appliedAt);
    makeIsoDate(row.recordedAt);
    if (
      row.sequence <= sequence ||
      row.appliedAt > row.recordedAt ||
      row.recordedAt > world.currentDate ||
      !world.people[row.personId] ||
      !authority ||
      authority.formedAt > row.appliedAt ||
      authority.sequence >= row.sequence ||
      !row.permitKind.trim() ||
      !row.ruleSourceUrl.trim()
    )
      throw new Error("Invalid saved permit application.");
    const trace = recordById(world.history.decisionTraces, row.decisionTraceId);
    if (
      !trace ||
      trace.sequence >= row.sequence ||
      trace.recordedAt > row.appliedAt ||
      trace.context.actorPersonId !== row.personId ||
      trace.context.subject.entityId !== row.issuingAuthorityOrganizationId ||
      trace.context.subject.key !== row.permitKind ||
      !isSelectedDecision(trace) ||
      trace.selectedOptionKey !== "apply"
    )
      throw new Error(
        "Permit application requires its actual selected saved decision.",
      );
    const question = Object.values(world.policyCatalog.propositions).find(
      (q) => q.stableKey === row.questionKey,
    );
    const law = question
      ? lawInForce(world, row.jurisdictionId, question.id, row.appliedAt)
      : null;
    if (
      !law ||
      (law.answer !== "yes" && law.answer !== "no") ||
      law.measureId !== row.governingLawKey
    )
      throw new Error("Permit application has no matching operative law.");
    const measure =
      law.origin === "enacted"
        ? recordById(world.history.legislativeMeasures ?? [], law.measureId)
        : null;
    if (
      law.origin === "enacted" &&
      (!measure ||
        measure.sequence >= row.sequence ||
        measure.introducedAt > row.appliedAt)
    )
      throw new Error(
        "Permit application has unavailable enacted-law evidence.",
      );
    const expectedSources = [
      trace.id,
      authority.id,
      ...(measure ? [measure.id] : []),
    ];
    if (
      new Set(row.sourceRecordIds).size !== row.sourceRecordIds.length ||
      row.sourceRecordIds.length !== expectedSources.length ||
      expectedSources.some((id) => !row.sourceRecordIds.includes(id))
    )
      throw new Error("Permit application has invalid actual source evidence.");
    sequence = row.sequence;
  }
  let reviewSequence = -1;
  const applications = new Map(
    permitApplications(world).map((row) => [row.id, row]),
  );
  const reviewKeys = new Set<string>();
  for (const row of permitReviews(world)) {
    const application = applications.get(row.applicationId);
    if (
      ids.has(row.id) ||
      row.id !== createStableId("decision", `${world.id}:${row.stableKey}`) ||
      row.stableKey !== `permit-review/v1:${row.applicationId}` ||
      reviewKeys.has(row.stableKey) ||
      !application ||
      !Number.isSafeInteger(row.sequence) ||
      row.sequence <= reviewSequence ||
      row.sequence <= application.sequence ||
      row.sequence >= world.history.nextSequence ||
      row.recordedAt < application.appliedAt ||
      row.recordedAt > world.currentDate ||
      row.lawMeasureId !== application.governingLawKey ||
      !row.ruleSourceUrl.trim() ||
      !Number.isSafeInteger(row.minimumAgeYears) ||
      row.minimumAgeYears < 0 ||
      !["eligible", "ineligible", "unavailable"].includes(row.outcome) ||
      new Set(row.sourceRecordIds).size !== row.sourceRecordIds.length ||
      !row.sourceRecordIds.includes(application.id)
    )
      throw new Error("Invalid saved permit review.");
    const hasReviewer =
      row.reviewerPersonId !== null &&
      row.reviewerParticipationId !== null &&
      !!world.people[row.reviewerPersonId];
    if (
      (row.reviewerPersonId === null) !==
      (row.reviewerParticipationId === null)
    )
      throw new Error("Permit review has a partial sheriff identity.");
    const sheriffGap =
      row.reasonKey === "sheriff-not-recorded" ||
      row.reasonKey === "sheriff-unavailable";
    if (sheriffGap === hasReviewer || (!sheriffGap && !hasReviewer))
      throw new Error("Permit review must name its actual sheriff or gap.");
    for (const sourceId of row.sourceRecordIds) {
      if (sourceId === application.id) continue;
      const participation = recordById(
        world.history.organizationParticipations,
        sourceId,
      );
      const permission = recordById(
        world.history.lawPermissionRecords ?? [],
        sourceId,
      );
      if (!participation && !permission)
        throw new Error("Permit review cites missing saved evidence.");
      if (
        participation &&
        (participation.sequence >= row.sequence ||
          participation.personId !== row.reviewerPersonId)
      )
        throw new Error("Permit review cites a different sheriff's seat.");
      if (permission && permission.sequence >= row.sequence)
        throw new Error("Permit review cites future permission evidence.");
    }
    ids.add(row.id);
    reviewKeys.add(row.stableKey);
    reviewSequence = row.sequence;
  }
  // No status producer is admitted until actual eligibility evidence and a
  // cited processing rule are supplied; absence cannot grant a permit.
  if (permitStatuses(world).length)
    throw new Error("Permit issuance/status writer is not yet admitted.");
}
