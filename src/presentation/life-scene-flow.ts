import { travelToPlace, type PlaceTravelProvider } from "./place-travel";
import { completeOrdinaryGoal } from "../simulation/life-personality";
import {
  activeChildAuthoritiesAt,
  activeEducationEnrollmentsAt,
  ageOnDate,
  householdMembershipsAt,
  peopleInHouseholdAt,
  kinshipRelationshipsAt,
  recordWorldEvent,
  recordEventKnowledge,
  advanceWorldMinutes,
  stableHash,
  personName,
} from "../simulation";
import type {
  World,
  EntityId,
  FutureTransitionHandlerRegistry,
} from "../simulation";

import {
  OPENING_LIFE_SCENES,
  OPENING_LIFE_ADDITIONS,
  OPENING_LIFE_FAMILIES,
  OPENING_LIFE_FOLLOWUPS,
} from "../simulation/opening-life-content";
import {
  eligibleEpisodeBeats,
  playEpisodeOption,
} from "../simulation/life-episodes";
import type {
  LifeSceneDefinition,
  LifeSceneSetting,
} from "../simulation/opening-life-content";

const OPEN = "life.scene.opened";
const CLOSED = "life.scene.resolved";
function alive(world: World, id: EntityId) {
  return (
    !!world.people[id] &&
    !world.history.personDeaths.some(
      (death) => death.personId === id && death.diedAt <= world.currentDate,
    )
  );
}
function sceneHousehold(world: World, personId: EntityId) {
  const memberships = householdMembershipsAt(world, personId);
  const primary = memberships.filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  return primary.length === 1
    ? primary[0]
    : memberships.length === 1
      ? memberships[0]
      : undefined;
}
function homePeople(world: World, personId: EntityId) {
  const household = sceneHousehold(world, personId);
  return household
    ? peopleInHouseholdAt(world, household.household.id).filter((id) =>
        alive(world, id),
      )
    : [];
}
function castFor(
  world: World,
  personId: EntityId,
  definition: LifeSceneDefinition,
): EntityId | null | undefined {
  if (definition.cast === "alone") return null;
  const housemates = homePeople(world, personId)
    .filter((id) => id !== personId)
    .sort();
  if (definition.cast === "housemate") return housemates[0];
  if (definition.cast === "guardian") {
    const authority = [...activeChildAuthoritiesAt(world, personId)]
      .sort((a, b) =>
        (a.authority.holder.kind === "person"
          ? a.authority.holder.personId
          : ""
        ).localeCompare(
          b.authority.holder.kind === "person"
            ? b.authority.holder.personId
            : "",
        ),
      )
      .find(
        (entry) =>
          entry.authority.holder.kind === "person" &&
          housemates.includes(entry.authority.holder.personId),
      );
    return authority?.authority.holder.kind === "person"
      ? authority.authority.holder.personId
      : undefined;
  }
  if (definition.cast === "sibling") {
    return kinshipRelationshipsAt(world, personId)
      .filter((kinship) => kinship.kind === "collateral:sibling")
      .flatMap((kinship) => kinship.personIds)
      .sort()
      .find((id) => housemates.includes(id));
  }
  const schools = activeEducationEnrollmentsAt(world, personId).map(
    (entry) => entry.enrollment.organizationId,
  );
  const age = ageOnDate(world.people[personId]!.birthDate, world.currentDate);
  return [...world.personOrder]
    .sort()
    .find(
      (id) =>
        id !== personId &&
        alive(world, id) &&
        Math.abs(
          ageOnDate(world.people[id]!.birthDate, world.currentDate) - age,
        ) <= 2 &&
        activeEducationEnrollmentsAt(world, id).some((entry) =>
          schools.includes(entry.enrollment.organizationId),
        ),
    );
}

function definitionAtStage(
  definition: LifeSceneDefinition,
  stageKey: string,
): LifeSceneDefinition {
  if (stageKey === "moment") return definition;
  const followup = OPENING_LIFE_FOLLOWUPS[definition.key];
  if (stageKey !== "follow-through" || !followup)
    throw new Error("Unknown opening stage.");
  return {
    ...definition,
    minutes: 5,
    premise: followup.premise,
    choices: followup.choices,
  };
}

