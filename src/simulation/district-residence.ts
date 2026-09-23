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
  bindingFromIdentity,
  districtMembershipFromCanonicalHome,
  districtsCrossingPlace,
  gazetteerChamberForOfficeChamberKey,
  resolveDistrictBinding,
} from "../districts/query";
import type { DistrictChamber, DistrictIdentity } from "../districts/types";
import type { ElectiveOfficeOption } from "./candidacy-packs";
import { makeIsoDate } from "./dates";
import { homeJurisdictionResidenceSince } from "./nationwide-world/residence-duration";
import { createStableId } from "./ids";
import { SeededRng } from "./rng";
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
    "split-home-assignment",
  ]);

/**
 * Methods whose interval says WHICH district a home is in but whose own start
 * is the day the record was written, not the day the life came to live there.
 * Their start is read through the household records (`householdCorrectedStart`).
 */
const HOME_PLACEMENT_METHODS = new Set<DistrictResidenceProvenanceMethod>([
  "canonical-home-join",
  "split-home-assignment",
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
  const earliest = covering[0];
  if (!earliest) return null;
  // A seat bound to the district the world joined this home to is the same
  // membership `recordedDistrictResidenceSince` reads, so it gets the same
  // household correction. Without it, choosing your own district on the
  // candidacy screen dated your residence from the game's first day, and a
  // lifelong Kotzebue resident failed a one-year rule (playtest, 2026-09-22).
  return HOME_PLACEMENT_METHODS.has(earliest.provenance.method)
    ? householdCorrectedStart(world, personId, earliest.startedOn, onDate)
    : earliest.startedOn;
}

/**
 * Start of a proved membership in whichever district of `chamber` this person
 * actually lives in, when no seat has been bound yet.
 *
 * Before a candidacy is filed there is no bound seat to ask about, but the
 * world has already written where this person lives: `syncDistrictMembershipFromCanonicalHome`
 * records a whole-place join at world creation. Reading that interval is the
 * difference between "the game has not recorded when this character came to
 * live here" and the truth, which is that it recorded it on day one.
 *
 * It stays as strict as `districtResidenceSince` about what counts. Seat
 * intent, self-certification and unknown provenance are still not membership,
 * and a place the join could not resolve — a city split across districts —
 * still answers null rather than guessing which district its resident is in.
 */
export function recordedDistrictResidenceSince(
  world: World,
  personId: EntityId,
  chamber: DistrictChamber,
  onDate: IsoDate,
): IsoDate | null {
  const membership = recordedDistrictMembership(
    world,
    personId,
    chamber,
    onDate,
  );
  if (membership === null) return null;
  /*
   * The interval says WHICH district; the household records say SINCE WHEN.
   *
   * The join is written once, at world creation, so its `startedOn` is the day
   * the world was written rather than the day this life came to live there. A
   * forty-year-old who has never moved was therefore resident in their state
   * since childhood and in their own house district for no time at all, and a
   * residence requirement measured against that refused a lifelong resident.
   * Absence read as a confident zero, which is the unknown-is-not-zero rule
   * crossed from the other side.
   *
   * Answering it here rather than at the join is deliberate, and it is the
   * second attempt: writing the corrected date INTO the interval changed the
   * recorded bytes, and a replay descriptor is a promise that replaying it
   * rebuilds the same world — `world46-opening` holds the game to that hash by
   * hash, and it caught the change. Reading it instead records nothing new, so
   * old saves keep their bytes AND get the corrected answer, which a
   * write-time repair could never reach.
   *
   * Where the two disagree the household record wins, because it is the only
   * one of them that is evidence of when somebody came to live somewhere; the
   * interval's own start is evidence of when the join was written. The
   * interval remains the answer whenever the household records say nothing.
   * What this dates is residence in the TERRITORY: district lines stay the
   * catalog's vintage, and nothing here claims where a boundary ran in an
   * earlier year.
   */
  return householdCorrectedStart(world, personId, membership.startedOn, onDate);
}

/**
 * A home-join interval's start, corrected from the household records as
 * explained above: the earlier of the interval's own start and the day the
 * records show this life came to live in its current home place.
 */
function householdCorrectedStart(
  world: World,
  personId: EntityId,
  startedOn: IsoDate,
  onDate: IsoDate,
): IsoDate {
  const person = world.people[personId];
  if (!person) return startedOn;
  const livedHereSince = homeJurisdictionResidenceSince(
    world,
    personId,
    person.homeJurisdictionId,
    onDate,
  );
  if (livedHereSince === null) return startedOn;
  return livedHereSince < startedOn ? livedHereSince : startedOn;
}

/**
 * The recorded membership itself, for a screen that has to say WHICH district
 * a filing would be for. A seat is filed against a Gazetteer identity, so the
 * interval's own binding is the only honest candidate to offer; everything
 * else on the list is a district this person has not been recorded in.
 */
export function recordedDistrictMembership(
  world: World,
  personId: EntityId,
  chamber: DistrictChamber,
  onDate: IsoDate,
): DistrictResidenceInterval | null {
  return (
    districtResidenceIntervals(world)
      .filter(
        (interval) =>
          isSupportedDistrictMembership(interval) &&
          interval.personId === personId &&
          interval.binding.chamber === chamber &&
          interval.startedOn <= onDate &&
          (interval.endedOn === null || interval.endedOn > onDate),
      )
      .sort((left, right) =>
        left.startedOn.localeCompare(right.startedOn),
      )[0] ?? null
  );
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
  if (input.provenance.method === "split-home-assignment") {
    const confirmed = confirmSplitHomeAssignment(
      world,
      input.personId,
      binding,
      input.provenance.sourceEventId,
    );
    if (confirmed.kind === "refused") {
      return { kind: "refused", reason: confirmed.reason, world };
    }
  }
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

/**
 * What the world knows about which district of `chamber` a person's home lies
 * in, for a screen or a rule that has to explain why it will not decide.
 *
 * A city split across several districts is not the same thing as a life whose
 * homes were never recorded. Both leave the duration unknown, but only the
 * second is the game failing to remember; the first is the join honestly
 * declining to pick one of several districts a resident might be in.
 */
export type CanonicalHomeDistrictKnowledge = "known" | "split" | "unknown";

export function canonicalHomeDistrictKnowledge(
  world: World,
  personId: EntityId,
  chamber: DistrictChamber,
): CanonicalHomeDistrictKnowledge {
  const person = world.people[personId];
  if (!person) return "unknown";
  const join = districtMembershipFromCanonicalHome({
    homeJurisdictionId: person.homeJurisdictionId,
    catalog: districtIdentityCatalog(),
    placeGeoid: canonicalHomePlaceGeoid(world, personId),
    chamber,
  });
  if (join.kind === "known") return "known";
  return join.kind === "conflicting" ? "split" : "unknown";
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
 *
 * The interval starts when this life actually came to live in the place, read
 * from the same household records the state-residence clock reads — not from
 * the day the residence fact happened to be written. A life the world records
 * in one town since 1985 was in that town's district since 1985 too; starting
 * the interval today would have the game assert a duration of zero against
 * records that say otherwise, which is the state clock and the district clock
 * disagreeing about one home.
 *
 * What that dates is residence in the territory. The district lines are the
 * catalog's own vintage, named in the interval's note, and this claims nothing
 * about where a boundary ran in an earlier year.
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
  const startedOn = residence.occurredAt;
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
      const staleSplitPlacement =
        open?.provenance.method === "split-home-assignment" &&
        !splitHomeDistricts(next, personId, chamber).some(
          (identity) => identity.recordId === open.binding.recordId,
        );
      if (
        open &&
        (open.provenance.method === "canonical-home-join" ||
          staleSplitPlacement)
      ) {
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
      startedOn,
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

/**
 * The districts of `chamber` that cross this person's recorded home place,
 * when that place is split. Empty when the home is wholly inside one district,
 * is not a Census place, or the chamber has no relationship file.
 */
export function splitHomeDistricts(
  world: World,
  personId: EntityId,
  chamber: DistrictChamber,
): readonly DistrictIdentity[] {
  if (chamber === "congressional") return [];
  return districtsCrossingPlace(
    districtIdentityCatalog(),
    canonicalHomePlaceGeoid(world, personId),
    chamber,
  );
}

function currentResidenceFactId(
  world: World,
  personId: EntityId,
): EntityId | null {
  const person = world.people[personId];
  if (!person) return null;
  return (
    factsForPerson(person).find(
      (fact) => fact.kind === "residence" && fact.endedAt === null,
    )?.id ?? null
  );
}

function confirmSplitHomeAssignment(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
  sourceEventId: EntityId | null,
):
  | { readonly kind: "confirmed" }
  | { readonly kind: "refused"; readonly reason: string } {
  if (
    sourceEventId === null ||
    sourceEventId !== currentResidenceFactId(world, personId)
  ) {
    return {
      kind: "refused",
      reason:
        "Placing a home in one district of a split town needs the current residence fact.",
    };
  }
  const crossing = splitHomeDistricts(world, personId, binding.chamber);
  if (!crossing.some((identity) => identity.recordId === binding.recordId)) {
    return {
      kind: "refused",
      reason: "That district does not cross this character's town.",
    };
  }
  return { kind: "confirmed" };
}

/**
 * Place a split town's resident in one of the districts crossing their town,
 * for each chamber where the world has no membership for them yet.
 *
 * GAME PROFILE placeholder: a split town's resident is assigned one
 * overlapping district by seed until research says how.
 *
 * The published join says only that the town crosses several districts; it
 * cannot say which one a given home is in, and without an answer a lifelong
 * Anchorage resident could never stand for the legislature. The pick is drawn
 * from the world seed among the districts that cross the town — never a
 * district elsewhere in the state — and written through
 * `establishDistrictResidence`, the one district-residence writer. The player
 * can say their home is in a different one of those districts
 * (`chooseSplitHomeDistrict`). A home the join already places, and a chamber
 * that already has an open interval, are left as they are.
 *
 * Called only for an opening of the current version: a legacy replay
 * descriptor rebuilds its exact bytes, and a save from before this existed is
 * not backfilled on load.
 */
export function assignSplitHomeDistricts(
  world: World,
  personId: EntityId,
): World {
  const residenceId = currentResidenceFactId(world, personId);
  const person = world.people[personId];
  if (!person || residenceId === null) return world;
  const residence = factsForPerson(person).find(
    (fact) => fact.id === residenceId,
  )!;
  let next = world;
  for (const chamber of HOME_JOIN_CHAMBERS) {
    const crossing = splitHomeDistricts(next, personId, chamber);
    if (crossing.length === 0) continue;
    const open = districtResidenceIntervals(next).some(
      (interval) =>
        interval.personId === personId &&
        interval.binding.chamber === chamber &&
        interval.endedOn === null,
    );
    if (open) continue;
    const pick = new SeededRng(
      JSON.stringify(["split-home-district-v1", next.seed, personId, chamber]),
    ).pick(crossing);
    const recorded = establishDistrictResidence(next, {
      personId,
      binding: bindingFromIdentity(pick),
      startedOn: residence.occurredAt,
      provenance: {
        method: "split-home-assignment",
        sourceEventId: residence.id,
        note: `Placed by seed among the ${crossing.length} districts crossing Census place ${canonicalHomePlaceGeoid(next, personId)} (${SLD_PLACE_RELATION_VINTAGE}).`,
      },
    });
    if (recorded.kind === "recorded") next = recorded.world;
  }
  return next;
}

/**
 * The player says which of the districts crossing their split town their home
 * is in. Written through `establishDistrictResidence` from today; the
 * residence clock still reads the household records, so saying where in town
 * you have always lived is not a move and does not restart the clock.
 */
export function chooseSplitHomeDistrict(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
): DistrictResidenceWriteResult {
  const residenceId = currentResidenceFactId(world, personId);
  const open = districtResidenceIntervals(world).find(
    (interval) =>
      interval.personId === personId &&
      interval.binding.chamber === binding.chamber &&
      interval.endedOn === null,
  );
  if (open && open.binding.recordId === binding.recordId) {
    return { kind: "recorded", world, interval: open };
  }
  return establishDistrictResidence(world, {
    personId,
    binding,
    startedOn: world.currentDate,
    provenance: {
      method: "split-home-assignment",
      sourceEventId: residenceId,
      note: "Chosen by the player among the districts crossing their town.",
    },
  });
}
