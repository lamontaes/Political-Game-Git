import { personName } from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import {
  evaluateDecision,
  recordDurableDecisionTrace,
} from "../simulation/decisions";
import {
  PRESS_MATTER_TAG,
  matterEvents,
  mattersForSubject,
  pressRecordsOfKind,
  findingOfficeResponseBinding,
  recordFindingOfficeResponse,
} from "../simulation/press";
import {
  OFFICE_EMPLOYMENT_KINDS,
  recordOfficeConsequence,
  officeConsequences,
} from "../simulation/governing/office-consequence";
import { recordWorldEvent } from "../simulation/world";
import { proseDate } from "./prose-dates";

/**
 * Answering for something in the office you hold (CRUNCH47 B2).
 *
 * The split with GOVERNING is deliberate and holds in both directions. This
 * decides what is said: whether to explain, to stand behind an account, to
 * cooperate with a body that has asked, to refuse to cooperate, or to resign.
 * What the office does about it is GOVERNING's, through its own writer, and
 * the answer it gives back is what this prints — including when the answer is
 * that nothing in the office changed.
 *
 * Three things this never does. It never ends a term: a resignation is a
 * decision, and only GOVERNING's writer closes anything. It never treats an
 * institution's willingness to look at something as a finding. And it never
 * invents the reason: the words the player chose are recorded as they chose
 * them, and passed on verbatim.
 */

export const OFFICE_ANSWER_EVENT = "office.answered-for-matter";

export type OfficeAnswerKind =
  | "explanation-requested"
  | "defense-recorded"
  | "cooperation-agreed"
  | "cooperation-declined"
  | "resignation";

/**
 * GOVERNING's writer, declared structurally so this module compiles and is
 * tested on its own. D's `recordOfficeConsequence` satisfies it exactly.
 */
export interface OfficeConsequenceWriter {
  (
    world: World,
    input: {
      readonly stableKey: string;
      readonly officeKey: string;
      readonly subjectPersonId: EntityId;
      readonly kind: OfficeAnswerKind;
      readonly effectiveAt: IsoDate;
      readonly statedReason: string;
      readonly evidenceEventIds: readonly EntityId[];
    },
  ): {
    readonly world: World;
    readonly eventId: EntityId;
    readonly outcome:
      | { readonly changed: false; readonly note: string }
      | {
          readonly changed: true;
          readonly kind: string;
          readonly workRelationshipId?: EntityId;
          readonly termRecordId?: EntityId;
          readonly effectiveAt: IsoDate;
          readonly note: string;
        };
  };
}

export interface OfficeAnswerOption {
  readonly kind: OfficeAnswerKind;
  readonly label: string;
  /** What this does, said before it is chosen. */
  readonly description: string;
  /** The exact words that would be recorded, which the player may replace. */
  readonly statement: string;
  /** True only for the one answer that can end a term. */
  readonly endsOffice: boolean;
}

export interface OfficeMatterView {
  readonly matterId: EntityId;
  readonly officeKey: string;
  readonly officeTitle: string;
  /** What the player actually knows of it, newest last. */
  readonly knownLines: readonly {
    readonly on: IsoDate;
    readonly text: string;
  }[];
  readonly options: readonly OfficeAnswerOption[];
  /** Said plainly: an institution looking at something is not a finding. */
  readonly note: string;
}

const OPTIONS: readonly Omit<OfficeAnswerOption, "statement">[] = [
  {
    kind: "explanation-requested",
    label: "Explain it yourself",
    description:
      "Say what happened, in your own words. The office is unaffected.",
    endsOffice: false,
  },
  {
    kind: "defense-recorded",
    label: "Stand behind your account",
    description: "Put your account on the record. The office is unaffected.",
    endsOffice: false,
  },
  {
    kind: "cooperation-agreed",
    label: "Cooperate with the inquiry",
    description:
      "Agree to answer what is asked of you. The office is unaffected.",
    endsOffice: false,
  },
  {
    kind: "cooperation-declined",
    label: "Decline to cooperate",
    description:
      "Say you will not take part. That is an answer on the record, not an admission.",
    endsOffice: false,
  },
  {
    kind: "resignation",
    label: "Resign the office",
    description: "Leave the office. This is the only answer that ends a term.",
    endsOffice: true,
  },
];

function statementFor(kind: OfficeAnswerKind, officeTitle: string): string {
  switch (kind) {
    case "explanation-requested":
      return "I'll explain exactly what happened.";
    case "defense-recorded":
      return "My account of this stands.";
    case "cooperation-agreed":
      return "I'll answer whatever they ask.";
    case "cooperation-declined":
      return "I won't be taking part in that.";
    case "resignation":
      return `I'm resigning as ${officeTitle}.`;
  }
}

