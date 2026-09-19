import { type EntityId, type IsoDate, type World } from "../simulation";
import { projectOpeningLife } from "./opening-life";
import { projectWorldOrientation } from "./living-world-orientation";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { projectPersonDossier } from "./person-dossier";
import { openingLifeLocation } from "./life-scene-flow";

export interface OpeningWorldBeat {
  readonly key:
    "white-house" | "congress" | "state" | "district" | "local" | "your-life";
  readonly asOf: IsoDate;
  readonly jurisdictionId: EntityId | null;
  readonly entityIds: readonly EntityId[];
  readonly facts: readonly string[];
  readonly sceneRequest:
    "white-house-exterior" | "congress" | "government" | "home" | null;
}

/** The world is already prepared at Begin. Every navigation step is a pure read. */
export function projectOpeningWorldSnapshot(world: World, personId: EntityId) {
  const life = projectOpeningLife(world, personId);
  const orientation = projectWorldOrientation(world, personId);
  const officials = currentPublicOfficeholders(world);
  const president =
    officials.find((item) => item.officeKey === "us-president") ?? null;
  const vicePresident =
    officials.find((item) => item.officeKey === "us-vice-president") ?? null;
  const district = orientation.homeState?.stateUsps === "DC";
  const executiveIds = [president, vicePresident].flatMap((item) =>
    item ? [item.personId] : [],
  );
  const localIds =
    orientation.locality?.governments.flatMap((item) =>
      item.organizationId ? [item.organizationId] : [],
    ) ?? [];
  const beats: OpeningWorldBeat[] = [
    {
      key: "white-house",
      asOf: world.currentDate,
      jurisdictionId: null,
      entityIds: executiveIds,
      facts: [president, vicePresident].flatMap((item) =>
        item ? [`${item.personName} — ${item.title}`] : [],
      ),
      sceneRequest: "white-house-exterior",
    },
    {
      key: "congress",
      asOf: world.currentDate,
      jurisdictionId: null,
      entityIds: [],
      facts: [],
      sceneRequest: "congress",
    },
    {
      key: district ? "district" : "state",
      asOf: world.currentDate,
      jurisdictionId: orientation.homeState?.jurisdictionId ?? null,
      entityIds: district
        ? localIds
        : orientation.homeState?.governor
          ? [orientation.homeState.governor.personId]
          : [],
      facts: orientation.homeState?.governor
        ? [
            `${orientation.homeState.governor.personName} — ${orientation.homeState.governor.title}`,
          ]
        : [],
      sceneRequest: "government",
    },
    ...(!district
      ? [
          {
            key: "local" as const,
            asOf: world.currentDate,
            jurisdictionId: orientation.locality?.jurisdictionId ?? null,
            entityIds: localIds,
            facts:
              orientation.locality?.governments.map((item) => item.name) ?? [],
            sceneRequest: null,
          },
        ]
      : []),
    {
      key: "your-life",
      asOf: world.currentDate,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      entityIds: [
        personId,
        ...life.household.household.map((item) => item.personId),
      ],
      facts: [
        ...life.household.sentences,
        ...life.household.grounding.map((item) => item.text),
      ],
      sceneRequest: "home",
    },
  ];
  return {
    asOf: world.currentDate,
    revision: world.history.nextSequence,
    beats,
    president,
    vicePresident,
    orientation,
    life,
    people: executiveIds.map((id) =>
      projectPersonDossier(world, personId, id)!,
    ),
    startingLocation: openingLifeLocation(world, personId),
  };
}
