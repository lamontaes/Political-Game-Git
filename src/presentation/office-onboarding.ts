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

export type OfficeBriefingAccess =
  | {
      readonly status: "known";
      readonly basis: "public-record" | "recorded-knowledge";
      readonly summary: string;
    }
  | {
      readonly status: "unavailable";
      readonly reason: string;
      readonly believedSummary: string | null;
    };

export interface OfficeBriefingItem {
  readonly kind: "amendment" | "filed-section";
  readonly itemId: EntityId;
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
    const event = world.history.events.find((record) =>
      record.involvedEntityIds.includes(amendment.id),
    );
    const access = resolveStaffEventAccess(
      world,
      input.staff,
      event ?? null,
      amendment.description,
    );
    return briefingItem(
      "amendment",
      amendment.id,
      amendment.offeredByLabel,
      access,
      inspected("amendment", amendment.id),
    );
  });
  if (items.length === 0) {
    const introduction = world.history.events.find(
      (record) =>
        record.type === "legislation.measure-introduced" &&
        record.involvedEntityIds.includes(measureId),
    );
    for (const section of currentMeasureProvisions(world, measureId)) {
      const filing = world.history.events.find(
        (record) =>
          record.type === "legislation.provision-filed" &&
          record.involvedEntityIds.includes(measureId) &&
          record.summary.includes(section.heading),
      );
      const access = resolveStaffEventAccess(
        world,
        input.staff,
        filing ?? introduction ?? null,
        section.text,
      );
      items.push(
        briefingItem(
          "filed-section",
          section.id,
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
  heading: string,
  access: OfficeBriefingAccess,
  inspected: boolean,
): OfficeBriefingItem {
  const known = access.status === "known";
  return {
    kind,
    itemId,
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

/**
 * Staff may brief a public filing without a private knowledge row. Missing
 * events, private records, and recorded unknown/incorrect knowledge do not
 * become known by absence.
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
  const knowledge = world.history.knowledge.filter(
    (record) => record.eventId === event.id && staffIds.has(record.personId),
  );
  if (knowledge.length > 0) {
    const ranked = [...knowledge].sort(
      (left, right) =>
        rankAccuracy(right.accuracy) - rankAccuracy(left.accuracy),
    );
    const best = ranked[0]!;
    if (best.accuracy === "accurate") {
      return {
        status: "known",
        basis: "recorded-knowledge",
        summary: canonicalSummary,
      };
    }
    if (best.accuracy === "partial") {
      return {
        status: "known",
        basis: "recorded-knowledge",
        summary: best.believedSummary,
      };
    }
    if (best.accuracy === "inaccurate") {
      return {
        status: "unavailable",
        reason: "Staff's recorded account of this item is incorrect.",
        believedSummary: best.believedSummary,
      };
    }
    return {
      status: "unavailable",
      reason: "Staff knowledge of this record is unknown.",
      believedSummary: best.believedSummary,
    };
  }
  if (event.visibility === "public") {
    return {
      status: "known",
      basis: "public-record",
      summary: canonicalSummary,
    };
  }
  return {
    status: "unavailable",
    reason:
      "This record is not public, and no staff knowledge of it is recorded.",
    believedSummary: null,
  };
}

function rankAccuracy(
  accuracy: "accurate" | "partial" | "inaccurate" | "unknown",
) {
  if (accuracy === "accurate") return 3;
  if (accuracy === "partial") return 2;
  if (accuracy === "inaccurate") return 1;
  return 0;
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
