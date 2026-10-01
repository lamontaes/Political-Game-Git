import { beforeAll, describe, expect, it } from "vitest";
import {
  cancelScheduledActivity,
  createOrganization,
  createScheduledActivity,
  scheduledActivityState,
  createWorkRelationship,
  householdMembershipsAt,
  lifePlaces,
  recordPersonDeath,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { SeededRng } from "../simulation/rng";
import { workSchedulesFor } from "../simulation/living-world/work-schedules";
import { recordSceneBinding } from "../simulation/scene-bindings";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import {
  enterOrdinaryMeeting,
  speakAtOrdinaryMeeting,
} from "../simulation/ordinary-meeting-presence";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { submitTimeCommand } from "./time-command";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { currentLifeTalkScene } from "./life-talk-presence";
import {
  resolveStoryScene,
  type StorySceneEvidence,
  type StorySceneRequest,
} from "./story-scene-resolver";

const seed = "team8-story-resolver-part1";
// Presence needs an actual local venue, not a statewide setup label.
const places = lifePlaces().filter((entry) => entry.scope === "locality");
const place = places[new SeededRng(seed).integer(0, places.length)]!;

describe("record-backed current story scene", { timeout: 60_000 }, () => {
  let home: World;
  let invited: World;
  let entered: World;
  let arrivalOnly: World;
  let viewer: EntityId;
  let householdId: EntityId;
  let activityId: EntityId;

  const request = (world: World): StorySceneRequest => ({
    viewerPersonId: viewer,
    place: { kind: "activity", activityId },
    moment: world.currentMoment,
  });
  const homeRequest = (): StorySceneRequest => ({
    viewerPersonId: viewer,
    place: { kind: "household", householdId },
    moment: home.currentMoment,
  });
  function assertEvidence(
    world: World,
    evidence: readonly StorySceneEvidence[],
  ) {
    for (const ref of evidence) {
      const records = {
        event: world.history.events,
        activity: world.history.scheduledActivities,
        "activity-state": world.history.scheduledActivityStates,
        "household-membership": world.history.householdMemberships,
        "household-location": world.history.householdLocations,
        "work-relationship": world.history.workRelationships,
        knowledge: world.history.knowledge,
      }[ref.kind];
      expect(
        records.some((record) => record.id === ref.id),
        JSON.stringify(ref),
      ).toBe(true);
    }
  }

  beforeAll(() => {
    process.stdout.write(
      `story resolver fixture place=${place.key} seed=${seed}\n`,
    );
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startKind: "custom",
        startAge: 34,
        household: "shares-a-home",
      }),
    ).game!;
    home = game.world;
    viewer = game.playerPersonId;
    householdId = householdMembershipsAt(home, viewer)[0]!.household.id;
    invited = openOrdinaryLifeRecords(home, viewer);
    activityId = invited.history.scheduledActivities.find(
      (activity) =>
        activity.location.locationKey === "ordinary-life:meeting-room",
    )!.id;
    arrivalOnly = submitTimeCommand(invited, {
      requestId: "story-resolver-arrival-only",
      personId: viewer,
      sourceMoment: invited.currentMoment,
      command: { kind: "attend-activity", activityId },
    }).world;
    let fixtureMeeting = arrivalOnly;
    // Explicit fixture notice supplies a recorded chair. A generated place
    // without one cannot be promoted into an active meeting by the resolver.
    const activity = fixtureMeeting.history.scheduledActivities.find(
      (entry) => entry.id === activityId,
    )!;
    const notice = fixtureMeeting.history.events.find(
      (event) =>
        activity.sourceEntityIds.includes(event.id) &&
        event.type === "civic.meeting-notice",
    )!;
    const chair = fixtureMeeting.personOrder.find(
      (id) =>
        id !== viewer &&
        fixtureMeeting.people[id]!.homeJurisdictionId ===
          activity.location.jurisdictionId &&
        fixtureMeeting.people[id]!.birthDate < "2000-01-01",
    )!;
    expect(chair).toBeDefined();
    // This is a declared input fixture, not a gameplay change to a saved
    // event: retain original IDs, dates, source order and known notice.
    fixtureMeeting = {
      ...fixtureMeeting,
      history: {
        ...fixtureMeeting.history,
        events: fixtureMeeting.history.events.map((event) =>
          event.id === notice.id
            ? {
                ...event,
                involvedEntityIds: [
                  ...new Set([...event.involvedEntityIds, chair]),
                ].sort(),
                participants: [
                  ...event.participants,
                  {
                    personId: chair,
                    role: "coordination:chair" as const,
                    detail: "Explicit fixture meeting chair",
                  },
                ].sort(
                  (a, b) =>
                    a.personId.localeCompare(b.personId) ||
                    a.role.localeCompare(b.role),
                ),
              }
            : event,
        ),
      },
    };
    entered = enterOrdinaryMeeting(fixtureMeeting, viewer, activityId);
    expect(projectOrdinaryMeetingScene(entered, viewer)?.phase).toBe("active");
  }, 60_000);

  it("reads the actual entered roster/options without writing or needing art", () => {
    const before = serializeWorld(entered);
    const started = performance.now();
    const scene = resolveStoryScene(entered, request(entered));
    const coldMs = performance.now() - started;
    const canonical = projectOrdinaryMeetingScene(entered, viewer)!;
    expect(scene.presentPeople.map((person) => person.personId)).toEqual([
      viewer,
      ...canonical.actors.map((person) => person.personId),
    ]);
    expect(
      scene.options
        .filter((option) => option.kind === "meeting-speech")
        .map((option) => option.words),
    ).toEqual(canonical.speechChoices.map((choice) => choice.words));
    expect(scene.expectedPeople).toEqual([]);
    expect(scene.facts.map((fact) => fact.text)).toContain(
      canonical.agendaText,
    );
    for (const person of scene.presentPeople)
      assertEvidence(entered, person.evidence);
    for (const option of scene.options)
      assertEvidence(entered, option.evidence);
    expect(resolveStoryScene(entered, request(entered))).toEqual(scene);
    const warmStart = performance.now();
    for (let index = 0; index < 20; index++)
      resolveStoryScene(entered, request(entered));
    process.stdout.write(
      `resolver read cold=${coldMs.toFixed(3)}ms warmMean=${((performance.now() - warmStart) / 20).toFixed(3)}ms events=${entered.history.events.length}\n`,
    );
    expect(serializeWorld(entered)).toBe(before);
  });

  it("keeps an actual arrival when no canonical chair/roster exists", () => {
    expect(projectOrdinaryMeetingScene(arrivalOnly, viewer)).toBeNull();
    const scene = resolveStoryScene(arrivalOnly, request(arrivalOnly));
    expect(scene.presentPeople.map((person) => person.personId)).toEqual([
      viewer,
    ]);
    expect(scene.presentPeople[0]?.reader).toBe("recorded-arrival");
    expect(scene.options).toEqual([]);
    assertEvidence(arrivalOnly, scene.presentPeople[0]!.evidence);
  });

  it("never treats a future invitation or canceled hold as attendance", () => {
    const offered = resolveStoryScene(invited, request(invited));
    expect(offered.presentPeople).toEqual([]);
    expect(offered.options).toEqual([]);
    expect(offered.expectedPeople.map((person) => person.personId)).toContain(
      viewer,
    );
    const canceled = cancelScheduledActivity(invited, activityId);
    expect(resolveStoryScene(canceled, request(canceled))).toMatchObject({
      presentPeople: [],
      expectedPeople: [],
      options: [],
    });
  });

  it("does not turn contextual bookkeeping into attendance", () => {
    const activity = invited.history.scheduledActivities.find(
      (entry) => entry.id === activityId,
    )!;
    const speaker = invited.personOrder.find((id) => id !== viewer)!;
    const bound = recordSceneBinding(
      invited,
      {
        version: 1,
        family: "favor",
        variant: "meet-up",
        playerPersonId: viewer,
        speakerPersonId: speaker,
        relationship: null,
        place: activity.location.label,
        jurisdictionId: activity.location.jurisdictionId!,
        request: "Fixture invitation",
        sourceEntityIds: [activity.id],
        facts: {},
        knownRecordIds: [],
        target: null,
        date: invited.currentDate,
        expiresAt: invited.currentDate,
      },
      "Fixture contextual bookkeeping",
    );
    expect(resolveStoryScene(bound, request(bound))).toMatchObject({
      presentPeople: [],
      options: [],
    });
  });

  it("keeps a known work shift expected and excludes private colleague records", () => {
    const worker = home.personOrder.find(
      (id) =>
        id !== viewer &&
        !home.history.workRelationships.some((entry) => entry.personId === id),
    )!;
    const jurisdictionId = home.people[worker]!.homeJurisdictionId;
    let world = createOrganization(home, {
      stableKey: "resolver:fixture:employer",
      formedAt: home.currentDate,
      provenance: { kind: "authored", note: "Expected roster fixture" },
      initialProfile: {
        name: "Fixture office",
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    const hire = (personId: EntityId) => {
      world = createWorkRelationship(world, {
        stableKey: `resolver:fixture:job:${personId}`,
        personId,
        organizationId,
        startedAt: world.currentDate,
        kind: "employment:administrative",
        compensation: "paid",
        authority: "directed",
        dependency: "partly-dependent",
        economicRisk: "organization-borne",
        provenance: { kind: "authored", note: "Expected roster fixture" },
        initialRole: {
          title: "Office clerk",
          occupationClassification: null,
          locationJurisdictionId: jurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 40, maximumHours: 40 },
            attention: "moderate",
            concurrency: "partly-concurrent",
            scheduleRigidity: "rigid",
            interruptibility: "interruptible",
            locationJurisdictionId: jurisdictionId,
          },
        },
      });
    };
    hire(worker);
    hire(viewer);
    const schedule = workSchedulesFor(world, worker)[0]!;
    expect(schedule.worksOn(world.currentDate)).toBe(true);
    world = {
      ...world,
      control: { kind: "person", personId: worker },
      currentMoment: {
        ...world.currentMoment,
        minuteOfDay: schedule.shift.startMinute + 1,
      },
    };
    const scene = resolveStoryScene(world, {
      viewerPersonId: worker,
      moment: world.currentMoment,
      place: {
        kind: "workplace",
        organizationId,
        jurisdictionId,
        workPlaceCategory: schedule.place,
      },
    });
    expect(scene.presentPeople).toEqual([]);
    expect(scene.options).toEqual([]);
    expect(scene.expectedPeople.map((person) => person.personId)).toEqual([
      worker,
    ]);
    expect(scene.expectedPeople[0]?.reason).toBe("expected-shift");
    assertEvidence(world, scene.expectedPeople[0]!.evidence);
  });

  it("does not combine another activity at the same venue label", () => {
    const actual = entered.history.scheduledActivities.find(
      (entry) => entry.id === activityId,
    )!;
    const jurisdictionId = entered.jurisdictionOrder.find(
      (id) => id !== actual.location.jurisdictionId,
    )!;
    const state = scheduledActivityState(entered, activityId);
    const otherActor = projectOrdinaryMeetingScene(entered, viewer)!.actors[0]!
      .personId;
    const other = createScheduledActivity(entered, {
      stableKey: "resolver:other-jurisdiction",
      title: actual.title,
      summary: actual.summary,
      kind: "confirmed",
      start: state.start,
      end: state.end,
      participantPersonIds: [otherActor],
      responsiblePersonId: otherActor,
      location: { ...actual.location, jurisdictionId },
      sourceEntityIds: actual.sourceEntityIds,
      flexibility: { kind: "fixed" },
      access: actual.access,
    });
    const otherId = other.history.scheduledActivities.at(-1)!.id;
    expect(
      resolveStoryScene(other, {
        ...request(other),
        place: { kind: "activity", activityId: otherId },
      }),
    ).toMatchObject({ presentPeople: [], options: [] });
  });

  it("keeps old moments and missing places empty", () => {
    expect(
      resolveStoryScene(entered, {
        ...request(entered),
        moment: invited.currentMoment,
      }),
    ).toMatchObject({
      status: "unsupported-moment",
      presentPeople: [],
      options: [],
    });
    expect(
      resolveStoryScene(home, {
        ...homeRequest(),
        moment: { ...home.currentMoment, timeZone: "different-clock" },
      }),
    ).toMatchObject({
      status: "unsupported-moment",
      presentPeople: [],
      options: [],
    });
    expect(
      resolveStoryScene(home, {
        ...homeRequest(),
        place: { kind: "activity", activityId: "missing" as EntityId },
      }),
    ).toMatchObject({
      status: "missing-place",
      presentPeople: [],
      options: [],
    });
  });

  it("projects the existing modeled home roster and hearing only in that home", () => {
    const before = serializeWorld(home);
    const canonical = currentLifeTalkScene(home, viewer)!;
    const scene = resolveStoryScene(home, homeRequest());
    expect(canonical.definition.setting).toBe("home");
    expect(scene.presentPeople.map((person) => person.personId)).toEqual(
      canonical.presentPersonIds,
    );
    expect(
      scene.presentPeople.every(
        (person) => person.reason === "modeled-home-context",
      ),
    ).toBe(true);
    const choices = scene.options.filter(
      (option) => option.kind === "conversation",
    );
    expect(choices.length).toBeGreaterThan(0);
    for (const choice of choices) {
      expect(choice.subject).toBe("life-talk");
      expect(
        choice.listenerPersonIds.every((id) =>
          scene.presentPeople.some((person) => person.personId === id),
        ),
      ).toBe(true);
      assertEvidence(home, choice.evidence);
    }
    expect(serializeWorld(home)).toBe(before);
    const moved = resolveStoryScene(entered, {
      ...homeRequest(),
      moment: entered.currentMoment,
    });
    expect(moved.presentPeople).toEqual([]);
    expect(moved.options).toEqual([]);
  });

  it("revalidates offered speech from the new snapshot after a recorded comment", () => {
    const spoken = speakAtOrdinaryMeeting(entered, viewer, activityId, "ask");
    const scene = resolveStoryScene(spoken, request(spoken));
    expect(
      scene.options.some((option) => option.kind === "meeting-speech"),
    ).toBe(false);
    expect(scene.priorSpeech[0]?.text).toBe(
      spoken.history.events.at(-1)?.context.choice,
    );
    expect(scene.snapshot.nextSequence).toBeGreaterThan(
      resolveStoryScene(entered, request(entered)).snapshot.nextSequence,
    );
    for (const text of scene.priorSpeech) assertEvidence(spoken, text.evidence);
  });

  it("does not offer a dead actor, another controlled viewer, or a stale opening record", () => {
    const dead = recordPersonDeath(home, {
      stableKey: "resolver:death",
      personId: viewer,
      diedAt: home.currentDate,
      causeKey: "mortality:other",
      sourceEntityIds: [viewer],
      summary: "Fixture death",
      provenance: { kind: "authored", note: "Resolver negative control" },
    });
    expect(
      resolveStoryScene(dead, { ...homeRequest(), moment: dead.currentMoment }),
    ).toMatchObject({
      status: "invalid-viewer",
      presentPeople: [],
      options: [],
    });
    const observer = { ...home, control: { kind: "observer" as const } };
    expect(resolveStoryScene(observer, homeRequest()).status).toBe(
      "invalid-viewer",
    );
    const event = home.history.events[0]!;
    expect(
      resolveStoryScene(home, {
        ...homeRequest(),
        place: { kind: "opened-scene", eventId: event.id },
      }),
    ).toMatchObject({ presentPeople: [], options: [] });
  });
});
