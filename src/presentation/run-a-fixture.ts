import {
  createDemoWorld,
  createGeneratedWorld,
  personName,
  recordRelationshipInteraction,
  recordWorldEvent,
} from "../simulation";
import type { EntityId, World } from "../simulation";

export const RUN_A_SEED = "stage-6-5-run-a";
export const RUN_A_HIDDEN_CANONICAL_TEXT =
  "Initial synthetic diagnostic record.";

const RUN_A_LEXINGTON_DISPLAY_NAMES = {
  canonical: "Lexington-Fayette, Kentucky",
  full: "Lexington, Kentucky",
  compact: "Lexington, KY",
} as const;

export function runAPlaceDisplayName(canonicalName: string): string {
  return canonicalName === RUN_A_LEXINGTON_DISPLAY_NAMES.canonical
    ? RUN_A_LEXINGTON_DISPLAY_NAMES.full
    : canonicalName;
}

export const RUN_A_FIXTURE_STATE_NAMES = [
  "normal",
  "person-menu",
  "dossier",
  "civic-learning",
  "mixed-pins",
  "navigation",
  "submenu",
] as const;

export type RunAFixtureStateName = (typeof RUN_A_FIXTURE_STATE_NAMES)[number];

export interface RunAScenePersonContext {
  readonly personId: EntityId;
  readonly title: string;
  readonly role: string;
  readonly qualitativeRead: string;
  readonly inferredRead: string;
}

export interface RunAFixture {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly scenePerson: RunAScenePersonContext;
  readonly officeEventId: EntityId;
  readonly locationDisplayName: string;
  readonly locationLabel: string;
  readonly locationDetail: string;
  readonly presentationTime: string;
}

function requirePersonId(world: World, index: number): EntityId {
  const personId = world.personOrder[index];
  if (!personId) {
    throw new Error(`Run A fixture is missing person ${index}.`);
  }
  return personId;
}

function requireJurisdictionId(world: World, index: number): EntityId {
  const jurisdictionId = world.jurisdictionOrder[index];
  if (!jurisdictionId) {
    throw new Error(`Run A fixture is missing jurisdiction ${index}.`);
  }
  return jurisdictionId;
}

export function createRunAFixture(seedInput?: string): RunAFixture {
  const seed =
    seedInput && seedInput.trim().length > 0 ? seedInput.trim() : RUN_A_SEED;
  let world =
    seed === RUN_A_SEED
      ? createDemoWorld(RUN_A_SEED)
      : createGeneratedWorld(seed);
  const scenePersonId = requirePersonId(world, 0);
  const playerPersonId = requirePersonId(world, 1);
  const jurisdictionId = requireJurisdictionId(world, 0);
  const jurisdiction = world.jurisdictions[jurisdictionId];
  const scenePerson = world.people[scenePersonId];
  const playerPerson = world.people[playerPersonId];

  if (!jurisdiction || !scenePerson || !playerPerson) {
    throw new Error("Run A fixture is missing required canonical entities.");
  }

  world = {
    ...world,
    control: { kind: "person", personId: playerPersonId },
  };

  world = recordWorldEvent(world, {
    stableKey: "run-a:office:morning-briefing",
    type: "work.policy-briefing",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [scenePersonId, playerPersonId, jurisdictionId],
    participants: [
      {
        personId: scenePersonId,
        role: "agency:briefing-lead",
        detail: "Prepared the constituent-service briefing",
      },
      {
        personId: playerPersonId,
        role: "presence:participant",
        detail: "Reviewed the briefing in person",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["relationship.shared-work", "simulation.fixture", "run-a.office"],
    summary: `${personName(scenePerson)} and ${personName(
      playerPerson,
    )} reviewed constituent-service notes before the afternoon briefing.`,
    context: {
      location: {
        jurisdictionId,
        label: "Shared legislative office",
        setting: "Synthetic Run A office fixture",
      },
      socialContext: "A quiet working session between office colleagues.",
      pressure: "Several constituent requests need a clear response.",
      choice: "Review the strongest points before the afternoon briefing.",
      motivation: "Keep the office response useful and grounded.",
      immediateReaction: "The notes were narrowed to three practical points.",
    },
  });

  const officeEvent = world.history.events.at(-1);
  if (!officeEvent) {
    throw new Error("Run A fixture did not record its office event.");
  }

  world = recordRelationshipInteraction(world, {
    stableKey: "run-a:office:working-rapport",
    personIds: [scenePersonId, playerPersonId],
    eventId: officeEvent.id,
    occurredAt: world.currentDate,
    kind: "work:briefing",
    change: "maintained",
    significance: "meaningful",
    summary: `${personName(scenePerson)} gave ${personName(
      playerPerson,
    )} a concise, candid read of the morning's constituent requests.`,
    tags: ["relationship.shared-work", "run-a.office"],
  });

  const hiddenBelief = world.history.privateBeliefs.find(
    (belief) => belief.personId === scenePersonId,
  );
  if (hiddenBelief?.rationale !== RUN_A_HIDDEN_CANONICAL_TEXT) {
    throw new Error("Run A fixture is missing its deliberately hidden fact.");
  }

  return {
    world,
    playerPersonId,
    scenePerson: {
      personId: scenePersonId,
      title: "Senior legislative aide",
      role: "Constituent services and policy briefing",
      qualitativeRead: "Established working rapport",
      inferredRead:
        "Direct and prepared. You have a useful working impression, though you may not know exactly where he stands.",
    },
    officeEventId: officeEvent.id,
    locationDisplayName: RUN_A_LEXINGTON_DISPLAY_NAMES.full,
    locationLabel: `${RUN_A_LEXINGTON_DISPLAY_NAMES.compact} · Legislative Office`,
    locationDetail: "Synthetic placeholder office fixture",
    presentationTime: "9:10 AM",
  };
}

export function parseRunAFixtureState(
  value: string | null | undefined,
): RunAFixtureStateName {
  return RUN_A_FIXTURE_STATE_NAMES.includes(value as RunAFixtureStateName)
    ? (value as RunAFixtureStateName)
    : "normal";
}
