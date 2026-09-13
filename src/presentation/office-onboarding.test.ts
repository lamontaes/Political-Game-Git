import { describe, expect, it } from "vitest";

import {
  deserializeWorld,
  recordEventKnowledge,
  recordWorkStatus,
  serializeWorld,
  currentOfficeVoteInstruction,
  currentOfficeWorkflowPreference,
  measureTextVersion,
  recordOfficeBriefingInspection,
  recordOfficeVoteInstruction,
  recordOfficeWorkflowPreference,
  type EntityId,
  type World,
} from "../simulation";
import { applyLegislativeCommand } from "./legislation-world";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { projectOfficeOnboarding } from "./office-onboarding";
import { evaluateOfficeVoteInstruction } from "./office-vote-instruction";
import {
  hireOfficeStaff,
  openOfficeBill,
  wonLegislativeSeat,
} from "../../tests/fixtures/office-onboarding-world";

function recordDefaultPreference(world: World, personId: EntityId) {
  const membership = resolveActiveMemberSeat(world, personId);
  if (membership.kind !== "seated") throw new Error(membership.reason);
  const result = recordOfficeWorkflowPreference(world, {
    personId,
    officeRelationshipId: membership.seat.relationshipId,
    votingMode: "prior-instructions-with-exceptions",
    caseworkMode: "staff-routine-player-exceptions",
  });
  expect(result.kind).toBe("recorded");
  if (result.kind !== "recorded") throw new Error(result.reason);
  return { world: result.world, seat: membership.seat };
}

