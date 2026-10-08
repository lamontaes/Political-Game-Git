import { describe, expect, it } from "vitest";
import governingBodySeatQualification from "../../data/research/local-government/governing-body-seat-qualification.json" with { type: "json" };
import {
  electiveOfficesForJurisdiction,
  localGoverningBodiesForJurisdiction,
} from "./candidacy";
import { searchLifePlaces } from "./life-places";
import { localGoverningBodyIdentityForOfficeKey } from "./nationwide-world/local-governing-body-candidacy-packs";
import { placeLocalGovernmentUnits } from "./nationwide-world/local-governments";
import { STATES } from "./state-reference";

/**
 * The first office on the golden path is a seat on the place's own governing
 * body: a town council, a village board of trustees, a county commission. Its
 * age comes from one row for all 56 places, the qualified-elector age most
 * state codes ask, until a place's own rule is read.
 *
 * Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana
 * Islands have no local governing body in the government-unit list the game
 * reads (the Census of Governments covers the states and Puerto Rico), so a
 * resident there has no such seat to file for: recorded as unsupported, not
 * estimated.
 */
const NO_LOCAL_GOVERNING_BODY = ["AS", "GU", "MP", "VI"];

function firstGoverningBodySeat(usps: string) {
  for (const place of searchLifePlaces("", 100_000, {
    stateJurisdictionKey: `US-${usps}`,
  })) {
    if (place.scope === "state") continue;
    const seat = localGoverningBodiesForJurisdiction(
      place.context.jurisdiction.id,
    ).find((identity) => identity.seat === "governing-body");
    if (seat) return { place, seat };
  }
  return null;
}

describe("a governing-body seat's age, in all 56 places", () => {
  it("is the qualified-elector estimate wherever the place has such a seat", () => {
    const unsupported: string[] = [];
    for (const usps of Object.keys(STATES)) {
      const found = firstGoverningBodySeat(usps);
      if (!found) {
        unsupported.push(usps);
        continue;
      }
      const office = electiveOfficesForJurisdiction(
        found.place.context.jurisdiction.id,
      ).find((option) => option.officeKey === found.seat.officeKey)!;
      const age = office.qualification.minimumAge;
      expect(age.kind, usps).toBe("known");
      if (age.kind !== "known") continue;
      expect(age.value, usps).toBe(governingBodySeatQualification.minimumAge);
      expect(age.source.verification, usps).toBe("game-profile");
      expect(age.source.sourceTitle, usps).toBe(
        "Qualified elector of the place",
      );
      // The key a filing carries names this same seat again, so the
      // eligibility gate and the filing office can find it.
      expect(
        localGoverningBodyIdentityForOfficeKey(found.seat.officeKey)?.unit.id,
        usps,
      ).toBe(found.seat.unit.id);
      expect(office.qualification.minimumAgeEstimate, usps).toMatchObject({
        basis: "qualified-elector-of-the-place",
        jurisdictionKey: `US-${usps}`,
        officeKey: found.seat.officeKey,
        estimatedFrom: governingBodySeatQualification.estimatedFrom,
      });
    }
    expect(unsupported.sort()).toEqual(NO_LOCAL_GOVERNING_BODY);
  });

  it("offers a town or township board seat where a place has no city of its own", () => {
    let checked = 0;
    for (const usps of Object.keys(STATES)) {
      const place = searchLifePlaces("", 100_000, {
        stateJurisdictionKey: `US-${usps}`,
      }).find((candidate) => {
        if (candidate.scope === "state") return false;
        const units = placeLocalGovernmentUnits(candidate);
        return units.municipal.length === 0 && units.townships.length > 0;
      });
      if (!place) continue;
      checked += 1;
      const township = placeLocalGovernmentUnits(place).townships[0]!;
      const seat = localGoverningBodiesForJurisdiction(
        place.context.jurisdiction.id,
      ).find(
        (identity) =>
          identity.unit.id === township.id &&
          identity.seat === "governing-body",
      );
      expect(seat, `${usps} ${place.key}`).toBeDefined();
      const office = electiveOfficesForJurisdiction(
        place.context.jurisdiction.id,
      ).find((option) => option.officeKey === seat!.officeKey)!;
      expect(office.qualification.minimumAgeEstimate?.basis, usps).toBe(
        "qualified-elector-of-the-place",
      );
    }
    // Towns and townships govern in the New England and Midwest states.
    expect(checked).toBeGreaterThan(5);
  });

  it("rests on read state codes and the national voting age", () => {
    expect(governingBodySeatQualification.minimumAge).toBe(18);
    expect(governingBodySeatQualification.examples.length).toBeGreaterThan(2);
    for (const example of governingBodySeatQualification.examples) {
      expect(Object.keys(STATES)).toContain(example.place);
      expect(example.url).toMatch(/^https:\/\//);
      expect(governingBodySeatQualification.estimatedFrom).toContain(
        example.citation.split(/[ :,]/)[0]!,
      );
    }
  });
});
