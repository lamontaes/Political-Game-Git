/**
 * Staff-guided office onboarding: revisable voting/casework preferences and
 * a truthful briefing from actual staff and known records.
 *
 * Opening this projection writes nothing. A staff recommendation is not an
 * adopted amendment. A preference is not a floor vote.
 */

import {
  legislativeMemberOffice,
  officeStaffIncumbencyRecords,
  officeStaffPositionRecords,
  officeStaffingView,
  personName,
  type OfficeStaffingView,
  type StaffableOffice,
} from "../simulation";
import { activeLifePathWorkers } from "../simulation/life-paths2-workers";
import {
  currentMeasureProvisions,
  measureAmendments,
  measureTextVersion,
  currentOfficeWorkflowPreference,
  currentOfficeVoteInstruction,
  officeBriefingInspections,
} from "../simulation";
import type {
  EntityId,
  OfficeCaseworkWorkflowMode,
  OfficeVoteInstructionDisposition,
  OfficeVotingWorkflowMode,
  World,
} from "../simulation";
import {
  resolveActiveMemberSeat,
  type ActiveMemberSeat,
} from "./legislative-member-seat";
import { evaluateOfficeVoteInstruction } from "./office-vote-instruction";

export const OFFICE_VOTING_CHOICES: readonly {
  readonly mode: OfficeVotingWorkflowMode;
  readonly label: string;
  readonly detail: string;
  readonly proposedDefault: boolean;
}[] = [
  {
    mode: "prior-instructions-with-exceptions",
    label: "Leave instructions, then handle exceptions",
    detail:
      "Record how you want to vote on a bill as it now reads. If the text or the question changes, the office stops and asks you again. This is not a proxy vote.",
    proposedDefault: true,
  },
  {
    mode: "review-batch",
    label: "Review votes in a batch",
    detail:
      "Hold the questions and take them up together. Nothing is recorded as a vote until that review.",
    proposedDefault: false,
  },
  {
    mode: "handle-individually",
    label: "Handle each vote yourself",
    detail:
      "Every question waits for your own decision. Staff may brief; they may not cast it.",
    proposedDefault: false,
  },
];

export const OFFICE_CASEWORK_CHOICES: readonly {
  readonly mode: OfficeCaseworkWorkflowMode;
  readonly label: string;
  readonly detail: string;
}[] = [
  {
    mode: "staff-routine-player-exceptions",
    label: "Staff handle routine requests; bring exceptions to me",
    detail:
      "Ordinary constituent work stays with the people who already work here. Unusual or contested requests come to you.",
  },
  {
    mode: "player-handles-all",
    label: "I will handle constituent work myself",
    detail: "Staff may still brief. They do not take the case unless you ask.",
  },
  {
    mode: "staff-handles-and-briefs",
    label: "Staff handle the casework and brief me",
    detail:
      "The office works the file and tells you what they did. You can change this later.",
  },
];

export const OFFICE_INSTRUCTION_CHOICES: readonly {
  readonly disposition: OfficeVoteInstructionDisposition;
  readonly label: string;
}[] = [
  { disposition: "yea", label: "Support this bill as it now reads" },
  { disposition: "nay", label: "Oppose this bill as it now reads" },
  {
    disposition: "present-not-voting",
    label: "Be recorded present, not voting, on this text",
  },
];

export interface OfficeStaffMember {
  readonly personId: EntityId;
  readonly name: string;
  readonly title: string;
}

export type OfficeBriefingAccess =
  | {
      readonly status: "known";
      readonly basis: "public-record" | "staff-account";
      readonly summary: string;
      readonly attributedPersonId: EntityId | null;
      readonly originEventId: EntityId;
      readonly publicRecordOnFile: boolean;
    }
  | {
      readonly status: "unavailable";
      readonly reason: string;
      readonly believedSummary: string | null;
    };

export interface OfficeBriefingItem {
  readonly kind: "amendment" | "filed-section";
  readonly itemId: EntityId;
  readonly canonicalRecordId: EntityId;
  readonly originEventId: EntityId | null;
  readonly heading: string;
  readonly summary: string;
  readonly inspected: boolean;
  readonly known: boolean;
  readonly access: OfficeBriefingAccess;
  readonly unknownReason: string | null;
}

