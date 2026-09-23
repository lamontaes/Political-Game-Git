import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { executiveOfficeStaffBoundary } from "../civil-personnel-actions";
import { workStatusAt } from "../life-queries";
import { assertWorldIntegrity } from "../world";
import type {
  EntityId,
  IsoDate,
  OfficeStaffIncumbencyRecord,
  OfficeStaffPositionRecord,
  PersonnelCivilClass,
  World,
} from "../types";
import type { GoverningOffice } from "./state-governing";

/**
 * Which positions an elected office is treated as having is an authored
 * gameplay profile: no acquired source establishes a staffing table for an
 * elected office. What IS sourced, where it has been compiled, is the
 * civil-service class those staff sit in, and that is read from the civil
 * personnel domain rather than invented here.
 *
 * These positions are governing's own records, not that domain's. Its
 * position family charters positions of AUTHORED STATE AGENCIES, and it
 * refuses anything else on purpose — a governor's office generated for one of
 * fifty states is neither authored nor an agency. Reusing that family here
 * would have meant loosening a rule that is doing its job, so this keeps its
 * own records and still reads its boundary for the one fact it establishes.
 */
export const OFFICE_STAFFING_PROFILE = "governing-office-staffing/v1";

export interface OfficeStaffPositionProfile {
  /** Stable across saves; also the suffix of the position's stable key. */
  readonly classKey: string;
  readonly title: string;
  /** What the office gets from filling it, in the player's terms. */
  readonly duty: string;
}

/**
 * Three positions, each one the game can actually use. A staffing table
 * longer than the game can exercise would be decoration, not a position.
 */
export const OFFICE_STAFF_POSITIONS: readonly OfficeStaffPositionProfile[] = [
  {
    classKey: "office-chief-of-staff",
    title: "Chief of Staff",
    duty: "Runs the office, recommends choices, and can take matters the officeholder hands over.",
  },
  {
    classKey: "office-legislative-director",
    title: "Legislative Director",
    duty: "Reads bills before the office has to decide on them.",
  },
  {
    classKey: "office-constituent-services",
    title: "Constituent Services Caseworker",
    duty: "Takes the cases constituents bring to the office.",
  },
];

export function officeStaffPositionProfile(
  classKey: string,
): OfficeStaffPositionProfile | null {
  return (
    OFFICE_STAFF_POSITIONS.find((position) => position.classKey === classKey) ??
    null
  );
}

export function officeStaffPositionKey(
  office: Pick<GoverningOffice, "officeKey">,
  classKey: string,
): string {
  return `office-staff:${office.officeKey}:${classKey}`;
}

export function officeStaffPositionRecords(
  world: World,
): readonly OfficeStaffPositionRecord[] {
  return world.history.officeStaffPositions ?? [];
}

export function officeStaffIncumbencyRecords(
  world: World,
): readonly OfficeStaffIncumbencyRecord[] {
  return world.history.officeStaffIncumbencies ?? [];
}

/* ------------------------------------------------------------------ *
 * What the civil personnel domain establishes about the class
 * ------------------------------------------------------------------ */

export interface OfficeStaffClassReading {
  readonly civilClass: PersonnelCivilClass;
  readonly basis: string;
}

/**
 * The staff's civil-service class, from the compiled boundary where the state
 * has one and `unknown` with the reason where it does not. Takes the state
 * code rather than a whole office, so it can be asked about a state whose
 * office this World has not materialized.
 */
export function officeStaffClass(
  stateUsps: string,
  onDate: IsoDate | string,
): OfficeStaffClassReading {
  const boundary = executiveOfficeStaffBoundary(
    `US-${stateUsps}`,
    makeIsoDate(onDate),
  );
  const profileNote = `Which positions this office has is ${OFFICE_STAFFING_PROFILE}, an authored gameplay profile, not sourced law.`;
  return boundary.state === "known"
    ? {
        civilClass: boundary.civilClass,
        basis: `${boundary.statement} (${boundary.citation}). ${profileNote}`,
      }
    : {
        civilClass: "unknown",
        basis: `${boundary.reason} The class is recorded unknown rather than guessed. ${profileNote}`,
      };
}

/* ------------------------------------------------------------------ *
 * Authorizing an office's positions
 * ------------------------------------------------------------------ */

export interface OfficeStaffingOutcome {
  readonly world: World;
  /** Positions this call authorized, in profile order. */
  readonly established: readonly string[];
  /** Positions that already existed, so nothing was written for them. */
  readonly alreadyAuthorized: readonly string[];
}

/**
 * Authorizes the office's staff positions once. Idempotent: a second call on
 * the same office writes nothing. Positions are authorized whether or not
 * anybody fills them — an unfilled position is a real fact about an office,
 * and it is what somebody looking for that kind of work has to find.
 */
