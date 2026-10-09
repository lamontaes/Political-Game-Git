import { describe, expect, it } from "vitest";
import { composeWorldTimeHandlers } from "../src/simulation/campaigns";
import { createCharacterHistoryContextPeople } from "../src/simulation/character-history";
import {
  CONDITION_PACK_ORIGIN,
  SUBSTANCE_USE_DISORDER_KEY,
  conditionPrevalence,
  holdsPackCondition,
  packCondition,
} from "../src/simulation/crisis/condition-pack";
import { MULTIPLIER_ONE } from "../src/simulation/crisis/hazard";
import { ensureCrisisMortality } from "../src/simulation/crisis/mortality";
import { crisisRecords } from "../src/simulation/crisis/records";
import type { HealthEpisodeRecord } from "../src/simulation/crisis/types";
import { addDays } from "../src/simulation/dates";
import { resolveFutureDueItemsThrough } from "../src/simulation/future-transitions";
import { stableHash } from "../src/simulation/ids";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import type { World } from "../src/simulation/types";
import { smallWorld } from "./fixtures/small-world";

/*
 * LW-16 producer: the person-level record of a substance use disorder that
 * the health and human services laws land on. It is the condition pack's own
 * row (NSDUH 2023 shares by age), written once on the health record when the
 * model first exposes a person. The place is drawn from all 56 by the seed.
 */
const SEED = "lw16-substance-use-1";
const STATES = lifePlaceStateIdentities();
const STATE =
  STATES[Number(BigInt(`0x${stableHash(SEED)}`) % BigInt(STATES.length))]!;
const small = smallWorld({ place: STATE.usps, people: 4, seed: SEED });
const HANDLERS = composeWorldTimeHandlers();

function exposed(world: World): World {
  const started = ensureCrisisMortality(world);
  const window = started.history.futureDueItems.find(
    (item) => item.transitionKey === "crisis:mortality-window",
  )!;
  return resolveFutureDueItemsThrough(started, window.dueAt, HANDLERS);
}

function cohort(world: World, age: number, count: number) {
  const date = world.currentDate;
  const next = createCharacterHistoryContextPeople(
    world,
    Array.from({ length: count }, (_, index) => ({
      stableKey: `lw16:cohort:${age}:${index}`,
      givenName: "Cohort",
      familyName: `Member-${index}`,
      birthDate: addDays(date, -Math.round(age * 365.25) - 120 - (index % 300)),
      homeJurisdictionId: small.jurisdictionId,
    })),
  );
  return { world: next, ids: next.personOrder.slice(-count) };
}

describe(`a substance use disorder on the health record (${STATE.name}, ${STATE.usps}, seed ${SEED})`, () => {
  it("reads the survey's shares by age, sliding between bands, and none for children", () => {
    const sud = packCondition(SUBSTANCE_USE_DISORDER_KEY)!;
    expect(conditionPrevalence(sud, 15, "equal-mixture")).toBeCloseTo(0.085, 3);
    expect(conditionPrevalence(sud, 22, "equal-mixture")).toBeCloseTo(0.271, 3);
    expect(conditionPrevalence(sud, 58.5, "equal-mixture")).toBeCloseTo(
      0.166,
      3,
    );
    expect(conditionPrevalence(sud, 8, "equal-mixture")).toBe(0);
    expect(sud.onsetScale).toBeNull();
  });

  it("writes the record once for people the model exposes, at the survey's shares, with no change to mortality", () => {
    const young = cohort(small.world, 22, 400);
    const older = cohort(young.world, 40, 400);
    const child = cohort(older.world, 8, 200);
    const open = exposed(child.world);

    const share = (ids: readonly string[]) =>
      ids.filter((id) =>
        holdsPackCondition(open, id, SUBSTANCE_USE_DISORDER_KEY),
      ).length / ids.length;
    const youngShare = share(young.ids);
    const olderShare = share(older.ids);
    console.info(
      `LW-16 producer, ${STATE.name} (${STATE.usps}, seed ${SEED}): ${(100 * youngShare).toFixed(1)} percent of 400 people aged 22 and ${(100 * olderShare).toFixed(1)} percent of 400 aged 40 hold the record; none of 200 children aged 8. Survey anchors: 27.1 percent at 22 and 16.6 percent from the late fifties, sliding between.`,
    );
    expect(youngShare).toBeGreaterThan(0.22);
    expect(youngShare).toBeLessThan(0.32);
    // The share slides smoothly between the survey's age anchors, so a
    // 40-year-old reads between the 22 and 58.5 figures (not a flat band).
    // Four hundred people sample it within about three standard deviations.
    const olderExpected = conditionPrevalence(
      packCondition(SUBSTANCE_USE_DISORDER_KEY)!,
      40,
      "equal-mixture",
    );
    expect(olderShare).toBeGreaterThan(olderExpected - 0.06);
    expect(olderShare).toBeLessThan(olderExpected + 0.06);
    expect(share(child.ids)).toBe(0);

    // The record is the ordinary private health episode, carrying one
    // neutral multiplier, and it begins no strain onset.
    const records = crisisRecords(open).filter(
      (record): record is HealthEpisodeRecord =>
        record.kind === "health-episode" &&
        record.conditionKey === SUBSTANCE_USE_DISORDER_KEY,
    );
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      expect(record.origin).toEqual(CONDITION_PACK_ORIGIN);
      expect(record.visibility).toBe("private");
      expect(record.hazardMultiplierMicros).toBe(MULTIPLIER_ONE);
    }
    const held = new Set(records.map((record) => record.personId));
    expect(held.size).toBe(records.length);
  }, 120_000);
});
