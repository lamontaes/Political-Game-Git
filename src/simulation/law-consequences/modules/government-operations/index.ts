import { ageOnDate } from "../../../dates";
import { lawInForce } from "../../../governing/law-in-force";
import {
  householdLocationAt,
  householdMembershipsAt,
  workRelationshipHistoryForPerson,
  workRoleHistory,
  workStatusHistory,
} from "../../../life-queries";
import {
  appendLawPermission,
  latestLawPermission,
} from "../../permission-records";
import { recordLawExposure } from "../../../law-exposure";
import { recordWorldEvent } from "../../../world";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../../../law-consequence-types";
import type { EntityId, World } from "../../../types";
import { GOVERNMENT_OPERATIONS_LAW_ROWS } from "../../government-operations-rows";

const KIND = "government-operations" as const;
const VOTING_SELECTOR = "government-operations-voting-age-resident";
const FORMER_OFFICIAL_SELECTOR = "government-operations-former-public-official";
const SCOPE = "government-operations-subject";
const ACTIONS = [
  "apply-photo-id-voting-requirement",
  "apply-former-office-lobbying-bar",
  "apply-same-day-registration-rule",
] as const;
const SELECTORS = [VOTING_SELECTOR, FORMER_OFFICIAL_SELECTOR] as const;

interface Candidate {
  readonly personId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly sourceRecordIds: readonly EntityId[];
}

