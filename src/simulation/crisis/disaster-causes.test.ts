import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { daysBetween } from "../dates";
import { stableHash } from "../ids";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { lifePlaceStateIdentities } from "../life-places";
import { createDwelling, startDwellingOccupancy } from "../resources";
import type { EntityId, ResidenceRole, World } from "../types";
import { withWorldIntegrityDeferred } from "../world";
import {
  declareHazardEpisode,
  homeDamageDegree,
  PROVISIONAL_DISASTER_POLICY,
} from "./disaster";
import { crisisRecords } from "./records";
import type {
  DisasterAssessmentRecord,
  DisasterDamageRecord,
  HazardMagnitude,
} from "./types";

/*
 * A132, first part: a disaster's damage to a home comes from recorded causes,
 * not a per-home draw. A home's damage is the hazard's magnitude, times the
 * flood-zone law for a flood, times how readily a home of its recorded kind
 * gives way. Injuries and deaths still read the damage level as before (the
 * CTO's 4:47 p.m. ruling). The place is drawn from all 56 by the seed.
 */
const SEED = "a132-recorded-causes-1";
const STATES = lifePlaceStateIdentities();
const STATE =
  STATES[Number(BigInt(`0x${stableHash(SEED)}`) % BigInt(STATES.length))]!;
const small = smallWorld({ place: STATE.usps, people: 8, seed: SEED });
const people = Object.keys(small.world.people) as EntityId[];
const provenance = {
  kind: "authored" as const,
  note: "A132 recorded-cause test",
};

interface Home {
  readonly householdId: EntityId;
  readonly dwellingId: EntityId | null;
}

/** One household at the place, in a dwelling of the given kind, through the real writers. */
function home(
  world: World,
  key: string,
  classification: string | null,
  residents: readonly (readonly [EntityId, ResidenceRole])[],
): { world: World; home: Home } {
  let next = createHousehold(world, {
    stableKey: `${key}:household`,
    label: `Test household ${key}`,
    formedAt: world.currentDate,
    provenance,
  });
  const householdId = next.history.households.at(-1)!.id;
  next = recordHouseholdLocation(next, {
    stableKey: `${key}:location`,
    householdId,
    effectiveAt: next.currentDate,
    jurisdictionId: small.jurisdictionId,
    label: `Home of ${key}`,
    kind: "residence:community-base",
    provenance,
    supersedesLocationId: null,
  });
  for (const [personId, residenceRole] of residents)
    next = startHouseholdMembership(next, {
      stableKey: `${key}:member:${personId}`,
      personId,
      householdId,
      startedAt: next.currentDate,
      residenceRole,
      kind: "resident:member",
      provenance,
    });
  if (!classification)
    return { world: next, home: { householdId, dwellingId: null } };
  next = createDwelling(next, {
    stableKey: `${key}:dwelling`,
    establishedAt: next.currentDate,
    jurisdictionId: small.jurisdictionId,
    locationLabel: `Dwelling of ${key}`,
    classification,
    provenance,
  });
  const dwellingId = next.history.dwellings.at(-1)!.id;
  next = startDwellingOccupancy(next, {
    stableKey: `${key}:occupancy`,
    occupant: { kind: "household", householdId },
    dwellingId,
    startedAt: next.currentDate,
    residenceRole: "primary",
    kind: "residence:owner",
    provenance,
  });
  return { world: next, home: { householdId, dwellingId } };
}

/** Several households at the place, each through the real writers. */
function homes(
  specs: readonly (readonly [
    string,
    string | null,
    readonly (readonly [EntityId, ResidenceRole])[],
  ])[],
): { world: World; homes: Home[] } {
  let world = small.world;
  const made: Home[] = [];
  for (const [key, classification, residents] of specs) {
    const next = home(world, key, classification, residents);
    world = next.world;
    made.push(next.home);
  }
  return { world, homes: made };
}

function strike(
  world: World,
  magnitude: HazardMagnitude,
  family: "flood" | "severe-storm" = "severe-storm",
) {
  const next = withWorldIntegrityDeferred(() =>
    declareHazardEpisode(world, {
      stableKey: `a132-causes:${family}:${magnitude}`,
      family,
      magnitude,
      stateUsps: small.stateUsps,
      jurisdictionIds: [small.jurisdictionId],
      durationDays: 2,
      basis: "Declared test episode; not a local hazard prediction.",
      sourceReference: null,
    }),
  );
  const records = crisisRecords(next);
  const episode = records.findLast(
    (record) => record.kind === "hazard-episode",
  )!;
  const damage = new Map(
    records
      .filter(
        (record): record is DisasterDamageRecord =>
          record.kind === "disaster-damage" && record.episodeId === episode.id,
      )
      .map((record) => [record.targetId, record]),
  );
  const assessment = records.find(
    (record): record is DisasterAssessmentRecord =>
      record.kind === "disaster-assessment" && record.episodeId === episode.id,
  )!;
  return { world: next, damage, assessment };
}

