import { describe, expect, it } from "vitest";
import { ownHealthNotices } from "../src/presentation/crisis-shell";
import { composeWorldTimeHandlers } from "../src/simulation/campaigns";
import {
  createCharacterHistoryContextPeople,
  createCharacterHistoryContextPerson,
} from "../src/simulation/character-history";
import {
  CONDITION_ONSET_KEY,
  CONDITION_PACK,
  conditionOnsetDay,
  conditionPrevalence,
  packCondition,
  startingConditionKeys,
} from "../src/simulation/crisis/condition-pack";
import {
  conditionStrainInput,
  ensureCrisisMortality,
  strainCrossingDay,
} from "../src/simulation/crisis/mortality";
import { recordHealthCoverage } from "../src/simulation/crisis/health-coverage";
import { crisisRecords } from "../src/simulation/crisis/records";
import type { HealthEpisodeRecord } from "../src/simulation/crisis/types";
import { addDays, daysBetween } from "../src/simulation/dates";
import { resolveFutureDueItemsThrough } from "../src/simulation/future-transitions";
import { stableHash } from "../src/simulation/ids";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../src/simulation/life";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import type { EntityId, World } from "../src/simulation/types";
import { smallWorld } from "./fixtures/small-world";

/*
 * Ruling 38: the spread in who dies when comes from recorded health. People
 * start with the chronic conditions people of their age hold (CDC/NCHS
 * prevalence), written once on their health record when the model first
 * exposes them; conditions begin later in life on the day each one's own
 * strain crosses the one threshold, from recorded causes. The place is drawn
 * from all 56 by the seed.
 */
const SEED = "ruling-38-conditions-1";
const STATES = lifePlaceStateIdentities();
const STATE =
  STATES[Number(BigInt(`0x${stableHash(SEED)}`) % BigInt(STATES.length))]!;
const small = smallWorld({ place: STATE.usps, people: 4, seed: SEED });
const HANDLERS = composeWorldTimeHandlers();
const CASE_LIMIT = 60_000;

function exposed(world: World): World {
  const started = ensureCrisisMortality(world);
  const window = started.history.futureDueItems.find(
    (item) => item.transitionKey === "crisis:mortality-window",
  )!;
  return resolveFutureDueItemsThrough(started, window.dueAt, HANDLERS);
}

function conditionEpisodes(
  world: World,
  personId: EntityId,
): readonly HealthEpisodeRecord[] {
  return crisisRecords(world).filter(
    (record): record is HealthEpisodeRecord =>
      record.kind === "health-episode" &&
      record.personId === personId &&
      record.label === "condition",
  );
}

/**
 * One person aged 60 in a one-person household at home in the place, through
 * the ordinary household writers. No job is recorded, so the household's
 * recorded pay is none.
 */
function poorSixty(place: ReturnType<typeof smallWorld>) {
  const date = place.world.currentDate;
  let world = createCharacterHistoryContextPerson(place.world, {
    stableKey: "ruling-38:poor-sixty",
    givenName: "Recorded",
    familyName: "Sixty",
    birthDate: addDays(date, -Math.round(60.4 * 365.25)),
    homeJurisdictionId: place.jurisdictionId,
  });
  const personId = world.personOrder.at(-1)!;
  const provenance = {
    kind: "authored",
    note: "Ruling 38 test: one-person household with no recorded job.",
  } as const;
  world = createHousehold(world, {
    stableKey: "ruling-38:household",
    formedAt: date,
    label: "Ruling 38 household",
    provenance,
  });
  const household = world.history.households.at(-1)!;
  world = recordHouseholdLocation(world, {
    stableKey: "ruling-38:home",
    householdId: household.id,
    effectiveAt: date,
    jurisdictionId: place.jurisdictionId,
    label: "Ruling 38 home",
    kind: "residence:fixture",
    provenance,
    supersedesLocationId: null,
  });
  world = startHouseholdMembership(world, {
    stableKey: "ruling-38:member",
    personId,
    householdId: household.id,
    startedAt: date,
    residenceRole: "primary",
    kind: "resident:fixture",
    provenance,
  });
  return { world, personId };
}

