import {
  canPersonAccess,
  compareSimulationMoments,
  householdMembershipsAt,
  personName,
  scheduledActivityState,
  type EntityId,
  type SimulationMoment,
  type World,
} from "../simulation";
import { peopleAtWorkAt } from "../simulation/living-world/work-schedules";
import { currentOpeningLifeScene } from "./life-scene-flow";
import { currentLifeTalkScene } from "./life-talk-presence";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { conversationExchangeTurns } from "./scene-conversation";
import { completedActivityHere } from "./scene-venues";
import {
  resolveConversationListeners,
  type ConversationAddressee,
  type ConversationAudibility,
  type ConversationIntentOption,
} from "./run-b-conversation";
import type { ConversationSubjectKey } from "./run-b-conversation-progress";
import type { OrdinaryMeetingAction } from "./ordinary-meeting-scene";
import type { OrdinaryMeetingSpeechChoice } from "../simulation/ordinary-meeting-presence";
import { recordedRoomPresence } from "./recorded-room-presence";
import { openingWorkLocation } from "./opening-work-location";
import {
  sceneBindingsFor,
  type BoundScene,
} from "../simulation/scene-bindings";

/** Block one reads place state only. Pending actors are not a selected cast,
 * their requests are not spoken lines, and their facts are not viewer knowledge.
 */
export interface StorySceneSituation {
  readonly status:
    "current" | "missing-place" | "unsupported-moment" | "invalid-viewer";
  readonly snapshot: StorySceneSnapshot;
  readonly location: {
    readonly jurisdictionId: EntityId | null;
    readonly label: string;
    readonly setting: string | null;
    readonly sourceRecordIds: readonly EntityId[];
  } | null;
  readonly pendingRequests: readonly BoundScene[];
  readonly currentActivity: {
    readonly activityId: EntityId;
    readonly stateId: EntityId;
    readonly sourceRecordIds: readonly EntityId[];
  } | null;
  readonly quiet: boolean;
}

/** Current recorded place -> actual pending state, or nothing.
 * No scene-family order, authored scene trigger, cast, wording, art or writeback.
 */
