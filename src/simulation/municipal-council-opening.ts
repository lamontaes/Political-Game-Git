import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "./character-history";
import type { CharacterHistoryContextPersonInput } from "./character-history";
import { makeIsoDate } from "./dates";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "./government-units";
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
} from "./local-ordinance-game-profile";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "./municipal-government";
import {
  installMunicipalGovernment,
  municipalGovernmentJurisdictionId,
  municipalOrganizationFor,
  municipalSeats,
  seatMunicipalMember,
} from "./municipal-public-work";
import {
  drawCanonicalNameForGender,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
} from "./people";
import { generatePersonIdentity } from "./person-identity";
import { SeededRng } from "./rng";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";

export const MUNICIPAL_COUNCIL_OPENING_VERSION =
  "municipal-council-opening/v1" as const;

function openingKey(governmentKey: string) {
  return `${MUNICIPAL_COUNCIL_OPENING_VERSION}:${governmentKey}`;
}

function memberKey(governmentKey: string, ordinal: number) {
  return `${openingKey(governmentKey)}:seat:${ordinal}:member`;
}

function managerKey(governmentKey: string) {
  return `${openingKey(governmentKey)}:professional-manager`;
}

/** Open only a matched county board on the county organization's own identity. */
export function ensureCountyCouncilOpening(
  world: World,
  governmentKey: string,
): World {
  const unit = governmentUnit(governmentKey);
  if (unit?.unitType !== "county") return world;
  const packId = `${unit.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
  const scope = localFiscalGameAuthorityForRulePackId(packId);
  const canonical = world.history.organizations.find(
    (organization) => organization.stableKey === `local-government:${unit.id}`,
  );
  if (
    !scope ||
    scope.unit.id !== unit.id ||
    scope.jurisdictionId !== governmentUnitJurisdictionId(unit) ||
    !canonical ||
    municipalOrganizationFor(world, unit.id)?.id !== canonical.id ||
    municipalGovernmentJurisdictionId(world, unit.id) !== scope.jurisdictionId
  )
    return world;
  return ensureMunicipalCouncilOpening(world, unit.id);
}

/**
 * A current fictional world begins with people in its home council's seats.
 * The compiled body size supplies the count, while names, ages and numbered
 * labels are explicitly generated game facts. An old or already populated
 * council is left exactly as it was.
 */
export function ensureMunicipalCouncilOpening(
  world: World,
  governmentKey: string,
): World {
  if (
    world.history.events.some(
      (event) => event.stableKey === openingKey(governmentKey),
    )
  )
    return world;
  // The District's council has its own sourced ward and at-large opening.
  if (governmentKey === "us-dc-washington") return world;
  const government = municipalGovernmentByKey(governmentKey);
  if (!government) return world;
  const unit = governmentUnit(governmentKey);
  const countyBoard = unit?.unitType === "county";
  const reading = primaryReading(government);
  const size = reading.bodySize;
  if (size === null || !Number.isSafeInteger(size) || size <= 0) return world;
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    governmentKey,
  );
  if (!jurisdictionId || !world.jurisdictions[jurisdictionId]) return world;
  const scope = unit
    ? localFiscalGameAuthorityForRulePackId(
        `${unit.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`,
      )
    : null;
  const gameProfileManager =
    reading.evidence === "game-profile" &&
    unit?.functionalActive === true &&
    (unit.unitType === "municipality" || unit.unitType === "county") &&
    government.key === unit.id &&
    scope?.unit.id === unit.id &&
    scope.jurisdictionId === jurisdictionId;

  let next = installMunicipalGovernment(world, {
    governmentKey,
    jurisdictionId,
    formedAt: world.currentDate,
  });
  if (
    municipalSeats(next, governmentKey).some(
      (seat) => seat.role === "member" || seat.role === "presiding-member",
    )
  )
    return next;

  const rng = new SeededRng(next.seed).fork(openingKey(governmentKey));
  const year = Number(next.currentDate.slice(0, 4));
  const pad = (value: number) => String(value).padStart(2, "0");
  const members: CharacterHistoryContextPersonInput[] = [];
  for (let ordinal = 1; ordinal <= size; ordinal += 1) {
    const seatRng = rng.fork(`seat:${ordinal}`);
    const age = seatRng.integer(25, 81);
    const identity = generatePersonIdentity(seatRng.fork("identity"));
    const name = drawCanonicalNameForGender(
      seatRng.fork("name"),
      identity.gender,
      undefined,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
    );
    members.push({
      stableKey: memberKey(governmentKey, ordinal),
      ...name,
      identity,
      birthDate: makeIsoDate(
        `${year - age - 1}-${pad(seatRng.integer(1, 13))}-${pad(seatRng.integer(1, 29))}`,
      ),
      homeJurisdictionId: jurisdictionId,
    });
  }
  // This fictional procedure has no sourced executive. Seat one distinct
  // game-profile manager to administer adopted money without changing the
  // council's compiled member count or asserting a real local officeholder.
  let manager: CharacterHistoryContextPersonInput | null = null;
  if (gameProfileManager) {
    const managerRng = rng.fork("manager");
    const age = managerRng.integer(25, 81);
    const identity = generatePersonIdentity(managerRng.fork("identity"));
    const name = drawCanonicalNameForGender(
      managerRng.fork("name"),
      identity.gender,
      undefined,
      DISTINCT_GIVEN_NAME_GENERATION_VERSION,
    );
    manager = {
      stableKey: managerKey(governmentKey),
      ...name,
      identity,
      birthDate: makeIsoDate(
        `${year - age - 1}-${pad(managerRng.integer(1, 13))}-${pad(managerRng.integer(1, 29))}`,
      ),
      homeJurisdictionId: jurisdictionId,
    };
  }
  next = createCharacterHistoryContextPeople(
    next,
    manager ? [...members, manager] : members,
  );
  const seatedIds: EntityId[] = members.map((_, index) =>
    characterHistoryContextPersonId(next, memberKey(governmentKey, index + 1)),
  );
  const managerPersonId = manager
    ? characterHistoryContextPersonId(next, manager.stableKey)
    : null;
  next = recordWorldEvent(next, {
    stableKey: openingKey(governmentKey),
    type: "world.municipal-council-opening",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: [
      ...seatedIds,
      ...(managerPersonId ? [managerPersonId] : []),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      MUNICIPAL_COUNCIL_OPENING_VERSION,
      `seated:${size}`,
      ...(managerPersonId ? ["manager:game-profile"] : []),
    ],
    summary: `${reading.bodyName ?? reading.displayName} begins this fictional world with ${size} generated ${countyBoard ? "board members" : "councilors"}, using its ${managerPersonId ? "game-profile" : "compiled"} seat count; their identities and numbered labels are game facts.${managerPersonId ? " A distinct fictional professional manager administers the game-profile program." : ""}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.find(
    (event) => event.stableKey === openingKey(governmentKey),
  )?.id;
  if (!eventId) throw new Error("Municipal council opening event is missing.");
  for (const [index, personId] of seatedIds.entries()) {
    next = seatMunicipalMember(next, {
      governmentKey,
      personId,
      startedAt: next.currentDate,
      role: "member",
      seatLabel: `Game seat ${index + 1}`,
      provenance: { kind: "simulated-event", eventId },
    });
  }
  if (managerPersonId)
    next = seatMunicipalMember(next, {
      governmentKey,
      personId: managerPersonId,
      startedAt: next.currentDate,
      role: "professional-manager",
      seatLabel: "Professional manager (game profile)",
      provenance: { kind: "simulated-event", eventId },
    });
  return next;
}
