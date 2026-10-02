import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { ageOnDate } from "./dates";
import { createOrganization, createWorkRelationship } from "./life";
import { lifePlaceStateIdentities } from "./life-places";
import { recordFamilyAddition } from "./people-family";
import { upbringingFor } from "./people-upbringing";
import { createWorkCompensation, money } from "./resources";
import { pickDistinct, SeededRng } from "./rng";
import type { EntityId, World } from "./types";

const SEED = "a137-opening-record-backcast";
// Sampling actual fixture places is the only draw: upbringing itself reads records.
const places = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);
const provenance = {
  kind: "authored" as const,
  note: "A137 recorded-pay fixture",
};

function opening(place: string) {
  const small = smallWorld({ place, seed: SEED, household: true });
  const personId = small.world.personOrder.find(
    (id) =>
      ageOnDate(small.world.people[id]!.birthDate, small.world.startedAt) >= 18,
  );
  if (!personId) throw new Error(`No adult in fixture ${place}, seed ${SEED}`);
  return { ...small, personId };
}

function withPay(world: World, personId: EntityId, weeklyMinor: number) {
  const home = world.people[personId]!.homeJurisdictionId;
  let next = createOrganization(world, {
    stableKey: "a137-opening-employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded employer",
      classification: "enterprise:retail",
      locationJurisdictionId: home,
    },
  });
  next = createWorkRelationship(next, {
    stableKey: "a137-opening-job",
    personId,
    organizationId: next.history.organizations.at(-1)!.id,
    startedAt: world.currentDate,
    kind: "employment:local-business",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Clerk",
      occupationClassification: "occupation:office-clerk",
      locationJurisdictionId: home,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: home,
      },
    },
  });
  return createWorkCompensation(next, {
    stableKey: "a137-opening-pay",
    workRelationshipId: next.history.workRelationships.at(-1)!.id,
    startsAt: world.currentDate,
    amount: money(weeklyMinor, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
}

describe(`A137 opening records, all 56 places, seed ${SEED}`, () => {
  it("has a measured place/cohort spread instead of one median upbringing", () => {
    const levels = new Set<string>();
    const sources = new Set<string>();
    for (const place of places) {
      const small = opening(place.jurisdictionKey);
      const u = upbringingFor(small.world, small.personId);
      expect(u.basis).toBe("game-profile");
      expect(u.caregiving).toBe("not-recorded");
      expect(u.events).toEqual([]);
      expect(u.schooling).toEqual([]);
      expect(u.firstJob).toBe("none");
      for (const row of u.money) {
        levels.add(row.level);
        sources.add(row.source.note);
        expect(row.source.note).toMatch(/^ESTIMATED FROM AVERAGE/);
        expect(row.estimatedParentIncomeRank).toBe(50);
      }
    }
    expect(sources.size).toBeGreaterThan(2);
    expect(levels.size).toBeGreaterThan(1);
  });

  it("reads actual adult job/pay, without a seed effect or a read-side write", () => {
    const small = opening(places[0]!.jurisdictionKey);
    const low = withPay(small.world, small.personId, 10000);
    const high = withPay(small.world, small.personId, 500000);
    const before = JSON.stringify(low);
    const poor = upbringingFor(low, small.personId);
    const wealthy = upbringingFor(high, small.personId);
    expect(poor.money[0]!.estimatedParentIncomeRank).toBeLessThan(
      wealthy.money[0]!.estimatedParentIncomeRank!,
    );
    expect(poor.money[0]!.source.note).toContain(
      "recorded opening adult household job/pay",
    );
    expect(
      upbringingFor({ ...low, seed: "no-upbringing-draw" }, small.personId),
    ).toEqual(poor);
    expect(upbringingFor(JSON.parse(before) as World, small.personId)).toEqual(
      poor,
    );
    expect(JSON.stringify(low)).toBe(before);
  });

  it("keeps a recorded birthplace when the adult's home differs", () => {
    const small = opening(places[0]!.jurisdictionKey);
    const elsewhere = opening(places[1]!.jurisdictionKey);
    const u = upbringingFor(small.world, small.personId);
    const moved = {
      ...small.world,
      jurisdictions: {
        ...small.world.jurisdictions,
        ...elsewhere.world.jurisdictions,
      },
      people: {
        ...small.world.people,
        [small.personId]: {
          ...small.world.people[small.personId]!,
          homeJurisdictionId: elsewhere.jurisdictionId,
        },
      },
    };
    // No payroll here: changing current residence cannot change the birthplace/cohort estimate.
    expect(upbringingFor(moved, small.personId)).toEqual(u);
  });

  it("gives recorded childhood household money priority over the opening backcast", () => {
    const small = opening(places[0]!.jurisdictionKey);
    const paid = withPay(small.world, small.personId, 500000);
    const born = recordFamilyAddition(paid, {
      kind: "birth",
      stableKey: "a137-recorded-child",
      occurredAt: paid.currentDate,
      parentPersonIds: [small.personId],
    });
    const child = upbringingFor(born.world, born.childPersonId);
    expect(child.basis).toBe("childhood-record");
    expect(child.money[0]!.source.kind).toBe("world-record");
    expect(child.money[0]!.level).toBe("secure");
    expect(child.money[0]!.estimatedParentIncomeRank).toBeUndefined();
    expect(child.caregiving).toBe("not-recorded");
    expect(child.events).toEqual([]);
  });
});