export function readStorySceneSituation(
  world: World,
  request: StorySceneRequest,
): StorySceneSituation {
  const snapshot: StorySceneSnapshot = {
    worldId: world.id,
    nextSequence: world.history.nextSequence,
    actionSequence: world.actionSequence,
    moment: { ...world.currentMoment },
  };
  const empty = (
    status: StorySceneSituation["status"],
  ): StorySceneSituation => ({
    status,
    snapshot,
    location: null,
    pendingRequests: [],
    currentActivity: null,
    quiet: true,
  });
  if (
    Object.keys(world.currentMoment).some(
      (key) =>
        world.currentMoment[key as keyof SimulationMoment] !==
        request.moment[key as keyof SimulationMoment],
    )
  )
    return empty("unsupported-moment");
  const viewer = request.viewerPersonId;
  if (
    world.control.kind !== "person" ||
    world.control.personId !== viewer ||
    !world.people[viewer] ||
    world.history.personDeaths.some(
      (record) =>
        record.personId === viewer && record.diedAt <= world.currentDate,
    )
  )
    return empty("invalid-viewer");

  const presence = recordedRoomPresence(world, viewer);
  const initial = openingWorkLocation(world, viewer);
  const startingHome = world.history.events
    .filter(
      (record) =>
        (record.type === "life.scene.arrived" ||
          record.type === "life.scene.opened") &&
        record.sequence < snapshot.nextSequence &&
        record.occurredAt <= world.currentDate &&
        record.recordedAt <= world.currentDate &&
        record.participants.some((person) => person.personId === viewer),
    )
    .at(-1);
  const eventId =
    presence?.eventId ??
    (initial?.tags.includes(`moment:${JSON.stringify(world.currentMoment)}`)
      ? initial.id
      : startingHome?.tags.includes("playtest65:initial-placement") &&
          startingHome.tags.includes(
            `moment:${JSON.stringify(world.currentMoment)}`,
          )
        ? startingHome.id
        : null);
  const event = eventId
    ? world.history.events.find(
        (record) =>
          record.id === eventId &&
          record.sequence < snapshot.nextSequence &&
          record.occurredAt <= world.currentDate &&
          record.recordedAt <= world.currentDate,
      )
    : null;
  const location = event?.context.location;
  if (!event || !location) return empty("missing-place");

  let placeMatches = false;
  let currentActivity: StorySceneSituation["currentActivity"] = null;
  if (request.place.kind === "activity") {
    const activityId = request.place.activityId;
    const activity = world.history.scheduledActivities.find(
      (record) => record.id === activityId,
    );
    if (
      activity &&
      activity.sequence < snapshot.nextSequence &&
      canPersonAccess(activity.access, viewer) &&
      event.involvedEntityIds.includes(activity.id) &&
      activity.location.jurisdictionId === location.jurisdictionId &&
      activity.location.label === location.label
    ) {
      placeMatches = true;
      const state = scheduledActivityState(world, activity.id);
      if (
        state.status === "scheduled" &&
        compareSimulationMoments(state.start, world.currentMoment) <= 0 &&
        compareSimulationMoments(world.currentMoment, state.end) < 0
      )
        currentActivity = {
          activityId: activity.id,
          stateId: state.id,
          sourceRecordIds: [event.id, activity.id, state.id],
        };
    }
  } else if (
    request.place.kind === "opened-scene" ||
    request.place.kind === "recorded-place"
  ) {
    placeMatches = request.place.eventId === event.id;
  } else if (request.place.kind === "household") {
    const householdId = request.place.householdId;
    placeMatches =
      location.setting === "home" &&
      householdMembershipsAt(world, viewer).some(
        (entry) =>
          entry.household.id === householdId &&
          entry.location?.jurisdictionId === location.jurisdictionId,
      );
  } else {
    placeMatches =
      location.setting === "work" &&
      request.place.jurisdictionId === location.jurisdictionId &&
      event.involvedEntityIds.includes(request.place.organizationId);
  }
  if (!placeMatches) return empty("missing-place");

  const pendingRequests = sceneBindingsFor(world, viewer).filter(
    (row) =>
      row.sequence < snapshot.nextSequence &&
      row.boundAt <= world.currentDate &&
      row.binding.expiresAt >= world.currentDate &&
      row.binding.place === location.label &&
      row.binding.jurisdictionId === location.jurisdictionId &&
      !world.history.events.some(
        (record) =>
          record.sequence < snapshot.nextSequence &&
          record.occurredAt <= world.currentDate &&
          record.recordedAt <= world.currentDate &&
          record.tags.includes(`scene.binding:${row.eventId}`) &&
          record.tags.includes("scene.turn.settled"),
      ),
  );
  return {
    status: "current",
    snapshot,
    location: { ...location, sourceRecordIds: [event.id] },
    pendingRequests,
    currentActivity,
    quiet: pendingRequests.length === 0 && currentActivity === null,
  };
}

/** IDs identify records, never a room inferred from its label or artwork. */
export type StoryScenePlace =
  | { readonly kind: "activity"; readonly activityId: EntityId }
  | { readonly kind: "recorded-place"; readonly eventId: EntityId }
  | { readonly kind: "opened-scene"; readonly eventId: EntityId }
  | { readonly kind: "household"; readonly householdId: EntityId }
  | {
      readonly kind: "workplace";
      readonly organizationId: EntityId;
      readonly jurisdictionId: EntityId;
      readonly workPlaceCategory: string;
    };

export interface StorySceneRequest {
  readonly viewerPersonId: EntityId;
  readonly place: StoryScenePlace;
  readonly moment: SimulationMoment;
  readonly addressee?: ConversationAddressee;
  readonly audibility?: ConversationAudibility;
}

export interface StorySceneSnapshot {
  readonly worldId: EntityId;
  readonly nextSequence: number;
  readonly actionSequence: number;
  readonly moment: SimulationMoment;
}

export type StorySceneEvidence =
  | { readonly kind: "event"; readonly id: EntityId }
  | { readonly kind: "activity"; readonly id: EntityId }
  | { readonly kind: "activity-state"; readonly id: EntityId }
  | { readonly kind: "household-membership"; readonly id: EntityId }
  | { readonly kind: "household-location"; readonly id: EntityId }
  | { readonly kind: "work-relationship"; readonly id: EntityId }
  | { readonly kind: "knowledge"; readonly id: EntityId };