/** People born across one year of age, through the batch context writer. */
function cohort(world: World, age: number, count: number) {
  const date = world.currentDate;
  const next = createCharacterHistoryContextPeople(
    world,
    Array.from({ length: count }, (_, index) => ({
      stableKey: `ruling-38:cohort:${age}:${index}`,
      givenName: "Cohort",
      familyName: `Member-${index}`,
      birthDate: addDays(date, -Math.round(age * 365.25) - 120 - (index % 300)),
      homeJurisdictionId: small.jurisdictionId,
    })),
  );
  return { world: next, ids: next.personOrder.slice(-count) };
}

describe(`chronic conditions from recorded health (${STATE.name}, ${STATE.usps}, seed ${SEED})`, () => {
  it("reads prevalence from the sourced table, sliding between bands", () => {
    const heart = packCondition("heart-disease")!;
    // A band's own figure at its middle age.
    expect(conditionPrevalence(heart, 55, "equal-mixture")).toBeCloseTo(
      0.059,
      3,
    );
    // Nobody under the first band's start; a smooth rise inside it.
    expect(conditionPrevalence(heart, 10, "equal-mixture")).toBe(0);
    const a = conditionPrevalence(heart, 60, "equal-mixture");
    const b = conditionPrevalence(heart, 60 + 1 / 365, "equal-mixture");
    expect(Math.abs(a - b)).toBeLessThan(0.001);
    // The source's sex difference where it gives one.
    const copd = packCondition("copd")!;
    expect(conditionPrevalence(copd, 50, "female")).toBeGreaterThan(
      conditionPrevalence(copd, 50, "male"),
    );
    // Every weight in the table carries the recorded calibration status.
    for (const condition of CONDITION_PACK)
      expect(condition.mortalityWeight.status).toBe(
        "RECORDED GAME CALIBRATION",
      );
  });

  it(
    "writes each person's starting conditions once, on their record, at the source's shares",
    () => {
      const { world, ids } = cohort(small.world, 70, 400);
      const open = exposed(world);
      let heart = 0;
      for (const personId of ids) {
        const episodes = conditionEpisodes(open, personId);
        const age =
          daysBetween(open.people[personId]!.birthDate, open.currentDate) /
          365.25;
        expect(episodes.map((episode) => episode.conditionKey).sort()).toEqual(
          [
            ...startingConditionKeys(open.seed, personId, age, "equal-mixture"),
          ].sort(),
        );
        for (const episode of episodes) {
          expect(episode.effectiveAt).toBe(open.currentDate);
          expect(episode.origin.kind).toBe("condition-pack");
          expect(episode.hazardMultiplierMicros).toBeGreaterThan(1_000_000);
        }
        if (
          episodes.some((episode) => episode.conditionKey === "heart-disease")
        )
          heart += 1;
      }
      // About 14.6% at 70.5 between the 45-64 and 65+ figures.
      const expected = conditionPrevalence(
        packCondition("heart-disease")!,
        70.5,
        "equal-mixture",
      );
      expect(Math.abs(heart / ids.length - expected)).toBeLessThan(0.05);
      // Identical worlds write identical records; a second window adds none.
      const again = exposed(world);
      expect(crisisRecords(again).length).toBe(crisisRecords(open).length);
      const holder = ids.find(
        (personId) => conditionEpisodes(open, personId).length > 0,
      )!;
      const nextWindow = open.history.futureDueItems.find(
        (item) =>
          item.transitionKey === "crisis:mortality-window" &&
          item.dueAt > open.currentDate,
      )!;
      const later = resolveFutureDueItemsThrough(
        open,
        nextWindow.dueAt,
        HANDLERS,
      );
      expect(
        conditionEpisodes(later, holder).filter(
          (episode) => episode.effectiveAt === open.currentDate,
        ),
      ).toEqual(conditionEpisodes(open, holder));
      // The person sees it on their own health record, by name.
      const label = packCondition(
        conditionEpisodes(open, holder)[0]!.conditionKey!,
      )!.label;
      expect(
        ownHealthNotices(open, holder).map((notice) => notice.headline),
      ).toContain(`Living with ${label}`);
      // A held condition brings the mortality strain's crossing sooner than
      // for a person of the same age who holds none.
      const clear = ids.find(
        (personId) =>
          conditionEpisodes(open, personId).length === 0 &&
          open.people[personId]!.birthDate === open.people[holder]!.birthDate,
      );
      if (clear) {
        const horizon = addDays(open.currentDate, 365 * 60);
        expect(
          strainCrossingDay(open, holder, open.currentDate, horizon)! <
            strainCrossingDay(open, clear, open.currentDate, horizon)!,
        ).toBe(true);
      }
    },
    CASE_LIMIT,
  );

  it(
    "begins a condition during life on the day its own strain crosses",
    () => {
      // The oldest age the life table carries crosses within months. The
      // first such person in seed order who starts with no pack condition.
      const date = small.world.currentDate;
      let world = small.world;
      let personId: EntityId | null = null;
      for (let index = 0; index < 20 && !personId; index += 1) {
        world = createCharacterHistoryContextPerson(world, {
          stableKey: `ruling-38:oldest:${index}`,
          givenName: "Oldest",
          familyName: `Resident-${index}`,
          birthDate: addDays(date, -Math.round(119.2 * 365.25) - index),
          homeJurisdictionId: small.jurisdictionId,
        });
        const id = world.personOrder.at(-1)!;
        if (
          startingConditionKeys(world.seed, id, 119.2, "equal-mixture")
            .length === 0
        )
          personId = id;
      }
      expect(personId).not.toBeNull();
      const open = exposed(world);
      expect(conditionEpisodes(open, personId!)).toEqual([]);
      const strain = conditionStrainInput(open, personId!)!;
      const onset = conditionOnsetDay(
        { ...strain, key: "heart-disease" },
        open.currentDate,
        addDays(open.currentDate, 365),
      )!;
      expect(onset).not.toBeNull();
      // Nothing is begun before its day; the quarter it falls in puts it on
      // the clock as a due item.
      const before = resolveFutureDueItemsThrough(
        open,
        addDays(onset, -1),
        HANDLERS,
      );
      expect(
        conditionEpisodes(before, personId!).some(
          (episode) => episode.conditionKey === "heart-disease",
        ),
      ).toBe(false);
      expect(
        before.history.futureDueItems.some(
          (item) =>
            item.transitionKey === CONDITION_ONSET_KEY &&
            item.entityIds.includes(personId!) &&
            item.dueAt === onset,
        ),
      ).toBe(true);
      const after = resolveFutureDueItemsThrough(before, onset, HANDLERS);
      const begun = conditionEpisodes(after, personId!).find(
        (episode) => episode.conditionKey === "heart-disease",
      )!;
      expect(begun.effectiveAt).toBe(onset);
      expect(begun.severity).toBe("chronic");
      expect(begun.causalParentIds.length).toBeGreaterThan(0);
    },
    CASE_LIMIT,
  );

  it(
    "brings a condition sooner for a person below the poverty line, from their coverage record",
    () => {
      // A coverage record reads the household's income. The first seed from
      // `ruling-38-poverty-0` whose place, drawn from all 56, writes one for
      // this person under its own recorded law.
      let found: { read: World; personId: EntityId; place: string } | null =
        null;
      for (let n = 0; n < 12 && !found; n += 1) {
        const seed = `ruling-38-poverty-${n}`;
        const state =
          STATES[
            Number(BigInt(`0x${stableHash(seed)}`) % BigInt(STATES.length))
          ]!;
        const place = smallWorld({ place: state.usps, people: 4, seed });
        const { world, personId } = poorSixty(place);
        const open = exposed(world);
        const window = crisisRecords(open).find(
          (record) => record.kind === "mortality-window",
        )!;
        const read = recordHealthCoverage(open, open.currentDate, window.id);
        if (conditionStrainInput(read, personId)!.coverage.length > 0)
          found = { read, personId, place: `${state.name}, seed ${seed}` };
      }
      expect(
        found,
        "a place whose law writes a coverage record",
      ).not.toBeNull();
      const { read, personId } = found!;
      const strain = conditionStrainInput(read, personId)!;
      // No job is recorded, so the household's recorded pay is none: under
      // the poverty line on the coverage record.
      expect(strain.coverage.at(-1)!.monthlyIncomeMinor).toBe(0);
      const horizon = addDays(read.currentDate, 365 * 80);
      for (const key of ["heart-disease", "diabetes"]) {
        if (strain.held.has(key)) continue;
        const withRecord = conditionOnsetDay(
          { ...strain, key },
          read.currentDate,
          horizon,
        )!;
        const without = conditionOnsetDay(
          { ...strain, key, coverage: [] },
          read.currentDate,
          horizon,
        )!;
        expect(withRecord < without, key).toBe(true);
      }
    },
    CASE_LIMIT,
  );
});