/** Age in years on the world's current day. */
function ageOf(world: World, personId: EntityId): number {
  return (
    daysBetween(world.people[personId]!.birthDate, world.currentDate) / 365.25
  );
}

/** Working-age residents, whose frailty sits at its floor. */
const adults = people.filter((personId) => {
  const age = ageOf(small.world, personId);
  return age >= 20 && age <= 60;
});

describe(`disaster damage from recorded causes (${STATE.name}, ${STATE.usps}, seed ${SEED})`, () => {
  it("has working-age residents to house", () => {
    expect(adults.length).toBeGreaterThanOrEqual(3);
  });

  it("gives two identical homes identical outcomes", () => {
    const {
      world,
      homes: [first, second],
    } = homes([
      ["a", "residential:single-family", [[adults[0]!, "primary"]]],
      ["b", "residential:single-family", [[adults[1]!, "primary"]]],
    ]);
    for (const magnitude of ["moderate", "major", "catastrophic"] as const) {
      const { damage, assessment } = strike(world, magnitude);
      const a = damage.get(first.householdId);
      const b = damage.get(second.householdId);
      expect(a?.level, magnitude).toBe(b?.level);
      expect(a?.repairUnits, magnitude).toBe(b?.repairUnits);
      expect(damage.get(first.dwellingId!)?.level).toBe(a?.level);
      expect(assessment.exposed.household).toBeGreaterThanOrEqual(2);
    }
    // Run twice, the same storm writes the same record.
    expect(strike(world, "major").assessment).toEqual(
      strike(world, "major").assessment,
    );
  });

  it("spares a sturdier home more than a mobile home", () => {
    const {
      world,
      homes: [mobile, house, apartment],
    } = homes([
      ["mobile", "residential:mobile-home", [[adults[0]!, "primary"]]],
      ["house", "residential:single-family", [[adults[1]!, "primary"]]],
      ["apartment", "residential:apartment", [[adults[2]!, "primary"]]],
    ]);
    const major = strike(world, "major").damage;
    const units = (h: Home) => major.get(h.householdId)?.repairUnits ?? 0;
    expect(units(mobile)).toBeGreaterThan(units(house));
    expect(units(house)).toBeGreaterThan(units(apartment));
    const catastrophic = strike(world, "catastrophic");
    expect(catastrophic.damage.get(mobile.householdId)?.level).toBe(
      "destroyed",
    );
    expect(catastrophic.damage.get(apartment.householdId)?.level).toBe(
      "damaged",
    );
    // A minor storm damages no ordinary home on record.
    expect(
      strike(world, "minor").damage.get(house.householdId),
    ).toBeUndefined();
  });

  it("reads a home with no recorded dwelling as an ordinary house, with no roll of its own", () => {
    const {
      world,
      homes: [bare, house],
    } = homes([
      ["bare", null, [[adults[0]!, "primary"]]],
      ["house-2", "residential:single-family", [[adults[1]!, "primary"]]],
    ]);
    for (const magnitude of [
      "minor",
      "moderate",
      "major",
      "catastrophic",
    ] as const) {
      const { damage } = strike(world, magnitude);
      expect(damage.get(bare.householdId)?.level, magnitude).toBe(
        damage.get(house.householdId)?.level,
      );
      expect(damage.get(bare.householdId)?.repairUnits, magnitude).toBe(
        damage.get(house.householdId)?.repairUnits,
      );
    }
  });

  it("slides a home's damage with magnitude and kind, never past wholly lost", () => {
    const { world } = strike(small.world, "major");
    const episode = crisisRecords(world).findLast(
      (record) => record.kind === "hazard-episode",
    )!;
    if (episode.kind !== "hazard-episode") throw new Error("no episode");
    const degree = (classification: string | null) =>
      homeDamageDegree(world, episode, small.jurisdictionId, classification);
    expect(degree(null)).toBe(
      PROVISIONAL_DISASTER_POLICY.intensityByMagnitude.major,
    );
    expect(degree("residential:single-family")).toBe(degree(null));
    expect(degree("residential:mobile-home")).toBeGreaterThan(degree(null));
    expect(degree("residential:apartment")).toBeLessThan(degree(null));
    for (const kind of [null, "residential:mobile-home"])
      expect(degree(kind)).toBeLessThanOrEqual(1);
  });
});