/** All eligible definitions are inspectable without creating a person or event. */
export function availableOpeningLifeScenes(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person || !alive(world, personId)) return [];
  const age = ageOnDate(person.birthDate, world.currentDate);
  const beats = eligibleEpisodeBeats({
    world,
    personId,
    families: OPENING_LIFE_FAMILIES,
  }).beats;
  return OPENING_LIFE_ADDITIONS.flatMap((definition) => {
    const beat = beats.find(
      (beat) => beat.episodeKey === `opening.${definition.key}`,
    );
    if (!beat) return [];
    if (age < definition.ages[0] || age > definition.ages[1]) return [];
    if (
      definition.key === "early.home.bedtime-delay" &&
      world.currentMoment.minuteOfDay < 19 * 60
    )
      return [];
    if (definition.setting === "home" && !sceneHousehold(world, personId))
      return [];
    if (
      definition.setting === "school" &&
      activeEducationEnrollmentsAt(world, personId).length === 0
    )
      return [];
    const counterpartPersonId = castFor(world, personId, definition);
    if (counterpartPersonId !== (beat.bindings[0]?.personId ?? null)) return [];
    return counterpartPersonId === undefined
      ? []
      : [
          {
            definition: definitionAtStage(definition, beat.stageKey),
            counterpartPersonId,
            beat,
          },
        ];
  });
}

export function currentOpeningLifeScene(world: World, personId: EntityId) {
  const opened = world.history.events
    .filter(
      (event) =>
        event.type === OPEN &&
        event.participants.some(
          (p) => p.personId === personId && p.role === "focus:subject",
        ),
    )
    .at(-1);
  if (
    !alive(world, personId) ||
    !opened ||
    opened.occurredAt !== world.currentDate ||
    world.history.events.some(
      (event) =>
        event.type === CLOSED && event.tags.includes(`resolves:${opened.id}`),
    )
  )
    return null;
  const lastEvent = world.history.events.at(-1);
  if (
    !lastEvent ||
    (lastEvent.id !== opened.id &&
      !lastEvent.tags.includes(`scene:${opened.id}`)) ||
    !lastEvent.tags.includes(`moment:${JSON.stringify(world.currentMoment)}`)
  )
    return null;
  const key = opened.tags.find((tag) => tag.startsWith("family:"))?.slice(7);
  const baseDefinition = OPENING_LIFE_SCENES.find((entry) => entry.key === key);
  if (!baseDefinition) return null;
  const stageKey =
    opened.tags
      .find((tag) => tag.startsWith("opening-stage:"))
      ?.slice("opening-stage:".length) ?? "moment";
  const definition = definitionAtStage(baseDefinition, stageKey);
  const counterpartPersonId =
    opened.participants.find((p) => p.role === "coordination:counterpart")
      ?.personId ?? null;
  if (counterpartPersonId && !alive(world, counterpartPersonId)) return null;
  return {
    presentPersonIds: opened.participants
      .map((participant) => participant.personId)
      .filter((id) => alive(world, id)),
    eventId: opened.id,
    stageKey,
    definition,
    counterpartPersonId,
    prose: opened.summary,
    choices: definition.choices,
    revision: world.history.nextSequence,
  };
}

