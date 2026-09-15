import {
  ageOnDate,
  factsForPerson,
  lifePlaceByJurisdictionId,
  personName,
} from "../simulation";
import type { EntityId, Jurisdiction, World } from "../simulation";
import type { RunAFixture, RunAScenePersonContext } from "./run-a-fixture";

/**
 * What a person would call the place, on the dossier a player reads.
 *
 * This used to run every birthplace and residence through the Run-A fixture's
 * display-name helper, which recognised exactly one place by literal: a
 * character born in Lexington was shown "Lexington, Kentucky", and a character
 * born anywhere else was shown whatever filing name the jurisdiction record
 * happened to carry. One development run's convenience was deciding how the
 * game named every place.
 *
 * The place catalog already holds this. Every playable place — the four named
 * ones and every row of the national corpus — carries the resident-facing
 * `displayName` beside the formal filing name, so the answer is looked up
 * rather than special-cased.
 *
 * A jurisdiction the catalog does not list still has its own recorded name,
 * and that is what it keeps. An unlisted place is not an unknown one.
 */
function placeDisplayName(jurisdiction: Jurisdiction): string {
  return (
    lifePlaceByJurisdictionId(jurisdiction.id)?.displayName ?? jurisdiction.name
  );
}

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
  readonly homePlace: PlayerVisibleFact;
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
        value: "No current public position is known.",
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

function projectHomePlace(world: World, personId: EntityId): PlayerVisibleFact {
  const person = requireScenePerson(world, personId);
  const facts = factsForPerson(person);
  const birthplace = facts.find(
    (fact) => fact.kind === "birthplace" && fact.jurisdictionId,
  );
  const birthplaceJurisdiction = birthplace?.jurisdictionId
    ? world.jurisdictions[birthplace.jurisdictionId]
    : undefined;

  if (birthplaceJurisdiction) {
    return {
      id: "birthplace",
      label: "Birthplace",
      value: placeDisplayName(birthplaceJurisdiction),
      access: "institutionally-accessible",
    };
  }

  const residence = [...facts]
    .reverse()
    .find(
      (fact) =>
        fact.kind === "residence" &&
        fact.endedAt === null &&
        fact.jurisdictionId,
    );
  const residenceJurisdiction = residence?.jurisdictionId
    ? world.jurisdictions[residence.jurisdictionId]
    : undefined;

  if (residenceJurisdiction) {
    return {
      id: "residence",
      label: "Residence",
      value: placeDisplayName(residenceJurisdiction),
      access: "institutionally-accessible",
    };
  }

  return {
    id: "hometown",
    label: "Hometown",
    value: "Not known",
    access: "unknown",
  };
}

export function projectRunADossier(
  world: World,
  playerPersonId: EntityId,
  sceneContext: RunAScenePersonContext,
): QuickDossierProjection {
  const person = requireScenePerson(world, sceneContext.personId);

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
    homePlace: projectHomePlace(world, person.id),
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
        value:
          sceneContext.workingHabit ??
          "Organizes constituent-service notes before briefings.",
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
      value: "You're not sure what he wants from this afternoon's briefing.",
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
