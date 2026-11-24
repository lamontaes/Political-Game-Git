import { describe, expect, it } from "vitest";
import { CountedStore, decodeStore, encodeStore } from "./counted-groups";
import type { PersonInput } from "./types";

const source = {
  tag: "SOURCED",
  asOf: "2026-01-01",
  citation: "test",
} as never;

const person = (id: string, traits: Record<string, number>): PersonInput => ({
  id,
  givenName: "A",
  familyName: "B",
  birthDate: "1990-01-01" as never,
  placeId: "place:test",
  householdId: "hh:test",
  tier: "husk",
  traits,
  liquidMinor: 0,
  livingCostDailyMinor: 0,
  source,
  familyIds: [],
  knownIds: [],
});

const store = () => {
  const s = new CountedStore();
  s.addTraitNames([person("x", { a: 1, b: 2 })]);
  return s;
};

describe("counted traits come back exactly", () => {
  it("reads fractional traits back through trait, traitRecord and packedTraits, and keeps whole ones in the small column", () => {
    const s = store();
    const whole = s.addMember(person("w", { a: 5, b: -127 }), 0);
    const odd = s.addMember(person("f", { a: 0.123456789, b: 3 }), 0);
    const big = s.addMember(person("g", { a: 400.5, b: -2 }), 0);
    expect(s.exactTraits.has(whole)).toBe(false);
    expect(s.exactTraits.has(odd)).toBe(true);
    expect(s.trait(odd, "a")).toBe(0.123456789);
    expect(s.trait(odd, "b")).toBe(3);
    expect(s.traitRecord(odd)).toEqual({ a: 0.123456789, b: 3 });
    expect(s.packedTraits(odd).a).toBe(0.123456789);
    expect(s.packedTraits(odd).b).toBe(3);
    expect(s.traitRecord(big)).toEqual({ a: 400.5, b: -2 });
    expect(s.packedTraits(big).a).toBe(400.5);
    expect(s.traitRecord(whole)).toEqual({ a: 5, b: -127 });
    expect(s.packedTraits(whole).b).toBe(-127);
    expect(s.trait(whole, "a")).toBe(5);
  });

  it("survives encode and decode, whole and exact members both", () => {
    const s = store();
    const whole = s.addMember(person("w", { a: 5, b: 6 }), 0);
    const odd = s.addMember(person("f", { a: -1.5, b: 0.1 }), 0);
    const back = decodeStore(structuredClone(encodeStore(s)));
    expect(back.exactTraits.has(whole)).toBe(false);
    expect(back.traitRecord(odd)).toEqual({ a: -1.5, b: 0.1 });
    expect(back.packedTraits(odd).b).toBe(0.1);
    expect(back.trait(odd, "a")).toBe(-1.5);
    expect(back.traitRecord(whole)).toEqual({ a: 5, b: 6 });
  });

  it("still refuses a trait it does not know, and a value that is not a finite number", () => {
    const s = store();
    expect(() => s.addMember(person("u", { a: 1, zzz: 2 }), 0)).toThrow(
      /Unknown trait for a counted member: zzz/,
    );
    expect(() => s.addMember(person("n", { a: Number.NaN, b: 1 }), 0)).toThrow(
      /not a finite number: a/,
    );
    expect(() =>
      s.addMember(person("i", { a: 1, b: Number.POSITIVE_INFINITY }), 0),
    ).toThrow(/not a finite number: b/);
  });
});