export interface OfficeStaffBriefing {
  readonly kind: "staffed" | "no-staff";
  /** Known items on file. Not a skill-ranked recommendation until one exists. */
  readonly role: "briefing";
  readonly recommendationStatus: "none";
  /** A recorded casework preference is not completed constituent work. */
  readonly executedDelegation: false;
  readonly staff: readonly OfficeStaffMember[];
  readonly packageLabel: string;
  readonly packageSummary: string;
  readonly items: readonly OfficeBriefingItem[];
  readonly openingIsNotAdoption: string;
}

export interface OfficeOnboardingProjection {
  readonly membership:
    | { readonly kind: "unseated"; readonly reason: string }
    | {
        readonly kind: "seated";
        readonly seat: ActiveMemberSeat;
        readonly officeLabel: string;
      };
  readonly preference: ReturnType<typeof currentOfficeWorkflowPreference>;
  readonly selectedMeasureId: EntityId | null;
  readonly measureDesignation: string | null;
  readonly measureTextVersion: string | null;
  readonly instruction: ReturnType<typeof currentOfficeVoteInstruction>;
  readonly instructionStatus: ReturnType<
    typeof evaluateOfficeVoteInstruction
  > | null;
  readonly briefing: OfficeStaffBriefing;
  /** The member's own office positions: who holds them and who applied. */
  readonly staffing: OfficeStaffingView | null;
  readonly wroteNothing: true;
}

export function projectOfficeOnboarding(
  world: World,
  playerPersonId: EntityId,
  selectedMeasureId?: EntityId | null,
): OfficeOnboardingProjection {
  const membership = resolveActiveMemberSeat(world, playerPersonId);
  if (membership.kind !== "seated") {
    return {
      membership: { kind: "unseated", reason: membership.reason },
      preference: null,
      selectedMeasureId: selectedMeasureId ?? null,
      measureDesignation: null,
      measureTextVersion: null,
      instruction: null,
      instructionStatus: null,
      briefing: emptyBriefing("no-staff", []),
      staffing: null,
      wroteNothing: true,
    };
  }
  const seat = membership.seat;
  const preference = currentOfficeWorkflowPreference(
    world,
    playerPersonId,
    seat.relationshipId,
  );
  const measureId = selectedMeasureId ?? null;
  const measure = measureId
    ? (world.history.legislativeMeasures ?? []).find(
        (record) => record.id === measureId,
      )
    : null;
  const version = measure ? measureTextVersion(world, measure.id) : null;
  const instruction =
    measure && preference
      ? currentOfficeVoteInstruction(
          world,
          playerPersonId,
          seat.relationshipId,
          measure.id,
        )
      : null;
  const instructionStatus =
    measure && preference
      ? evaluateOfficeVoteInstruction(world, {
          actorPersonId: playerPersonId,
          officeRelationshipId: seat.relationshipId,
          chamberKey: seat.chamberKey,
          measureId: measure.id,
        })
      : null;
  const staff = listOfficeStaff(world, seat, playerPersonId);
  const briefing = projectStaffBriefing(world, {
    playerPersonId,
    seat,
    staff,
    measureId: measure?.id ?? null,
  });
  return {
    membership: {
      kind: "seated",
      seat,
      officeLabel: officeLabel(world, seat),
    },
    preference,
    selectedMeasureId: measure?.id ?? null,
    measureDesignation: measure?.designation ?? null,
    measureTextVersion: version,
    instruction,
    instructionStatus,
    briefing,
    staffing: officeStaffingView(
      world,
      memberStaffOffice(world, seat, playerPersonId),
    ),
    wroteNothing: true,
  };
}

/** The member's own office, as the staff-hiring records know it. */
export function memberStaffOffice(
  world: World,
  seat: ActiveMemberSeat,
  playerPersonId: EntityId,
): StaffableOffice {
  const player = world.people[playerPersonId];
  return legislativeMemberOffice({
    seatRelationshipId: seat.relationshipId,
    organizationId: seat.organizationId,
    jurisdictionId: seat.governingJurisdictionId,
    holderPersonId: playerPersonId,
    title: player ? personName(player) : "this member",
  });
}

