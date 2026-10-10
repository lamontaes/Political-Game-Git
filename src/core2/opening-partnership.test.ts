import { describe, expect, it } from "vitest";
import {
  drawAdultAge,
  partnerAgedHousehold,
  OPENING_PARTNERSHIP,
  partneredByAge,
  partnershipGeo,
} from "./opening-partnership";

describe("opening partnership chain", () => {
  const nation = partnershipGeo(null);

  it("falls back from place to state to nation", () => {
    expect(nation.key).toBe(OPENING_PARTNERSHIP.nationalKey);
    const state = Object.keys(OPENING_PARTNERSHIP.geos).find(
      (key) => key.length === 2,
    )!;
    // A place too small for the 1-year survey reads its state.
    expect(partnershipGeo(`${state}99999`).key).toBe(state);
    // A territory outside the survey reads the nation.
    expect(partnershipGeo("6600000").key).toBe(OPENING_PARTNERSHIP.nationalKey);
  });

  it("rises with first marriages and falls with widowhood, faster for women", () => {
    const women = partneredByAge(nation.key, nation.rows, "female");
    const men = partneredByAge(nation.key, nation.rows, "male");
    expect(women[20]!).toBeLessThan(women[40]!);
    expect(men[20]!).toBeLessThan(men[50]!);
    expect(women[85]!).toBeLessThan(women[60]!);
    expect(women[85]!).toBeLessThan(men[85]!);
    for (const value of [...women, ...men]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("draws the same age for the same person and keeps it inside the role's bounds", () => {
    const input = {
      seed: "p15-partnership",
      key: "household:1:person:0",
      geo: nation,
      sex: "female" as const,
      arrangement: "alone" as const,
      minimum: 20,
      maximumExclusive: 90,
    };
    const age = drawAdultAge(input);
    expect(drawAdultAge(input)).toBe(age);
    expect(age).toBeGreaterThanOrEqual(20);
    expect(age).toBeLessThan(90);
    const alone = Array.from({ length: 400 }, (_, i) =>
      drawAdultAge({ ...input, key: `person:${i}` }),
    );
    const couple = Array.from({ length: 400 }, (_, i) =>
      drawAdultAge({ ...input, key: `person:${i}`, arrangement: "partnered" }),
    );
    const share = (ages: number[]) =>
      ages.filter((value) => value >= 75).length / ages.length;
    // Women 75 and over are far more often widowed and alone than in a couple.
    expect(share(alone)).toBeGreaterThan(share(couple));
  });
});

describe("opening household ages", () => {
  const nation = partnershipGeo(null);
  const person = (key: string, gender: string) => ({
    stableKey: key,
    givenName: "A",
    familyName: `Family ${key}`,
    birthDate: "1970-01-01",
    identity: { gender },
  });
  const age = (
    shape: string,
    members: { age: number; role: "adult" | "child" }[],
    genders: string[],
    index: number,
  ) =>
    partnerAgedHousehold({
      seed: "p15-household-ages",
      geo: nation,
      skeleton: { index, shape, members },
      people: genders.map((gender, n) => person(`h${index}:p${n}`, gender)),
      rebirth: (row, years) => ({ ...row, birthDate: `${2021 - years}-01-01` }),
    });
  const range = Array.from({ length: 600 }, (_, i) => i);

  it("makes husbands older on average, with a long tail, from the CPS gap", () => {
    const gaps = range.map((i) => {
      const { skeleton } = age(
        "couple",
        [
          { age: 40, role: "adult" },
          { age: 40, role: "adult" },
        ],
        i % 2 ? ["male", "female"] : ["female", "male"],
        i,
      );
      const [a, b] = skeleton.members.map((member) => member.age);
      return i % 2 ? a! - b! : b! - a!;
    });
    const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    expect(mean).toBeGreaterThan(1);
    expect(mean).toBeLessThan(4);
    expect(gaps.some((gap) => gap >= 10)).toBe(true);
    expect(gaps.some((gap) => gap <= -4)).toBe(true);
  });

  it("seats single parents, housemates and a parent with a grown child past the old windows", () => {
    const parents = range.map(
      (i) =>
        age(
          "parent-with-children",
          [
            { age: 30, role: "adult" },
            { age: 5, role: "child" },
          ],
          ["female", "male"],
          i,
        ).skeleton.members,
    );
    // Single parents older than the old 52-year cap, and every child born when the parent was 15 or older.
    expect(parents.some(([parent]) => parent!.age > 52)).toBe(true);
    for (const [parent, child] of parents) {
      expect(child!.age).toBeLessThan(18);
      expect(parent!.age - child!.age).toBeGreaterThanOrEqual(15);
    }
    const housemates = range.map((i) =>
      age(
        "housemates",
        [
          { age: 25, role: "adult" },
          { age: 25, role: "adult" },
        ],
        ["female", "male"],
        i,
      ),
    );
    const related = housemates.filter((row) => row.grownChild === 1);
    const unrelated = housemates.filter((row) => row.grownChild === undefined);
    expect(related.length).toBeGreaterThan(0);
    expect(unrelated.length).toBeGreaterThan(0);
    // Housemates older than the old 40-year cap.
    expect(
      unrelated.some((row) => row.skeleton.members.some((m) => m.age > 40)),
    ).toBe(true);
    for (const row of related) {
      const [parent, child] = row.skeleton.members;
      expect(child!.age).toBeGreaterThanOrEqual(18);
      expect(parent!.age - child!.age).toBeGreaterThanOrEqual(15);
      expect(row.people[1]!.familyName).toBe(row.people[0]!.familyName);
    }
    expect(related.some((row) => row.skeleton.members[0]!.age >= 65)).toBe(
      true,
    );
  });
});
