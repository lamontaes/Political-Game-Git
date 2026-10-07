import { recordedCivicReporterFixture } from "../../tests/support/recorded-civic-journalist";
import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "../presentation/new-game";
import { projectPublicInformationPanel } from "../presentation/public-information-adapters";
import {
  activeWorkRelationshipsAt,
  addSimulationMinutes,
  completePressInterview,
  confirmPressResponse,
  createWorkItem,
  currentJournalists,
  deserializeWorld,
  draftPressResponse,
  projectEligiblePressReporters,
  projectPitchablePressBases,
  projectPressInterview,
  projectPressReachSnapshot,
  producePressRequestResponse,
  publishPressInterview,
  recordPersonDeath,
  recordPersonFunctionalCapacity,
  recordPressRequest,
  recordWorkStatus,
  seekCivicPressContact,
  serializeWorld,
} from "./index";
import { arrangeAcceptedPressInterview } from "./press-interview-producers";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";

const VITALITY = {
  kind: "authored" as const,
  note: "PRESS-REACH13 refusal fixture.",
} as const;

function memberWorld(seed: string) {
  return createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "legislative-office",
    household: "shares-a-home",
    seed,
    givenName: "Morgan",
    familyName: "Reed",
  });
}

function recordPublicHearing(world: World, seed: string) {
  const sourcePersonId =
    world.control.kind === "person" ? world.control.personId : null;
  if (!sourcePersonId) throw new Error("Controlled source required.");
  const jurisdictionId = Object.keys(world.jurisdictions)[0] as
    EntityId | undefined;
  return recordWorldEvent(world, {
    stableKey: `${seed}:public-hearing`,
    type: "legislation.committee-hearing-completed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdictionId ?? null,
    involvedEntityIds: [
      sourcePersonId,
      ...(jurisdictionId ? [jurisdictionId] : []),
    ].sort(),
    participants: [
      {
        personId: sourcePersonId,
        role: "agency:hearing-participant",
        detail: "Participated in the recorded hearing",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "press.question-basis"],
    summary: "A scheduled committee hearing concluded without a final vote.",
    context: {
      location: jurisdictionId
        ? {
            jurisdictionId,
            label: "Committee room",
            setting: "Recorded hearing",
          }
        : null,
      socialContext: "The committee heard testimony on a pending measure.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("PRESS-REACH13 normal-world reporter prerequisites", () => {
  it("traces a member start: journalism role and pitchable basis are initially missing", () => {
    const created = memberWorld("press-reach13-trace");
    const before = serializeWorld(created.world);
    const snapshot = projectPressReachSnapshot(created.world);
    expect(snapshot.sourcePersonId).toBe(created.playerPersonId);
    expect(snapshot.journalistCount).toBe(0);
    expect(
      snapshot.gaps.filter((gap) => gap.blocking).map((gap) => gap.code),
    ).toEqual(["no-journalist-role"]);
    expect(snapshot.gaps.map((gap) => gap.code)).toContain(
      "no-colleague-adviser",
    );
    expect(serializeWorld(created.world)).toBe(before);
  });

  it("returns unavailable without creating people, jobs, organizations or consent", () => {
    const created = memberWorld("press-reach13-employ");
    const before = serializeWorld(created.world);
    const contact = seekCivicPressContact(created.world);
    expect(contact.world).toBe(created.world);
    expect(contact.reporterPersonId).toBeNull();
    expect(contact.reporterWorkRoleId).toBeNull();
    expect(contact.organizationId).toBeNull();
    expect(contact.established).toBe(false);
    expect(serializeWorld(contact.world)).toBe(before);
    const loaded = deserializeWorld(before);
    expect(seekCivicPressContact(loaded).world).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(before);
  });

  it("does not replace a dead, incapacitated or expired recorded journalist", () => {
    const created = memberWorld("press-reach13-refuse-substitution");
    const first = recordedCivicReporterFixture(created.world);
    const deceased = recordPersonDeath(first.world, {
      stableKey: "press-reach13-refuse-substitution:death",
      personId: first.reporterPersonId,
      diedAt: first.world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [first.world.id],
      summary: "The recorded fixture reporter died.",
      provenance: VITALITY,
    });
    const incapacitated = recordPersonFunctionalCapacity(first.world, {
      stableKey: "press-reach13-refuse-substitution:capacity",
      personId: first.reporterPersonId,
      effectiveAt: first.world.currentDate,
      status: "incapacitated",
      reasonKey: "capacity:test-incapacitated",
      sourceEntityIds: [],
      summary: "The fixture reporter is unavailable.",
      provenance: VITALITY,
    });
    const job = activeWorkRelationshipsAt(
      first.world,
      first.reporterPersonId,
    )[0]!;
    const expired = recordWorkStatus(first.world, {
      stableKey: "press-reach13-refuse-substitution:ended",
      workRelationshipId: job.relationship.id,
      effectiveAt: first.world.currentDate,
      status: "ended",
      reason: "The recorded fixture assignment ended.",
      provenance: VITALITY,
      supersedesStatusId: job.status.id,
    });
    for (const world of [deceased, incapacitated, expired]) {
      const before = serializeWorld(world);
      expect(currentJournalists(world, created.playerPersonId)).toEqual([]);
      const contact = seekCivicPressContact(world);
      expect(contact.world).toBe(world);
      expect(contact.reporterPersonId).toBeNull();
      expect(contact.reporterWorkRoleId).toBeNull();
      expect(contact.established).toBe(false);
      expect(serializeWorld(world)).toBe(before);
    }
  });

  it("uses a generated public basis and a recorded fixture reporter without an adviser, then survives reload", () => {
    const created = memberWorld("press-reach13-ordinary");
    const beforePeople = new Set(created.world.personOrder);
    const snapshot = projectPressReachSnapshot(created.world);
    expect(snapshot.journalistCount).toBe(0);
    const bases = projectPitchablePressBases(
      created.world,
      created.playerPersonId,
    );
    expect(bases.length).toBeGreaterThan(0);
    const basis = bases[0]!;
    const contact = recordedCivicReporterFixture(created.world);
    expect(contact.established).toBe(false);
    expect(beforePeople.has(contact.reporterPersonId)).toBe(false);
    expect(projectPressReachSnapshot(contact.world).colleagueAdviserCount).toBe(
      0,
    );
    expect(
      projectEligiblePressReporters(contact.world, {
        sourcePersonId: created.playerPersonId,
        questionBasisEventIds: [basis.eventId],
      }).some((reporter) => reporter.personId === contact.reporterPersonId),
    ).toBe(true);

    const request = recordPressRequest(contact.world, {
      stableKey: "press-reach13-ordinary:request",
      reporterPersonId: contact.reporterPersonId,
      reporterWorkRoleId: contact.reporterWorkRoleId,
      jurisdictionId: basis.jurisdictionId,
      channel: "written",
      terms: "on-record",
      backgroundAttribution: null,
      pitch: "Ask about this already recorded public development.",
      primaryQuestion: "What public record exists from this development?",
      questionBasisEventIds: [basis.eventId],
    });
    expect(
      request.world.history.knowledge.some(
        (record) =>
          record.personId === contact.reporterPersonId &&
          record.eventId === basis.eventId &&
          record.source.kind === "told-by",
      ),
    ).toBe(true);

    const reporterResponse = producePressRequestResponse(request.world, {
      stableKey: "press-reach13-ordinary:reporter-response",
      requestEventId: request.requestEventId,
    });
    expect(
      reporterResponse.world.history.events.find(
        (event) => event.id === reporterResponse.responseEventId,
      )?.context.choice,
    ).toBe("accepted");

    const start = addSimulationMinutes(
      reporterResponse.world.currentMoment,
      30,
    );
    const arranged = arrangeAcceptedPressInterview(reporterResponse.world, {
      stableKey: "press-reach13-ordinary:arrangement",
      requestEventId: request.requestEventId,
      reporterResponseEventId: reporterResponse.responseEventId,
      start,
      end: addSimulationMinutes(start, 20),
      location: {
        locationKey: "office-press-room",
        label: "Office press room",
      },
      preparationMinutes: 0,
    });
    expect(arranged.preparationWorkItemId).toBeNull();

    let world = draftPressResponse(arranged.world, {
      stableKey: "press-reach13-ordinary:draft",
      activityId: arranged.activityId,
      mode: "condensed",
      intent: "answer-directly",
      followUpQuestion: "What remains on the public record?",
      proposedWording:
        "The recorded public development is already part of this civic life.",
    });
    world = confirmPressResponse(world, {
      stableKey: "press-reach13-ordinary:confirm",
      activityId: arranged.activityId,
      confirmedWording:
        "The recorded public development is already part of this civic life.",
    });
    world = completePressInterview(world, arranged.activityId);
    world = publishPressInterview(world, {
      stableKey: "press-reach13-ordinary:story",
      activityId: arranged.activityId,
    });
    const interview = projectPressInterview(world, arranged.activityId);
    expect(interview).toMatchObject({
      completed: true,
      adviserPersonId: null,
    });
    expect(interview.publicationId).not.toBeNull();
    expect(projectPublicInformationPanel(world).items.length).toBeGreaterThan(
      0,
    );
    const loaded = deserializeWorld(serializeWorld(world));
    expect(projectPressInterview(loaded, arranged.activityId)).toEqual(
      interview,
    );
    const duplicate = seekCivicPressContact(loaded);
    expect(duplicate.established).toBe(false);
    expect(duplicate.reporterPersonId).toBe(contact.reporterPersonId);
  });

  it("runs request → saved response → unprepared arrangement → interview → publication → save/reload", () => {
    const created = memberWorld("press-reach13-loop");
    const contact = recordedCivicReporterFixture(created.world);
    let world = recordPublicHearing(contact.world, "press-reach13-loop");
    const basisEventId = world.history.events.at(-1)!.id;
    expect(
      world.history.knowledge.some(
        (record) =>
          record.personId === contact.reporterPersonId &&
          record.eventId === basisEventId,
      ),
    ).toBe(false);
    expect(
      projectPitchablePressBases(world, created.playerPersonId).map(
        (item) => item.eventId,
      ),
    ).toContain(basisEventId);
    expect(
      projectEligiblePressReporters(world, {
        sourcePersonId: created.playerPersonId,
        questionBasisEventIds: [basisEventId],
      }).some((reporter) => reporter.personId === contact.reporterPersonId),
    ).toBe(true);

    const request = recordPressRequest(world, {
      stableKey: "press-reach13-loop:request",
      reporterPersonId: contact.reporterPersonId,
      reporterWorkRoleId: contact.reporterWorkRoleId,
      jurisdictionId: world.history.events.at(-1)!.jurisdictionId,
      channel: "written",
      terms: "on-record",
      backgroundAttribution: null,
      pitch: "Discuss the completed hearing and the work that remains.",
      primaryQuestion:
        "What happened at the hearing, and is there a final result?",
      questionBasisEventIds: [basisEventId],
    });
    expect(
      request.world.history.knowledge.some(
        (record) =>
          record.personId === contact.reporterPersonId &&
          record.eventId === basisEventId &&
          record.source.kind === "told-by",
      ),
    ).toBe(true);

    const reporterResponse = producePressRequestResponse(request.world, {
      stableKey: "press-reach13-loop:reporter-response",
      requestEventId: request.requestEventId,
    });
    const responseEvent = reporterResponse.world.history.events.find(
      (event) => event.id === reporterResponse.responseEventId,
    );
    expect(responseEvent?.context.choice).toBe("accepted");

    const start = addSimulationMinutes(
      reporterResponse.world.currentMoment,
      90,
    );
    const arranged = arrangeAcceptedPressInterview(reporterResponse.world, {
      stableKey: "press-reach13-loop:arrangement",
      requestEventId: request.requestEventId,
      reporterResponseEventId: reporterResponse.responseEventId,
      start,
      end: addSimulationMinutes(start, 30),
      location: {
        locationKey: "office-press-room",
        label: "Office press room",
      },
      preparationMinutes: 0,
    });
    expect(arranged.preparationWorkItemId).toBeNull();

    world = draftPressResponse(arranged.world, {
      stableKey: "press-reach13-loop:draft",
      activityId: arranged.activityId,
      mode: "condensed",
      intent: "answer-directly",
      followUpQuestion: "What procedural steps remain?",
      proposedWording:
        "The hearing is complete, the measure remains pending, and no final vote has occurred.",
    });
    world = confirmPressResponse(world, {
      stableKey: "press-reach13-loop:confirm",
      activityId: arranged.activityId,
      confirmedWording:
        "The hearing is complete, the measure remains pending, and no final vote has occurred.",
    });
    world = completePressInterview(world, arranged.activityId);
    world = publishPressInterview(world, {
      stableKey: "press-reach13-loop:story",
      activityId: arranged.activityId,
    });
    const interview = projectPressInterview(world, arranged.activityId);
    expect(interview).toMatchObject({
      mode: "condensed",
      completed: true,
      condensedPenaltyApplied: false,
      adviserPersonId: null,
    });
    expect(interview.publicationId).not.toBeNull();
    expect(projectPublicInformationPanel(world).items.length).toBeGreaterThan(
      0,
    );
    const loaded = deserializeWorld(serializeWorld(world));
    expect(projectPressInterview(loaded, arranged.activityId)).toEqual(
      interview,
    );
  });

  it("refuses private bases, deferred assigned work, missing reporter consent and off-record publication", () => {
    const created = memberWorld("press-reach13-refuse");
    const contact = recordedCivicReporterFixture(created.world);
    const sourcePersonId = created.playerPersonId;
    let world = recordWorldEvent(contact.world, {
      stableKey: "press-reach13-refuse:private",
      type: "life.private-note",
      occurredAt: contact.world.currentDate,
      recordedAt: contact.world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [sourcePersonId],
      participants: [
        {
          personId: sourcePersonId,
          role: "agency:note-author",
          detail: "Wrote a private note",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["press.question-basis"],
      summary: "A private note was recorded.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const privateId = world.history.events.at(-1)!.id;
    expect(
      projectEligiblePressReporters(world, {
        sourcePersonId,
        questionBasisEventIds: [privateId],
      }),
    ).toEqual([]);

    world = recordPublicHearing(world, "press-reach13-refuse");
    const publicId = world.history.events.at(-1)!.id;
    const staffing = world.history.events.find(
      (event) => event.type === "press.civic-newsroom-staffed",
    )!;
    world = createWorkItem(world, {
      stableKey: "press-reach13-refuse:coverage",
      title: "Finish the current coverage file",
      summary:
        "Complete already assigned civic coverage before new interviews.",
      jurisdictionId: staffing.jurisdictionId,
      sourceEntityIds: [staffing.id],
      focus: {
        kind: "other",
        targetKey: "press.coverage-file",
        sourceEntityId: staffing.id,
      },
      effort: { kind: "authored-duration", requiredMinutes: 30 },
      access: { kind: "office" },
      assignedPersonIds: [contact.reporterPersonId],
      playerRequirement: "none",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: null,
    });
    const request = recordPressRequest(world, {
      stableKey: "press-reach13-refuse:request",
      reporterPersonId: contact.reporterPersonId,
      reporterWorkRoleId: contact.reporterWorkRoleId,
      jurisdictionId: staffing.jurisdictionId,
      channel: "spoken",
      terms: "off-record",
      backgroundAttribution: null,
      pitch: "Ask about the public hearing off the record.",
      primaryQuestion: "What happened at the hearing?",
      questionBasisEventIds: [publicId],
    });
    const deferred = producePressRequestResponse(request.world, {
      stableKey: "press-reach13-refuse:defer",
      requestEventId: request.requestEventId,
    });
    expect(
      deferred.world.history.events.find(
        (event) => event.id === deferred.responseEventId,
      )?.context.choice,
    ).toBe("deferred");
    const start = addSimulationMinutes(deferred.world.currentMoment, 60);
    expect(() =>
      arrangeAcceptedPressInterview(deferred.world, {
        stableKey: "press-reach13-refuse:arrange",
        requestEventId: request.requestEventId,
        reporterResponseEventId: deferred.responseEventId,
        start,
        end: addSimulationMinutes(start, 20),
        location: { locationKey: "press-room", label: "Press room" },
        preparationMinutes: 0,
      }),
    ).toThrow(/Reporter consent is required/u);
    expect(deferred.world.history.scheduledActivities).toHaveLength(0);
  });

  it("keeps off-record material off the publication path after an accepted unprepared exchange", () => {
    const created = memberWorld("press-reach13-offrecord");
    const contact = recordedCivicReporterFixture(created.world);
    let world = recordPublicHearing(contact.world, "press-reach13-offrecord");
    const basisEventId = world.history.events.at(-1)!.id;
    const request = recordPressRequest(world, {
      stableKey: "press-reach13-offrecord:request",
      reporterPersonId: contact.reporterPersonId,
      reporterWorkRoleId: contact.reporterWorkRoleId,
      jurisdictionId: world.history.events.at(-1)!.jurisdictionId,
      channel: "spoken",
      terms: "off-record",
      backgroundAttribution: null,
      pitch: "Talk through the hearing privately.",
      primaryQuestion: "What happened at the hearing?",
      questionBasisEventIds: [basisEventId],
    });
    const reporterResponse = producePressRequestResponse(request.world, {
      stableKey: "press-reach13-offrecord:response",
      requestEventId: request.requestEventId,
    });
    const start = addSimulationMinutes(
      reporterResponse.world.currentMoment,
      30,
    );
    const arranged = arrangeAcceptedPressInterview(reporterResponse.world, {
      stableKey: "press-reach13-offrecord:arrangement",
      requestEventId: request.requestEventId,
      reporterResponseEventId: reporterResponse.responseEventId,
      start,
      end: addSimulationMinutes(start, 20),
      location: { locationKey: "side-room", label: "Side room" },
      preparationMinutes: 0,
    });
    world = draftPressResponse(arranged.world, {
      stableKey: "press-reach13-offrecord:draft",
      activityId: arranged.activityId,
      mode: "condensed",
      intent: "answer-directly",
      followUpQuestion: "What remains unresolved?",
      proposedWording: "The hearing ended without a final vote.",
    });
    world = confirmPressResponse(world, {
      stableKey: "press-reach13-offrecord:confirm",
      activityId: arranged.activityId,
      confirmedWording: "The hearing ended without a final vote.",
    });
    world = completePressInterview(world, arranged.activityId);
    expect(() =>
      publishPressInterview(world, {
        stableKey: "press-reach13-offrecord:story",
        activityId: arranged.activityId,
      }),
    ).toThrow(/Off-record material cannot be published/u);
    expect(world.history.publications ?? []).toHaveLength(0);
  });
});
