import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { recordByStableKey } from "../history-index";
import { recordWorldEvent } from "../world";
import { eventById } from "../event-index";
import type { LegislativeRulePack } from "../legislature-rules";
import type {
  EntityId,
  HistoricalEvent,
  LegislativeActionRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { seatedCongressChamber } from "./congress-chambers";
import { principledLeaning } from "./officeholder-principles";
import { lawInForce, statuteAnswer } from "./law-in-force";
import { FEDERAL_LAW_EFFECTS } from "../public-budgets/federal-treasury";
import { currentMeasureProvisions } from "../legislative-politics";
import { projectCongress } from "../living-world/congress";
import { personName } from "../people";

const VERSION = "congress-procedure/v1";
const CONSENT_VERSION = "senate-consent/v1";
export const SENATE_CONSENT_REQUEST = "legislation.unanimous-consent-requested";
export const SENATE_CONSENT_PASSAGE = "legislation.passed-without-objection";

/** Saved policy and text evidence for the request, never a roll-call tally. */
function consentEvidence(
  world: World,
  measure: LegislativeMeasureRecord,
  requesterId: EntityId,
  checkControl = true,
): {
  tags: readonly string[];
  senators: readonly EntityId[];
  objectors: readonly EntityId[];
} | null {
  if (
    measure.rulePackId !== US_CONGRESS_PACK_ID ||
    measure.subjectClass !== "general-policy"
  )
    return null;
  const answers = measure.propositionAnswers ?? [];
  const sections = currentMeasureProvisions(world, measure.id);
  if (
    !answers.length ||
    sections.some(
      (section) =>
        !section.answers ||
        !answers.some(
          (answer) =>
            answer.propositionId === section.answers!.propositionId &&
            answer.answer === section.answers!.answer,
        ),
    )
  )
    return null;
  // Read directly, rather than using a sitting's pinned current roster: replay
  // can ask about a Senate that sat before today's member was seated.
  const senators = (projectCongress(world)?.senate.seats ?? []).flatMap(
    (seat) =>
      seat.occupant.kind === "member" ? [seat.occupant.member.personId] : [],
  );
  if (
    !senators.length ||
    !senators.includes(requesterId) ||
    (checkControl &&
      world.control.kind === "person" &&
      senators.includes(world.control.personId))
  )
    return null;
  const evidence = new Set<EntityId>();
  const objectors: EntityId[] = [];
  let requesterScore = 0;
  for (const senatorId of senators) {
    let objects = false;
    for (const answer of answers) {
      const leaning = principledLeaning(world, senatorId, answer.propositionId);
      if (!leaning.recordIds.length) return null;
      for (const id of leaning.recordIds) evidence.add(id);
      const score = answer.answer === "yes" ? leaning.score : -leaning.score;
      if (score < 0) objects = true;
      if (senatorId === requesterId) requesterScore += score;
    }
    if (objects) objectors.push(senatorId);
  }
  if (requesterScore <= 0) return null;
  return {
    senators,
    objectors,
    tags: [
      CONSENT_VERSION,
      "chamber:senate",
      "stage:passage",
      `outcome:${objectors.length ? "objected" : "without-objection"}`,
      ...senators.map((id) => `senator:${id}`),
      ...objectors.map((id) => `objector:${id}`),
      ...[...evidence].sort().map((id) => `principle:${id}`),
      ...answers.map((a) => `answer:${a.propositionId}:${a.answer}`),
      ...sections.map((s) => `provision:${s.id}`),
    ],
  };
}

export function recordSenateConsentRequest(
  world: World,
  measure: LegislativeMeasureRecord,
  input: { stableKey: string; requestedByPersonId: EntityId },
): World {
  if (recordByStableKey(world.history.events, input.stableKey)) return world;
  const evidence = consentEvidence(world, measure, input.requestedByPersonId);
  if (!evidence) return world;
  const name = personName(world.people[input.requestedByPersonId]!);
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: SENATE_CONSENT_REQUEST,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id, ...evidence.senators],
    participants: [
      {
        personId: input.requestedByPersonId,
        role: "agency:requester",
        detail: `Requested passage of ${measure.designation} without objection.`,
      },
      ...evidence.objectors
        .filter((id) => id !== input.requestedByPersonId)
        .map((personId) => ({
          personId,
          role: "agency:objector" as const,
          detail: `Objected to passage of ${measure.designation} from recorded principles.`,
        })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: evidence.tags,
    summary: `${name} requested passage of ${measure.designation} without objection. ${evidence.objectors.length ? `${evidence.objectors.map((id) => personName(world.people[id]!)).join(", ")} objected from their recorded principles; the ordinary vote remains required.` : "No seated senator's recorded principles objected to its recorded terms."}`,
    context: {
      location: null,
      socialContext: "The request is put to the Senate, not a roll call.",
      pressure: null,
      choice: null,
      motivation: "The requester's recorded principles support the measure.",
      immediateReaction: evidence.objectors.length
        ? "An objection preserves the ordinary vote."
        : "The chair may put passage without objection.",
    },
  });
}

