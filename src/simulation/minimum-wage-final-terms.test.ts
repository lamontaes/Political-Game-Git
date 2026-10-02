import { describe, expect, it } from "vitest";
import { authoredWageTerm } from "../../tests/fixtures/authored-wage-term";
import { smallWorld } from "../../tests/fixtures/small-world";
import { makeIsoDate } from "./dates";
import {
  lifePlaceStateIdentities,
  type LifePlaceStateIdentity,
} from "./life-places";
import {
  CITY_MINIMUM_WAGE_QUESTION_KEY,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
  federalMinimumSchedule,
  federalMinimumHourlyMinorAt,
  minimumWageSettingAt,
  localMinimumSettingAt,
} from "./minimum-wage";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { pickDistinct, SeededRng } from "./rng";

const SEED = "a38-explicit-wage-text-all56";
const places = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);
const enactedAt = makeIsoDate("2026-01-16");
const effectiveAt = makeIsoDate("2026-02-01");

// These controls test reading adopted text. They author no actual passage,
// payroll, or voter decision; the separate play-script steps remain TODO.
describe("A38 adopted federal floor through one reader", () => {
  it.each(places)(
    "reads $17.37 rather than a yes-answer placeholder in $jurisdictionKey",
    (place: LifePlaceStateIdentity) => {
      const { world } = smallWorld({
        place: place.jurisdictionKey,
        date: enactedAt,
        seed: `${SEED}:${place.jurisdictionKey}`,
      });
      expect(federalMinimumHourlyMinorAt(world, enactedAt)).toBe(725);
      const enacted = authoredWageTerm(world, {
        key: `${SEED}:${place.jurisdictionKey}:federal`,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
        answer: "yes",
        effectiveAt,
        designation: "Authored $17.37 control",
        termKey: "floor",
        amountMinor: 1737,
      });
      const before = JSON.stringify(enacted.history);
      expect(federalMinimumSchedule(enacted)).toEqual([]);
      const operative = { ...enacted, currentDate: effectiveAt };
      const expected = [
        {
          from: effectiveAt,
          hourlyMinor: 1737,
          measureId: enacted.history.legislativeMeasures!.at(-1)!.id,
          designation: "Authored $17.37 control",
        },
      ];
      expect(federalMinimumSchedule(operative)).toEqual(expected);
      expect(federalMinimumHourlyMinorAt(operative, effectiveAt)).toBe(1737);
      expect(federalMinimumSchedule(operative)).toEqual(expected);
      // Earlier queries must not freeze a cache shared by later snapshots.
      expect(federalMinimumSchedule(enacted)).toEqual([]);
      expect(JSON.stringify(enacted.history)).toBe(before);
    },
  );

  it("retains canonical starting federal provenance and refuses absent numeric authority", () => {
    const { world, jurisdictionId } = smallWorld({
      place: "MS",
      date: enactedAt,
      seed: `${SEED}:canonical-federal`,
    });
    expect(
      minimumWageSettingAt(world, jurisdictionId, enactedAt),
    ).toMatchObject({
      hourlyMinor: 725,
      level: "federal",
      effectiveAt: makeIsoDate("2009-07-24"),
    });
    const absent = {
      ...world,
      policyCatalog: { ...world.policyCatalog, propositions: {} },
    };
    expect(federalMinimumHourlyMinorAt(absent, enactedAt)).toBeNull();
    expect(minimumWageSettingAt(absent, jurisdictionId, enactedAt)).toBeNull();
    expect(
      federalMinimumHourlyMinorAt(world, makeIsoDate("2009-07-23")),
    ).toBeNull();
  });

  it("keeps a stronger dated state floor above canonical federal text", () => {
    const { world, jurisdictionId } = smallWorld({
      place: "DC",
      date: enactedAt,
      seed: `${SEED}:stronger-state`,
    });
    expect(federalMinimumHourlyMinorAt(world, enactedAt)).toBe(725);
    expect(
      minimumWageSettingAt(world, jurisdictionId, enactedAt),
    ).toMatchObject({
      hourlyMinor: 1795,
      level: "state",
    });
  });

  it("retains distinct adopted amounts for successive yes laws and a later no", () => {
    const { world } = smallWorld({ place: "MS", date: enactedAt, seed: SEED });
    const first = authoredWageTerm(world, {
      key: `${SEED}:first-amount`,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
      answer: "yes",
      effectiveAt,
      designation: "First adopted floor",
      termKey: "floor",
      amountMinor: 1601,
    });
    const firstSnapshot = { ...first, currentDate: effectiveAt };
    expect(
      federalMinimumSchedule(firstSnapshot).map((row) => row.hourlyMinor),
    ).toEqual([1601]);
    const secondDate = makeIsoDate("2026-03-01");
    const second = authoredWageTerm(firstSnapshot, {
      key: `${SEED}:second-amount`,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
      answer: "yes",
      effectiveAt: secondDate,
      designation: "Second adopted floor",
      termKey: "floor",
      amountMinor: 1802,
    });
    const secondSnapshot = { ...second, currentDate: secondDate };
    expect(
      federalMinimumSchedule(secondSnapshot).map((row) => [
        row.from,
        row.hourlyMinor,
      ]),
    ).toEqual([
      [effectiveAt, 1601],
      [secondDate, 1802],
    ]);
    const thirdDate = makeIsoDate("2026-04-01");
    const third = authoredWageTerm(secondSnapshot, {
      key: `${SEED}:third-amount`,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
      answer: "no",
      effectiveAt: thirdDate,
      designation: "Explicit replacement floor",
      termKey: "floor",
      amountMinor: 903,
    });
    expect(
      federalMinimumSchedule({ ...third, currentDate: thirdDate }).map(
        (row) => row.hourlyMinor,
      ),
    ).toEqual([1601, 1802, 903]);
    expect(
      federalMinimumSchedule(firstSnapshot).map((row) => row.hourlyMinor),
    ).toEqual([1601]);
  });

  it("refuses an operative yes without an adopted hourly floor", () => {
    const { world } = smallWorld({
      place: "MS",
      date: effectiveAt,
      seed: SEED,
    });
    const enacted = authoredWageTerm(world, {
      key: `${SEED}:missing`,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
      answer: "yes",
      effectiveAt,
      designation: "No numeric floor",
      termKey: "floor",
      amountMinor: null,
    });
    expect(() => federalMinimumSchedule(enacted)).toThrow(
      "Federal minimum wage requires its adopted floor in minor/hour",
    );
  });
});

