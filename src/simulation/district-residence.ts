/**
 * District residence intervals and seat intents.
 *
 * Gazetteer identities are looked up. Whole-place membership is written from a
 * published SLDL/SLDU–place join when the canonical home is a Census place
 * wholly inside one district. A selected district is a desired seat identity,
 * not that join. World stepping does not resample these records. Old saves
 * without intervals stay UNKNOWN.
 */

import { districtIdentityCatalog } from "../districts/catalog";
import { SLD_PLACE_RELATION_VINTAGE } from "../districts/place-membership";
import {
  districtMembershipFromCanonicalHome,
  gazetteerChamberForOfficeChamberKey,
  resolveDistrictBinding,
} from "../districts/query";
import type { DistrictChamber } from "../districts/types";
import type { ElectiveOfficeOption } from "./candidacy-packs";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { lifePlaceByJurisdictionId } from "./life-places";
import { factsForPerson } from "./people";
import type {
  DistrictResidenceInterval,
  DistrictResidenceProvenance,
  DistrictResidenceProvenanceMethod,
  DistrictSeatBinding,
  DistrictSeatIntent,
  EntityId,
  IsoDate,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

const HOME_JOIN_CHAMBERS: readonly DistrictChamber[] = [
  "state-lower",
  "state-upper",
];

const MEMBERSHIP_PROVENANCE_METHODS =
  new Set<DistrictResidenceProvenanceMethod>([
    "authored",
    "simulated-event",
    "canonical-home-join",
  ]);

export interface EstablishDistrictResidenceInput {
  readonly personId: EntityId;
  readonly binding: DistrictSeatBinding;
  readonly startedOn: string;
  readonly provenance: DistrictResidenceProvenance;
}

export type DistrictResidenceWriteResult =
  | {
      readonly kind: "recorded";
      readonly world: World;
      readonly interval: DistrictResidenceInterval;
    }
  | {
      readonly kind: "refused";
      readonly reason: string;
      readonly world: World;
    };

export type DistrictSeatIntentWriteResult =
  | { readonly kind: "recorded"; readonly world: World }
  | {
      readonly kind: "refused";
      readonly reason: string;
      readonly world: World;
    };

export function districtResidenceIntervals(
  world: World,
): readonly DistrictResidenceInterval[] {
  return world.history.districtResidenceIntervals ?? [];
}

export function districtSeatIntents(
  world: World,
): readonly DistrictSeatIntent[] {
  return world.history.districtSeatIntents ?? [];
}

export function desiredDistrictBinding(
  world: World,
  personId: EntityId,
): DistrictSeatBinding | null {
  return (
    districtSeatIntents(world).find((intent) => intent.personId === personId)
      ?.binding ?? null
  );
}

export function isSupportedDistrictMembership(
  interval: DistrictResidenceInterval,
): boolean {
  if (!MEMBERSHIP_PROVENANCE_METHODS.has(interval.provenance.method)) {
    return false;
  }
  if (
    interval.provenance.method === "simulated-event" &&
    interval.provenance.sourceEventId === null
  ) {
    return false;
  }
  return true;
}

export function bindOfficeToDistrict(
  option: ElectiveOfficeOption,
  binding: DistrictSeatBinding,
  expectedStateUsps: string | null,
):
  | { readonly kind: "bound"; readonly option: ElectiveOfficeOption }
  | { readonly kind: "refused"; readonly reason: string } {
  const chamberKey = option.officeKey.split(":").at(-1) ?? "";
  const expectedChamber = gazetteerChamberForOfficeChamberKey(chamberKey);
  if (expectedChamber === null) {
    return {
      kind: "refused",
      reason:
        "This office has no Gazetteer chamber mapping, so the game will not attach a district identity to it.",
    };
  }
  const resolved = resolveDistrictBinding(districtIdentityCatalog(), binding, {
    chamber: expectedChamber,
    ...(expectedStateUsps ? { stateUsps: expectedStateUsps } : {}),
  });
  if (resolved.kind === "refused") {
    return { kind: "refused", reason: resolved.reason };
  }
  return {
    kind: "bound",
    option: {
      ...option,
      office: {
        ...option.office,
        districtBinding: resolved.binding,
      },
    },
  };
}

/**
 * Start of a proved, uninterrupted membership interval. Player seat intent,
 * picker self-certification, and unknown provenance do not count.
 */
export function districtResidenceSince(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
  onDate: IsoDate,
): IsoDate | null {
  const resolved = resolveDistrictBinding(districtIdentityCatalog(), binding);
  if (resolved.kind === "refused") return null;
  const covering = districtResidenceIntervals(world)
    .filter(
      (interval) =>
        isSupportedDistrictMembership(interval) &&
        interval.personId === personId &&
        interval.binding.recordId === resolved.binding.recordId &&
        interval.binding.vintage === resolved.binding.vintage &&
        interval.binding.compilerVersion === resolved.binding.compilerVersion &&
        interval.startedOn <= onDate &&
        (interval.endedOn === null || interval.endedOn > onDate),
    )
    .sort((left, right) => left.startedOn.localeCompare(right.startedOn));
  return covering[0]?.startedOn ?? null;
}

export function selectDesiredDistrict(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
): DistrictSeatIntentWriteResult {
  const person = world.people[personId];
  if (!person) {
    return {
      kind: "refused",
      reason:
        "A district cannot be selected for somebody who is not in the world.",
      world,
    };
  }
  const resolved = resolveDistrictBinding(districtIdentityCatalog(), binding);
  if (resolved.kind === "refused") {
    return { kind: "refused", reason: resolved.reason, world };
  }
  const intent: DistrictSeatIntent = {
    personId,
    binding: resolved.binding,
    selectedOn: world.currentDate,
  };
  const nextIntents = [
    ...districtSeatIntents(world).filter(
      (existing) =>
        existing.personId !== personId ||
        existing.binding.chamber !== resolved.binding.chamber,
    ),
    intent,
  ];
  const next: World = {
    ...world,
    history: {
      ...world.history,
      districtSeatIntents: nextIntents,
    },
  };
  assertWorldIntegrity(next);
  return { kind: "recorded", world: next };
}

/**
 * Record an explicit district-residence interval. The start date must be
 * supplied by a World establishment or move. Birthplace, state residence,
 * interior points, and picker selection are not membership inputs.
 */
export function establishDistrictResidence(
  world: World,
  input: EstablishDistrictResidenceInput,
): DistrictResidenceWriteResult {
  const person = world.people[input.personId];
  if (!person) {
    return {
      kind: "refused",
      reason:
        "District residence cannot be recorded for somebody who is not in the world.",
      world,
    };
  }
  if (!MEMBERSHIP_PROVENANCE_METHODS.has(input.provenance.method)) {
    return {
      kind: "refused",
      reason:
        "Selecting a district does not establish that this character's home lies in it.",
      world,
    };
  }
  if (
    input.provenance.method === "simulated-event" &&
    input.provenance.sourceEventId === null
  ) {
    return {
      kind: "refused",
      reason:
        "A simulated district-residence event needs the canonical event that established it.",
      world,
    };
  }
  const startedOn = makeIsoDate(input.startedOn);
  if (startedOn > world.currentDate) {
    return {
      kind: "refused",
      reason: "District residence cannot start after the current world date.",
      world,
    };
  }
  const resolved = resolveDistrictBinding(
    districtIdentityCatalog(),
    input.binding,
  );
  if (resolved.kind === "refused") {
    return { kind: "refused", reason: resolved.reason, world };
  }
  const binding = resolved.binding;
  if (input.provenance.method === "canonical-home-join") {
    const confirmed = confirmCanonicalHomeJoin(
      world,
      input.personId,
      binding,
      input.provenance.sourceEventId,
    );
    if (confirmed.kind === "refused") {
      return { kind: "refused", reason: confirmed.reason, world };
    }
  }
  const openSameChamber = districtResidenceIntervals(world).filter(
    (interval) =>
      interval.personId === input.personId &&
      interval.binding.chamber === binding.chamber &&
      interval.endedOn === null,
  );
  let nextIntervals = [...districtResidenceIntervals(world)];
  for (const open of openSameChamber) {
    if (
      open.binding.recordId === binding.recordId &&
      open.binding.vintage === binding.vintage
    ) {
      return {
        kind: "refused",
        reason:
          "This character already has an open residence interval in that district.",
        world,
      };
    }
    if (startedOn < open.startedOn) {
      return {
        kind: "refused",
        reason:
          "A later district residence cannot start before the still-open interval it would replace.",
        world,
      };
    }
    nextIntervals = nextIntervals.map((interval) =>
      interval.id === open.id ? { ...interval, endedOn: startedOn } : interval,
    );
  }

  const interval: DistrictResidenceInterval = {
    id: createStableId(
      "district-residence",
      `${world.id}:district-residence:${input.personId}:${binding.recordId}:${startedOn}`,
    ),
    stableKey: `district-residence:${input.personId}:${binding.recordId}:${startedOn}`,
    sequence: world.history.nextSequence,
    personId: input.personId,
    binding,
    startedOn,
    endedOn: null,
    provenance: {
      method: input.provenance.method,
      sourceEventId: input.provenance.sourceEventId,
      note: input.provenance.note,
    },
  };
  if (
    nextIntervals.some((existing) => existing.stableKey === interval.stableKey)
  ) {
    return {
      kind: "refused",
      reason: "That district-residence interval is already recorded.",
      world,
    };
  }
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      districtResidenceIntervals: [...nextIntervals, interval],
    },
  };
  assertWorldIntegrity(next);
  return { kind: "recorded", world: next, interval };
}

