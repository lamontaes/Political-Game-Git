import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createStableId,
  SeededRng,
  drawCanonicalName,
  makeIsoDate,
  personName,
  recordWorldEvent,
} from "../simulation";
import type {
  EntityId,
  World,
  CharacterHistoryTransition,
} from "../simulation";

/** Institutional facts are sourced; people and initial tenures are fictional. */
export const OPENING_OFFICE_SOURCES = {
  constitution:
    "https://www.archives.gov/founding-docs/constitution-transcript",
  amendments: "https://www.archives.gov/founding-docs/amendments-11-27",
} as const;
const VERSION = "opening-officeholders-v1";
const OFFICES = [
  {
    key: "us-president",
    title: "President of the United States",
    organization: "Presidency of the United States",
    years: 4,
    monthDay: "01-20",
    anchor: 2025,
  },
  {
    key: "us-chief-justice",
    title: "Chief Justice of the United States",
    organization: "Supreme Court of the United States",
    years: null,
    monthDay: "01-01",
    anchor: 2025,
  },
] as const;

/** No election result, preference, influence, or eligibility is inferred here. */
export function establishOpeningOfficeholders(
  world: World,
  playerPersonId: EntityId,
): World {
  const player = world.people[playerPersonId];
  if (!player) throw new Error("Opening requires an existing player.");
  let next = world;
  for (const office of OFFICES) {
    const key = `${VERSION}:${office.key}`;
    // Initialization is one-time. Expired tenures stay history, never reroll on reads.
    if (
      next.history.events.some((event) =>
        event.stableKey.startsWith(`${key}:term:`),
      )
    )
      continue;
    const year = Number(world.currentDate.slice(0, 4));
    let startYear =
      office.years === null
        ? year
        : office.anchor +
          Math.floor((year - office.anchor) / office.years) * office.years;
    if (`${startYear}-${office.monthDay}` > world.currentDate)
      startYear -= office.years ?? 1;
    const startedAt = makeIsoDate(`${startYear}-${office.monthDay}`);
    const termKey = `${key}:term:${startedAt}`;
    const personKey = `${termKey}:holder`;
    const personId = characterHistoryContextPersonId(world, personKey);
    const rng = new SeededRng(world.seed).fork(personKey);
    const provenance = { kind: "generated" as const, generatorKey: VERSION };
    const transitions: CharacterHistoryTransition[] = [
      {
        kind: "context-person",
        input: {
          stableKey: personKey,
          ...drawCanonicalName(rng),
          birthDate: makeIsoDate(`${startYear - rng.integer(45, 70)}-01-01`),
          homeJurisdictionId: player.homeJurisdictionId,
        },
      },
      {
        kind: "organization",
        input: {
          stableKey: key,
          formedAt: startedAt,
          provenance,
          initialProfile: {
            name: office.organization,
            classification: "sector:government",
            locationJurisdictionId: null,
          },
        },
      },
    ];
    next = applyCharacterHistoryPlan(next, {
      stableKey: termKey,
      mode: "quick-generated",
      personId: playerPersonId,
      transitions,
    }).world;
    next = recordWorldEvent(next, {
      stableKey: termKey,
      type: "world.office-tenure",
      occurredAt: startedAt,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [personId, organizationIdFor(world.id, key)],
      participants: [{ personId, role: "focus:subject", detail: office.title }],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        VERSION,
        `office:${office.key}`,
        "provenance:fictional-initial-tenure",
      ],
      summary: `${personName(next.people[personId]!)} holds the office of ${office.title} in this fictional world.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  return next;
}

/** A past term is not a present officeholder. Judicial tenure has no fixed end. */
export function openingOfficeholders(world: World) {
  return OFFICES.flatMap((office) =>
    world.history.events.flatMap((term) => {
      if (
        term.type !== "world.office-tenure" ||
        !term.tags.includes(`office:${office.key}`) ||
        term.occurredAt > world.currentDate
      )
        return [];
      const personId = term.participants.find(
        (participant) => participant.role === "focus:subject",
      )?.personId;
      if (!personId || !world.people[personId]) return [];
      const endExclusive =
        office.years === null
          ? null
          : makeIsoDate(
              `${Number(term.occurredAt.slice(0, 4)) + office.years}-${office.monthDay}`,
            );
      if (endExclusive !== null && world.currentDate >= endExclusive) return [];
      if (
        world.history.personDeaths.some(
          (death) =>
            death.personId === personId && death.diedAt <= world.currentDate,
        )
      )
        return [];
      return [
        {
          officeKey: office.key,
          title: office.title,
          personId,
          personName: personName(world.people[personId]!),
          termId: term.id,
          organizationId: organizationIdFor(
            world.id,
            `${VERSION}:${office.key}`,
          ),
          startedAt: term.occurredAt,
          endExclusive,
          identityProvenance: "fictional-simulation" as const,
          sources: Object.values(OPENING_OFFICE_SOURCES),
        },
      ];
    }),
  );
}

function organizationIdFor(worldId: EntityId, stableKey: string): EntityId {
  return createStableId("organization", `${worldId}:${stableKey}`);
}