export interface StoryScenePerson {
  readonly personId: EntityId;
  readonly name: string;
  readonly reader:
    | "ordinary-meeting"
    | "completed-activity"
    | "recorded-arrival"
    | "opening-scene"
    | "quiet-home"
    | "work-schedule"
    | "scheduled-activity";
  readonly reason:
    | "recorded-presence"
    | "modeled-home-context"
    | "expected-attendance"
    | "expected-shift";
  readonly evidence: readonly StorySceneEvidence[];
}

interface OptionBasis {
  readonly evidence: readonly StorySceneEvidence[];
  /** Resolve again before dispatch; this is not an executable saved offer. */
  readonly snapshot: StorySceneSnapshot;
}

export type StorySceneOption = OptionBasis &
  (
    | {
        readonly kind: "conversation";
        readonly subject: ConversationSubjectKey;
        readonly intent: ConversationIntentOption;
        readonly addressee: ConversationAddressee;
        readonly audibility: ConversationAudibility;
        readonly listenerPersonIds: readonly EntityId[];
      }
    | {
        readonly kind: "meeting-action";
        readonly activityId: EntityId;
        readonly action: OrdinaryMeetingAction;
      }
    | {
        readonly kind: "meeting-speech";
        readonly activityId: EntityId;
        readonly choice: OrdinaryMeetingSpeechChoice;
        readonly words: string;
      }
    | {
        readonly kind: "opening-choice";
        readonly eventId: EntityId;
        readonly choiceKey: string;
        readonly label: string;
      }
  );

export interface StorySceneText {
  readonly text: string;
  readonly evidence: readonly StorySceneEvidence[];
}

export interface StorySceneResolution {
  readonly status:
    "resolved" | "unsupported-moment" | "invalid-viewer" | "missing-place";
  readonly place: StoryScenePlace;
  readonly moment: SimulationMoment;
  readonly snapshot: StorySceneSnapshot;
  readonly presentPeople: readonly StoryScenePerson[];
  readonly expectedPeople: readonly StoryScenePerson[];
  readonly facts: readonly StorySceneText[];
  readonly priorSpeech: readonly StorySceneText[];
  readonly options: readonly StorySceneOption[];
  /** Developer coverage findings; never render these as player dialogue. */
  readonly coverage: readonly string[];
}

