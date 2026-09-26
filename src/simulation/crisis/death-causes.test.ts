import { describe, expect, it } from "vitest";
import { createCharacterHistoryContextPerson } from "../character-history";
import { createDemoWorld } from "../demo";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { Person, World } from "../types";
import { advanceWorld, assertWorldIntegrity, createWorld } from "../world";
import {
  DEATH_CAUSE_ILLNESS_WITH_COURSE,
  DEATH_CAUSE_INJURY,
  DEATH_CAUSE_SUDDEN_ILLNESS,
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

/**
 * Whether and when a hazard death happens is the threshold model's alone.
 * These lists were recorded by running this same cohort for 800 days on
 * origin/main at b01af95c2, before causes existed. The cause code must leave
 * every one of them exactly where it was.
 */
const MAIN_DEATHS: Readonly<Record<string, readonly string[]>> = {
  "death-cause-invariance-a": [
    "person_e06cf5edd68af75f@2026-11-26",
    "person_e06cfaedd68affde@2026-08-16",
    "person_e06cfbedd68b0191@2026-08-22",
    "person_e06cfcedd68b0344@2026-09-16",
    "person_e06cfeedd68b06aa@2028-02-22",
    "person_e06cffedd68b085d@2028-02-24",
    "person_e073e8edd690fff6@2026-05-01",
    "person_e073eaedd691035c@2026-11-28",
    "person_e073ecedd69106c2@2026-12-08",
    "person_e073f1edd6910f41@2027-05-21",
    "person_e076eaedd6933933@2026-07-07",
    "person_e076ebedd6933ae6@2026-09-12",
    "person_e076ededd6933e4c@2028-01-24",
    "person_e076f6edd6934d97@2026-12-17",
    "person_e1e47d119d091ed0@2027-11-19",
    "person_e1e47e119d092083@2027-08-14",
    "person_e1e47f119d092236@2026-06-07",
    "person_e1e480119d0923e9@2027-04-17",
    "person_e1e481119d09259c@2026-07-07",
    "person_e1e482119d09274f@2027-11-17",
    "person_e1e484119d092ab5@2026-10-28",
  ],
  "death-cause-invariance-b": [
    "person_2bbf832f662c4aa6@2027-08-17",
    "person_2bbf842f662c4c59@2026-08-11",
    "person_2bbf872f662c5172@2026-04-11",
    "person_2bbf882f662c5325@2027-09-15",
    "person_2bbf8d2f662c5ba4@2026-09-02",
    "person_2bbf8e2f662c5d57@2026-06-25",
    "person_2bc6892f66327386@2027-10-17",
    "person_2bc6902f66327f6b@2026-05-19",
    "person_2bc6942f66328637@2026-09-13",
    "person_2bca0f2f66358d0f@2027-05-07",
    "person_2bca122f66359228@2027-11-05",
    "person_2bca142f6635958e@2027-05-01",
    "person_2bca182f66359c5a@2028-02-19",
    "person_d4684a3f143e6e5c@2027-01-06",
    "person_d4684b3f143e700f@2026-10-08",
    "person_d4684e3f143e7528@2027-01-07",
    "person_d4684f3f143e76db@2026-07-17",
    "person_d468503f143e788e@2026-09-12",
    "person_d468523f143e7bf4@2026-12-18",
    "person_d468533f143e7da7@2026-09-12",
    "person_d468543f143e7f5a@2027-09-28",
  ],
};

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
    "leaves every death on the day and person main gave it, and gives each a cause",
    () => {
      for (const [seed, expected] of Object.entries(MAIN_DEATHS)) {
        const run = advanceWorld(cohort(seed), 800, REGISTRY);
        expect(
          run.history.personDeaths
            .map((death) => `${death.personId}@${death.diedAt}`)
            .sort(),
        ).toEqual(expected);
        for (const death of run.history.personDeaths) {
          expect([
            DEATH_CAUSE_ILLNESS_WITH_COURSE,
            DEATH_CAUSE_SUDDEN_ILLNESS,
            DEATH_CAUSE_INJURY,
          ] as string[]).toContain(death.causeKey);
          const course = crisisRecords(run).find(
            (record) =>
              record.kind === "health-episode" &&
              record.personId === death.personId &&
              record.stableKey.startsWith(FATAL_ILLNESS_EPISODE_PREFIX),
          );
          // An illness death always had its illness first, and only then.
          expect(death.causeKey === DEATH_CAUSE_ILLNESS_WITH_COURSE).toBe(
            course !== undefined,
          );
          if (course) {
            expect(course.effectiveAt < death.diedAt).toBe(true);
            expect(death.sourceEntityIds).toContain(course.id);
            expect(latestHealthState(run, course.id)?.state).toBe("deceased");
          }
        }
        assertWorldIntegrity(deserializeWorld(serializeWorld(run)));
      }
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
