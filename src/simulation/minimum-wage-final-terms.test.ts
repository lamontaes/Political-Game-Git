import { describe, expect, it } from "vitest";
import { authoredWageTerm } from "../../tests/fixtures/authored-wage-term";
import { smallWorld } from "../../tests/fixtures/small-world";
import { makeIsoDate } from "./dates";
import { lifePlaceStateIdentities } from "./life-places";
import {
  CITY_MINIMUM_WAGE_QUESTION_KEY,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  federalMinimumSchedule,
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
    (place) => {
      const { world } = smallWorld({
        place: place.jurisdictionKey,
        date: enactedAt,
        seed: `${SEED}:${place.jurisdictionKey}`,
      });
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
      expect(federalMinimumSchedule(operative)).toEqual(expected);
      // Earlier queries must not freeze a cache shared by later snapshots.
      expect(federalMinimumSchedule(enacted)).toEqual([]);
      expect(JSON.stringify(enacted.history)).toBe(before);
    },
  );

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
      date: effectiveAt,
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
    ).toMatchObject({ hourlyMinor: 2341, level: "local" });
    expect(
      localMinimumSettingAt(enacted, jurisdictionId, 1700, effectiveAt)
        ?.hourlyMinor,
    ).toBe(2341);
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