/** Current-snapshot projection. Existing readers retain their own semantics. */
export function resolveStoryScene(
  world: World,
  request: StorySceneRequest,
): StorySceneResolution {
  const snapshot: StorySceneSnapshot = {
    worldId: world.id,
    nextSequence: world.history.nextSequence,
    actionSequence: world.actionSequence,
    moment: { ...world.currentMoment },
  };
  const presentPeople: StoryScenePerson[] = [];
  const expectedPeople: StoryScenePerson[] = [];
  const facts: StorySceneText[] = [];
  const priorSpeech: StorySceneText[] = [];
  const options: StorySceneOption[] = [];
  const coverage: string[] = [];
  const result = (
    status: StorySceneResolution["status"],
  ): StorySceneResolution => ({
    status,
    place: { ...request.place },
    moment: { ...request.moment },
    snapshot,
    presentPeople,
    expectedPeople,
    facts,
    priorSpeech,
    options,
    coverage,
  });
  // The same instant with a different geographic clock is not the same reader request.
  if (
    Object.keys(world.currentMoment).some(
      (key) =>
        world.currentMoment[key as keyof SimulationMoment] !==
        request.moment[key as keyof SimulationMoment],
    )
  )
    return result("unsupported-moment");
  const deadPeople = new Set(
    world.history.personDeaths
      .filter(
        (death) =>
          death.diedAt <= world.currentDate &&
          death.sequence < snapshot.nextSequence,
      )
      .map((death) => death.personId),
  );
  const alive = (id: EntityId) => !!world.people[id] && !deadPeople.has(id);
  const viewer = request.viewerPersonId;
  if (
    !alive(viewer) ||
    world.control.kind !== "person" ||
    world.control.personId !== viewer
  )
    return result("invalid-viewer");
  const events = new Map(
    world.history.events
      .filter(
        (event) =>
          event.occurredAt <= world.currentDate &&
          event.recordedAt <= world.currentDate &&
          event.sequence < snapshot.nextSequence,
      )
      .map((event) => [event.id, event]),
  );
  const viewerKnowledge = new Map(
    world.history.knowledge
      .filter(
        (entry) =>
          entry.personId === viewer &&
          entry.accuracy === "accurate" &&
          entry.learnedAt <= world.currentDate &&
          entry.sequence < snapshot.nextSequence,
      )
      .map((entry) => [entry.eventId, entry]),
  );
  const add = (
    target: StoryScenePerson[],
    id: EntityId,
    reader: StoryScenePerson["reader"],
    reason: StoryScenePerson["reason"],
    evidence: readonly StorySceneEvidence[],
  ) => {
    if (!alive(id) || target.some((entry) => entry.personId === id)) return;
    target.push({
      personId: id,
      name: personName(world.people[id]!),
      reader,
      reason,
      evidence,
    });
  };
  let sceneEvidence: readonly StorySceneEvidence[] = [];
  let jurisdictionId: EntityId | null = null;
  let lifeTalkSource: string | null = null;
  if (request.place.kind === "activity") {
    const activityId = request.place.activityId;
    const activity = world.history.scheduledActivities.find(
      (entry) => entry.id === activityId,
    );
    if (
      !activity ||
      compareSimulationMoments(activity.createdAt, world.currentMoment) > 0 ||
      !canPersonAccess(activity.access, viewer)
    )
      return result("missing-place");
    jurisdictionId = activity.location.jurisdictionId;
    const state = scheduledActivityState(world, activity.id);
    sceneEvidence = [
      { kind: "activity", id: activity.id },
      { kind: "activity-state", id: state.id },
    ];
    const meeting = projectOrdinaryMeetingScene(world, viewer);
    if (meeting?.activityId === activity.id && events.has(meeting.eventId)) {
      sceneEvidence = [
        ...sceneEvidence,
        { kind: "event", id: meeting.eventId },
      ];
      add(
        presentPeople,
        viewer,
        "ordinary-meeting",
        "recorded-presence",
        sceneEvidence,
      );
      for (const actor of meeting.actors)
        add(
          presentPeople,
          actor.personId,
          "ordinary-meeting",
          "recorded-presence",
          sceneEvidence,
        );
      if (meeting.agendaText)
        facts.push({ text: meeting.agendaText, evidence: sceneEvidence });
      for (const action of meeting.availableActions)
        options.push({
          kind: "meeting-action",
          activityId: activity.id,
          action,
          evidence: sceneEvidence,
          snapshot,
        });
      for (const choice of meeting.speechChoices)
        options.push({
          kind: "meeting-speech",
          activityId: activity.id,
          choice: choice.key,
          words: choice.words,
          evidence: sceneEvidence,
          snapshot,
        });
      // Keep the comment's own provenance, rather than calling entry evidence a spoken turn.
      const comment = [...events.values()].find(
        (event) =>
          event.stableKey ===
            `ordinary-meeting-presence-v1:${activity.id}:comment:${viewer}` &&
          event.context.choice === meeting.spokenWords,
      );
      if (comment && viewerKnowledge.has(comment.id))
        priorSpeech.push({
          text: comment.context.choice!,
          evidence: [
            { kind: "event", id: comment.id },
            { kind: "knowledge", id: viewerKnowledge.get(comment.id)!.id },
          ],
        });
    } else if (
      activity.kind !== "travel" &&
      completedActivityHere(world, viewer)?.id === activity.id
    ) {
      const outcome = state.outcomeEventId
        ? events.get(state.outcomeEventId)
        : null;
      if (outcome) {
        sceneEvidence = [...sceneEvidence, { kind: "event", id: outcome.id }];
        for (const participant of outcome.participants.filter(
          (entry) => entry.role === "presence:participant",
        ))
          add(
            presentPeople,
            participant.personId,
            "completed-activity",
            "recorded-presence",
            sceneEvidence,
          );
      }
    } else if (
      activity.kind !== "travel" &&
      state.status === "scheduled" &&
      compareSimulationMoments(state.start, world.currentMoment) <= 0 &&
      compareSimulationMoments(world.currentMoment, state.end) < 0
    ) {
      const arrival = [...events.values()]
        .filter(
          (event) =>
            (event.type === "life.scene.arrived" ||
              event.type === "life.scene.opened") &&
            event.context.location !== null &&
            event.participants.some((entry) => entry.personId === viewer),
        )
        .at(-1);
      if (
        arrival?.type === "life.scene.arrived" &&
        arrival.involvedEntityIds.includes(activity.id) &&
        arrival.context.location?.jurisdictionId ===
          activity.location.jurisdictionId &&
        arrival.context.location.label === activity.location.label &&
        arrival.participants.some(
          (entry) =>
            entry.personId === viewer && entry.role === "presence:participant",
        )
      ) {
        sceneEvidence = [...sceneEvidence, { kind: "event", id: arrival.id }];
        add(
          presentPeople,
          viewer,
          "recorded-arrival",
          "recorded-presence",
          sceneEvidence,
        );
        coverage.push(
          "Arrival establishes the viewer only; no canonical roster or scene choices are established here.",
        );
      }
    }
    if (
      state.status === "scheduled" &&
      compareSimulationMoments(state.end, world.currentMoment) > 0
    )
      for (const id of activity.participantPersonIds)
        if (!presentPeople.some((entry) => entry.personId === id))
          add(
            expectedPeople,
            id,
            "scheduled-activity",
            "expected-attendance",
            sceneEvidence,
          );
    if (presentPeople.length === 0)
      coverage.push(
        "No current recorded presence at this activity; scheduled participants are expectations only.",
      );
  } else if (request.place.kind === "recorded-place") {
    const presence = recordedRoomPresence(world, viewer);
    if (!presence || presence.eventId !== request.place.eventId)
      return result("missing-place");
    const event = events.get(presence.eventId);
    if (!event) return result("missing-place");
    jurisdictionId = presence.location.jurisdictionId;
    sceneEvidence = [{ kind: "event", id: presence.eventId }];
    for (const id of presence.personIds)
      add(
        presentPeople,
        id,
        "recorded-arrival",
        "recorded-presence",
        sceneEvidence,
      );
  } else if (request.place.kind === "opened-scene") {
    const opened = currentOpeningLifeScene(world, viewer);
    const event = events.get(request.place.eventId);
    if (!event) return result("missing-place");
    if (opened?.eventId === event.id) {
      jurisdictionId = event.jurisdictionId;
      sceneEvidence = [{ kind: "event", id: event.id }];
      lifeTalkSource = event.id;
      for (const id of opened.presentPersonIds)
        add(
          presentPeople,
          id,
          "opening-scene",
          "recorded-presence",
          sceneEvidence,
        );
      const knowledge = world.history.knowledge.find(
        (entry) =>
          entry.eventId === event.id &&
          entry.personId === viewer &&
          entry.learnedAt <= world.currentDate &&
          entry.sequence < snapshot.nextSequence &&
          entry.accuracy === "accurate",
      );
      if (knowledge)
        facts.push({
          text: opened.prose,
          evidence: [...sceneEvidence, { kind: "knowledge", id: knowledge.id }],
        });
      for (const choice of opened.choices)
        options.push({
          kind: "opening-choice",
          eventId: event.id,
          choiceKey: choice.key,
          label: choice.label,
          evidence: sceneEvidence,
          snapshot,
        });
    } else
      coverage.push(
        "The requested opening record is not the current unresolved scene.",
      );
  } else if (request.place.kind === "household") {
    const householdId = request.place.householdId;
    const home = householdMembershipsAt(world, viewer).find(
      (entry) => entry.membership.householdId === householdId,
    );
    if (!home) return result("missing-place");
    jurisdictionId = home.location?.jurisdictionId ?? null;
    const talk = currentLifeTalkScene(world, viewer);
    if (talk?.definition.setting === "home") {
      lifeTalkSource = talk.eventId;
      for (const id of talk.presentPersonIds) {
        if (!alive(id)) continue;
        const membership = householdMembershipsAt(world, id).find(
          (entry) => entry.membership.householdId === home.household.id,
        );
        if (!membership) continue;
        const evidence: StorySceneEvidence[] = [
          { kind: "household-membership", id: membership.membership.id },
        ];
        if (home.location)
          evidence.push({ kind: "household-location", id: home.location.id });
        if (events.has(talk.eventId as EntityId))
          evidence.push({ kind: "event", id: talk.eventId as EntityId });
        add(presentPeople, id, "quiet-home", "modeled-home-context", evidence);
      }
      sceneEvidence =
        presentPeople.find((entry) => entry.personId === viewer)?.evidence ??
        [];
    } else
      coverage.push(
        "Household membership does not override the current non-home location.",
      );
  } else {
    const place = request.place;
    if (
      !world.history.organizations.some(
        (entry) =>
          entry.id === place.organizationId &&
          entry.sequence < snapshot.nextSequence &&
          entry.formedAt <= world.currentDate,
      ) ||
      !world.jurisdictions[place.jurisdictionId]
    )
      return result("missing-place");
    jurisdictionId = place.jurisdictionId;
    const workById = new Map(
      world.history.workRelationships.map((entry) => [entry.id, entry]),
    );
    for (const worker of peopleAtWorkAt(
      world,
      place.jurisdictionId,
      place.workPlaceCategory,
    ).filter((entry) => entry.organizationId === place.organizationId)) {
      const work = workById.get(worker.workRelationshipId);
      const source = work?.provenance;
      const known =
        worker.personId === viewer ||
        (source?.kind === "simulated-event" &&
          events.has(source.eventId) &&
          viewerKnowledge.has(source.eventId));
      if (!known) continue;
      add(expectedPeople, worker.personId, "work-schedule", "expected-shift", [
        { kind: "work-relationship", id: worker.workRelationshipId },
      ]);
    }
    coverage.push(
      "Work schedule and organization identify expected workers, not exact building arrival.",
    );
  }
  if (
    lifeTalkSource &&
    presentPeople.some((entry) => entry.personId === viewer)
  ) {
    const present = new Set(presentPeople.map((entry) => entry.personId));
    const talk = currentLifeTalkScene(world, viewer);
    if (talk?.eventId === lifeTalkSource) {
      for (const candidate of availablePlayerConversations(world, viewer)) {
        if (candidate.subject !== "life-talk") {
          coverage.push(
            `Canonical location adapter not established for ${candidate.subject}; its room alone does not prove presence.`,
          );
          continue;
        }
        if (
          candidate.room.jurisdictionId !== jurisdictionId ||
          !candidate.room.physicallyPresentPersonIds.every((id) =>
            present.has(id),
          )
        )
          continue;
        const projection = projectPlayerConversation(
          world,
          viewer,
          candidate.subject,
          { addressee: request.addressee, audibility: request.audibility },
        );
        if (!projection || projection.settled) continue;
        const listeners = resolveConversationListeners(
          projection.room,
          projection.addressee,
          projection.audibility,
        );
        if (!listeners.every((id) => present.has(id))) continue;
        for (const intent of projection.intents)
          options.push({
            kind: "conversation",
            subject: projection.subject,
            intent: { ...intent },
            addressee: projection.addressee,
            audibility: projection.audibility,
            listenerPersonIds: [...listeners],
            evidence: sceneEvidence,
            snapshot,
          });
        for (const turn of conversationExchangeTurns(
          world,
          viewer,
          projection.subject,
          projection.addressee === "everyone" ? null : projection.addressee,
        )) {
          if (!turn.current) continue;
          const event = events.get(turn.eventId);
          const knowledge = viewerKnowledge.get(turn.eventId);
          if (!event || !knowledge) continue;
          const evidence: StorySceneEvidence[] = [
            { kind: "event", id: event.id },
            { kind: "knowledge", id: knowledge.id },
          ];
          if (event.context.choice)
            priorSpeech.push({ text: event.context.choice, evidence });
          if (event.context.immediateReaction)
            priorSpeech.push({
              text: event.context.immediateReaction,
              evidence,
            });
        }
      }
    }
  }
  return result("resolved");
}