describe("L staff-guided office onboarding", () => {
  it("writes nothing when the ordinary office projection opens", () => {
    const member = wonLegislativeSeat("l-onboard-open");
    const opened = openOfficeBill(member.world, member.personId);
    const before = serializeWorld(opened.world);
    const votes = (opened.world.history.legislativeVotes ?? []).length;
    const projection = projectOfficeOnboarding(
      opened.world,
      member.personId,
      opened.assignment.measureId,
    );
    expect(projection.wroteNothing).toBe(true);
    expect(projection.preference).toBeNull();
    expect(projection.briefing.kind).toBe("no-staff");
    expect(serializeWorld(opened.world)).toBe(before);
    expect((opened.world.history.legislativeVotes ?? []).length).toBe(votes);
    expect(
      evaluateOfficeVoteInstruction(opened.world, {
        actorPersonId: member.personId,
        officeRelationshipId: member.seat.relationshipId,
        chamberKey: member.seat.chamberKey,
        measureId: opened.assignment.measureId,
      }).kind,
    ).toBe("refused");
  });

  it("records revisable preferences bound to the live office, not a new term", () => {
    const member = wonLegislativeSeat("l-onboard-pref");
    const first = recordDefaultPreference(member.world, member.personId);
    const revised = recordOfficeWorkflowPreference(first.world, {
      personId: member.personId,
      officeRelationshipId: first.seat.relationshipId,
      votingMode: "handle-individually",
      caseworkMode: "player-handles-all",
    });
    expect(revised.kind).toBe("recorded");
    if (revised.kind !== "recorded") throw new Error(revised.reason);
    const current = currentOfficeWorkflowPreference(
      revised.world,
      member.personId,
      first.seat.relationshipId,
    );
    expect(current?.votingMode).toBe("handle-individually");
    expect(current?.caseworkMode).toBe("player-handles-all");
    expect(
      currentOfficeWorkflowPreference(
        revised.world,
        member.personId,
        "work-relationship_not-this-office" as EntityId,
      ),
    ).toBeNull();

    const relationship = revised.world.history.workRelationships.find(
      (entry) => entry.id === first.seat.relationshipId,
    )!;
    const latestStatus = revised.world.history.workStatuses
      .filter((status) => status.workRelationshipId === relationship.id)
      .at(-1)!;
    const ended = recordWorkStatus(revised.world, {
      stableKey: "l-onboard:seat-ended",
      workRelationshipId: relationship.id,
      effectiveAt: revised.world.currentDate,
      status: "ended",
      reason: "left office",
      supersedesStatusId: latestStatus.id,
      provenance: { kind: "authored", note: "L office-change isolation." },
    });
    expect(resolveActiveMemberSeat(ended, member.personId).kind).toBe(
      "unseated",
    );
    expect(
      currentOfficeWorkflowPreference(
        ended,
        member.personId,
        first.seat.relationshipId,
      )?.votingMode,
    ).toBe("handle-individually");
    const projection = projectOfficeOnboarding(ended, member.personId);
    expect(projection.membership.kind).toBe("unseated");
    expect(
      evaluateOfficeVoteInstruction(ended, {
        actorPersonId: member.personId,
        officeRelationshipId: first.seat.relationshipId,
        chamberKey: first.seat.chamberKey,
        measureId: "legislative-measure_missing" as EntityId,
      }).code,
    ).toBe("no-active-seat");
  });

  it("refuses a standing instruction after the measure changes, without casting a vote", () => {
    const member = wonLegislativeSeat("l-onboard-changed");
    const opened = openOfficeBill(member.world, member.personId);
    const preferred = recordDefaultPreference(opened.world, member.personId);
    const instructed = recordOfficeVoteInstruction(preferred.world, {
      personId: member.personId,
      officeRelationshipId: preferred.seat.relationshipId,
      chamberKey: preferred.seat.chamberKey,
      measureId: opened.assignment.measureId,
      disposition: "yea",
    });
    expect(instructed.kind).toBe("recorded");
    if (instructed.kind !== "recorded") throw new Error(instructed.reason);
    const votesBefore = (instructed.world.history.legislativeVotes ?? [])
      .length;
    const armed = evaluateOfficeVoteInstruction(instructed.world, {
      actorPersonId: member.personId,
      officeRelationshipId: preferred.seat.relationshipId,
      chamberKey: preferred.seat.chamberKey,
      measureId: opened.assignment.measureId,
    });
    expect(armed.kind).toBe("armed");
    const stepped = applyLegislativeCommand(
      instructed.world,
      opened.assignment,
      { kind: "take-step", step: "request-referral" },
    );
    expect(
      measureTextVersion(stepped.world, opened.assignment.measureId),
    ).not.toBe(
      measureTextVersion(instructed.world, opened.assignment.measureId),
    );
    const refused = evaluateOfficeVoteInstruction(stepped.world, {
      actorPersonId: member.personId,
      officeRelationshipId: preferred.seat.relationshipId,
      chamberKey: preferred.seat.chamberKey,
      measureId: opened.assignment.measureId,
    });
    expect(refused).toMatchObject({ kind: "refused", code: "measure-changed" });
    expect((stepped.world.history.legislativeVotes ?? []).length).toBe(
      votesBefore,
    );
    expect(
      currentOfficeVoteInstruction(
        stepped.world,
        member.personId,
        preferred.seat.relationshipId,
        opened.assignment.measureId,
      )?.disposition,
    ).toBe("yea");
  });

  it("briefs from actual staff and still works with none, without inventing an aide", () => {
    const member = wonLegislativeSeat("l-onboard-staff");
    const opened = openOfficeBill(member.world, member.personId);
    const none = projectOfficeOnboarding(
      opened.world,
      member.personId,
      opened.assignment.measureId,
    );
    expect(none.briefing.kind).toBe("no-staff");
    expect(none.briefing.staff).toHaveLength(0);
    expect(none.briefing.packageSummary).toMatch(/without inventing an aide/i);

    const hired = hireOfficeStaff(
      opened.world,
      member.personId,
      member.seat.organizationId,
    );
    const staffed = projectOfficeOnboarding(
      hired.world,
      member.personId,
      opened.assignment.measureId,
    );
    expect(staffed.briefing.kind).toBe("staffed");
    expect(staffed.briefing.staff.map((entry) => entry.personId)).toContain(
      hired.staffPersonId,
    );
    expect(staffed.briefing.staff.some((entry) => entry.title.length > 0)).toBe(
      true,
    );
    expect(staffed.briefing.openingIsNotAdoption).toMatch(/does not adopt/i);

    const item = staffed.briefing.items[0];
    expect(item).toBeTruthy();
    const beforeAmendments = (hired.world.history.legislativeAmendments ?? [])
      .length;
    const inspected = recordOfficeBriefingInspection(hired.world, {
      personId: member.personId,
      officeRelationshipId: member.seat.relationshipId,
      measureId: opened.assignment.measureId,
      itemKind: item!.kind,
      itemId: item!.itemId,
    });
    expect(inspected.kind).toBe("recorded");
    if (inspected.kind !== "recorded") throw new Error(inspected.reason);
    expect((inspected.world.history.legislativeAmendments ?? []).length).toBe(
      beforeAmendments,
    );
    const after = projectOfficeOnboarding(
      inspected.world,
      member.personId,
      opened.assignment.measureId,
    );
    expect(
      after.briefing.items.find((entry) => entry.itemId === item!.itemId)
        ?.inspected,
    ).toBe(true);
  });

  it("does not invent omitted facts when staff knowledge is unknown", () => {
    const member = wonLegislativeSeat("l-onboard-unknown");
    const opened = openOfficeBill(member.world, member.personId);
    const hired = hireOfficeStaff(
      opened.world,
      member.personId,
      member.seat.organizationId,
    );
    const filing = hired.world.history.events.find(
      (record) =>
        record.type === "legislation.measure-introduced" &&
        record.involvedEntityIds.includes(opened.assignment.measureId),
    );
    expect(filing).toBeTruthy();
    const informed = recordEventKnowledge(hired.world, {
      stableKey: "l-onboard:staff-unknown-filing",
      personId: hired.staffPersonId,
      eventId: filing!.id,
      learnedAt: hired.world.currentDate,
      believedSummary: "Staff have not established what was filed.",
      accuracy: "unknown",
      confidence: "low",
      source: { kind: "direct" },
    });
    const briefing = projectOfficeOnboarding(
      informed,
      member.personId,
      opened.assignment.measureId,
    ).briefing;
    expect(briefing.items.length).toBeGreaterThan(0);
    expect(briefing.items.every((item) => item.known === false)).toBe(true);
    expect(briefing.items[0]?.unknownReason).toMatch(/unknown/i);
  });

  it("keeps two lives isolated across save and reopen", () => {
    const first = wonLegislativeSeat("l-onboard-life-a");
    const second = wonLegislativeSeat("l-onboard-life-b");
    const firstOpened = openOfficeBill(first.world, first.personId);
    const secondOpened = openOfficeBill(second.world, second.personId);
    const firstSaved = recordDefaultPreference(
      firstOpened.world,
      first.personId,
    );
    const firstInstructed = recordOfficeVoteInstruction(firstSaved.world, {
      personId: first.personId,
      officeRelationshipId: firstSaved.seat.relationshipId,
      chamberKey: firstSaved.seat.chamberKey,
      measureId: firstOpened.assignment.measureId,
      disposition: "nay",
    });
    expect(firstInstructed.kind).toBe("recorded");
    if (firstInstructed.kind !== "recorded") {
      throw new Error(firstInstructed.reason);
    }
    const restoredFirst = deserializeWorld(
      serializeWorld(firstInstructed.world),
    );
    const restoredSecond = deserializeWorld(serializeWorld(secondOpened.world));
    expect(
      currentOfficeWorkflowPreference(
        restoredFirst,
        first.personId,
        firstSaved.seat.relationshipId,
      )?.votingMode,
    ).toBe("prior-instructions-with-exceptions");
    expect(
      currentOfficeWorkflowPreference(
        restoredSecond,
        second.personId,
        second.seat.relationshipId,
      ),
    ).toBeNull();
    expect(restoredFirst.id).not.toBe(restoredSecond.id);
    expect(
      evaluateOfficeVoteInstruction(restoredSecond, {
        actorPersonId: second.personId,
        officeRelationshipId: second.seat.relationshipId,
        chamberKey: second.seat.chamberKey,
        measureId: secondOpened.assignment.measureId,
      }).code,
    ).toBe("no-preference");
    expect(
      evaluateOfficeVoteInstruction(restoredFirst, {
        actorPersonId: first.personId,
        officeRelationshipId: firstSaved.seat.relationshipId,
        chamberKey: firstSaved.seat.chamberKey,
        measureId: firstOpened.assignment.measureId,
      }).kind,
    ).toBe("armed");
  });
});
