import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { currentLifeCutoff, kinshipRelationshipsAt } from "../life-queries";
import { personName } from "../people";
import type {
  EntityId,
  EventParticipant,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import { recordWorldEvent } from "../world";
import { publicOfficesHeldBy } from "./offices";
import { crisisRecords } from "./records";
import type { OfficeRef, OfficialContinuityRecord } from "./types";

/**
 * A public official who dies in office is buried with the town, the state or
 * the nation watching. The funeral follows the death recorded by the
 * continuity notice; family and the colleagues who served beside them attend.
 * Where the office's rule allows it, the official first lies in state.
 *
 * Nothing here decides anyone's death, office or successor: it reads the
 * continuity record and writes the ceremony that follows it.
 */
export const OFFICIAL_FUNERAL_VERSION = "official-funeral/v1" as const;
/** In the `crisis:` namespace so every clock path can settle it. */
export const OFFICIAL_FUNERAL_KEY = "crisis:official-funeral" as const;

export const OFFICIAL_FUNERAL_EVENT_TYPES = {
  layInState: "civic.official-lay-in-state",
  funeral: "civic.official-funeral",
} as const;

/**
 * Estimated timing and the most common real rule for lying in state.
 *
 * 1. Days from death to the funeral. Research: `funeral-timing` (state
 *    funerals for sitting presidents ran three to seven days).
 * 2. Where an official lies in state. Every president who died in office
 *    except Franklin Roosevelt lay in state in the U.S. Capitol Rotunda, which
 *    Congress grants by concurrent resolution; a governor who dies in office
 *    most often lies in state in the state capitol by the governor's or the
 *    legislature's order. Any other office has a funeral only. ESTIMATED FROM
 *    THE MOST COMMON RULE; the estimate uses the presidential and gubernatorial
 *    offices represented in every state and territory because the game has no
 *    more specific jurisdiction record.
 */
export const ESTIMATED_OFFICIAL_FUNERAL = {
  provenance:
    "ESTIMATED FROM AVERAGE: 5-day midpoint of the game's recorded 3-to-7-day presidential range; lying-in-state basis uses the presidential and gubernatorial offices represented across all 56 places",
  daysToFuneral: 5,
  researchQuestions: ["funeral-timing", "lying-in-state-authority"],
} as const;

function lyingInStatePlace(office: OfficeRef): string | null {
  if (office.officeKey === "us-president") return "the U.S. Capitol Rotunda";
  if (/-governor$/.test(office.officeKey)) return "the state capitol";
  return null;
}

/** Called with the continuity notice of a death in office. */
export function scheduleOfficialFuneral(
  world: World,
  personId: EntityId,
  diedAt: string,
): World {
  const dueAt = addDays(
    diedAt as World["currentDate"],
    ESTIMATED_OFFICIAL_FUNERAL.daysToFuneral,
  );
  return scheduleFutureDueItem(world, {
    stableKey: `${OFFICIAL_FUNERAL_VERSION}:${personId}`,
    dueAt: dueAt < world.currentDate ? world.currentDate : dueAt,
    transitionKey: OFFICIAL_FUNERAL_KEY,
    entityIds: [personId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [personId] },
  });
}

function continuityDeathOf(
  world: World,
  personId: EntityId,
): OfficialContinuityRecord | null {
  for (const record of crisisRecords(world))
    if (
      record.kind === "official-continuity" &&
      record.change === "death" &&
      record.personId === personId
    )
      return record;
  return null;
}

/** Living relatives the World records. */
function familyOf(world: World, personId: EntityId): EntityId[] {
  const family = new Set<EntityId>();
  const cutoff = currentLifeCutoff(world);
  for (const relationship of kinshipRelationshipsAt(world, personId))
    for (const id of relationship.personIds)
      if (id !== personId && isPersonAliveAt(world, id, cutoff)) family.add(id);
  return [...family].sort();
}

/**
 * People who hold an office beside the dead official's: the same chamber or
 * executive organization, or the other half of the national ticket.
 */
function colleaguesOf(
  world: World,
  personId: EntityId,
  offices: readonly OfficeRef[],
): EntityId[] {
  const organizations = new Set(
    offices.flatMap((office) =>
      office.organizationId ? [office.organizationId] : [],
    ),
  );
  const national = offices.some((office) =>
    ["us-president", "us-vice-president"].includes(office.officeKey),
  );
  const colleagues: EntityId[] = [];
  for (const id of Object.keys(world.people).sort() as EntityId[]) {
    if (id === personId) continue;
    const held = publicOfficesHeldBy(world, id);
    if (
      held.some(
        (office) =>
          (office.organizationId !== null &&
            organizations.has(office.organizationId)) ||
          (national &&
            ["us-president", "us-vice-president"].includes(office.officeKey)),
      )
    )
      colleagues.push(id);
  }
  return colleagues;
}

const EMPTY_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

export function officialFuneralHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== OFFICIAL_FUNERAL_KEY)
    throw new Error("The official funeral received another transition.");
  const personId = dueItem.entityIds[0]!;
  const record = continuityDeathOf(world, personId);
  const person = world.people[personId];
  if (!record || !person)
    return {
      world,
      status: "resolved",
      reasonKey: "official-funeral:no-death-in-office",
      context: null,
      outcomeEventId: null,
    };
  const name = personName(person);
  const titles = record.offices.map((office) => office.title).join(" and ");
  const family = familyOf(world, personId);
  const colleagues = colleaguesOf(world, personId, record.offices);
  const mourners: EventParticipant[] = [
    { personId, role: "focus:deceased", detail: titles },
    ...family.map((id) => ({
      personId: id,
      role: "presence:family" as const,
      detail: null,
    })),
    ...colleagues
      .filter((id) => !family.includes(id))
      .map((id) => ({
        personId: id,
        role: "presence:colleague" as const,
        detail: null,
      })),
  ];
  const key = `${OFFICIAL_FUNERAL_VERSION}:${personId}`;
  const tags = [
    "civic.ceremony",
    `policy:${OFFICIAL_FUNERAL_VERSION}`,
    ...record.offices.map((office) => `office:${office.officeKey}`),
  ];
  const involved = [
    ...new Set([
      record.sourceRecordId,
      ...mourners.map((mourner) => mourner.personId),
    ]),
  ].sort();
  let next = world;
  const place = record.offices
    .map(lyingInStatePlace)
    .find((found) => found !== null);
  if (place) {
    next = recordWorldEvent(next, {
      stableKey: `${key}:lay-in-state`,
      type: OFFICIAL_FUNERAL_EVENT_TYPES.layInState,
      occurredAt: addDays(dueItem.dueAt, -1),
      recordedAt: next.currentDate,
      jurisdictionId: person.homeJurisdictionId,
      involvedEntityIds: involved,
      participants: mourners,
      personFactConstraints: [],
      visibility: "public",
      tags: [...tags, "civic.lay-in-state"],
      summary: `${name}, ${titles}, lay in state in ${place} the day before the funeral.`,
      context: EMPTY_CONTEXT,
    });
  }
  const mourning = [
    family.length > 0
      ? `${family.length} ${family.length === 1 ? "relative" : "relatives"}`
      : null,
    colleagues.length > 0
      ? `${colleagues.length} ${colleagues.length === 1 ? "colleague" : "colleagues"} in office`
      : null,
  ].filter((part): part is string => part !== null);
  next = recordWorldEvent(next, {
    stableKey: `${key}:funeral`,
    type: OFFICIAL_FUNERAL_EVENT_TYPES.funeral,
    occurredAt: dueItem.dueAt,
    recordedAt: next.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: involved,
    participants: mourners,
    personFactConstraints: [],
    visibility: "public",
    tags: [...tags, "civic.funeral"],
    summary:
      `The funeral of ${name}, who died while serving as ${titles}, was held` +
      (mourning.length > 0 ? `; ${mourning.join(" and ")} attended.` : "."),
    context: EMPTY_CONTEXT,
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: place
      ? "official-funeral:lay-in-state"
      : "official-funeral:held",
    context: null,
    outcomeEventId: next.history.events.at(-1)!.id,
  };
}
