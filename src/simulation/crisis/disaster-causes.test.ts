import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays, daysBetween } from "../dates";
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
import { beginHealthEpisode } from "./health";
import {
  declareHazardEpisode,
  disasterHarm,
  disasterInjury,
  PROVISIONAL_DISASTER_POLICY,
} from "./disaster";
import { crisisRecords } from "./records";
import type {
  DisasterAssessmentRecord,
  DisasterDamageRecord,
  HazardMagnitude,
} from "./types";

/*
 * A132: a disaster's harm comes from recorded causes, not a per-home or
 * per-person draw. A home's damage is the hazard's magnitude times how readily
 * a home of its recorded kind gives way; a person's harm is that damage times
 * whether it was their main home and how readily they could get clear. The
 * place is drawn from all 56 by the seed.
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

/** The person laid up by a serious illness, through the real health writer. */
function bedridden(world: World, personId: EntityId): World {
  return beginHealthEpisode(world, {
    stableKey: `a132-causes:bedridden:${personId}`,
    personId,
    severity: "serious",
    initialLimitation: "incapacitated",
    origin: { kind: "authored", note: "A132 test: already laid up" },
    causalParentIds: [],
  });
}

describe(`disaster harm from recorded causes (${STATE.name}, ${STATE.usps}, seed ${SEED})`, () => {
  it("has working-age residents to house", () => {
    expect(adults.length).toBeGreaterThanOrEqual(3);
  });

  it("gives two identical homes identical outcomes", () => {
    let world = small.world;
    let first: Home;
    let second: Home;
    ({ world, home: first } = home(world, "a", "residential:single-family", [
      [adults[0]!, "primary"],
    ]));
    ({ world, home: second } = home(world, "b", "residential:single-family", [
      [adults[1]!, "primary"],
    ]));
    for (const magnitude of ["moderate", "major", "catastrophic"] as const) {
      const { damage, assessment } = strike(world, magnitude);
      const a = damage.get(first.householdId);
      const b = damage.get(second.householdId);
      expect(a?.level, magnitude).toBe(b?.level);
      expect(a?.repairUnits, magnitude).toBe(b?.repairUnits);
      expect(damage.get(first.dwellingId!)?.level).toBe(a?.level);
      expect(assessment.injuredPersonIds.includes(adults[0]!)).toBe(
        assessment.injuredPersonIds.includes(adults[1]!),
      );
    }
    // Run twice, the same storm writes the same record.
    expect(strike(world, "major").assessment).toEqual(
      strike(world, "major").assessment,
    );
  });

  it("spares a sturdier home more than a mobile home", () => {
    let world = small.world;
    let mobile: Home;
    let house: Home;
    let apartment: Home;
    ({ world, home: mobile } = home(
      world,
      "mobile",
      "residential:mobile-home",
      [[adults[0]!, "primary"]],
    ));
    ({ world, home: house } = home(
      world,
      "house",
      "residential:single-family",
      [[adults[1]!, "primary"]],
    ));
    ({ world, home: apartment } = home(
      world,
      "apartment",
      "residential:apartment",
      [[adults[2]!, "primary"]],
    ));
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
    // The person in the mobile home is hurt; the one in the apartment is not.
    expect(catastrophic.assessment.injuredPersonIds).toContain(adults[0]!);
    expect(catastrophic.assessment.injuredPersonIds).not.toContain(adults[2]!);
    // A minor storm damages no ordinary home on record.
    expect(
      strike(world, "minor").damage.get(house.householdId),
    ).toBeUndefined();
  });

  it("hurts no one in an empty home, and less someone whose main home is elsewhere", () => {
    let world = small.world;
    let empty: Home;
    ({ world, home: empty } = home(
      world,
      "empty",
      "residential:mobile-home",
      [],
    ));
    ({ world } = home(world, "lived-in", "residential:mobile-home", [
      [adults[0]!, "primary"],
    ]));
    ({ world } = home(world, "weekend", "residential:mobile-home", [
      [adults[1]!, "secondary"],
    ]));
    const { damage, assessment } = strike(world, "catastrophic");
    // The empty home is destroyed and no one in it is hurt; of the two people
    // in identical homes, the one who lives there is hurt worse.
    expect(damage.get(empty.householdId)?.level).toBe("destroyed");
    expect(assessment.injuredPersonIds).toContain(adults[0]!);
    const atHome = disasterHarm(world, adults[0]!, 1, true);
    const away = disasterHarm(world, adults[1]!, 1, false);
    expect(away).toBeLessThan(atHome * 0.51);
    expect(disasterInjury(atHome).seriousness).toBeGreaterThan(
      disasterInjury(away).seriousness,
    );
    expect(assessment.deceasedPersonIds).toEqual([]);
  });

  it("slides harm with age and injury with harm, with no step", () => {
    const person = adults[0]!;
    const birth = small.world.people[person]!.birthDate;
    const at = (days: number): World => ({
      ...small.world,
      currentDate: addDays(birth, days),
    });
    // The same person one day older is hurt nearly the same, at any age.
    for (const years of [1, 3, 40, 80, 85, 90]) {
      const day = Math.round(years * 365.25);
      const today = disasterHarm(at(day), person, 1, true);
      const tomorrow = disasterHarm(at(day + 1), person, 1, true);
      expect(Math.abs(today - tomorrow), `age ${years}`).toBeLessThan(1e-3);
    }
    // A small child and a very old person are hurt worse than an adult.
    const adult = disasterHarm(at(40 * 365), person, 1, true);
    expect(disasterHarm(at(365), person, 1, true)).toBeGreaterThan(adult);
    expect(disasterHarm(at(90 * 365), person, 1, true)).toBeGreaterThan(adult);
    // Injury seriousness and days in bed slide with harm.
    const near = disasterInjury(0.6);
    const nearer = disasterInjury(0.6001);
    expect(Math.abs(near.seriousness - nearer.seriousness)).toBeLessThan(1e-3);
    expect(disasterInjury(0.69).incapacitatedDays).toBeGreaterThan(
      disasterInjury(0.4).incapacitatedDays,
    );
  });

  it("kills only where the recorded exposure is lethal", () => {
    const policy = PROVISIONAL_DISASTER_POLICY;
    // Someone already laid up cannot get clear; a capable adult can.
    let world = bedridden(small.world, adults[0]!);
    expect(disasterHarm(world, adults[0]!, 1, true)).toBeGreaterThanOrEqual(
      policy.lethalFrom,
    );
    expect(disasterHarm(world, adults[1]!, 1, true)).toBeLessThan(
      policy.lethalFrom,
    );
    ({ world } = home(world, "family", "residential:mobile-home", [
      [adults[0]!, "primary"],
      [adults[1]!, "primary"],
    ]));
    const { world: after, assessment } = strike(world, "catastrophic");
    // Their mobile home is destroyed: the one laid up dies of injuries, the
    // other lives, hurt.
    expect(assessment.deceasedPersonIds).toEqual([adults[0]!]);
    expect(assessment.injuredPersonIds).toEqual([adults[1]!]);
    const death = after.history.personDeaths.find(
      (row) => row.personId === adults[0]!,
    )!;
    expect(death.causeKey).toBe("crisis-injury:severe-storm");
    // In a sturdier apartment the same storm takes no one.
    let sturdy = bedridden(small.world, adults[0]!);
    ({ world: sturdy } = home(sturdy, "sturdy", "residential:apartment", [
      [adults[0]!, "primary"],
    ]));
    expect(strike(sturdy, "catastrophic").assessment.deceasedPersonIds).toEqual(
      [],
    );
  });
});