export function establishOfficeStaffPositions(
  world: World,
  office: Pick<GoverningOffice, "officeKey" | "organizationId"> & {
    /** Null where no state's civil-service boundary applies to this office. */
    readonly stateUsps: string | null;
  },
  table: {
    readonly positions: readonly OfficeStaffPositionProfile[];
    readonly profile: string;
    readonly classReading?: OfficeStaffClassReading;
  } = { positions: OFFICE_STAFF_POSITIONS, profile: OFFICE_STAFFING_PROFILE },
): OfficeStaffingOutcome {
  const reading: OfficeStaffClassReading =
    table.classReading ??
    (office.stateUsps
      ? officeStaffClass(office.stateUsps, world.currentDate)
      : {
          civilClass: "unknown",
          basis: `No state civil-service boundary applies to this office, so the class is recorded unknown. Which positions it has is ${table.profile}, an authored gameplay profile.`,
        });
  const existing = officeStaffPositionRecords(world);
  const established: string[] = [];
  const alreadyAuthorized: string[] = [];
  const added: OfficeStaffPositionRecord[] = [];
  let sequence = world.history.nextSequence;
  for (const position of table.positions) {
    const stableKey = officeStaffPositionKey(office, position.classKey);
    if (existing.some((record) => record.stableKey === stableKey)) {
      alreadyAuthorized.push(position.classKey);
      continue;
    }
    added.push({
      id: createStableId("office-staff-position", `${world.id}:${stableKey}`),
      stableKey,
      sequence,
      recordedAt: makeIsoDate(world.currentDate),
      officeKey: office.officeKey,
      organizationId: office.organizationId,
      classKey: position.classKey,
      title: position.title,
      duty: position.duty,
      civilClass: reading.civilClass,
      civilClassBasis: reading.basis,
      profile: table.profile,
    });
    established.push(position.classKey);
    sequence += 1;
  }
  if (added.length === 0) return { world, established, alreadyAuthorized };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence,
      officeStaffPositions: [...existing, ...added],
    },
  };
  assertWorldIntegrity(next);
  return { world: next, established, alreadyAuthorized };
}

/** Every authorized position belonging to this office. */
export function officeStaffPositions(
  world: World,
  office: Pick<GoverningOffice, "officeKey">,
): readonly OfficeStaffPositionRecord[] {
  return officeStaffPositionRecords(world).filter(
    (record) => record.officeKey === office.officeKey,
  );
}

/* ------------------------------------------------------------------ *
 * Who holds one, and what is open
 * ------------------------------------------------------------------ */

/** The incumbency of a position, while the employment behind it lasts. */
export function positionIncumbency(
  world: World,
  positionId: EntityId,
): OfficeStaffIncumbencyRecord | null {
  return (
    officeStaffIncumbencyRecords(world).find(
      (record) =>
        record.positionId === positionId &&
        workIsActive(world, record.workRelationshipId),
    ) ?? null
  );
}

export interface OpenOfficePosition {
  readonly positionId: EntityId;
  readonly officeKey: string;
  readonly organizationId: EntityId;
  readonly title: string;
  readonly classKey: string;
  readonly duty: string;
  readonly civilClass: PersonnelCivilClass;
}

/**
 * Positions nobody currently holds. This is the canonical answer to "what
 * work of this kind is open" — including for somebody who has just finished
 * an education and is looking. It reads authorized positions and their
 * incumbencies, and invents no opening that was never authorized.
 */
export function openOfficePositions(
  world: World,
  officeKey?: string,
): readonly OpenOfficePosition[] {
  const held = new Set(
    officeStaffIncumbencyRecords(world)
      .filter((record) => workIsActive(world, record.workRelationshipId))
      .map((record) => record.positionId),
  );
  return officeStaffPositionRecords(world)
    .filter(
      (record) =>
        (officeKey === undefined || record.officeKey === officeKey) &&
        !held.has(record.id),
    )
    .map((record) => ({
      positionId: record.id,
      officeKey: record.officeKey,
      organizationId: record.organizationId,
      title: record.title,
      classKey: record.classKey,
      duty: record.duty,
      civilClass: record.civilClass,
    }));
}

/**
 * A position is held only while the employment behind it is active. An
 * employment that has ended reopens the position rather than holding it
 * forever, which is what makes a resignation visible as an opening.
 */
function workIsActive(world: World, workRelationshipId: EntityId): boolean {
  return workStatusAt(world, workRelationshipId)?.status === "active";
}

/**
 * Binds an employment this office has just created to the position it fills.
 * Refusing is normal — a position nobody authorized, or one somebody already
 * holds — and refusing leaves the employment alone rather than unwinding it.
 */
export function recordOfficeStaffIncumbency(
  world: World,
  office: Pick<GoverningOffice, "officeKey">,
  input: {
    readonly classKey: string;
    readonly workRelationshipId: EntityId;
    readonly note: string;
  },
): { readonly world: World; readonly bound: boolean; readonly note: string } {
  const stableKey = officeStaffPositionKey(office, input.classKey);
  const position = officeStaffPositionRecords(world).find(
    (record) => record.stableKey === stableKey,
  );
  if (!position)
    return {
      world,
      bound: false,
      note: `No ${input.classKey} position is authorized for this office, so the employment records no incumbency.`,
    };
  const work = world.history.workRelationships.find(
    (relationship) => relationship.id === input.workRelationshipId,
  );
  if (!work || work.organizationId !== position.organizationId)
    return {
      world,
      bound: false,
      note: "The employment must be with the office that authorized the position.",
    };
  if (positionIncumbency(world, position.id))
    return {
      world,
      bound: false,
      note: `Somebody already holds the ${position.title} position.`,
    };
  const incumbencyKey = `${stableKey}:incumbency:${input.workRelationshipId}`;
  const record: OfficeStaffIncumbencyRecord = {
    id: createStableId(
      "office-staff-incumbency",
      `${world.id}:${incumbencyKey}`,
    ),
    stableKey: incumbencyKey,
    sequence: world.history.nextSequence,
    recordedAt: makeIsoDate(world.currentDate),
    positionId: position.id,
    workRelationshipId: work.id,
    personId: work.personId,
    startedAt: makeIsoDate(work.startedAt),
    note: input.note,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      officeStaffIncumbencies: [...officeStaffIncumbencyRecords(world), record],
    },
  };
  assertWorldIntegrity(next);
  return {
    world: next,
    bound: true,
    note: `Recorded in the ${position.title} position.`,
  };
}
