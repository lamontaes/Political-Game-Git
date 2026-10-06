import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { municipalGovernmentForLifePlace } from "./municipal-government";
import { modelCampaignFieldReach } from "./campaign-contact-calibration";
import { simulationMomentAtLocalTime } from "./dates";
import { createOrganization, createWorkRelationship } from "./life";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { recordEventKnowledge, recordRelationshipInteraction } from "./records";
import { deserializeWorld, serializeWorldPayload } from "./serialization";
import { advanceWorldMinutes } from "./time-work";
import { localProtestCauses } from "./pressure/ladder";
import { ensurePressMediaOpening } from "./press/outlets";
import {
  ensurePressDeskSchedule,
  eventIsNewsCandidate,
  pressDeskSweepHandler,
  publishOpeningPublicRecords,
  storyLeads,
} from "./press/desk";
import { onShiftAt, workSchedulesFor } from "./living-world/work-schedules";
import {
  holdProtest,
  inviteToProtest,
  organizeProtest,
  protestAttendance,
  protestConsiderations,
  protests,
  PROTEST_HELD,
  PROTEST_INVITED,
} from "./living-world/protests";
import type { World } from "./types";

const seed = "session110-protest-named-turnout";
const place = drawRandomPlace(
  seed,
  (row) => municipalGovernmentForLifePlace(row) !== null,
);
function fixture() {
  const small = smallWorld({
    place: place.key,
    date: "2026-01-05",
    seed,
    people: 12,
    household: true,
  });
  let world = small.world;
  const organizer = world.personOrder[0]!;
  const supporter = world.personOrder[1]!;
  const worker = world.personOrder[2]!;
  const proposition = Object.values(world.policyCatalog.propositions)[0]!;
  for (const personId of [supporter, worker]) {
    world = recordPrivateBelief(world, {
      stableKey: `protest-view:${personId}`,
      personId,
      propositionId: proposition.id,
      formedAt: world.currentDate,
      position: "support",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale: "I want this proposition enacted and will show up for it.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    world = recordRelationshipInteraction(world, {
      stableKey: `protest-tie:${personId}`,
      personIds: [personId, organizer],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "care:looked-after",
      change: "strengthened",
      significance: "major",
      summary: "The organizer and resident have helped each other.",
      tags: [],
    });
  }
  world = createOrganization(world, {
    stableKey: "protest-worker-employer",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: "Work schedule fixture employer." },
    initialProfile: {
      name: `${place.displayName} office`,
      classification: "enterprise:office",
      locationJurisdictionId: small.jurisdictionId,
    },
  });
  const employerId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "protest-worker",
    personId: worker,
    organizationId: employerId,
    startedAt: world.currentDate,
    kind: "employment:job",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "Actual work schedule fixture." },
    initialRole: {
      title: "Office clerk",
      occupationClassification: null,
      locationJurisdictionId: small.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: small.jurisdictionId,
      },
    },
  });
  const startsAt = simulationMomentAtLocalTime({
    date: world.currentDate,
    minuteOfDay: Math.max(world.currentMoment.minuteOfDay, 10 * 60),
    timeZone: world.currentMoment.timeZone,
  });
  world = organizeProtest(world, {
    stableKey: "protest:shared-cause",
    organizerPersonId: organizer,
    jurisdictionId: small.jurisdictionId,
    propositionId: proposition.id,
    stance: "support",
    startsAt,
    placeKey: "public-sidewalk",
    placeLabel: `${place.displayName} public sidewalk`,
  });
  world = inviteToProtest(world, {
    protestKey: protests(world)[0]!.stableKey,
    minutes: 240,
    outreachKey: "protest-outreach",
  });
  return {
    ...small,
    world,
    organizer,
    supporter,
    worker,
    startsAt,
    key: protests(world)[0]!.stableKey,
  };
}
function atStart(f: ReturnType<typeof fixture>, world: World = f.world) {
  return advanceWorldMinutes(
    world,
    f.startsAt.minuteOfDay - world.currentMoment.minuteOfDay,
  );
}
describe(`recorded protest attendance in ${place.displayName} (${seed})`, () => {
  it("asks actual reached residents, excludes an on-shift worker, and counts a supporter with ties", () => {
    const f = fixture();
    const invitations = f.world.history.events.filter(
      (event) => event.type === PROTEST_INVITED,
    );
    expect(invitations).toHaveLength(
      Math.min(
        f.world.personOrder.length - 1,
        modelCampaignFieldReach("door-canvass", 240)!
          .estimatedCompletedConversations!.min,
      ),
    );
    expect(
      invitations.flatMap((row) =>
        row.participants.map((participant) => participant.personId),
      ),
    ).toContain(f.worker);
    expect(
      workSchedulesFor(f.world, f.worker).some((schedule) =>
        onShiftAt(schedule, f.startsAt),
      ),
    ).toBe(true);
    const world = holdProtest(atStart(f), f.key);
    expect(protestAttendance(world, f.key)).toContain(f.supporter);
    expect(protestAttendance(world, f.key)).not.toContain(f.worker);
    const workerDecision = world.history.decisionTraces.find(
      (row) =>
        row.context.actorPersonId === f.worker &&
        row.context.decisionType === "protest.attend",
    )!;
    expect(
      workerDecision.context.constraints.some(
        (row) => row.kind === "constraint:work-shift",
      ),
    ).toBe(true);
    const supporterDecision = world.history.decisionTraces.find(
      (row) =>
        row.context.actorPersonId === f.supporter &&
        row.context.decisionType === "protest.attend",
    )!;
    expect(
      supporterDecision.context.considerations.some(
        (row) => row.sourceType === "social:relationship",
      ),
    ).toBe(true);
    const invitedPeople = new Set(
      invitations.flatMap((row) =>
        row.participants.map((participant) => participant.personId),
      ),
    );
    expect(
      protestAttendance(world, f.key).every((id) => invitedPeople.has(id)),
    ).toBe(true);
  });
  it("sizes the public crowd only from recorded turnout and preserves it after reload", () => {
    const f = fixture();
    const world = holdProtest(atStart(f), f.key);
    const attendance = protestAttendance(world, f.key);
    const event = world.history.events.find(
      (row) => row.type === PROTEST_HELD,
    )!;
    expect(event.participants.map((row) => row.personId)).toEqual(attendance);
    expect(event.tags).toContain(`crowd:${attendance.length}`);
    expect(event.visibility).toBe("public");
    const loaded = deserializeWorld(serializeWorldPayload(world));
    expect(protestAttendance(loaded, f.key)).toEqual(attendance);
    expect(holdProtest(loaded, f.key)).toBe(loaded);
    expect(localProtestCauses(loaded, f.jurisdictionId)[0]).toMatchObject({
      sourceEventId: event.id,
      turnout: attendance.length,
      attendeePersonIds: attendance,
    });
    expect(localProtestCauses(loaded, f.stateJurisdictionId)).toEqual([]);
  });
  it("does not evaluate an ignored human invitation or count that person as attending", () => {
    const f = fixture();
    const world = holdProtest(
      atStart(f, {
        ...f.world,
        control: { kind: "person", personId: f.supporter },
      }),
      f.key,
    );
    expect(protestAttendance(world, f.key)).not.toContain(f.supporter);
    expect(
      world.history.decisionTraces.some(
        (row) =>
          row.context.actorPersonId === f.supporter &&
          row.context.decisionType === "protest.attend",
      ),
    ).toBe(false);
  });
  it("refuses premature or retrospectively held protests", () => {
    const f = fixture();
    if (f.world.currentMoment.minuteOfDay < f.startsAt.minuteOfDay)
      expect(() => holdProtest(f.world, f.key)).toThrow("recorded date");
    const world = advanceWorldMinutes(atStart(f), 24 * 60);
    expect(() => holdProtest(world, f.key)).toThrow("recorded date");
  });
  it("supplies official considerations only after actual knowledge of the public event", () => {
    const f = fixture();
    let world = holdProtest(atStart(f), f.key);
    const held = world.history.events.find((row) => row.type === PROTEST_HELD)!;
    expect(
      protestConsiderations(world, f.organizer, f.key, {
        key: "yes",
        stance: "support",
      }),
    ).toEqual([]);
    world = recordEventKnowledge(world, {
      stableKey: "protest-official-informed",
      personId: f.organizer,
      eventId: held.id,
      learnedAt: world.currentDate,
      believedSummary: held.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const reasons = protestConsiderations(world, f.organizer, f.key, {
      key: "yes",
      stance: "support",
    });
    expect(reasons.length).toBeGreaterThan(0);
    expect(
      reasons.every((row) =>
        row.sourceRefs.some(
          (ref) => ref.kind === "historical-event" && ref.eventId === held.id,
        ),
      ),
    ).toBe(true);
  });
  it("reaches the existing news desk and a real public-record publication", () => {
    const f = fixture();
    let world = ensurePressDeskSchedule(
      ensurePressMediaOpening(f.world, f.personId),
    );
    world = holdProtest(atStart(f, world), f.key);
    const held = world.history.events.find((row) => row.type === PROTEST_HELD)!;
    expect(eventIsNewsCandidate(world, held)).toBe(true);
    const due = world.history.futureDueItems.find(
      (row) => row.stableKey === "press46:desk-sweep:0",
    )!;
    const swept = pressDeskSweepHandler(world, due).world;
    expect(
      storyLeads(swept).some((row) => row.basisEventIds.includes(held.id)),
    ).toBe(true);
    const published = publishOpeningPublicRecords(swept);
    expect(
      (published.history.publications ?? []).some(
        (row) => row.sourceEventId === held.id,
      ),
    ).toBe(true);
  });
});
