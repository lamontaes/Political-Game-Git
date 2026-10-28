/**
 * Audit row 7 (docs/reports/real-statistics-in-play-2026-10-27.md): the old
 * core's county median home value, which still feeds the opening's mortgages,
 * town homes and property-tax bases, opens drawn per world (owner, Oct 27:
 * realistic, not real). The seat of one state or territory drawn from all
 * 56, two seeds.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  corePlaceStateIdentities,
  coreSeatOfGovernmentPlace,
} from "../core2/place-lookup";
import { seededUnit } from "../core2/seeded";
import {
  homeValueForJurisdiction,
  publishedHomeValueForJurisdiction,
} from "./county-home-value";

const seed = process.env.REALISTIC_SEED ?? randomBytes(8).toString("hex");
const states = corePlaceStateIdentities();
const state =
  states[
    Math.floor(seededUnit(seed, "county-home-value-world") * states.length)
  ]!;
const place = coreSeatOfGovernmentPlace(state.jurisdictionKey)!.place;
const where = `the seat of ${state.name} (${place.key}), seed ${seed}`;

describe(`the county home value opens drawn per world (${where})`, () => {
  it("differs from the published value and between two worlds", () => {
    const jurisdiction = place.context.jurisdiction.id;
    const real = publishedHomeValueForJurisdiction(jurisdiction).dollars;
    const a = homeValueForJurisdiction(jurisdiction, `${seed}:a`).dollars;
    const b = homeValueForJurisdiction(jurisdiction, `${seed}:b`).dollars;
    expect(a, `${where}: published`).not.toBe(real);
    expect(a, `${where}: other world`).not.toBe(b);
  });
});
