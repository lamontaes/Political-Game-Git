import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "../presentation/new-game";
import { projectPublicInformationPanel } from "../presentation/public-information-adapters";
import {
  addSimulationMinutes,
  completePressInterview,
  confirmPressResponse,
  createWorkItem,
  deserializeWorld,
  draftPressResponse,
  projectEligiblePressReporters,
  projectPitchablePressBases,
  projectPressInterview,
  projectPressReachSnapshot,
  producePressRequestResponse,
  publishPressInterview,
  recordPressRequest,
  seekCivicPressContact,
  serializeWorld,
} from "./index";
import { arrangeAcceptedPressInterview } from "./press-interview-producers";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";

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

  it("employs an existing adult as a civic reporter without injecting a person or granting consent", () => {
    const created = memberWorld("press-reach13-employ");
    const beforePeople = [...created.world.personOrder].sort();
    const contact = seekCivicPressContact(created.world);
    expect(contact.established).toBe(true);
    expect(contact.reporterPersonId).not.toBe(created.playerPersonId);
    expect(created.world.people[contact.reporterPersonId]).toBeDefined();
    expect([...contact.world.personOrder].sort()).toEqual(beforePeople);
    expect(
      contact.world.history.events.some(
        (event) => event.type === "press.interview-request-answered",
      ),
    ).toBe(false);
    const reused = seekCivicPressContact(contact.world);
    expect(reused.established).toBe(false);
    expect(reused.reporterPersonId).toBe(contact.reporterPersonId);
  });

  it("runs request → saved response → unprepared arrangement → interview → publication → save/reload", () => {
    const created = memberWorld("press-reach13-loop");
    const contact = seekCivicPressContact(created.world);
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
    const contact = seekCivicPressContact(created.world);
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
    const contact = seekCivicPressContact(created.world);
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
