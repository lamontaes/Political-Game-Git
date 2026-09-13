/**
 * Staff-guided office onboarding: revisable voting/casework preferences and
 * a truthful briefing from actual staff and known records.
 *
 * Opening this projection writes nothing. A staff recommendation is not an
 * adopted amendment. A preference is not a floor vote.
 */

import { personName } from "../simulation";
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

export interface OfficeBriefingItem {
  readonly kind: "amendment" | "filed-section";
  readonly itemId: EntityId;
  readonly heading: string;
  readonly summary: string;
  readonly inspected: boolean;
  readonly known: boolean;
  readonly unknownReason: string | null;
}

export interface OfficeStaffBriefing {
  readonly kind: "staffed" | "no-staff";
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
    wroteNothing: true,
  };
}

export function listOfficeStaff(
  world: World,
  seat: ActiveMemberSeat,
  playerPersonId: EntityId,
): readonly OfficeStaffMember[] {
  return activeLifePathWorkers(world, seat.organizationId)
    .filter(
      (entry) =>
        entry.personId !== playerPersonId &&
        entry.relationship.kind === "employment:legislative-staff",
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
      staff: input.staff,
      packageLabel: `${input.staff[0]!.name} has no bill on the table`,
      packageSummary:
        "Open a measure through the ordinary office docket before asking staff for an amendment package.",
      items: [],
      openingIsNotAdoption:
        "Opening a recommendation does not adopt it or change the bill.",
    };
  }
  const inspections = officeBriefingInspections(world).filter(
    (record) =>
      record.personId === input.playerPersonId &&
      record.officeRelationshipId === input.seat.relationshipId &&
      record.measureId === input.measureId,
  );
  const inspected = (kind: "amendment" | "filed-section", itemId: EntityId) =>
    inspections.some(
      (record) => record.itemKind === kind && record.itemId === itemId,
    );
  const amendments = measureAmendments(world, input.measureId);
  const items: OfficeBriefingItem[] = amendments.map((amendment) => {
    const known = staffKnowAmendment(world, input.staff, amendment.id);
    return {
      kind: "amendment",
      itemId: amendment.id,
      heading: amendment.offeredByLabel,
      summary: known
        ? amendment.description
        : "Staff have not established what this amendment says.",
      inspected: inspected("amendment", amendment.id),
      known,
      unknownReason: known
        ? null
        : "No staff record of this amendment is in the office files they actually know.",
    };
  });
  if (items.length === 0) {
    const introduction = world.history.events.find(
      (record) =>
        record.type === "legislation.measure-introduced" &&
        record.involvedEntityIds.includes(input.measureId),
    );
    const knownFromStaff = introduction
      ? staffKnowEvent(world, input.staff, introduction.id)
      : true;
    for (const section of currentMeasureProvisions(world, input.measureId)) {
      items.push({
        kind: "filed-section",
        itemId: section.id,
        heading: `Section ${section.sectionNumber}. ${section.heading}`,
        summary: knownFromStaff
          ? section.text
          : "Staff cannot yet brief this section from what they actually know.",
        inspected: inspected("filed-section", section.id),
        known: knownFromStaff,
        unknownReason: knownFromStaff
          ? null
          : "Staff knowledge of this filing is recorded as unknown.",
      });
    }
  }
  const knownCount = items.filter((item) => item.known).length;
  const lead = input.staff[0]!;
  const packageSummary =
    knownCount === 0
      ? `${lead.name} cannot recommend a package: the office has no known amendment or section to group.`
      : `${lead.name} recommends taking the known items together, with inspection of each still available. This is a staff judgment, not an omniscient best package.`;
  return {
    kind: "staffed",
    staff: input.staff,
    packageLabel: `${lead.name}'s recommended package`,
    packageSummary,
    items,
    openingIsNotAdoption:
      "Opening a recommendation does not adopt it or change the bill.",
  };
}

function staffKnowAmendment(
  world: World,
  staff: readonly OfficeStaffMember[],
  amendmentId: EntityId,
): boolean {
  const amendment = (world.history.legislativeAmendments ?? []).find(
    (record) => record.id === amendmentId,
  );
  if (!amendment) return false;
  const event = world.history.events.find((record) =>
    record.involvedEntityIds.includes(amendment.id),
  );
  if (!event) return true;
  return staffKnowEvent(world, staff, event.id);
}

function staffKnowEvent(
  world: World,
  staff: readonly OfficeStaffMember[],
  eventId: EntityId,
): boolean {
  const staffIds = new Set(staff.map((member) => member.personId));
  const knowledge = world.history.knowledge.filter(
    (record) => record.eventId === eventId && staffIds.has(record.personId),
  );
  if (knowledge.length === 0) return true;
  return knowledge.some(
    (record) => record.accuracy === "accurate" || record.accuracy === "partial",
  );
}

function emptyBriefing(
  kind: "staffed" | "no-staff",
  staff: readonly OfficeStaffMember[],
): OfficeStaffBriefing {
  return {
    kind,
    staff,
    packageLabel:
      kind === "no-staff"
        ? "No aide is on staff"
        : "Staff have nothing to brief",
    packageSummary:
      kind === "no-staff"
        ? "This office works without inventing an aide. You can still record how votes and casework should be handled."
        : "Staff are present but have no known package for this bill.",
    items: [],
    openingIsNotAdoption:
      "Opening a recommendation does not adopt it or change the bill.",
  };
}