export function officeOnboardingDraftResetKey(
  worldId: EntityId,
  playerPersonId: EntityId,
  officeRelationshipId: EntityId | null,
  preferenceId: EntityId | null,
): string {
  return `${worldId}:${playerPersonId}:${officeRelationshipId ?? "unseated"}:${preferenceId ?? "none"}`;
}

/**
 * Staff employed at this member's organization. Ordinary production seating
 * does not hire aides onto that organization; a no-staff office is valid.
 */
export function listOfficeStaff(
  world: World,
  seat: ActiveMemberSeat,
  playerPersonId: EntityId,
): readonly OfficeStaffMember[] {
  // Staff hired into a position work for that position's office. Everybody
  // shares the chamber's organization, so a staffer bound to another member's
  // office is not this member's staff; one bound to none (a production start's
  // legislative office) still is.
  const ownOffice = memberStaffOffice(world, seat, playerPersonId).officeKey;
  const positionOffice = new Map(
    officeStaffPositionRecords(world).map((record) => [
      record.id,
      record.officeKey,
    ]),
  );
  const boundOffice = new Map(
    officeStaffIncumbencyRecords(world).map((record) => [
      record.workRelationshipId,
      positionOffice.get(record.positionId) ?? null,
    ]),
  );
  return activeLifePathWorkers(world, seat.organizationId)
    .filter(
      (entry) =>
        entry.personId !== playerPersonId &&
        entry.relationship.kind === "employment:legislative-staff" &&
        (!boundOffice.has(entry.relationship.id) ||
          boundOffice.get(entry.relationship.id) === ownOffice),
    )
    .map((entry) => {
      const person = world.people[entry.personId];
      return {
        personId: entry.personId,
        name: person ? personName(person) : "An unnamed staffer",
        title: entry.role.title,
      };
    });
}

function officeLabel(world: World, seat: ActiveMemberSeat): string {
  const jurisdiction = world.jurisdictions[seat.governingJurisdictionId];
  return jurisdiction
    ? `${jurisdiction.name} · ${seat.chamberKey}`
    : seat.chamberKey;
}

function projectStaffBriefing(
  world: World,
  input: {
    readonly playerPersonId: EntityId;
    readonly seat: ActiveMemberSeat;
    readonly staff: readonly OfficeStaffMember[];
    readonly measureId: EntityId | null;
  },
): OfficeStaffBriefing {
  if (input.staff.length === 0) {
    return emptyBriefing("no-staff", []);
  }
  if (!input.measureId) {
    return {
      kind: "staffed",
      role: "briefing",
      recommendationStatus: "none",
      executedDelegation: false,
      staff: input.staff,
      packageLabel: `${input.staff[0]!.name} has no bill on the table`,
      packageSummary:
        "Open a measure through the ordinary office docket before asking staff to brief known items.",
      items: [],
      openingIsNotAdoption:
        "Opening a briefing item does not adopt it, recommend it, or change the bill.",
    };
  }
  const measureId = input.measureId;
  const inspections = officeBriefingInspections(world).filter(
    (record) =>
      record.personId === input.playerPersonId &&
      record.officeRelationshipId === input.seat.relationshipId &&
      record.measureId === measureId,
  );
  const inspected = (kind: "amendment" | "filed-section", itemId: EntityId) =>
    inspections.some(
      (record) => record.itemKind === kind && record.itemId === itemId,
    );
  const amendments = measureAmendments(world, measureId);
  const items: OfficeBriefingItem[] = amendments.map((amendment) => {
    const originEventId = originEventIdForAmendment(world, amendment.id);
    const event = originEventId
      ? (world.history.events.find((record) => record.id === originEventId) ??
        null)
      : null;
    const access = resolveStaffEventAccess(
      world,
      input.staff,
      event,
      amendment.description,
    );
    return briefingItem(
      "amendment",
      amendment.id,
      amendment.id,
      originEventId,
      amendment.offeredByLabel,
      access,
      inspected("amendment", amendment.id),
    );
  });
  if (items.length === 0) {
    for (const section of currentMeasureProvisions(world, measureId)) {
      const event =
        world.history.events.find((record) => record.id === section.eventId) ??
        null;
      const access = resolveStaffEventAccess(
        world,
        input.staff,
        event,
        section.text,
      );
      items.push(
        briefingItem(
          "filed-section",
          section.id,
          section.id,
          section.eventId,
          `Section ${section.sectionNumber}. ${section.heading}`,
          access,
          inspected("filed-section", section.id),
        ),
      );
    }
  }
  const knownCount = items.filter((item) => item.known).length;
  const lead = input.staff[0]!;
  const packageSummary =
    knownCount === 0
      ? `${lead.name} has no known items to brief on this bill.`
      : `${lead.name} can brief the known items on file. This is not a recommended amendment package.`;
  return {
    kind: "staffed",
    role: "briefing",
    recommendationStatus: "none",
    executedDelegation: false,
    staff: input.staff,
    packageLabel: `Briefing from ${lead.name}`,
    packageSummary,
    items,
    openingIsNotAdoption:
      "Opening a briefing item does not adopt it, recommend it, or change the bill.",
  };
}

