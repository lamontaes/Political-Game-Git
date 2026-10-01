import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { composeWorldTimeHandlers } from "../campaigns";
import { createCharacterHistoryContextPerson } from "../character-history";
import { addDays, daysBetween } from "../dates";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import type { EntityId, IsoDate, Person, World } from "../types";
import {
  DEATH_CAUSE_ILLNESS_WITH_COURSE,
  remainingDaysAfterOnset,
} from "./death-causes";
import { beginHealthEpisode } from "./health";
import {
  ensureCrisisMortality,
  seriousStrainEpisode,
  conditionStrainInput,
  strainCrossingDay,
} from "./mortality";
import { ssa2023AnnualProbability } from "./mortality-table";
import { crisisRecords } from "./records";

/*
 * Ruling 29: deaths without dice. A person's strain grows from their recorded
 * age, conditions and coverage; a serious episode begins on the day it crosses
 * the one threshold everybody shares, and the death is written on the day the
 * episode's remaining days run out, citing it. The place is drawn from all 56
 * by the seed.
 */
const SEED = "ruling-29-strain-1";
const STATES = lifePlaceStateIdentities();
const STATE =
  STATES[Number(BigInt(`0x${stableHash(SEED)}`) % BigInt(STATES.length))]!;
const small = smallWorld({ place: STATE.usps, people: 4, seed: SEED });
const HANDLERS = composeWorldTimeHandlers();

/** Adds people born on the given days, through the context-person writer. */
function withPeople(
  world: World,
  births: readonly string[],
): { world: World; ids: EntityId[] } {
  let next = world;
  const ids: EntityId[] = [];
  births.forEach((birthDate, index) => {
    next = createCharacterHistoryContextPerson(next, {
      stableKey: `ruling-29:person:${index}`,
      givenName: "Strain",
      familyName: `Test-${index}`,
      birthDate: birthDate as Person["birthDate"],
      homeJurisdictionId: small.jurisdictionId,
    });
    ids.push(next.personOrder.at(-1)!);
  });
  return { world: next, ids };
}

/** The world on the first day of exposure, with the first window resolved. */
function exposed(world: World): World {
  const started = ensureCrisisMortality(world);
  const window = started.history.futureDueItems.find(
    (item) => item.transitionKey === "crisis:mortality-window",
  )!;
  return resolveFutureDueItemsThrough(started, window.dueAt, HANDLERS);
}

function crossing(world: World, personId: EntityId): IsoDate | null {
  return strainCrossingDay(
    world,
    personId,
    world.currentDate,
    addDays(world.currentDate, 365 * 120),
  );
}

