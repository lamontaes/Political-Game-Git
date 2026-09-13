import { describe, expect, it } from "vitest";

import { ageOnDate } from "./dates";
import { createStableId } from "./ids";
import { createStartingPerson } from "./people";
import { resolveStartingBirthday } from "./starting-birthday";
import type { IsoDate } from "./types";

function start(overrides: {
  readonly age?: number;
  readonly birthMonth?: number;
  readonly birthDay?: number;
  readonly currentDate?: IsoDate;
  readonly worldSeed?: string;
}) {
  return createStartingPerson({
    worldId: createStableId("world", "starting-birthday"),
    worldSeed: overrides.worldSeed ?? "starting-birthday-seed",
    currentDate: overrides.currentDate ?? ("2026-06-15" as IsoDate),
    homeJurisdictionId: createStableId("jurisdiction", "anywhere"),
    age: overrides.age ?? 34,
    givenName: "Wren",
    familyName: "Okafor",
    ...(overrides.birthMonth === undefined || overrides.birthDay === undefined
      ? {}
      : { birthMonth: overrides.birthMonth, birthDay: overrides.birthDay }),
  });
}

describe("Starting birthday from age and anniversary", () => {
  it("derives a canonical date of birth that keeps the named age", () => {
    const currentDate = "2026-06-15" as IsoDate;
    const resolved = resolveStartingBirthday({
      currentDate,
      startAge: 34,
      birthMonth: 3,
      birthDay: 15,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.birthDate).toBe("1992-03-15");
    expect(ageOnDate(resolved.birthDate, currentDate)).toBe(34);
  });

  it("keeps the named age when the anniversary has not occurred yet this year", () => {
    const currentDate = "2026-03-15" as IsoDate;
    const resolved = resolveStartingBirthday({
      currentDate,
      startAge: 34,
      birthMonth: 12,
      birthDay: 1,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.birthDate).toBe("1991-12-01");
    expect(ageOnDate(resolved.birthDate, currentDate)).toBe(34);
  });

  it("uses a leap-day birth year when the starting age allows one", () => {
    const currentDate = "2026-06-15" as IsoDate;
    const resolved = resolveStartingBirthday({
      currentDate,
      startAge: 10,
      birthMonth: 2,
      birthDay: 29,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.birthDate).toBe("2016-02-29");
    expect(ageOnDate(resolved.birthDate, currentDate)).toBe(10);
  });

  it("refuses February 29 when neither candidate birth year is a leap year", () => {
    const resolved = resolveStartingBirthday({
      currentDate: "2025-06-15" as IsoDate,
      startAge: 10,
      birthMonth: 2,
      birthDay: 29,
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.message).toContain("February 29");
  });

  it("refuses a day that is never a calendar date", () => {
    const resolved = resolveStartingBirthday({
      currentDate: "2026-06-15" as IsoDate,
      startAge: 34,
      birthMonth: 4,
      birthDay: 31,
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.message).toContain("not a calendar date");
  });

  it("writes the named birthday onto a new starting person without changing a seeded one", () => {
    const seeded = start({ worldSeed: "same-seed" });
    const again = start({ worldSeed: "same-seed" });
    expect(again.birthDate).toBe(seeded.birthDate);

    const named = start({
      worldSeed: "same-seed",
      birthMonth: 7,
      birthDay: 4,
    });
    expect(named.birthDate).toBe("1991-07-04");
    expect(named.birthDate).not.toBe(seeded.birthDate);
    expect(ageOnDate(named.birthDate, "2026-06-15" as IsoDate)).toBe(34);
  });
});