/** Initial scene construction establishes presence. Later location changes belong to the place owner. */
export function openNextLifeScene(
  world: World,
  personId: EntityId,
  initialSetting?: LifeSceneSetting,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("Only the player can enter this scene.");
  if (currentOpeningLifeScene(world, personId)) return world;
  const previous = world.history.events
    .filter(
      (event) =>
        event.type === OPEN && event.involvedEntityIds.includes(personId),
    )
    .at(-1);
  const arrival = world.history.events
    .filter(
      (event) =>
        event.type === "life.scene.arrived" &&
        event.involvedEntityIds.includes(personId),
    )
    .at(-1);
  const latestContext =
    arrival && (!previous || arrival.sequence > previous.sequence)
      ? arrival
      : previous;
  const setting =
    latestContext?.context.location?.setting ?? initialSetting ?? "home";
  if (latestContext && initialSetting && initialSetting !== setting)
    throw new Error(
      "A new backdrop is not travel. A place transition is required.",
    );
  const eligible = availableOpeningLifeScenes(world, personId).filter(
    ({ definition, beat }) =>
      definition.setting === setting &&
      !world.history.events.some(
        (event) =>
          event.type === OPEN &&
          event.involvedEntityIds.includes(personId) &&
          event.tags.includes(`family:${definition.key}`) &&
          (event.tags.find((tag) => tag.startsWith("opening-stage:")) ??
            "opening-stage:moment") === `opening-stage:${beat.stageKey}` &&
          (definition.recurrence !== "daily" ||
            event.occurredAt === world.currentDate),
      ),
  );
  if (!eligible.length) return world;
  const index =
    Number.parseInt(
      stableHash(
        `${world.seed}:${personId}:${world.history.nextSequence}`,
      ).slice(0, 8),
      16,
    ) % eligible.length;
  const { definition, counterpartPersonId, beat } = eligible[index]!;
  const present =
    definition.setting === "home"
      ? homePeople(world, personId)
      : counterpartPersonId
        ? [personId, counterpartPersonId]
        : [personId];
  const label =
    definition.setting === "home"
      ? "Home"
      : definition.setting === "school"
        ? "School"
        : "In your neighborhood";
  const summary = beat.prose;
  let next = recordWorldEvent(world, {
    stableKey: `opening-life:scene:${personId}:${definition.key}${definition.recurrence === "daily" ? `:${world.currentDate}` : ""}${beat.stageKey === "moment" ? "" : `:${beat.stageKey}`}`,
    type: OPEN,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: present,
    participants: [
      {
        personId,
        role: "focus:subject",
        detail: "Present in the authored scene",
      },
      ...(counterpartPersonId
        ? [
            {
              personId: counterpartPersonId,
              role: "coordination:counterpart" as const,
              detail: "Present in the authored scene",
            },
          ]
        : []),
      ...present
        .filter((id) => id !== personId && id !== counterpartPersonId)
        .map((id) => ({
          personId: id,
          role: "presence:participant" as const,
          detail: "Present in the authored household scene",
        })),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "opening-life-v1",
      `family:${definition.key}`,
      `opening-stage:${beat.stageKey}`,
      "provenance:authored-premise",
      `moment:${JSON.stringify(world.currentMoment)}`,
    ],
    summary,
    context: {
      location: {
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        label,
        setting: definition.setting,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  for (const id of present)
    next = recordEventKnowledge(next, {
      stableKey: `${event.stableKey}:witness:${id}`,
      personId: id,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  return next;
}

export function chooseOpeningLifeScene(
  world: World,
  personId: EntityId,
  eventId: EntityId,
  choiceKey: string,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    throw new Error("Only the player can choose.");
  const scene = currentOpeningLifeScene(world, personId);
  const choice = scene?.choices.find((entry) => entry.key === choiceKey);
  if (!scene || scene.eventId !== eventId || !choice)
    throw new Error("That scene choice is no longer available.");
  const probe = advanceWorldMinutes(world, scene.definition.minutes, handlers);
  if (probe === world) return world;
  if (
    probe.history.events
      .slice(world.history.events.length)
      .some((event) => event.type !== "simulation.minutes-advanced")
  )
    return probe;
  const beat = eligibleEpisodeBeats({
    world,
    personId,
    families: OPENING_LIFE_FAMILIES,
  }).beats.find(
    (beat) =>
      beat.episodeKey === `opening.${scene.definition.key}` &&
      beat.stageKey === scene.stageKey,
  );
  if (!beat) throw new Error("The episode's prerequisites changed.");
  const played = playEpisodeOption(world, {
    personId,
    beat,
    optionKey: choiceKey,
    families: OPENING_LIFE_FAMILIES,
  });
  const advanced = advanceWorldMinutes(
    played.world,
    scene.definition.minutes,
    handlers,
  );
  const aftermath = choice.aftermath.replaceAll(
    "{person}",
    scene.counterpartPersonId
      ? personName(world.people[scene.counterpartPersonId]!)
      : "",
  );
  const next = recordWorldEvent(advanced, {
    stableKey: `opening-life:scene-answer:${eventId}`,
    type: CLOSED,
    occurredAt: world.currentDate,
    recordedAt: advanced.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [
      personId,
      ...(scene.counterpartPersonId ? [scene.counterpartPersonId] : []),
    ],
    participants: [
      { personId, role: "focus:subject", detail: choice.label },
      ...(scene.counterpartPersonId
        ? [
            {
              personId: scene.counterpartPersonId,
              role: "coordination:counterpart" as const,
              detail: "Present for the choice",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "opening-life-v1",
      `family:${scene.definition.key}`,
      `choice:${choice.key}`,
      `resolves:${eventId}`,
      ...(choice.approach ? [`approach:${choice.approach}`] : []),
    ],
    summary: aftermath,
    context: {
      location: world.history.events.find((event) => event.id === eventId)!
        .context.location,
      socialContext: null,
      pressure: null,
      choice: choice.label,
      motivation: null,
      immediateReaction: aftermath,
    },
  });
  const completedGoal =
    scene.definition.key === "young.home.choose-activity" ||
    scene.definition.key === "adult.home.free-time"
      ? choice.key === "read"
        ? "learning"
        : choice.key === "rest"
          ? "privacy"
          : null
      : null;
  return completedGoal
    ? completeOrdinaryGoal(
        next,
        personId,
        completedGoal,
        next.history.events.at(-1)!.id,
      )
    : next;
}

/** A chosen short walk writes arrival only after uninterrupted canonical time. */
export function walkOpeningNeighborhood(
  world: World,
  personId: EntityId,
  destination: "home" | "neighborhood",
  handlers?: FutureTransitionHandlerRegistry,
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    !alive(world, personId) ||
    !sceneHousehold(world, personId)
  )
    return world;
  const age = ageOnDate(world.people[personId]!.birthDate, world.currentDate);
  const guardian = activeChildAuthoritiesAt(world, personId).find(
    (entry) =>
      entry.authority.holder.kind === "person" &&
      homePeople(world, personId).includes(entry.authority.holder.personId),
  );
  if (age < 5 || (age < 18 && !guardian)) return world;
  const origin = world.history.events
    .filter(
      (event) =>
        [OPEN, "life.scene.arrived"].includes(event.type) &&
        event.participants.some(
          (participant) => participant.personId === personId,
        ),
    )
    .at(-1);
  const location = origin?.context.location;
  if (
    !origin ||
    !location ||
    !location.setting ||
    location.setting === destination ||
    !["home", "neighborhood"].includes(location.setting)
  )
    return world;
  const householdId = sceneHousehold(world, personId)!.household.id;
  const companionId =
    age < 18 && guardian?.authority.holder.kind === "person"
      ? guardian.authority.holder.personId
      : null;
  const provider: PlaceTravelProvider = (
    current,
    currentPersonId,
    requested,
  ) => {
    if (
      currentPersonId !== personId ||
      requested !== destination ||
      !alive(current, personId) ||
      sceneHousehold(current, personId)?.household.id !== householdId ||
      (companionId !== null &&
        (!homePeople(current, personId).includes(companionId) ||
          !activeChildAuthoritiesAt(current, personId).some(
            (entry) =>
              entry.authority.holder.kind === "person" &&
              entry.authority.holder.personId === companionId,
          )))
    )
      return {
        kind: "unavailable",
        reason: "This walk is no longer available.",
      };
    return {
      kind: "available",
      route: {
        version: 1,
        id: `opening-walk:${householdId}:${origin.id}:${destination}`,
        origin: {
          key: location.setting!,
          label: location.label,
          jurisdictionId: location.jurisdictionId,
          setting: location.setting!,
        },
        destination: {
          key: destination,
          label: destination === "home" ? "Home" : "In your neighborhood",
          jurisdictionId: location.jurisdictionId,
          setting: destination,
        },
        duration: {
          minutes: 5,
          basis: "authored-scenario",
          evidence:
            "OPENING-LIFE1 authored short local walk; no measured distance or travel speed is asserted.",
        },
        originEventId: origin.id,
        participantPersonIds: [personId, ...(companionId ? [companionId] : [])],
      },
    };
  };
  const next = travelToPlace(world, personId, destination, provider, handlers);
  return next.history.events
    .slice(world.history.events.length)
    .some(
      (event) =>
        event.type === "life.scene.arrived" &&
        event.participants.some(
          (participant) => participant.personId === personId,
        ),
    )
    ? openNextLifeScene(next, personId, destination)
    : next;
}

/** Scene-family selection hint for the root owner, read from actual scene/arrival records. */
export function openingLifeLocation(world: World, personId: EntityId) {
  return (
    world.history.events
      .filter(
        (event) =>
          (event.type === OPEN || event.type === "life.scene.arrived") &&
          event.involvedEntityIds.includes(personId),
      )
      .at(-1)?.context.location ?? null
  );
}
