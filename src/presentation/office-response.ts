import type { EntityId, IsoDate, World } from "../simulation";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import {
  PRESS_MATTER_TAG,
  matterEvents,
  mattersForSubject,
  pressRecordsOfKind,
} from "../simulation/press";
import {
  OFFICE_EMPLOYMENT_KINDS,
  recordOfficeConsequence,
  type OfficeConsequenceKind,
} from "../simulation/governing/office-consequence";
import type { MatterResponse } from "../simulation/press/records";
import { respondToMatter } from "../simulation/press/responses";
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

export type OfficeAnswerKind = Extract<
  MatterResponse,
  "deny" | "apologize" | "attack-source" | "decline-comment" | "resign"
>;

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
      readonly kind: OfficeConsequenceKind;
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
    kind: "deny",
    label: "Deny",
    description: "Record a denial.",
    endsOffice: false,
  },
  {
    kind: "apologize",
    label: "Apologize",
    description: "Record an apology.",
    endsOffice: false,
  },
  {
    kind: "attack-source",
    label: "Attack source",
    description: "Challenge the source on the record.",
    endsOffice: false,
  },
  {
    kind: "decline-comment",
    label: "Go quiet",
    description: "Decline to comment on the record.",
    endsOffice: false,
  },
  {
    kind: "resign",
    label: "Resign the office",
    description: "Leave the office. This is the only answer that ends a term.",
    endsOffice: true,
  },
];

function statementFor(kind: OfficeAnswerKind, officeTitle: string): string {
  switch (kind) {
    case "deny":
    case "apologize":
    case "attack-source":
    case "decline-comment":
      return kind;
    case "resign":
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
    const answered =
      world.history.events.some(
        (event) =>
          event.type === OFFICE_ANSWER_EVENT &&
          event.tags.includes(`${PRESS_MATTER_TAG}${matter.id}`),
      ) ||
      pressRecordsOfKind(world, "matter-response").some(
        (response) =>
          response.matterId === matter.id &&
          response.actorPersonId === personId,
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
  const response = respondToMatter(world, {
    matterId: input.matterId,
    personId: input.personId,
    response: input.kind,
    meaning: statement,
    officeKey: view.officeKey,
    officeConsequenceWriter: recordOfficeConsequence,
  });
  const outcome = response.officeOutcome;
  if (!outcome) throw new Error("The office response was not recorded.");
  return {
    world: response.world,
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
  const result = answerForOffice(world, input, recordOfficeConsequence);
  return { world: result.world, line: officeOutcomeLine(result) };
}
