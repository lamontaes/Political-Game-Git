import { describe, expect, it } from "vitest";
import { PEOPLE_MIND_VERSION } from "../simulation/people-trait-definitions";
import { OPENING_KIN } from "./opening-kin";
import {
  openingTemperaments,
  type TemperamentSubject,
} from "./opening-personality";
import type { IsoDate, PersonId } from "./types";

const seed = "p15-opening-personality";
const startedAt = "2021-01-01" as IsoDate;
const key = (trait: string) => `${PEOPLE_MIND_VERSION}:${trait}`;
const subject = (
  id: string,
  birthDate: string,
  gender: string,
  parents: string[] = [],
): TemperamentSubject => ({
  id: id as PersonId,
  birthDate: birthDate as IsoDate,
  gender,
  parents: parents as PersonId[],
});
const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;
function correlation(a: number[], b: number[]): number {
  const ma = mean(a),
    mb = mean(b);
  let num = 0,
    da = 0,
    db = 0;
  a.forEach((value, i) => {
    num += (value - ma) * (b[i]! - mb);
    da += (value - ma) ** 2;
    db += (b[i]! - mb) ** 2;
  });
  return num / Math.sqrt(da * db);
}

describe("opening temperament", () => {
  const count = 4000;
  const founders = Array.from({ length: count }, (_, i) =>
    subject(`f${i}`, "1981-06-15", i % 2 ? "male" : "female"),
  );

  it("is seed-stable and lands on the owner-accepted 10/20/40/20/10 spread at the reference age", () => {
    const first = openingTemperaments(founders, { seed, startedAt });
    const again = openingTemperaments(founders, { seed, startedAt });
    expect([...again]).toEqual([...first]);
    const other = openingTemperaments(founders, {
      seed: `${seed}:other`,
      startedAt,
    });
    expect([...other]).not.toEqual([...first]);
    const levels = OPENING_KIN.personality.levels.values;
    const expected = [0.1, 0.2, 0.4, 0.2, 0.1];
    for (const row of OPENING_KIN.personality.dimensions) {
      const values = founders.map((f) => first.get(f.id)![key(row.trait)]!);
      levels.forEach((level, i) => {
        const share = values.filter((value) => value === level).length / count;
        // Sex shifts of up to a third of a standard deviation widen the mix slightly.
        expect(
          Math.abs(share - expected[i]!),
          `${row.trait} ${level}`,
        ).toBeLessThan(0.04);
      });
    }
  });

  it("gives many distinct profiles, none held by a large share", () => {
    const traits = openingTemperaments(founders, { seed, startedAt });
    const profiles = new Map<string, number>();
    for (const row of traits.values()) {
      const profile = JSON.stringify(row);
      profiles.set(profile, (profiles.get(profile) ?? 0) + 1);
    }
    expect(profiles.size).toBeGreaterThan(count / 4);
    expect(Math.max(...profiles.values()) / count).toBeLessThan(0.02);
  });

  it("passes a heritable share from parents to children", () => {
    const families = Array.from({ length: count / 2 }, (_, i) => [
      subject(`m${i}`, "1960-03-01", "female"),
      subject(`d${i}`, "1958-03-01", "male"),
      subject(`c${i}`, "1990-03-01", i % 2 ? "male" : "female", [
        `m${i}`,
        `d${i}`,
      ]),
      subject(`u${i}`, "1990-03-01", i % 2 ? "male" : "female"),
    ]).flat();
    const traits = openingTemperaments(families, { seed, startedAt });
    for (const row of OPENING_KIN.personality.dimensions) {
      const at = (id: string) => traits.get(id as PersonId)![key(row.trait)]!;
      const ids = Array.from({ length: count / 2 }, (_, i) => i);
      const mid = ids.map((i) => (at(`m${i}`) + at(`d${i}`)) / 2);
      const child = ids.map((i) => at(`c${i}`));
      const stranger = ids.map((i) => at(`u${i}`));
      expect(correlation(mid, child), row.trait).toBeGreaterThan(0.15);
      expect(Math.abs(correlation(mid, stranger)), row.trait).toBeLessThan(
        0.08,
      );
    }
  });

  it("shifts excitement-seeking down with age and conflict up for men, as the sourced norms do", () => {
    const young = Array.from({ length: count }, (_, i) =>
      subject(`y${i}`, "1996-06-15", i % 2 ? "male" : "female"),
    );
    const old = Array.from({ length: count }, (_, i) =>
      subject(`o${i}`, "1946-06-15", i % 2 ? "male" : "female"),
    );
    const traits = openingTemperaments([...young, ...old], {
      seed,
      startedAt,
    });
    const avg = (rows: TemperamentSubject[], trait: string) =>
      mean(rows.map((row) => traits.get(row.id)![key(trait)]!));
    expect(avg(young, "risk")).toBeGreaterThan(avg(old, "risk") + 0.3);
    const men = [...young, ...old].filter((row) => row.gender === "male");
    const women = [...young, ...old].filter((row) => row.gender === "female");
    expect(avg(men, "conflict")).toBeGreaterThan(avg(women, "conflict") + 0.1);
    expect(avg(men, "risk")).toBeGreaterThan(avg(women, "risk") + 0.1);
  });
});