function canonicalHomePlaceGeoid(
  world: World,
  personId: EntityId,
): string | null {
  const person = world.people[personId];
  if (!person) return null;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  if (!place || place.scope !== "locality" || !place.sourceGeoid) return null;
  return place.sourceGeoid;
}

function confirmCanonicalHomeJoin(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
  sourceEventId: EntityId | null,
):
  | { readonly kind: "confirmed" }
  | { readonly kind: "refused"; readonly reason: string } {
  if (sourceEventId === null) {
    return {
      kind: "refused",
      reason:
        "A canonical home join needs the residence fact that established the home. Selecting a district is not that fact.",
    };
  }
  const person = world.people[personId];
  if (!person) {
    return {
      kind: "refused",
      reason:
        "District residence cannot be recorded for somebody who is not in the world.",
    };
  }
  const fact = factsForPerson(person).find(
    (entry) => entry.id === sourceEventId,
  );
  if (!fact || fact.kind !== "residence") {
    return {
      kind: "refused",
      reason:
        "A canonical home join needs the current residence fact, not another event.",
    };
  }
  if (fact.jurisdictionId !== person.homeJurisdictionId) {
    return {
      kind: "refused",
      reason:
        "The named residence fact is not this character's current canonical home.",
    };
  }
  const join = districtMembershipFromCanonicalHome({
    homeJurisdictionId: person.homeJurisdictionId,
    catalog: districtIdentityCatalog(),
    placeGeoid: canonicalHomePlaceGeoid(world, personId),
    chamber: binding.chamber,
  });
  if (join.kind !== "known" || join.binding.recordId !== binding.recordId) {
    return {
      kind: "refused",
      reason:
        "No supported home-to-district membership join confirms this district for the recorded home.",
    };
  }
  return { kind: "confirmed" };
}