describe("A38 adopted city target", () => {
  it("reads the actual target independently of the supplied state base", () => {
    const { world, jurisdictionId } = smallWorld({
      place: "NE",
      date: enactedAt,
      seed: SEED,
    });
    const enacted = authoredWageTerm(world, {
      key: `${SEED}:city`,
      jurisdictionId,
      questionKey: CITY_MINIMUM_WAGE_QUESTION_KEY,
      answer: "yes",
      effectiveAt,
      designation: "Authored $23.41 ordinance",
      termKey: "target",
      amountMinor: 2341,
    });
    expect(
      localMinimumSettingAt(enacted, jurisdictionId, 1500, effectiveAt),
    ).toBeNull();
    const operative = { ...enacted, currentDate: effectiveAt };
    expect(
      localMinimumSettingAt(operative, jurisdictionId, 1500, effectiveAt),
    ).toMatchObject({ hourlyMinor: 2341, level: "local" });
    expect(
      localMinimumSettingAt(operative, jurisdictionId, 1700, effectiveAt)
        ?.hourlyMinor,
    ).toBe(2341);
  });

  it("supplies no local floor without an ordinance", () => {
    const { world, jurisdictionId } = smallWorld({
      place: "NE",
      date: effectiveAt,
      seed: SEED,
    });
    expect(
      localMinimumSettingAt(world, jurisdictionId, 1500, effectiveAt),
    ).toBeNull();
  });

  it("ends the city floor when the actual state's later law removes local authority", () => {
    const { world, jurisdictionId, stateJurisdictionId } = smallWorld({
      place: "NE",
      date: enactedAt,
      seed: SEED,
    });
    const authorized = authoredWageTerm(world, {
      key: `${SEED}:allow-city`,
      jurisdictionId: stateJurisdictionId,
      questionKey: LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
      answer: "yes",
      effectiveAt: enactedAt,
      designation: "Explicit local authority control",
      termKey: "target",
      amountMinor: null,
    });
    const city = authoredWageTerm(authorized, {
      key: `${SEED}:preempted-city`,
      jurisdictionId,
      questionKey: CITY_MINIMUM_WAGE_QUESTION_KEY,
      answer: "yes",
      effectiveAt,
      designation: "Authored city target",
      termKey: "target",
      amountMinor: 2341,
    });
    const operative = { ...city, currentDate: effectiveAt };
    expect(
      localMinimumSettingAt(operative, jurisdictionId, 1500, effectiveAt)
        ?.hourlyMinor,
    ).toBe(2341);
    const preemptedAt = makeIsoDate("2026-03-01");
    const barred = authoredWageTerm(operative, {
      key: `${SEED}:bar-city`,
      jurisdictionId: stateJurisdictionId,
      questionKey: LOCAL_MINIMUM_WAGE_AUTHORITY_QUESTION_KEY,
      answer: "no",
      effectiveAt: preemptedAt,
      designation: "Remove local authority control",
      termKey: "target",
      amountMinor: null,
    });
    const later = { ...barred, currentDate: preemptedAt };
    expect(
      localMinimumSettingAt(later, jurisdictionId, 1500, effectiveAt)
        ?.hourlyMinor,
    ).toBe(2341);
    expect(
      localMinimumSettingAt(later, jurisdictionId, 1500, preemptedAt),
    ).toBeNull();
  });

  it("does not invent a premium for a city yes with no numeric target", () => {
    const { world, jurisdictionId } = smallWorld({
      place: "NE",
      date: effectiveAt,
      seed: SEED,
    });
    const enacted = authoredWageTerm(world, {
      key: `${SEED}:city-missing`,
      jurisdictionId,
      questionKey: CITY_MINIMUM_WAGE_QUESTION_KEY,
      answer: "yes",
      effectiveAt,
      designation: "No numeric city target",
      termKey: "target",
      amountMinor: null,
    });
    expect(
      localMinimumSettingAt(enacted, jurisdictionId, 1500, effectiveAt),
    ).toBeNull();
  });
});

describe("Your Money player script on the receiving payroll graph", () => {
  it.todo("open an employed adult and inspect the saved pay stub");
  it.todo(
    "advance only the clock to payday and reconcile gross, tax, net and employer cash",
  );
  it.todo(
    "pass a numeric wage through the actual desk and retain its authority on the next eligible paycheck",
  );
  it.todo("settle actual bills and inspect the household budget");
  it.todo(
    "join an assessment-linked completed paycheck to the existing noticing and voter reflection consumer",
  );
  it.todo(
    "repeat and Save/Continue without duplicate pay, withholding or reflection",
  );
});