/**
 * The public office this person currently holds, as the work record names it.
 *
 * An office is a job in the world's own terms — a seat, an executive office, a
 * directorship — so it is read off the work relationship rather than guessed
 * from a title. Somebody who holds none has nothing to answer for here, and
 * that is the ordinary case.
 */
function heldOffice(
  world: World,
  personId: EntityId,
): { officeKey: string; title: string } | null {
  for (const entry of activeWorkRelationshipsAt(world, personId)) {
    const title = entry.role.title;
    const officeKey = entry.relationship.stableKey;
    if (!title || !officeKey) continue;
    if (
      OFFICE_EMPLOYMENT_KINDS.includes(entry.relationship.kind) ||
      entry.relationship.kind.startsWith("office:")
    ) {
      return { officeKey, title };
    }
  }
  return null;
}

/**
 * Matters about the played person that they know of, and what they can say.
 * Pure; nothing here writes and nothing here is compulsory.
 */
export function projectOfficeMatters(
  world: World,
  personId: EntityId,
): readonly OfficeMatterView[] {
  const office = heldOffice(world, personId);
  if (!office) return [];
  return mattersForSubject(world, personId).flatMap((matter) => {
    const known = matterEvents(world, matter.id).filter(
      (event) =>
        event.visibility === "public" ||
        world.history.knowledge.some(
          (entry) => entry.personId === personId && entry.eventId === event.id,
        ),
    );
    if (known.length === 0) return [];
    const answered = world.history.events.some(
      (event) =>
        event.type === OFFICE_ANSWER_EVENT &&
        event.tags.includes(`${PRESS_MATTER_TAG}${matter.id}`),
    );
    if (answered) return [];
    return [
      {
        matterId: matter.id,
        officeKey: office.officeKey,
        officeTitle: office.title,
        knownLines: known.map((event) => ({
          on: event.occurredAt,
          text: event.summary,
        })),
        options: OPTIONS.map((option) => ({
          ...option,
          statement: statementFor(option.kind, office.title),
        })),
        note: "A body that can look at something is not a body that has found anything.",
      },
    ];
  });
}

export interface AnswerForOfficeInput {
  readonly personId: EntityId;
  readonly matterId: EntityId;
  readonly kind: OfficeAnswerKind;
  /** The player's own words, when they wrote their own. */
  readonly statement?: string;
}

export interface OfficeAnswerResult {
  readonly world: World;
  /** What actually changed in the office, in GOVERNING's own words. */
  readonly officeNote: string;
  readonly officeChanged: boolean;
  /** The date the office became vacant, for the prose to say. */
  readonly effectiveAt: IsoDate | null;
}

/**
 * Says it, and asks the office what that means.
 *
 * The words are recorded here whatever the office does with them, so a refusal
 * to cooperate is a record of its own rather than silence. Then GOVERNING
 * decides; for four of the five answers it decides that nothing changed, and
 * this prints that rather than implying otherwise.
 */
export function answerForOffice(
  world: World,
  input: AnswerForOfficeInput,
  recordOfficeConsequence: OfficeConsequenceWriter,
): OfficeAnswerResult {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId
  ) {
    throw new Error(
      "Only the character being played answers for their office.",
    );
  }
  const view = projectOfficeMatters(world, input.personId).find(
    (entry) => entry.matterId === input.matterId,
  );
  if (!view) {
    throw new Error("There is nothing of yours to answer here.");
  }
  const statement =
    input.statement?.trim() || statementFor(input.kind, view.officeTitle);
  const person = world.people[input.personId]!;
  const evidenceEventIds = view.knownLines.length
    ? matterEvents(world, input.matterId)
        .filter((event) => event.visibility === "public")
        .map((event) => event.id)
    : [];
  let next = recordWorldEvent(world, {
    stableKey: `office-answer:${input.matterId}:${input.personId}`,
    type: OFFICE_ANSWER_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [input.personId],
    participants: [
      {
        personId: input.personId,
        role: "agency:actor",
        detail: statement,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `${PRESS_MATTER_TAG}${input.matterId}`,
      `office.answer:${input.kind}`,
    ],
    summary: `${personName(person)} answered for the ${view.officeTitle}: “${statement}”`,
    context: {
      location: null,
      socialContext: "An officeholder answering for something in public.",
      pressure: null,
      choice: statement,
      motivation: null,
      immediateReaction: null,
    },
  });
  const consequence = recordOfficeConsequence(next, {
    stableKey: `office-consequence:${input.matterId}:${input.personId}:${input.kind}`,
    officeKey: view.officeKey,
    subjectPersonId: input.personId,
    kind: input.kind,
    effectiveAt: next.currentDate,
    statedReason: statement,
    evidenceEventIds,
  });
  next = consequence.world;
  const outcome = consequence.outcome;
  return {
    world: next,
    officeNote: outcome.note,
    officeChanged: outcome.changed,
    effectiveAt: outcome.changed ? outcome.effectiveAt : null,
  };
}

