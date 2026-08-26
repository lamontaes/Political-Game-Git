import { ageOnDate, personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import type { RunAFixture, RunAScenePersonContext } from "./run-a-fixture";

export type EpistemicAccess =
  | "personally-known"
  | "institutionally-accessible"
  | "publicly-discoverable"
  | "reported"
  | "inferred-uncertain"
  | "unknown";

export interface PlayerVisibleFact {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly access: EpistemicAccess;
}

export interface QuickDossierProjection {
  readonly personId: EntityId;
  readonly name: string;
  readonly title: string;
  readonly role: string;
  readonly age: PlayerVisibleFact;
  readonly hometown: PlayerVisibleFact;
  readonly relationship: PlayerVisibleFact;
  readonly read: PlayerVisibleFact;
  readonly knownFacts: readonly PlayerVisibleFact[];
  readonly latestInteraction: PlayerVisibleFact;
  readonly unresolved: PlayerVisibleFact;
}

export const EPISTEMIC_ACCESS_LABELS: Readonly<
  Record<EpistemicAccess, string>
> = {
  "personally-known": "Known directly",
  "institutionally-accessible": "Office record",
  "publicly-discoverable": "Public",
  reported: "Reported",
  "inferred-uncertain": "Uncertain read",
  unknown: "Unknown",
};

function requireScenePerson(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) {
    throw new Error(`Run A projection cannot find person ${personId}.`);
  }
  return person;
}

function projectPublicPosition(
  world: World,
  personId: EntityId,
): PlayerVisibleFact {
  const position = [...world.history.publicPositions]
    .reverse()
    .find(
      (candidate) =>
        candidate.personId === personId && candidate.audience === "public",
    );

  return position
    ? {
        id: "public-position",
        label: "Public position",
        value: position.statement,
        access: "publicly-discoverable",
      }
    : {
        id: "public-position",
        label: "Public position",
        value: "No current statement is available.",
        access: "unknown",
      };
}

function projectLatestInteraction(
  world: World,
  scenePersonId: EntityId,
  playerPersonId: EntityId,
): PlayerVisibleFact {
  const interaction = [...world.history.relationshipInteractions]
    .reverse()
    .find(
      (candidate) =>
        candidate.personIds.includes(scenePersonId) &&
        candidate.personIds.includes(playerPersonId),
    );

  return interaction
    ? {
        id: "latest-interaction",
        label: "Latest meaningful interaction",
        value: interaction.summary,
        access: "personally-known",
      }
    : {
        id: "latest-interaction",
        label: "Latest meaningful interaction",
        value: "No meaningful interaction is known.",
        access: "unknown",
      };
}

export function projectRunADossier(
  world: World,
  playerPersonId: EntityId,
  sceneContext: RunAScenePersonContext,
): QuickDossierProjection {
  const person = requireScenePerson(world, sceneContext.personId);
  const hometown = world.jurisdictions[person.homeJurisdictionId];

  return {
    personId: person.id,
    name: personName(person),
    title: sceneContext.title,
    role: sceneContext.role,
    age: {
      id: "age",
      label: "Age",
      value: String(ageOnDate(person.birthDate, world.currentDate)),
      access: "institutionally-accessible",
    },
    hometown: {
      id: "hometown",
      label: "Hometown",
      value: hometown?.name ?? "Not known",
      access: hometown ? "institutionally-accessible" : "unknown",
    },
    relationship: {
      id: "relationship",
      label: "Relationship",
      value: sceneContext.qualitativeRead,
      access: "personally-known",
    },
    read: {
      id: "read",
      label: "Current read",
      value: sceneContext.inferredRead,
      access: "inferred-uncertain",
    },
    knownFacts: [
      {
        id: "briefing-habit",
        label: "Working habit",
        value: "Organizes constituent-service notes before briefings.",
        access: "personally-known",
      },
      {
        id: "office-role",
        label: "Office assignment",
        value: sceneContext.role,
        access: "institutionally-accessible",
      },
      projectPublicPosition(world, person.id),
    ],
    latestInteraction: projectLatestInteraction(
      world,
      person.id,
      playerPersonId,
    ),
    unresolved: {
      id: "unresolved",
      label: "Unconfirmed priority",
      value: "What he wants from the afternoon briefing is not yet known.",
      access: "unknown",
    },
  };
}

export function projectRunAFixtureDossier(
  fixture: RunAFixture,
): QuickDossierProjection {
  return projectRunADossier(
    fixture.world,
    fixture.playerPersonId,
    fixture.scenePerson,
  );
}
