import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  workStatusAt,
} from "../life-queries";
import { recordWorkStatus } from "../life";
import { personName } from "../people";
import type { EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { currentGoverningOffices } from "./state-governing";
import { congressSeats } from "../living-world/congress-seats";
import { projectCongress } from "../living-world/congress";
import {
  LIVING_WORLD_WRITER_VERSION,
  SEAT_VACANCY_EVENT,
  congressSeatTitle,
} from "../living-world/opening";
import { seatTermWindow } from "../living-world/congress-seats";
import { stateJurisdictionForKey } from "../life-places";
import type { CongressSeat } from "../living-world/congress-seats";

/** The tags a seat record carries, so the congress projection reads it. */
function congressSeatVacancyTags(
  seat: CongressSeat,
  onDate: IsoDate,
): readonly string[] {
  const window = seatTermWindow(seat, onDate);
  return [
    LIVING_WORLD_WRITER_VERSION,
    OFFICE_CONSEQUENCE_VERSION,
    `office:${seat.chamberKey}`,
    `seat:${seat.seatKey}`,
    `state:${seat.stateUsps}`,
    `term-start:${window.startsAt}`,
    `term-end:${window.endExclusive}`,
  ];
}

/**
 * What an office does about something said of its holder.
 *
 * PRESS and PEOPLE own the asking: the request to explain, the interview, the
 * words the player chooses. This is the other half — whether anything in the
 * office actually changes. Usually nothing does, and saying so is the point:
 * an allegation, an answer, even an agreement to cooperate leaves the term
 * exactly where it was. A resignation is the one kind here that ends a term,
 * and it ends it through the same work writer any other ending uses.
 *
 * Nothing here is a finding. The stated reason is recorded as said, never
 * parsed, and the evidence ids are references, not judgments.
 */

export const OFFICE_CONSEQUENCE_VERSION = "office-consequence/v1";
export const OFFICE_CONSEQUENCE_EVENT = "governing.office-consequence" as const;

export type OfficeConsequenceKind =
  | "explanation-requested"
  | "defense-recorded"
  | "cooperation-agreed"
  | "cooperation-declined"
  | "resignation"
  /** The holder was sentenced to jail (`justice/prosecution.ts`). */
  | "removed-on-sentence";

/** The kinds that end a term. */
function endsTerm(kind: OfficeConsequenceKind): boolean {
  return kind === "resignation" || kind === "removed-on-sentence";
}

export interface OfficeConsequenceInput {
  readonly stableKey: string;
  readonly officeKey: string;
  readonly subjectPersonId: EntityId;
  readonly kind: OfficeConsequenceKind;
  /** The date the scene happens. */
  readonly effectiveAt: IsoDate;
  /** The person's own words, recorded as given. */
  readonly statedReason: string;
  /** Allegation or publication events the request cites. None is a finding. */
  readonly evidenceEventIds: readonly EntityId[];
}

export type OfficeConsequenceOutcome =
  | { readonly changed: false; readonly note: string }
  | {
      readonly changed: true;
      readonly kind: "term-closed";
      readonly workRelationshipId: EntityId;
      readonly termRecordId: EntityId;
      readonly effectiveAt: IsoDate;
      readonly note: string;
    };

export interface OfficeConsequenceResult {
  readonly world: World;
  readonly eventId: EntityId;
  readonly outcome: OfficeConsequenceOutcome;
}

const UNCHANGED: Record<
  Exclude<OfficeConsequenceKind, "resignation" | "removed-on-sentence">,
  string
> = {
  "explanation-requested":
    "Being asked to explain changes nothing about the office; the term stands.",
  "defense-recorded":
    "An answer is recorded, not judged. Nothing about the office changes.",
  "cooperation-agreed":
    "Agreeing to cooperate changes nothing about the office by itself.",
  "cooperation-declined":
    "Refusing to cooperate is an answer, not a forfeit. The term stands.",
};

function eventKey(input: OfficeConsequenceInput): string {
  return `${OFFICE_CONSEQUENCE_VERSION}:${input.stableKey}`;
}

function outcomeFromEvent(
  world: World,
  eventId: EntityId,
  tags: readonly string[],
): OfficeConsequenceOutcome {
  const note =
    world.history.events.find((event) => event.id === eventId)?.summary ?? "";
  const closed = tags.find((tag) => tag.startsWith("term-closed:"));
  if (!closed) return { changed: false, note };
  const [, workRelationshipId, termRecordId, effectiveAt] = closed.split(":");
  return {
    changed: true,
    kind: "term-closed",
    workRelationshipId: workRelationshipId as EntityId,
    termRecordId: termRecordId as EntityId,
    effectiveAt: effectiveAt as IsoDate,
    note,
  };
}

/**
 * Records one office consequence, once. A repeat with the same stable key
 * returns the original world and ids, so a retried save writes nothing twice.
 */
export function recordOfficeConsequence(
  world: World,
  input: OfficeConsequenceInput,
): OfficeConsequenceResult {
  const stableKey = eventKey(input);
  const existing = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (existing)
    return {
      world,
      eventId: existing.id,
      outcome: outcomeFromEvent(world, existing.id, existing.tags),
    };
  if (!input.statedReason.trim())
    throw new Error("An office consequence records what was actually said.");
  const office = currentGoverningOffices(world).find(
    (candidate) => candidate.officeKey === input.officeKey,
  );
  const subject = world.people[input.subjectPersonId];
  if (!subject) throw new Error("That person is not in this world.");
  const holds = office?.holderPersonId === input.subjectPersonId;
  const removed = input.kind === "removed-on-sentence";
  let next = world;
  let outcome: OfficeConsequenceOutcome = {
    changed: false,
    note:
      input.kind === "resignation" || input.kind === "removed-on-sentence"
        ? "They do not hold this office, so there is no term to end."
        : UNCHANGED[input.kind],
  };
  const tags: string[] = [
    OFFICE_CONSEQUENCE_VERSION,
    `office:${input.officeKey}`,
    `consequence:${input.kind}`,
    ...input.evidenceEventIds.map((id) => `evidence:${id}`),
  ];
  // An office the player holds may be a governorship, a seat in Congress, or
  // an ordinary recorded job like a legislative member's. A resignation has
  // to reach whichever of those this key names, or say plainly that it named
  // none of them.
  const seat =
    endsTerm(input.kind) && !holds
      ? congressSeats().find(
          (candidate) => candidate.seatKey === input.officeKey,
        )
      : undefined;
  const heldSeat =
    seat &&
    projectCongress(world)?.[
      seat.chamberKey === "us-house" ? "house" : "senate"
    ].seats.find((row) => row.seatKey === seat.seatKey);
  const seatIsTheirs =
    heldSeat?.occupant.kind === "member" &&
    heldSeat.occupant.member.personId === input.subjectPersonId;
  const job =
    endsTerm(input.kind) && !holds && !seatIsTheirs
      ? world.history.workRelationships.find(
          (relationship) =>
            (relationship.id === input.officeKey ||
              relationship.stableKey === input.officeKey) &&
            relationship.personId === input.subjectPersonId,
        )
      : undefined;
  if (endsTerm(input.kind) && seat && seatIsTheirs) {
    next = recordWorldEvent(world, {
      stableKey: `${stableKey}:seat-vacant`,
      type: SEAT_VACANCY_EVENT,
      occurredAt: input.effectiveAt,
      recordedAt: world.currentDate,
      jurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
      involvedEntityIds: [input.subjectPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        ...congressSeatVacancyTags(seat, input.effectiveAt),
        removed ? "vacancy-cause:removed" : "vacancy-cause:resigned",
      ],
      summary: `The seat of the ${congressSeatTitle(seat)} is vacant: the member ${removed ? "was removed after being sentenced to jail" : "resigned"}.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    outcome = {
      changed: true,
      kind: "term-closed",
      workRelationshipId:
        heldSeat!.occupant.kind === "member"
          ? heldSeat!.occupant.member.termId
          : (input.officeKey as EntityId),
      termRecordId: next.history.events.at(-1)!.id,
      effectiveAt: input.effectiveAt,
      note: `${personName(subject)} ${removed ? "was removed from" : "resigned"} the seat of the ${congressSeatTitle(seat)}. It is vacant from ${input.effectiveAt} until it is filled.`,
    };
    tags.push(
      `term-closed:${outcome.workRelationshipId}:${outcome.termRecordId}:${input.effectiveAt}`,
    );
  } else if (endsTerm(input.kind) && job) {
    const jobStatus = workStatusAt(world, job.id, currentLifeCutoff(world));
    if (jobStatus && jobStatus.status !== "ended") {
      next = recordWorkStatus(world, {
        stableKey: `${stableKey}:job-ended`,
        workRelationshipId: job.id,
        effectiveAt: input.effectiveAt,
        status: "ended",
        reason: removed
          ? "Removed on a jail sentence."
          : "Resigned the office.",
        provenance: {
          kind: "authored",
          note: `${OFFICE_CONSEQUENCE_VERSION}: the holder ${removed ? "was removed from" : "resigned"} this recorded office.`,
        },
        supersedesStatusId: jobStatus.id,
      });
      outcome = {
        changed: true,
        kind: "term-closed",
        workRelationshipId: job.id,
        termRecordId: job.id,
        effectiveAt: input.effectiveAt,
        note: `${personName(subject)} ${removed ? "was removed from office after being sentenced to jail" : "resigned"}. The office is vacant from ${input.effectiveAt}; who fills it is decided by rules the game has not compiled for this body.`,
      };
      tags.push(`term-closed:${job.id}:${job.id}:${input.effectiveAt}`);
    }
  } else if (endsTerm(input.kind) && office && holds) {
    // An elected term is a work relationship and ends through the work
    // writer. An opening incumbent's term is a recorded tenure with no
    // relationship behind it; the office is vacated by this record alone,
    // which the holder reader honors either way.
    const status = workStatusAt(world, office.termId, currentLifeCutoff(world));
    if (!status || status.status !== "ended") {
      if (status)
        next = recordWorkStatus(world, {
          stableKey: `${stableKey}:office-ended`,
          workRelationshipId: office.termId,
          effectiveAt: input.effectiveAt,
          status: "ended",
          reason: removed
            ? "Removed on a jail sentence."
            : "Resigned the office.",
          provenance: {
            kind: "authored",
            note: `${OFFICE_CONSEQUENCE_VERSION}: the holder ${removed ? "was removed" : "resigned"}; the office is vacant from this date.`,
          },
          supersedesStatusId: status.id,
        });
      outcome = {
        changed: true,
        kind: "term-closed",
        workRelationshipId: office.termId,
        termRecordId: office.termId,
        effectiveAt: input.effectiveAt,
        note: `${personName(subject)} ${removed ? "was removed as" : "resigned as"} ${office.title}${removed ? " after being sentenced to jail" : ""}. The office is vacant from ${input.effectiveAt}; who fills it is decided by this state's own rules, which the game has not compiled.`,
      };
      tags.push(
        `term-closed:${office.termId}:${office.termId}:${input.effectiveAt}`,
      );
    }
  }
  next = recordWorldEvent(next, {
    stableKey,
    type: OFFICE_CONSEQUENCE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: office?.jurisdictionId ?? null,
    involvedEntityIds: [input.subjectPersonId],
    participants: [
      {
        personId: input.subjectPersonId,
        role: "focus:subject",
        detail: input.kind,
      },
    ],
    personFactConstraints: [],
    visibility: endsTerm(input.kind) ? "public" : "limited",
    tags,
    summary: outcome.changed
      ? outcome.note
      : `${personName(subject)}${office && holds ? `, ${office.title},` : ""} — ${outcome.note} They said: ${input.statedReason}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  return { world: next, eventId, outcome };
}

/** The work kinds that are a public office rather than an ordinary job. */
export const OFFICE_EMPLOYMENT_KINDS: readonly string[] = [
  "employment:legislative-member",
  "employment:executive-office",
  "employment:state-agency-director",
  "employment:judicial-office",
];

/**
 * Every office `personId` holds today, by the key `recordOfficeConsequence`
 * accepts: a state executive office, a seat in Congress, or a recorded office
 * job. Read-only.
 */
export function officesHeldBy(
  world: World,
  personId: EntityId,
): readonly { readonly officeKey: string; readonly title: string }[] {
  const held: { officeKey: string; title: string }[] = [];
  for (const office of currentGoverningOffices(world))
    if (office.holderPersonId === personId)
      held.push({ officeKey: office.officeKey, title: office.title });
  const congress = projectCongress(world);
  for (const chamber of congress ? [congress.house, congress.senate] : [])
    for (const seat of chamber.seats)
      if (
        seat.occupant.kind === "member" &&
        seat.occupant.member.personId === personId
      ) {
        const known = congressSeats().find(
          (candidate) => candidate.seatKey === seat.seatKey,
        );
        held.push({
          officeKey: seat.seatKey,
          title: known ? congressSeatTitle(known) : seat.seatKey,
        });
      }
  for (const entry of activeWorkRelationshipsAt(world, personId)) {
    const title = entry.role.title;
    const officeKey = entry.relationship.stableKey;
    if (!title || !officeKey) continue;
    if (
      OFFICE_EMPLOYMENT_KINDS.includes(entry.relationship.kind) ||
      entry.relationship.kind.startsWith("office:")
    )
      held.push({ officeKey, title });
  }
  return held;
}

/** Everything recorded about one office, newest first. */
export function officeConsequences(
  world: World,
  officeKey?: string,
): readonly {
  readonly eventId: EntityId;
  readonly kind: OfficeConsequenceKind;
  readonly officeKey: string;
  readonly changed: boolean;
}[] {
  return world.history.events
    .filter((event) => event.type === OFFICE_CONSEQUENCE_EVENT)
    .flatMap((event) => {
      const key = event.tags
        .find((tag) => tag.startsWith("office:"))
        ?.slice("office:".length);
      const kind = event.tags
        .find((tag) => tag.startsWith("consequence:"))
        ?.slice("consequence:".length) as OfficeConsequenceKind | undefined;
      if (!key || !kind || (officeKey && key !== officeKey)) return [];
      return [
        {
          eventId: event.id,
          kind,
          officeKey: key,
          changed: event.tags.some((tag) => tag.startsWith("term-closed:")),
        },
      ];
    })
    .reverse();
}