/**
 * Write or close World-established membership from the current canonical home.
 *
 * Called when a life is first placed. Old saves are not backfilled: this only
 * runs on a live world write, never on deserialize. Statewide and split homes
 * stay unknown. Authored intervals are not closed by a later unknown join.
 */
export function syncDistrictMembershipFromCanonicalHome(
  world: World,
  personId: EntityId,
): World {
  const person = world.people[personId];
  if (!person) return world;
  const residence = factsForPerson(person).find(
    (fact) => fact.kind === "residence" && fact.endedAt === null,
  );
  if (!residence) return world;
  const placeGeoid = canonicalHomePlaceGeoid(world, personId);
  let next = world;
  for (const chamber of HOME_JOIN_CHAMBERS) {
    const join = districtMembershipFromCanonicalHome({
      homeJurisdictionId: person.homeJurisdictionId,
      catalog: districtIdentityCatalog(),
      placeGeoid,
      chamber,
    });
    const open = districtResidenceIntervals(next).find(
      (interval) =>
        interval.personId === personId &&
        interval.binding.chamber === chamber &&
        interval.endedOn === null,
    );
    if (join.kind !== "known") {
      if (open?.provenance.method === "canonical-home-join") {
        next = {
          ...next,
          history: {
            ...next.history,
            districtResidenceIntervals: districtResidenceIntervals(next).map(
              (interval) =>
                interval.id === open.id
                  ? { ...interval, endedOn: next.currentDate }
                  : interval,
            ),
          },
        };
        assertWorldIntegrity(next);
      }
      continue;
    }
    if (
      open &&
      open.binding.recordId === join.binding.recordId &&
      open.binding.vintage === join.binding.vintage
    ) {
      continue;
    }
    const recorded = establishDistrictResidence(next, {
      personId,
      binding: join.binding,
      startedOn: residence.occurredAt,
      provenance: {
        method: "canonical-home-join",
        sourceEventId: residence.id,
        note: `Whole-place membership from ${SLD_PLACE_RELATION_VINTAGE} for Census place ${placeGeoid}.`,
      },
    });
    if (recorded.kind === "recorded") next = recorded.world;
  }
  return next;
}

export function bindElectiveOfficeOption(
  option: ElectiveOfficeOption,
  binding: DistrictSeatBinding,
  expectedStateUsps: string | null,
): ReturnType<typeof bindOfficeToDistrict> {
  return bindOfficeToDistrict(option, binding, expectedStateUsps);
}