function briefingItem(
  kind: "amendment" | "filed-section",
  itemId: EntityId,
  canonicalRecordId: EntityId,
  originEventId: EntityId | null,
  heading: string,
  access: OfficeBriefingAccess,
  inspected: boolean,
): OfficeBriefingItem {
  const known = access.status === "known";
  return {
    kind,
    itemId,
    canonicalRecordId,
    originEventId,
    heading,
    summary:
      access.status === "known"
        ? access.summary
        : (access.believedSummary ?? access.reason),
    inspected,
    known,
    access,
    unknownReason: access.status === "unavailable" ? access.reason : null,
  };
}

function originEventIdForAmendment(
  world: World,
  amendmentId: EntityId,
): EntityId | null {
  return (
    (world.history.legislativeActions ?? []).find(
      (action) => action.amendmentId === amendmentId,
    )?.eventId ?? null
  );
}

/**
 * Staff may brief a public filing without a private knowledge row. Missing
 * events and private records do not become known by absence. Recorded staff
 * accounts are attributed; hidden accuracy is not a player verdict.
 */
export function resolveStaffEventAccess(
  world: World,
  staff: readonly OfficeStaffMember[],
  event: World["history"]["events"][number] | null,
  canonicalSummary: string,
): OfficeBriefingAccess {
  if (!event) {
    return {
      status: "unavailable",
      reason: "No established record of this item is available to brief.",
      believedSummary: null,
    };
  }
  const staffIds = new Set(staff.map((member) => member.personId));
  const knowledge = world.history.knowledge
    .filter(
      (record) => record.eventId === event.id && staffIds.has(record.personId),
    )
    .slice()
    .sort((left, right) => right.sequence - left.sequence);
  if (knowledge.length > 0) {
    const latest = knowledge[0]!;
    return {
      status: "known",
      basis: "staff-account",
      summary: latest.believedSummary,
      attributedPersonId: latest.personId,
      originEventId: event.id,
      publicRecordOnFile: event.visibility === "public",
    };
  }
  if (event.visibility === "public") {
    return {
      status: "known",
      basis: "public-record",
      summary: canonicalSummary,
      attributedPersonId: null,
      originEventId: event.id,
      publicRecordOnFile: true,
    };
  }
  return {
    status: "unavailable",
    reason:
      "This record is not public, and no staff knowledge of it is recorded.",
    believedSummary: null,
  };
}

function emptyBriefing(
  kind: "staffed" | "no-staff",
  staff: readonly OfficeStaffMember[],
): OfficeStaffBriefing {
  return {
    kind,
    role: "briefing",
    recommendationStatus: "none",
    executedDelegation: false,
    staff,
    packageLabel:
      kind === "no-staff"
        ? "No staff are recorded for this office"
        : "Staff have nothing to brief",
    packageSummary:
      kind === "no-staff"
        ? "You can still record how votes and casework should be handled."
        : "Staff are present but have no known items to brief on this bill.",
    items: [],
    openingIsNotAdoption:
      "Opening a briefing item does not adopt it, recommend it, or change the bill.",
  };
}
