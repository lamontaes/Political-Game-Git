import { describe, expect, it } from "vitest";
import { createCharacterHistoryContextPerson } from "../character-history";
import { createDemoWorld } from "../demo";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { Person, World } from "../types";
import { advanceWorld, assertWorldIntegrity, createWorld } from "../world";
import {
  DEATH_CAUSE_ILLNESS_WITH_COURSE,
  DEATH_CAUSE_INJURY,
  FATAL_ILLNESS_EPISODE_PREFIX,
  MORTALITY_CAUSE_KEY,
  createCrisisTransitionRegistry,
  crisisRecords,
  deathCausePhrase,
  deathCauseSummary,
  deathSentence,
  ensureCrisisMortality,
  latestHealthState,
} from "./index";

const REGISTRY = createCrisisTransitionRegistry();
const SLOW = 600_000;

function cohort(seed: string): World {
  const demo = createDemoWorld(seed);
  let world = createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
  for (let i = 0; i < 40; i += 1) {
    const key = `crisis:cohort:${i}`;
    world = createCharacterHistoryContextPerson(world, {
      stableKey: key,
      givenName: "Crisis",
      familyName: key.replaceAll(":", "-"),
      birthDate:
        `19${24 + (i % 12)}-0${1 + (i % 9)}-1${i % 9}` as Person["birthDate"],
      homeJurisdictionId: world.jurisdictionOrder[0]!,
    });
  }
  return ensureCrisisMortality(world);
}

function deathsWithCauses(world: World): string[] {
  return world.history.personDeaths
    .map((death) => `${death.personId}@${death.diedAt}:${death.causeKey}`)
    .sort();
}

describe("K1 death causes", () => {
  it(
    "writes every death after its serious episode, citing it",
    () => {
      const run = advanceWorld(
        cohort("death-cause-invariance-a"),
        800,
        REGISTRY,
      );
      expect(run.history.personDeaths.length).toBeGreaterThan(0);
      for (const death of run.history.personDeaths) {
        // Ruling 29: every K1 death ends a serious episode; no cause is drawn.
        expect(death.causeKey).toBe(DEATH_CAUSE_ILLNESS_WITH_COURSE);
        const course = crisisRecords(run).find(
          (record) =>
            record.kind === "health-episode" &&
            record.personId === death.personId &&
            record.stableKey.startsWith(FATAL_ILLNESS_EPISODE_PREFIX),
        );
        expect(course).toBeDefined();
        expect(course!.effectiveAt < death.diedAt).toBe(true);
        expect(death.sourceEntityIds).toContain(course!.id);
        expect(latestHealthState(run, course!.id)?.state).toBe("deceased");
      }
      assertWorldIntegrity(deserializeWorld(serializeWorld(run)));
    },
    SLOW,
  );

  it(
    "gives the same deaths and causes for any partition of time and after a save",
    () => {
      const world = cohort("death-cause-invariance-a");
      const whole = deathsWithCauses(advanceWorld(world, 800, REGISTRY));
      let stepped = world;
      for (let done = 0; done < 800; done += 45)
        stepped = advanceWorld(stepped, Math.min(45, 800 - done), REGISTRY);
      expect(deathsWithCauses(stepped)).toEqual(whole);
      const half = deserializeWorld(
        serializeWorld(advanceWorld(world, 333, REGISTRY)),
      );
      expect(deathsWithCauses(advanceWorld(half, 467, REGISTRY))).toEqual(
        whole,
      );
    },
    SLOW,
  );

  it("says a cause only from a cause key it knows, and an old death plainly", () => {
    expect(deathCausePhrase(MORTALITY_CAUSE_KEY)).toBeNull();
    expect(deathCausePhrase("cause:unknown")).toBeNull();
    expect(deathSentence("Ann Lee", MORTALITY_CAUSE_KEY, "May 1, 2030")).toBe(
      "Ann Lee died on May 1, 2030.",
    );
    expect(
      deathSentence("Ann Lee", DEATH_CAUSE_ILLNESS_WITH_COURSE, "May 1, 2030"),
    ).toBe("Ann Lee died after a serious illness on May 1, 2030.");
    expect(deathCauseSummary(DEATH_CAUSE_INJURY)).toBe("Died in an accident.");
  });
});