function atRequest(world: World, request: HistoricalEvent): World {
  // A read-only frontier of actual records. Nothing is persisted or drawn.
  return {
    ...world,
    currentDate: request.occurredAt,
    history: {
      ...world.history,
      nextSequence: request.sequence,
      events: world.history.events.filter((r) => r.sequence < request.sequence),
      principles: world.history.principles.filter(
        (r) => r.sequence < request.sequence,
      ),
      legislativeProvisions: (world.history.legislativeProvisions ?? []).filter(
        (r) => r.sequence < request.sequence,
      ),
    },
  };
}

/** The chair can rely only on this request's actual, unchanged text frontier. */
export function senateConsentRequestPermitsPassage(
  world: World,
  measure: LegislativeMeasureRecord,
  request: HistoricalEvent,
  at: Pick<LegislativeActionRecord, "occurredAt" | "sequence">,
): boolean {
  const requester = request.participants[0];
  if (
    request.type !== SENATE_CONSENT_REQUEST ||
    request.jurisdictionId !== measure.jurisdictionId ||
    !request.involvedEntityIds.includes(measure.id) ||
    request.participants.length !== 1 ||
    requester?.role !== "agency:requester" ||
    request.occurredAt !== at.occurredAt ||
    request.recordedAt > at.occurredAt ||
    request.sequence >= at.sequence
  )
    return false;
  const historical = atRequest(world, request);
  const evidence = consentEvidence(
    historical,
    measure,
    requester.personId,
    false,
  );
  if (
    !evidence ||
    evidence.objectors.length ||
    evidence.senators.some((id) => !request.involvedEntityIds.includes(id))
  )
    return false;
  if (
    [...request.tags].sort().join("\n") !== [...evidence.tags].sort().join("\n")
  )
    return false;
  // Even a same-day amended section after the request needs a new request.
  return !(world.history.legislativeProvisions ?? []).some(
    (r) =>
      r.measureId === measure.id &&
      r.sequence > request.sequence &&
      r.sequence < at.sequence,
  );
}

export function validSenateConsentPassage(
  world: World,
  measure: LegislativeMeasureRecord,
  action: LegislativeActionRecord,
): boolean {
  const event = eventById(world, action.eventId);
  const references =
    event?.tags.filter((tag) => tag.startsWith("consent-request:")) ?? [];
  const request =
    references.length === 1
      ? eventById(world, references[0]!.slice("consent-request:".length))
      : null;
  return !!(
    event?.type === SENATE_CONSENT_PASSAGE &&
    event.occurredAt === action.occurredAt &&
    event.recordedAt <= action.occurredAt &&
    event.sequence < action.sequence &&
    event.involvedEntityIds.includes(measure.id) &&
    action.kind === "floor-stage-passed" &&
    action.chamberKey === "senate" &&
    action.floorStageKey === "passage" &&
    action.voteId === null &&
    request &&
    request.sequence < event.sequence &&
    senateConsentRequestPermitsPassage(world, measure, request, action)
  );
}

/**
 * Narrow automatic Byrd review: each term must change a registered fiscal line,
 * every recurring term must avoid a deficit increase, and Social Security is
 * excluded. Mixed or unscored terms stay on the ordinary route. A fiscal label
 * by itself never qualifies a bill.
 */