describe(`deaths from recorded strain (${STATE.name}, ${STATE.usps}, seed ${SEED})`, () => {
  it("brings two people with identical records to the episode on the same day", () => {
    const { world, ids } = withPeople(small.world, [
      "1941-05-14",
      "1941-05-14",
    ]);
    const open = exposed(world);
    const [a, b] = ids as [EntityId, EntityId];
    // Identical records: the same birth day and the same starting conditions.
    expect([...conditionStrainInput(open, a)!.held]).toEqual([
      ...conditionStrainInput(open, b)!.held,
    ]);
    expect(crossing(open, a)).not.toBeNull();
    expect(crossing(open, a)).toBe(crossing(open, b));
    // One day older crosses on nearly the same day.
    const { world: older, ids: olderIds } = withPeople(small.world, [
      "1941-05-13",
    ]);
    const shift = daysBetween(
      crossing(exposed(older), olderIds[0]!)!,
      crossing(open, a)!,
    );
    expect(Math.abs(shift)).toBeLessThanOrEqual(2);
  });

  it("brings a recorded condition's episode sooner", () => {
    const { world, ids } = withPeople(small.world, [
      "1941-05-14",
      "1941-05-14",
    ]);
    const [well, ill] = ids as [EntityId, EntityId];
    const open = exposed(world);
    const sick = beginHealthEpisode(open, {
      stableKey: "ruling-29:condition",
      personId: ill,
      severity: "serious",
      initialLimitation: "limited",
      origin: {
        kind: "authored",
        note: "Ruling 29 test: a recorded condition",
      },
      causalParentIds: [],
      hazard: {
        micros: 2_000_000,
        basis: "Ruling 29 test: doubles the strain",
      },
    });
    expect(crossing(sick, ill)! < crossing(sick, well)!).toBe(true);
    expect(crossing(sick, well)).toBe(crossing(open, well));
    // Remaining days shrink with age and with the conditions' weight.
    const young = remainingDaysAfterOnset({
      age: 40,
      severity: 1,
      covered: null,
    });
    expect(
      remainingDaysAfterOnset({ age: 90, severity: 1, covered: null }),
    ).toBeLessThan(young);
    expect(
      remainingDaysAfterOnset({ age: 40, severity: 2, covered: null }),
    ).toBeLessThan(young);
    expect(
      Math.abs(
        remainingDaysAfterOnset({ age: 60, severity: 1, covered: null }) -
          remainingDaysAfterOnset({
            age: 60 + 1 / 365,
            severity: 1,
            covered: null,
          }),
      ),
    ).toBeLessThanOrEqual(1);
  });

  it("writes the death on the episode's last day, citing it", () => {
    const { world, ids } = withPeople(small.world, ["1919-02-03"]);
    const [oldest] = ids as [EntityId];
    const open = exposed(world);
    const onset = crossing(open, oldest)!;
    expect(onset).not.toBeNull();
    const ill = resolveFutureDueItemsThrough(open, onset, HANDLERS);
    const episode = seriousStrainEpisode(ill, oldest)!;
    expect(episode.effectiveAt).toBe(onset);
    const diesOn = episode.stableKey.slice(-10) as IsoDate;
    expect(daysBetween(onset, diesOn)).toBeGreaterThanOrEqual(1);
    // Not yet: the person lives through the episode's days.
    const before = resolveFutureDueItemsThrough(
      ill,
      addDays(diesOn, -1),
      HANDLERS,
    );
    expect(
      before.history.personDeaths.some((row) => row.personId === oldest),
    ).toBe(false);
    const after = resolveFutureDueItemsThrough(before, diesOn, HANDLERS);
    const death = after.history.personDeaths.find(
      (row) => row.personId === oldest,
    )!;
    expect(death.diedAt).toBe(diesOn);
    expect(death.causeKey).toBe(DEATH_CAUSE_ILLNESS_WITH_COURSE);
    expect(death.sourceEntityIds).toContain(episode.id);
    expect(
      crisisRecords(after).some(
        (record) =>
          record.kind === "health-state" &&
          record.episodeId === episode.id &&
          record.state === "deceased",
      ),
    ).toBe(true);
  });

  it("reaches the threshold at the life table's median remaining life", () => {
    // The table checks the total only: with no recorded multiplier, the day
    // the strain crosses is the day half of the people of that age in the
    // table have died. Checked at ages across a life.
    for (const age of [0, 30, 60, 75, 90]) {
      const born = addDays(
        small.world.currentDate,
        -Math.round(age * 365.25) - 10,
      );
      const { world, ids } = withPeople(small.world, [born]);
      const open = exposed(world);
      const start = open.currentDate;
      // A person whose records multiply nothing: no starting condition.
      expect(conditionStrainInput(open, ids[0]!)!.held.size, `age ${age}`).toBe(
        0,
      );
      const day = crossing(open, ids[0]!)!;
      // The same median from the table's own probabilities (equal mixture).
      let survival = 1;
      let years = 0;
      const startAge = daysBetween(born, start) / 365.25;
      let current = Math.floor(startAge);
      let fraction = 1 - (startAge - current);
      for (;;) {
        const q =
          (Number(ssa2023AnnualProbability(Math.min(current, 119), "male")) +
            Number(
              ssa2023AnnualProbability(Math.min(current, 119), "female"),
            )) /
          2;
        const hazard = -Math.log(1 - q);
        const after = survival * Math.exp(-hazard * fraction);
        if (after <= 0.5) {
          years += Math.log(survival / 0.5) / hazard;
          break;
        }
        survival = after;
        years += fraction;
        current += 1;
        fraction = 1;
      }
      const expected = years * 365.25;
      // The table mixes the two hazards rather than the survivals, so allow
      // a small gap.
      expect(
        Math.abs(daysBetween(start, day) - expected) / expected,
        `age ${age}`,
      ).toBeLessThan(0.03);
    }
  });
});
