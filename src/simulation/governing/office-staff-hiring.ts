import { makeIsoDate } from "../dates";
import { createWorkRelationship } from "../life";
import { recordWorldEvent } from "../world";
import type {
  EntityId,
  HistoricalEvent,
  OccupationClassification,
  World,
} from "../types";
import {
  OFFICE_STAFFING_PROFILE,
  OFFICE_STAFF_POSITIONS,
  establishOfficeStaffPositions,
  officeStaffIncumbencyRecords,
  officeStaffPositions,
  openOfficePositions,
  recordOfficeStaffIncumbency,
  type OfficeStaffClassReading,
  type OfficeStaffPositionProfile,
} from "./office-staffing";
import { createCandidates, type GoverningOffice } from "./state-governing";
import { staffAssessment, type StaffAssessment } from "./staff-evidence";

/**
 * Hiring into an office's authorized staff positions, for any elected office
 * the game seats: a governor's office and a legislator's own office use the
 * same records (office-staff positions, incumbencies and ordinary
 * employment), so there is one answer to "who works for this office".
 *
 * A governor's chief of staff is still chosen through the transition matter;
 * this is how every other open position gets filled.
 */
export const OFFICE_STAFF_HIRING_VERSION = "governing-office-staff-hiring/v1";
export const OFFICE_STAFF_CANDIDATES_OFFERED =
  "governing.staff-candidates-offered" as const;
export const OFFICE_STAFF_HIRED = "governing.staff-hired" as const;

/** How many people apply for one opening. Authored, like the governor's three. */
export const CANDIDATES_PER_OPENING = 3;

/** An office that can hire, whatever level of government it sits in. */
export interface StaffableOffice {
  readonly officeKey: string;
  readonly title: string;
  readonly organizationId: EntityId;
  readonly jurisdictionId: EntityId;
  /** Null where no state's civil-service boundary is read for this office. */
  readonly stateUsps: string | null;
  readonly holderPersonId: EntityId;
  readonly employmentKind:
    "employment:executive-staff" | "employment:legislative-staff";
  readonly occupationClassification: OccupationClassification;
  /** Which positions this office has, and whose profile says so. */
  readonly table: {
    readonly positions: readonly OfficeStaffPositionProfile[];
    readonly profile: string;
    readonly classReading?: OfficeStaffClassReading;
  };
  /**
   * Positions filled some other way, which this route neither offers nor
   * fills (a governor's chief of staff is chosen through the transition).
   */
  readonly filledElsewhere?: readonly string[];
}

/* ------------------------------------------------------------------ *
 * A governor's office
 * ------------------------------------------------------------------ */

export function executiveStaffOffice(office: GoverningOffice): StaffableOffice {
  return {
    officeKey: office.officeKey,
    title: office.title,
    organizationId: office.organizationId,
    jurisdictionId: office.jurisdictionId,
    stateUsps: office.stateUsps,
    holderPersonId: office.holderPersonId,
    employmentKind: "employment:executive-staff",
    occupationClassification: "service:executive-office-staff",
    table: {
      positions: OFFICE_STAFF_POSITIONS,
      profile: OFFICE_STAFFING_PROFILE,
    },
    filledElsewhere: ["office-chief-of-staff"],
  };
}

/* ------------------------------------------------------------------ *
 * A legislator's own office
 * ------------------------------------------------------------------ */

/**
 * PLACEHOLDER, pending research request `elected-office-staff-by-level`. How
 * many staff a state legislator has varies from none (a citizen legislature
 * sharing caucus staff) to a full office, and nothing read so far says which
 * a given chamber is. Two positions are what the game can already use: the
 * office briefing reads staff, and the casework setting hands routine cases
 * to staff.
 */
export const LEGISLATIVE_MEMBER_STAFF_PROFILE =
  "governing-legislative-member-staffing/v1-placeholder";

export const LEGISLATIVE_MEMBER_STAFF_POSITIONS: readonly OfficeStaffPositionProfile[] =
  [
    {
      classKey: "member-legislative-aide",
      title: "Legislative Aide",
      duty: "Reads the bills in front of you and briefs you before you have to decide.",
    },
    {
      classKey: "member-constituent-caseworker",
      title: "Constituent Caseworker",
      duty: "Takes the constituent requests your casework setting hands to staff.",
    },
  ];

const LEGISLATIVE_MEMBER_STAFF_CLASS: OfficeStaffClassReading = {
  civilClass: "unknown",
  basis: `Whether a legislator's staff are civil service or at-will has not been read for any state, so the class is recorded unknown. Which positions this office has is ${LEGISLATIVE_MEMBER_STAFF_PROFILE}, a placeholder pending research.`,
};

