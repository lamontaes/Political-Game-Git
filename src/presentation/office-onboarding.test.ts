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
import {
  projectOfficeOnboarding,
  resolveStaffEventAccess,
} from "./office-onboarding";
import { evaluateOfficeVoteInstruction } from "./office-vote-instruction";
import {
  hireOfficeStaff,
  openOfficeBill,
  wonLegislativeSeat,
} from "../../tests/fixtures/office-onboarding-world";

function filingEvents(world: World, measureId: EntityId) {
  return world.history.events.filter(
    (record) =>
      (record.type === "legislation.measure-introduced" ||
        record.type === "legislation.provision-filed") &&
      record.involvedEntityIds.includes(measureId),
  );
}

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
    const instructionWithoutRecord = recordOfficeVoteInstruction(opened.world, {
      personId: member.personId,
      officeRelationshipId: member.seat.relationshipId,
      chamberKey: member.seat.chamberKey,
      measureId: opened.assignment.measureId,
      disposition: "yea",
    });
    expect(instructionWithoutRecord.kind).toBe("refused");
    if (instructionWithoutRecord.kind === "refused") {
      expect(instructionWithoutRecord.reason).toMatch(
        /Record how this office handles votes/i,
      );
    }
    expect(serializeWorld(opened.world)).toBe(before);
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

  it("briefs from actual staff and still works when none are recorded", () => {
    const member = wonLegislativeSeat("l-onboard-staff");
    const opened = openOfficeBill(member.world, member.personId);
    const none = projectOfficeOnboarding(
      opened.world,
      member.personId,
      opened.assignment.measureId,
    );
    expect(none.briefing.kind).toBe("no-staff");
    expect(none.briefing.staff).toHaveLength(0);
    expect(none.briefing.role).toBe("briefing");
    expect(none.briefing.recommendationStatus).toBe("none");
    expect(none.briefing.executedDelegation).toBe(false);
    expect(none.briefing.packageSummary).not.toMatch(/inventing an aide/i);
    expect(none.briefing.packageLabel).toMatch(/No staff are recorded/i);

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
    expect(staffed.briefing.packageSummary).toMatch(
      /not a recommended amendment package/i,
    );
    expect(staffed.briefing.items[0]?.access.status).toBe("known");
    if (staffed.briefing.items[0]?.access.status === "known") {
      expect(staffed.briefing.items[0].access.basis).toBe("public-record");
    }

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
    let informed = hired.world;
    for (const [index, event] of filingEvents(
      hired.world,
      opened.assignment.measureId,
    ).entries()) {
      informed = recordEventKnowledge(informed, {
        stableKey: `l-onboard:staff-unknown-filing:${index}`,
        personId: hired.staffPersonId,
        eventId: event.id,
        learnedAt: hired.world.currentDate,
        believedSummary: "Staff have not established what was filed.",
        accuracy: "unknown",
        confidence: "low",
        source: { kind: "public-record", reference: "office filing file" },
      });
    }
    const briefing = projectOfficeOnboarding(
      informed,
      member.personId,
      opened.assignment.measureId,
    ).briefing;
    expect(briefing.items.length).toBeGreaterThan(0);
    expect(briefing.items.every((item) => item.known === false)).toBe(true);
    expect(briefing.items[0]?.unknownReason).toMatch(/unknown/i);
  });

  it("does not treat missing events or private records as known", () => {
    const member = wonLegislativeSeat("l-onboard-access");
    const opened = openOfficeBill(member.world, member.personId);
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
    const staff = staffed.briefing.staff;
    const missing = resolveStaffEventAccess(
      hired.world,
      staff,
      null,
      "canonical text",
    );
    expect(missing).toMatchObject({ status: "unavailable" });

    const filing = hired.world.history.events.find(
      (record) =>
        record.type === "legislation.measure-introduced" &&
        record.involvedEntityIds.includes(opened.assignment.measureId),
    )!;
    expect(filing.visibility).toBe("public");
    const publicAccess = resolveStaffEventAccess(
      hired.world,
      staff,
      filing,
      "filed purpose",
    );
    expect(publicAccess).toEqual({
      status: "known",
      basis: "public-record",
      summary: "filed purpose",
    });

    const privateEvent = { ...filing, visibility: "private" as const };
    const privateAccess = resolveStaffEventAccess(
      hired.world,
      staff,
      privateEvent,
      "secret text",
    );
    expect(privateAccess.status).toBe("unavailable");
    if (privateAccess.status === "unavailable") {
      expect(privateAccess.reason).toMatch(/not public/i);
    }

    const privateWorld = {
      ...hired.world,
      history: {
        ...hired.world.history,
        events: hired.world.history.events.map((record) =>
          record.involvedEntityIds.includes(opened.assignment.measureId) &&
          (record.type === "legislation.measure-introduced" ||
            record.type === "legislation.provision-filed")
            ? { ...record, visibility: "private" as const }
            : record,
        ),
      },
    };
    const privateBriefing = projectOfficeOnboarding(
      privateWorld,
      member.personId,
      opened.assignment.measureId,
    ).briefing;
    expect(privateBriefing.items.every((item) => !item.known)).toBe(true);

    const stripped = {
      ...hired.world,
      history: {
        ...hired.world.history,
        events: hired.world.history.events.filter(
          (record) =>
            record.type !== "legislation.measure-introduced" &&
            record.type !== "legislation.provision-filed",
        ),
      },
    };
    const withoutRecords = projectOfficeOnboarding(
      stripped,
      member.personId,
      opened.assignment.measureId,
    );
    expect(withoutRecords.briefing.items.length).toBeGreaterThan(0);
    expect(withoutRecords.briefing.items.every((item) => !item.known)).toBe(
      true,
    );
  });

  it("uses recorded partial or incorrect knowledge instead of inventing a full account", () => {
    const member = wonLegislativeSeat("l-onboard-partial");
    const opened = openOfficeBill(member.world, member.personId);
    const hired = hireOfficeStaff(
      opened.world,
      member.personId,
      member.seat.organizationId,
    );
    let partial = hired.world;
    for (const [index, event] of filingEvents(
      hired.world,
      opened.assignment.measureId,
    ).entries()) {
      partial = recordEventKnowledge(partial, {
        stableKey: `l-onboard:staff-partial-filing:${index}`,
        personId: hired.staffPersonId,
        eventId: event.id,
        learnedAt: hired.world.currentDate,
        believedSummary: "Staff know only that a bill was filed.",
        accuracy: "partial",
        confidence: "medium",
        source: { kind: "public-record", reference: "office filing file" },
      });
    }
    const partialBriefing = projectOfficeOnboarding(
      partial,
      member.personId,
      opened.assignment.measureId,
    ).briefing;
    expect(partialBriefing.items[0]?.known).toBe(true);
    expect(partialBriefing.items[0]?.summary).toBe(
      "Staff know only that a bill was filed.",
    );
    if (partialBriefing.items[0]?.access.status === "known") {
      expect(partialBriefing.items[0].access.basis).toBe("recorded-knowledge");
    }

    let incorrect = hired.world;
    for (const [index, event] of filingEvents(
      hired.world,
      opened.assignment.measureId,
    ).entries()) {
      incorrect = recordEventKnowledge(incorrect, {
        stableKey: `l-onboard:staff-wrong-filing:${index}`,
        personId: hired.staffPersonId,
        eventId: event.id,
        learnedAt: hired.world.currentDate,
        believedSummary: "Staff think the bill funds a different program.",
        accuracy: "inaccurate",
        confidence: "low",
        source: { kind: "public-record", reference: "office filing file" },
      });
    }
    const wrong = projectOfficeOnboarding(
      incorrect,
      member.personId,
      opened.assignment.measureId,
    ).briefing;
    expect(wrong.items[0]?.known).toBe(false);
    expect(wrong.items[0]?.unknownReason).toMatch(/incorrect/i);
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