/** The sentence a scene prints after an answer, from the office's own answer. */
export function officeOutcomeLine(result: OfficeAnswerResult): string {
  return result.officeChanged && result.effectiveAt
    ? `${result.officeNote} The office is vacant from ${proseDate(result.effectiveAt)}.`
    : result.officeNote;
}

/** Matters this person is a subject of, whether or not they hold an office. */
export function matterSubjectCount(world: World, personId: EntityId): number {
  return pressRecordsOfKind(world, "matter").filter((matter) =>
    matter.subjectPersonIds.includes(personId),
  ).length;
}

/**
 * What the press desk calls when the player picks an answer: the answer said
 * through GOVERNING's real writer, and the sentence to print about what the
 * office did with it.
 */
export function answerForOfficeOnDesk(
  world: World,
  input: AnswerForOfficeInput,
): { readonly world: World; readonly line: string } {
  if (input.kind === "resignation") {
    if (
      world.control.kind !== "person" ||
      world.control.personId !== input.personId
    )
      throw new Error(
        "Only the character being played answers for their office.",
      );
    const view = projectOfficeMatters(world, input.personId).find(
      (entry) => entry.matterId === input.matterId,
    );
    if (!view) throw new Error("There is nothing of yours to answer here.");
    const proceedings = pressRecordsOfKind(world, "matter-proceeding").filter(
      (row) => row.matterId === input.matterId,
    );
    const steps = pressRecordsOfKind(world, "proceeding-step")
      .filter((row) => proceedings.some((p) => p.id === row.proceedingId))
      .sort((a, b) => b.sequence - a.sequence);
    for (const step of steps) {
      const subject = {
        proceedingId: step.proceedingId,
        stepId: step.id,
        personId: input.personId,
        officeKey: view.officeKey,
      };
      const binding = findingOfficeResponseBinding(world, subject);
      if (!binding) continue;
      if (!input.statement?.trim())
        throw new Error("Choose the words to record for your resignation.");
      const statement = input.statement;
      let next = recordWorldEvent(world, {
        stableKey: `office-answer:${input.matterId}:${input.personId}`,
        type: OFFICE_ANSWER_EVENT,
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: binding.event.jurisdictionId,
        involvedEntityIds: [input.personId],
        participants: [
          { personId: input.personId, role: "agency:actor", detail: statement },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          `${PRESS_MATTER_TAG}${input.matterId}`,
          "office.answer:resignation",
          "provenance:player-choice",
        ],
        summary: statement,
        context: {
          location: null,
          socialContext: binding.proceeding.institutionLabel,
          pressure: null,
          choice: "resign",
          motivation: null,
          immediateReaction: statement,
        },
      });
      const choiceEvent = next.history.events.at(-1)!;
      const evaluation = evaluateDecision(next, {
        stableKey: `${choiceEvent.stableKey}:decision`,
        decisionType: binding.decisionType,
        actorPersonId: input.personId,
        cutoff: {
          asOfDate: next.currentDate,
          historySequenceExclusive: next.history.nextSequence,
        },
        subject: binding.subject,
        options: binding.options,
        constraints: [],
        considerations: [
          {
            stableKey: `${choiceEvent.stableKey}:chosen`,
            optionKey: "resign",
            sourceType: "context:player-choice",
            direction: "supports",
            importance: "decisive",
            confidence: "high",
            explanation: statement,
            sourceRefs: [{ kind: "historical-event", eventId: choiceEvent.id }],
          },
        ],
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      });
      next = recordDurableDecisionTrace(next, evaluation);
      next = recordFindingOfficeResponse(next, {
        ...subject,
        decisionTraceId: next.history.decisionTraces.at(-1)!.id,
        statement,
      });
      const consequence = officeConsequences(next, view.officeKey).find((row) =>
        next.history.events.some(
          (event) =>
            event.id === row.eventId &&
            event.sequence >= world.history.nextSequence,
        ),
      );
      const event =
        consequence &&
        next.history.events.find((row) => row.id === consequence.eventId);
      if (!consequence || !event)
        throw new Error(
          "The recorded office response did not produce an office consequence.",
        );
      return {
        world: next,
        line: event.summary,
      };
    }
  }
  const result = answerForOffice(world, input, recordOfficeConsequence);
  return { world: result.world, line: officeOutcomeLine(result) };
}