export function legislativeMemberOffice(input: {
  readonly seatRelationshipId: EntityId;
  readonly organizationId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly holderPersonId: EntityId;
  readonly title: string;
}): StaffableOffice {
  return {
    officeKey: `legislative-member:${input.seatRelationshipId}`,
    title: input.title,
    organizationId: input.organizationId,
    jurisdictionId: input.jurisdictionId,
    stateUsps: null,
    holderPersonId: input.holderPersonId,
    employmentKind: "employment:legislative-staff",
    occupationClassification: "occupation:legislative-staff",
    table: {
      positions: LEGISLATIVE_MEMBER_STAFF_POSITIONS,
      profile: LEGISLATIVE_MEMBER_STAFF_PROFILE,
      classReading: LEGISLATIVE_MEMBER_STAFF_CLASS,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */

export interface StaffCandidateView {
  readonly personId: EntityId;
  readonly assessment: StaffAssessment;
}

export interface StaffOpeningView {
  readonly positionId: EntityId;
  readonly classKey: string;
  readonly title: string;
  readonly duty: string;
  /** Empty until the office asks for applicants. */
  readonly candidates: readonly StaffCandidateView[];
}

export interface StaffHolderView {
  readonly positionId: EntityId;
  readonly title: string;
  readonly personId: EntityId;
}

export interface OfficeStaffingView {
  /** False until the office's positions exist; they are authorized on first ask. */
  readonly authorized: boolean;
  readonly openings: readonly StaffOpeningView[];
  readonly filled: readonly StaffHolderView[];
  readonly profile: string;
}

/**
 * The office's positions as they stand. Reading writes nothing: positions not
 * yet authorized are reported as such, not created.
 */
export function officeStaffingView(
  world: World,
  office: StaffableOffice,
): OfficeStaffingView {
  const positions = officeStaffPositions(world, office);
  const open = new Set(
    openOfficePositions(world, office.officeKey).map((p) => p.positionId),
  );
  const openings: StaffOpeningView[] = [];
  const filled: StaffHolderView[] = [];
  const elsewhere = new Set(office.filledElsewhere ?? []);
  for (const position of positions) {
    if (open.has(position.id)) {
      if (elsewhere.has(position.classKey)) continue;
      openings.push({
        positionId: position.id,
        classKey: position.classKey,
        title: position.title,
        duty: position.duty,
        candidates: offeredCandidates(world, office, position.id).map(
          (personId) => ({
            personId,
            assessment: staffAssessment(world, personId),
          }),
        ),
      });
      continue;
    }
    const holder = [...officeStaffIncumbencyRecords(world)]
      .reverse()
      .find((record) => record.positionId === position.id);
    if (holder)
      filled.push({
        positionId: position.id,
        title: position.title,
        personId: holder.personId,
      });
  }
  return {
    authorized: positions.length > 0,
    openings,
    filled,
    profile: office.table.profile,
  };
}

function offeringKey(
  world: World,
  office: StaffableOffice,
  positionId: EntityId,
): string {
  // A position that has been held before opens a fresh search; the count of
  // earlier incumbencies keeps each search's applicants its own.
  const earlier = officeStaffIncumbencyRecords(world).filter(
    (record) => record.positionId === positionId,
  ).length;
  return `office-staff-offer:${office.officeKey}:${positionId}:${earlier}`;
}

function offeringEvent(
  world: World,
  office: StaffableOffice,
  positionId: EntityId,
): HistoricalEvent | null {
  const key = offeringKey(world, office, positionId);
  return world.history.events.find((event) => event.stableKey === key) ?? null;
}

function offeredCandidates(
  world: World,
  office: StaffableOffice,
  positionId: EntityId,
): readonly EntityId[] {
  const event = offeringEvent(world, office, positionId);
  if (!event) return [];
  return event.participants
    .filter((participant) => participant.role === "focus:candidate")
    .map((participant) => participant.personId)
    .filter((personId) => world.people[personId] !== undefined);
}

function emptyContext() {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
}

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

export type StaffingResult =
  | { readonly kind: "done"; readonly world: World; readonly note: string }
  | { readonly kind: "refused"; readonly reason: string };

/**
 * Authorizes the office's positions (once) and, for every opening with no
 * applicants yet, writes applicants into the world with their working lives
 * already on record. Idempotent: asking again writes nothing.
 */
export function openOfficeStaffSearch(
  world: World,
  office: StaffableOffice,
): StaffingResult {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== office.holderPersonId
  )
    return {
      kind: "refused",
      reason: "Only the officeholder can hire for this office.",
    };
  let next = establishOfficeStaffPositions(world, office, office.table).world;
  let asked = 0;
  for (const opening of openOfficePositions(next, office.officeKey)) {
    if ((office.filledElsewhere ?? []).includes(opening.classKey)) continue;
    if (offeringEvent(next, office, opening.positionId)) continue;
    const key = offeringKey(next, office, opening.positionId);
    const created = createCandidates(next, office, key, CANDIDATES_PER_OPENING);
    next = recordWorldEvent(created.world, {
      stableKey: key,
      type: OFFICE_STAFF_CANDIDATES_OFFERED,
      occurredAt: created.world.currentDate,
      recordedAt: created.world.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [
        office.holderPersonId,
        office.organizationId,
        ...created.personIds,
      ],
      participants: [
        {
          personId: office.holderPersonId,
          role: "agency:officeholder",
          detail: office.title,
        },
        ...created.personIds.map((personId) => ({
          personId,
          role: "focus:candidate" as const,
          detail: opening.title,
        })),
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        OFFICE_STAFF_HIRING_VERSION,
        `office:${office.officeKey}`,
        `position:${opening.positionId}`,
      ],
      summary: `${created.personIds.length} people applied to be ${opening.title} in the office of ${office.title}.`,
      context: emptyContext(),
    });
    asked += 1;
  }
  return {
    kind: "done",
    world: next,
    note:
      asked === 0
        ? "Every open position already has applicants."
        : `Applicants are waiting for ${asked} open ${asked === 1 ? "position" : "positions"}.`,
  };
}

/**
 * Hires one applicant into one open position: an ordinary employment with the
 * office's organization, bound to the position it fills. Refuses an applicant
 * who did not apply for that position, or a position somebody holds.
 */
export function hireOfficeStaff(
  world: World,
  office: StaffableOffice,
  input: { readonly positionId: EntityId; readonly personId: EntityId },
): StaffingResult {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== office.holderPersonId
  )
    return {
      kind: "refused",
      reason: "Only the officeholder can hire for this office.",
    };
  const position = officeStaffPositions(world, office).find(
    (record) => record.id === input.positionId,
  );
  if (!position)
    return { kind: "refused", reason: "This office has no such position." };
  if ((office.filledElsewhere ?? []).includes(position.classKey))
    return {
      kind: "refused",
      reason: `The ${position.title} is not hired from this list.`,
    };
  if (
    !openOfficePositions(world, office.officeKey).some(
      (opening) => opening.positionId === position.id,
    )
  )
    return {
      kind: "refused",
      reason: `Somebody already holds the ${position.title} position.`,
    };
  if (!offeredCandidates(world, office, position.id).includes(input.personId))
    return {
      kind: "refused",
      reason: `That person did not apply to be ${position.title}.`,
    };
  const person = world.people[input.personId]!;
  const hireKey = `${offeringKey(world, office, position.id)}:hire`;
  let next = recordWorldEvent(world, {
    stableKey: hireKey,
    type: OFFICE_STAFF_HIRED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      office.holderPersonId,
      office.organizationId,
      input.personId,
    ],
    participants: [
      {
        personId: office.holderPersonId,
        role: "agency:officeholder",
        detail: office.title,
      },
      { personId: input.personId, role: "focus:hire", detail: position.title },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      OFFICE_STAFF_HIRING_VERSION,
      `office:${office.officeKey}`,
      `position:${position.id}`,
    ],
    summary: `${person.givenName} ${person.familyName} was hired as ${position.title} in the office of ${office.title}.`,
    context: emptyContext(),
  });
  const hired = next.history.events.at(-1)!;
  const workKey = `${hireKey}:work`;
  next = createWorkRelationship(next, {
    stableKey: workKey,
    personId: input.personId,
    organizationId: office.organizationId,
    startedAt: makeIsoDate(world.currentDate),
    initialStatus: "active",
    kind: office.employmentKind,
    compensation: "paid",
    authority: "shared",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "simulated-event", eventId: hired.id },
    initialRole: {
      title: position.title,
      occupationClassification: office.occupationClassification,
      locationJurisdictionId: office.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 45 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: office.jurisdictionId,
      },
    },
  });
  const work = next.history.workRelationships.find(
    (relationship) => relationship.stableKey === workKey,
  );
  if (!work)
    return { kind: "refused", reason: "The employment could not be recorded." };
  const bound = recordOfficeStaffIncumbency(next, office, {
    classKey: position.classKey,
    workRelationshipId: work.id,
    note: `Hired as ${position.title} by the officeholder.`,
  });
  return {
    kind: "done",
    world: bound.world,
    note: `${person.givenName} ${person.familyName} now works for you as ${position.title}.`,
  };
}
