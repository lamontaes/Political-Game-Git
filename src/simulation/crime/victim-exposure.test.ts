import { describe, expect, it } from "vitest";

// World first, the order the game itself loads in.
import { advanceWorld, assertWorldIntegrity } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, makeIsoDate } from "../dates";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { recordRelationshipInteraction } from "../records";
import type { EntityId, IsoDate, World } from "../types";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  CRIME_EVENT_TYPES,
  crimeExposures,
  crimeIncidents,
  crimeRateMultiplier,
  ensureCrimeProduction,
  exposureDays,
  priorVictimizations,
  recordSampledCrime,
  sampleMonthlyCrime,
  sampleTownPoliceLog,
  UNRESEARCHED_LOCAL_CRIME,
  UNRESEARCHED_TOWN_POLICE_LOG,
  type CrimeExposure,
} from "./index";
import { eligibleOffenders } from "./offenders";

/** The place of all 56 this seed draws, with a locality to live in. */
function drawPlace(): { seed: string; usps: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `a131-victim-exposure-${n}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, usps: place.usps };
  }
  throw new Error("No place with a locality was drawn.");
}

const { seed, usps } = drawPlace();
const label = `${usps}, seed ${seed}`;

function opened() {
  const small = smallWorld({ place: usps, people: 8, seed });
  // The opening records its conditions, which is what schedules the crime pass.
  const world = ensureCrimeProduction(
    ensureWorldStartingConditions(small.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    }),
  );
  return { ...small, world };
}

function monthOf(date: IsoDate): IsoDate {
  return makeIsoDate(`${date.slice(0, 7)}-01`);
}

function exposureOf(
  exposures: readonly CrimeExposure[],
  targetId: EntityId,
  offense: CrimeExposure["offense"],
): CrimeExposure {
  return exposures.find(
    (row) => row.targetId === targetId && row.offense === offense,
  )!;
}

/**
 * The first resident the law lets offend comes to know a neighbor, through
 * the real relationship writer.
 */
function acquaint(world: World, town: EntityId, playerId: EntityId) {
  const month = monthOf(world.currentDate);
  const offender = eligibleOffenders(world, town, month)[0]?.personId;
  expect(offender, `${label}: an adult resident`).toBeDefined();
  const neighbor = crimeExposures(world, month).find(
    (row) =>
      row.jurisdictionId === town &&
      row.offense === "assault" &&
      row.targetId !== offender &&
      row.targetId !== playerId,
  )?.targetId;
  expect(neighbor, `${label}: a neighbor`).toBeDefined();
  const acquainted = recordRelationshipInteraction(world, {
    stableKey: "a131-test:met",
    personIds: [offender!, neighbor!],
    eventId: null,
    occurredAt: world.currentDate,
    kind: "contact:conversation",
    change: "formed",
    significance: "meaningful",
    summary: "They met.",
    tags: [],
  });
  return { offender: offender!, neighbor: neighbor!, acquainted };
}

describe(`crime victims come from causes, not dice (A131; ${label})`, () => {
  it("the town's rate is the check on totals, and causes decide who it falls on", () => {
    const { world, jurisdictionId, personId } = opened();
    const month = monthOf(world.currentDate);
    const exposures = crimeExposures(world, month).filter(
      (row) => row.jurisdictionId === jurisdictionId,
    );
    expect(exposures.length).toBeGreaterThan(0);
    for (const rule of UNRESEARCHED_LOCAL_CRIME.offenses) {
      const rows = exposures.filter((row) => row.offense === rule.offense);
      if (rows.length === 0) continue;
      const total = rows.reduce((sum, row) => sum + row.annualRate, 0);
      const expected =
        rule.annualRate *
        crimeRateMultiplier(world, jurisdictionId, rule.offense, month)
          .multiplier *
        rows.length;
      expect(total, label).toBeCloseTo(expected, 10);
    }

    // A resident whose circumstances point to offending comes to know a
    // neighbor: the recorded relationship turns the town's assaults toward
    // that neighbor, and nobody is drawn.
    const { offender, neighbor, acquainted } = acquaint(
      world,
      jurisdictionId,
      personId,
    );
    const before = exposureOf(exposures, neighbor, "assault");
    const after = exposureOf(
      crimeExposures(acquainted, month),
      neighbor,
      "assault",
    );
    expect(after.points!).toBeGreaterThan(before.points!);
    expect(after.annualRate).toBeGreaterThan(before.annualRate);
    // Burglary is done to a home, so knowing someone does not bear on it.
    for (const row of crimeExposures(acquainted, month))
      if (row.offense === "burglary" || row.offense === "vandalism")
        expect(row.annualRate).toBeCloseTo(
          exposureOf(exposures, row.targetId, row.offense).annualRate,
          12,
        );
    console.info(
      JSON.stringify({
        place: label,
        offender,
        neighbor,
        assaultRateBefore: before.annualRate,
        assaultRateAfter: after.annualRate,
        pointsBefore: before.points,
        pointsAfter: after.points,
      }),
    );
  });

  it("an offense happens on the day exposure reaches it, the same every time, and a repeat victim is more exposed", () => {
    // Exposure building at 0.3 offenses a year from none reaches its first
    // offense on its 1,218th day, two in nine years and three in ten.
    const since = makeIsoDate("2020-01-01");
    const clock = { since, startingExposure: 0, recorded: 0, annualRate: 0.3 };
    const nine = exposureDays(clock, since, makeIsoDate("2028-12-31"));
    expect(nine).toHaveLength(2);
    expect(nine[0]).toBe(addDays(since, 1217));
    expect(exposureDays(clock, since, makeIsoDate("2029-12-31"))).toHaveLength(
      3,
    );
    // Month by month, counting what is on record, finds the same days.
    expect([
      ...exposureDays(clock, since, makeIsoDate("2023-06-30")),
      ...exposureDays(
        { ...clock, recorded: 1 },
        makeIsoDate("2023-07-01"),
        makeIsoDate("2028-12-31"),
      ),
    ]).toEqual(nine);
    // Half an offense already built at the opening brings the first one
    // forward by half the wait; nothing builds at a rate of none.
    expect(
      exposureDays(
        { ...clock, startingExposure: 0.5 },
        since,
        makeIsoDate("2028-12-31"),
      )[0],
    ).toBe(addDays(since, 608));
    expect(
      exposureDays(
        { ...clock, annualRate: 0 },
        since,
        makeIsoDate("2099-01-01"),
      ),
    ).toEqual([]);
    // When the causes rise so an offense is already owed, it comes on the
    // first day looked at, once, and never again for the same count.
    const owed = exposureDays(
      { ...clock, annualRate: 3 },
      makeIsoDate("2021-06-01"),
      makeIsoDate("2021-06-30"),
    );
    expect(owed[0]).toBe(makeIsoDate("2021-06-01"));

    // The first month, looking ahead from the opening, in which the town's
    // exposure reaches a named resident, once one resident knows another.
    const small = opened();
    const { acquainted: world } = acquaint(
      small.world,
      small.jurisdictionId,
      small.personId,
    );
    let month = monthOf(world.currentDate);
    let found: ReturnType<typeof sampleMonthlyCrime>[number] | null = null;
    for (let n = 0; n < 240 && !found; n++) {
      found = sampleMonthlyCrime(world, month)[0] ?? null;
      if (!found) month = monthOf(addDays(month, 32));
    }
    expect(found, `${label}: a named offense within 20 years`).not.toBeNull();
    expect(JSON.stringify(sampleMonthlyCrime(world, month))).toBe(
      JSON.stringify(sampleMonthlyCrime(world, month)),
    );
    const exposure = exposureOf(
      crimeExposures(world, month),
      found!.targetId,
      found!.offense,
    );
    expect(found!.occurredAt).toBe(
      exposureDays(
        exposure,
        month,
        addDays(monthOf(addDays(month, 32)), -1),
      )[0],
    );

    // Once it is on record, the victim carries it: their share of the next
    // offense of every kind grows against everyone else's.
    const victim = found!.victimPersonIds[0]!;
    const dated: World = { ...world, currentDate: found!.occurredAt };
    const recorded = recordSampledCrime(dated, month, found!);
    const next = monthOf(addDays(month, 32));
    expect(priorVictimizations(recorded, victim, next)).toBe(1);
    const share = (at: World, offense: CrimeExposure["offense"]) => {
      const rows = crimeExposures(at, next).filter(
        (row) => row.offense === offense,
      );
      const total = rows.reduce((sum, row) => sum + row.annualRate, 0);
      return (
        rows.find((row) => row.victimPersonIds.includes(victim))!.annualRate /
        total
      );
    };
    expect(share(recorded, "assault")).toBeGreaterThan(share(dated, "assault"));
    console.info(
      JSON.stringify({
        place: label,
        firstNamedOffense: found,
        assaultShareBefore: share(dated, "assault"),
        assaultShareAfter: share(recorded, "assault"),
      }),
    );
  });

  it("two months of play write the town's police log at its computed days, with no roll", () => {
    const { world, jurisdictionId } = opened();
    const registry = createCampaignElectionTransitionRegistry();
    const later = advanceWorld(world, 62, registry);
    assertWorldIntegrity(later);
    const again = advanceWorld(world, 62, registry);
    const logged = crimeIncidents(later).filter((event) =>
      event.tags.includes("crime:town-log"),
    );
    expect(crimeIncidents(again).map((event) => event.stableKey)).toEqual(
      crimeIncidents(later).map((event) => event.stableKey),
    );
    // Each pass logs what the town's causes give for the month it looks back on.
    const months = [
      ...new Set(logged.map((event) => monthOf(event.occurredAt))),
    ];
    expect(logged.length, label).toBeGreaterThan(0);
    for (const month of months) {
      const expected = sampleTownPoliceLog(later, month).filter(
        (entry) =>
          entry.jurisdictionId === jurisdictionId &&
          entry.occurredAt >= world.currentDate,
      );
      const actual = logged.filter(
        (event) =>
          monthOf(event.occurredAt) === month &&
          event.jurisdictionId === jurisdictionId,
      );
      expect(actual.map((event) => event.occurredAt).sort()).toEqual(
        expected.map((entry) => entry.occurredAt).sort(),
      );
      // About the blanket expectation a month, moved by the place's causes.
      expect(expected.length).toBeLessThanOrEqual(
        UNRESEARCHED_TOWN_POLICE_LOG.reportedPerMonth * 2 + 1,
      );
    }
    for (const event of logged) {
      expect(event.type).toBe(CRIME_EVENT_TYPES.reported);
      expect(event.visibility).toBe("public");
    }
    console.info(
      JSON.stringify({
        place: label,
        days: 62,
        townLog: logged.map((event) => [event.occurredAt, event.summary]),
      }),
    );
  });
});