export function reconciliationScope(
  world: World,
  measure: LegislativeMeasureRecord,
): boolean {
  if (measure.rulePackId !== US_CONGRESS_PACK_ID) return false;
  const answers = measure.propositionAnswers ?? [];
  if (answers.length === 0) return false;
  for (const term of answers) {
    const proposition = world.policyCatalog.propositions[term.propositionId];
    if (!proposition) return false;
    const issue = world.policyCatalog.issues[proposition.issueId];
    if (issue?.stableKey.includes("social-security")) return false;
    const effects = FEDERAL_LAW_EFFECTS.filter(
      (e) => e.questionKey === proposition.stableKey,
    );
    if (effects.length === 0) return false;
    const prior = statuteAnswer(
      lawInForce(world, measure.jurisdictionId, term.propositionId),
    );
    if (prior === "closed" || prior === term.answer) return false;
    // The treasury starts from sourced actual receipts/outlays and applies
    // only enacted-in-play deltas. No enacted delta means the model's known
    // opening books, not a claim that unrecorded law answers "no".
    const applied = lawInForce(
      world,
      measure.jurisdictionId,
      term.propositionId,
      world.currentDate,
      "enacted-only",
    );
    for (const effect of effects) {
      if (effect.shareOn) return false; // Unscored future windows need a fiscal score.
      const after = (term.answer === "yes" ? effect.toYes : effect.toNo) ?? 0;
      const before = applied
        ? ((applied.answer === "yes" ? effect.toYes : effect.toNo) ?? 0)
        : 0;
      const delta = after - before;
      if (
        delta === 0 ||
        (effect.line.kind === "receipt" ? delta < 0 : delta > 0)
      )
        return false;
    }
  }
  // Every recorded section needs a fiscal answer scored above. An unlinked
  // clause is unscored; a budget title does not make that clause incidental.
  return currentMeasureProvisions(world, measure.id).every(
    (section) =>
      section.answers !== undefined &&
      answers.some(
        (a) =>
          a.propositionId === section.answers!.propositionId &&
          a.answer === section.answers!.answer,
      ),
  );
}

function procedureKey(measureId: EntityId) {
  return `${VERSION}:${measureId}`;
}

export function recordedCongressProcedure(
  world: World,
  measureId: EntityId,
  at: Pick<LegislativeActionRecord, "occurredAt" | "sequence"> = {
    occurredAt: world.currentDate,
    sequence: world.history.nextSequence,
  },
): "ordinary" | "reconciliation" | "unanimous-consent" {
  const record = recordByStableKey(
    world.history.events,
    procedureKey(measureId),
  );
  // Replay supplies the action's immutable frontier. A later append, even
  // on the same day or reporting an earlier occurrence, cannot authorize it.
  if (
    !record ||
    record.occurredAt > at.occurredAt ||
    record.recordedAt > at.occurredAt ||
    record.sequence >= at.sequence
  )
    return "ordinary";
  if (record?.tags.includes("procedure:reconciliation"))
    return "reconciliation";
  if (record?.tags.includes("procedure:unanimous-consent"))
    return "unanimous-consent";
  return "ordinary";
}

/**
 * Compact budget-resolution producer: each chamber decides the fiscal
 * instructions from its members' recorded principles. The dated roll and
 * outcome are canonical events; these instructions are not enacted law.
 */