function candidateRows(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly Candidate[] {
  const cutoff = {
    asOfDate: context.onDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const allowed = context.subjectIds.length
    ? new Set(context.subjectIds)
    : null;
  if (row.who.selector === VOTING_SELECTOR) {
    const candidates: Candidate[] = [];
    for (const personId of allowed ?? world.personOrder) {
      const person = world.people[personId];
      if (!person || ageOnDate(person.birthDate, context.onDate) < 18) continue;
      const membership = householdMembershipsAt(world, personId, cutoff)[0];
      if (!membership) continue;
      const location = householdLocationAt(
        world,
        membership.membership.householdId,
        cutoff,
      );
      if (!location?.jurisdictionId) continue;
      candidates.push({
        personId,
        jurisdictionId: location.jurisdictionId,
        sourceRecordIds: [membership.membership.id, location.id],
      });
    }
    return candidates;
  }
  if (row.who.selector === FORMER_OFFICIAL_SELECTOR) {
    const candidates: Candidate[] = [];
    for (const personId of allowed ?? world.personOrder) {
      for (const relationship of workRelationshipHistoryForPerson(
        world,
        personId,
        cutoff,
      )) {
        if (
          relationship.kind !== "employment:legislative-member" &&
          relationship.kind !== "employment:executive-office"
        )
          continue;
        const status = workStatusHistory(world, relationship.id, cutoff).at(-1);
        const role = workRoleHistory(world, relationship.id, cutoff).at(-1);
        if (
          status?.status !== "ended" ||
          status.effectiveAt > context.onDate ||
          !role?.locationJurisdictionId
        )
          continue;
        candidates.push({
          personId,
          jurisdictionId: role.locationJurisdictionId,
          sourceRecordIds: [relationship.id, status.id, role.id],
        });
      }
    }
    return candidates;
  }
  throw new Error(
    `Unsupported government-operations selector: ${row.who.selector}`,
  );
}

function checkedRow(row: LawConsequenceRow): void {
  if (
    row.kind !== KIND ||
    row.when !== "effective" ||
    !(SELECTORS as readonly string[]).includes(row.who.selector) ||
    !(ACTIONS as readonly string[]).includes(row.what) ||
    row.decision?.op !== "term" ||
    row.decision.key !== "law-answer" ||
    row.decision.type !== "boolean" ||
    row.amount ||
    row.lag.days !== 0 ||
    row.onward?.length
  )
    throw new Error("Unsupported government-operations consequence row.");
  const predicates = [...row.who.predicates, ...row.conditions];
  if (
    predicates.length !== 1 ||
    predicates[0]!.capability !== SCOPE ||
    Object.keys(predicates[0]!.parameters).length !== 1 ||
    !["voting-age-resident", "former-public-official"].includes(
      String(predicates[0]!.parameters.group),
    )
  )
    throw new Error(
      "Government-operations row needs one explicit population scope.",
    );
}

export function resolveGovernmentOperations(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  checkedRow(row);
  if (context.activity !== "effective" || context.onDate > world.currentDate)
    return [];
  const question = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === context.questionKey,
  );
  if (!question) return [];
  const canonical = GOVERNMENT_OPERATIONS_LAW_ROWS[question.stableKey];
  if (
    !canonical ||
    canonical.id !== row.id ||
    JSON.stringify(canonical) !== JSON.stringify(row)
  )
    throw new Error("Government-operations requires its exact catalog row.");
  const candidates = candidateRows(world, row, context);
  const result: ResolvedLawConsequence[] = [];
  for (const candidate of candidates) {
    const law = lawInForce(
      world,
      candidate.jurisdictionId,
      question.id,
      context.onDate,
    );
    if (
      !law ||
      (law.answer !== "yes" && law.answer !== "no") ||
      (context.governingLawId && law.measureId !== context.governingLawId)
    )
      continue;
    result.push({
      row,
      law,
      questionKey: question.stableKey,
      jurisdictionId: candidate.jurisdictionId,
      subject: { kind: "person", id: candidate.personId },
      activityId: context.activityId,
      effectiveAt: context.onDate,
      sourceRecordIds: [...new Set(candidate.sourceRecordIds)],
      value: { type: "boolean", value: law.answer === "yes" },
    });
  }
  return result;
}

function permissionFor(
  row: LawConsequenceRow,
  answer: boolean,
): {
  readonly permissionKey: string;
  readonly status: "permitted" | "prohibited";
} {
  if (row.what === "apply-photo-id-voting-requirement")
    return {
      permissionKey: "election.vote-without-photo-id-requirement",
      status: answer ? "prohibited" : "permitted",
    };
  if (row.what === "apply-same-day-registration-rule")
    return {
      permissionKey: "election.same-day-registration",
      status: answer ? "permitted" : "prohibited",
    };
  if (row.what === "apply-former-office-lobbying-bar")
    return {
      permissionKey: "lobbying.former-public-official",
      status: answer ? "prohibited" : "permitted",
    };
  throw new Error(`Unsupported government-operations action: ${row.what}`);
}

export function applyGovernmentOperations(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (resolved.subject.kind !== "person" || resolved.value.type !== "boolean")
    return world;
  const current = resolveGovernmentOperations(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: resolved.row.when,
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    governingLawId: resolved.law.measureId,
    questionKey: resolved.questionKey,
  }).find(
    (candidate) =>
      candidate.subject.id === resolved.subject.id &&
      JSON.stringify(candidate) === JSON.stringify(resolved),
  );
  if (!current || current.value.type !== "boolean") return world;
  const permission = permissionFor(current.row, current.value.value);
  let next = appendLawPermission(
    world,
    current.law,
    {
      effectKind: KIND,
      questionKey: current.questionKey,
      jurisdictionId: current.jurisdictionId,
      appliedAt: current.effectiveAt,
      sourceRecordIds: current.sourceRecordIds,
    },
    {
      subject: { kind: "person", id: current.subject.id },
      permissionKey: permission.permissionKey,
      status: permission.status,
      effectiveAt: current.effectiveAt,
      sourceRecordIds: current.sourceRecordIds,
    },
  );
  const saved = latestLawPermission(
    next,
    { kind: "person", id: current.subject.id },
    permission.permissionKey,
    current.effectiveAt,
  );
  if (!saved)
    throw new Error("Government-operations permission was not saved.");
  const eventStableKey = `${saved.stableKey}:effect`;
  let effect = next.history.events.find(
    (event) => event.stableKey === eventStableKey,
  );
  if (!effect) {
    const summary =
      current.row.what === "apply-photo-id-voting-requirement"
        ? "The photo-identification requirement applies to voting in this resident's jurisdiction."
        : current.row.what === "apply-same-day-registration-rule"
          ? "Eligible residents in this jurisdiction may register and vote on the same day."
          : "This former public official is subject to the jurisdiction's post-office lobbying cooling-off rule; the saved law source does not encode its duration.";
    next = recordWorldEvent(next, {
      stableKey: eventStableKey,
      type: "law.government-operations-applied",
      occurredAt: current.effectiveAt,
      recordedAt: next.currentDate,
      jurisdictionId: current.jurisdictionId,
      involvedEntityIds: [current.subject.id],
      participants: [
        {
          personId: current.subject.id,
          role: "impact:government-operations-rule",
          detail: current.row.what,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        "law:government-operations",
        current.questionKey,
        current.law.measureId,
        current.row.id,
        `permission:${saved.id}`,
      ],
      summary,
      context: {
        location: {
          jurisdictionId: current.jurisdictionId,
          label: next.jurisdictions[current.jurisdictionId]!.name,
          setting: "Government rule",
        },
        socialContext: current.questionKey,
        pressure: null,
        choice: null,
        motivation:
          "Apply the law in force to the person's recorded circumstances.",
        immediateReaction: "The law's rule was recorded for this person.",
      },
    });
    effect = next.history.events.find(
      (event) => event.stableKey === eventStableKey,
    );
  }
  if (!effect)
    throw new Error("Government-operations effect event was not saved.");
  return recordLawExposure(next, {
    stableKey: `${saved.stableKey}:exposure`,
    personId: current.subject.id,
    measureId: current.law.measureId,
    channel:
      current.row.what === "apply-former-office-lobbying-bar"
        ? "job-rule"
        : "public-service",
    direction: "none",
    amount: null,
    cadence: null,
    sourceRecordId: effect.id,
    includeFamily: false,
  });
}

export const GOVERNMENT_OPERATIONS_REGISTRATION: LawConsequenceKindRegistration =
  {
    kind: KIND,
    owner: "LW-01 government operations",
    selectors: SELECTORS,
    actions: ACTIONS,
    predicates: [SCOPE],
    units: [],
    resolve: resolveGovernmentOperations,
    apply: applyGovernmentOperations,
  };

export const registrations = [GOVERNMENT_OPERATIONS_REGISTRATION] as const;