export function recordBudgetInstructions(
  world: World,
  measure: LegislativeMeasureRecord,
): World {
  if (
    recordedCongressProcedure(world, measure.id) !== "ordinary" ||
    !reconciliationScope(world, measure)
  )
    return world;
  let next = world;
  const instructionKeys: string[] = [];
  for (const chamberKey of ["house", "senate"] as const) {
    const key = `${VERSION}:instructions:${measure.id}:${chamberKey}`;
    instructionKeys.push(key);
    const existing = recordByStableKey(next.history.events, key);
    if (existing) {
      if (!existing.tags.includes("outcome:passed")) return next;
      continue;
    }
    const members = seatedCongressChamber(next, chamberKey)?.body.members ?? [];
    if (!members.length) return next;
    const ballots = members.map((member) => {
      if (
        !member.personId ||
        (next.control.kind === "person" &&
          next.control.personId === member.personId)
      )
        return { member, disposition: "absent" };
      const views = (measure.propositionAnswers ?? []).map((a) => {
        const score = principledLeaning(
          next,
          member.personId!,
          a.propositionId,
        ).score;
        return a.answer === "yes" ? score : -score;
      });
      return {
        member,
        disposition: views.every((score) => score > 0)
          ? "yea"
          : views.some((score) => score < 0)
            ? "nay"
            : "present-not-voting",
      };
    });
    const yeas = ballots.filter((b) => b.disposition === "yea").length;
    const nays = ballots.filter((b) => b.disposition === "nay").length;
    const present = ballots.filter((b) => b.disposition !== "absent").length;
    const passed = present > members.length / 2 && yeas > nays;
    next = recordWorldEvent(next, {
      stableKey: key,
      type: "congress.budget-instructions-voted",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: measure.jurisdictionId,
      involvedEntityIds: [measure.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        VERSION,
        "basis:game-profile",
        `chamber:${chamberKey}`,
        `outcome:${passed ? "passed" : "failed"}`,
        ...ballots
          .filter((b) => b.member.personId)
          .map((b) => `ballot:${b.member.personId}:${b.disposition}`),
      ],
      summary: `The ${chamberKey === "house" ? "House" : "Senate"} ${passed ? "adopted" : "did not adopt"} deficit-reducing budget instructions for ${measure.designation}: ${yeas} yeas and ${nays} nays, with ${present} members present.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation:
          "Members weighed the fiscal instructions from their recorded principles.",
        immediateReaction: null,
      },
    });
    if (!passed) return next;
  }
  return recordProcedure(
    next,
    measure,
    "reconciliation",
    instructionKeys.map((key) => `instructions:${key}`),
    "Both chambers adopted deficit-reducing budget instructions from their members' principles. The bill's scored fiscal terms comply with those instructions.",
  );
}

/** Legacy draft marker only; it cannot authorize consent passage or a vote. */
export function recordUnanimousConsent(
  world: World,
  measure: LegislativeMeasureRecord,
): World {
  if (
    measure.rulePackId !== US_CONGRESS_PACK_ID ||
    measure.subjectClass !== "general-policy" ||
    recordedCongressProcedure(world, measure.id) !== "ordinary"
  )
    return world;
  const answers = measure.propositionAnswers ?? [];
  const senators = seatedCongressChamber(world, "senate")?.body.members ?? [];
  if (!answers.length || !senators.length || senators.some((s) => !s.personId))
    return world;
  if (
    senators.some(
      (s) =>
        world.control.kind === "person" &&
        world.control.personId === s.personId,
    )
  )
    return world;
  const objectionOrMissingEvidence = senators.some((s) =>
    answers.some((a) => {
      const leaning = principledLeaning(world, s.personId!, a.propositionId);
      // No recorded view is not evidence that the senator has no objection.
      return (
        leaning.recordIds.length === 0 ||
        (a.answer === "yes" ? leaning.score : -leaning.score) < 0
      );
    }),
  );
  if (objectionOrMissingEvidence) return world;
  return recordProcedure(
    world,
    measure,
    "unanimous-consent",
    senators.map((s) => `no-objection:${s.personId}`),
    "No senator objected from their principles to the routine measure's recorded terms.",
  );
}

function recordProcedure(
  world: World,
  measure: LegislativeMeasureRecord,
  kind: "reconciliation" | "unanimous-consent",
  tags: readonly string[],
  reason: string,
): World {
  return recordWorldEvent(world, {
    stableKey: procedureKey(measure.id),
    type: "congress.procedure-adopted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [VERSION, `procedure:${kind}`, ...tags],
    summary: reason,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: reason,
      immediateReaction: null,
    },
  });
}

/** Draft reconciliation adapter; consent passage never changes a vote rule. */
export function congressProcedurePack(
  world: World,
  measure: LegislativeMeasureRecord,
  pack: LegislativeRulePack,
  at?: Pick<LegislativeActionRecord, "occurredAt" | "sequence">,
): LegislativeRulePack {
  const procedure = recordedCongressProcedure(world, measure.id, at);
  if (
    measure.rulePackId !== US_CONGRESS_PACK_ID ||
    procedure !== "reconciliation"
  )
    return pack;
  return {
    ...pack,
    chambers: pack.chambers.map((chamber) =>
      chamber.chamberKey !== "senate"
        ? chamber
        : {
            ...chamber,
            floorStages: chamber.floorStages.filter(
              (stage) => stage.stageKey !== "cloture",
            ),
          },
    ),
  };
}
