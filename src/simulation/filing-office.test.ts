import { describe, expect, it } from "vitest";
import filingOfficeData from "../../data/research/elections/filing-office.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { localGoverningBodiesForJurisdiction } from "./candidacy";
import { filingOfficeForSeat } from "./filing-office";
import { countyGovernmentUnit } from "./government-units";
import { searchLifePlaces } from "./life-places";
import { municipalRulePackFor } from "./municipal-election-rule-packs";
import { STATES } from "./state-reference";

/**
 * Where a candidate for a local seat files, in all 56 places: one reader, the
 * state's own election-administration rule, and the territories' rows.
 */
function firstLocalSeat(usps: string) {
  for (const place of searchLifePlaces("", 100_000, {
    stateJurisdictionKey: `US-${usps}`,
  })) {
    if (place.scope === "state") continue;
    const seat = localGoverningBodiesForJurisdiction(
      place.context.jurisdiction.id,
    ).find((identity) => identity.seat === "governing-body");
    if (seat) return seat;
  }
  return null;
}

describe("the office a local candidate files with, in all 56 places", () => {
  const { world } = smallWorld({ place: "US-KY", seed: "filing-office-56" });

  it("follows each state's election-administration rule, and the territories' rows", () => {
    let resolved = 0;
    for (const usps of Object.keys(STATES)) {
      const rule = municipalRulePackFor(usps)?.electoral.administration;
      const territory = (
        filingOfficeData.territories as Record<
          string,
          { administration: string; estimatedFrom: string }
        >
      )[usps];
      // Every place has a read rule or a territory row.
      expect(rule?.kind === "known" || territory !== undefined, usps).toBe(
        true,
      );
      const seat = firstLocalSeat(usps);
      if (!seat) continue;
      const office = filingOfficeForSeat(world, seat.officeKey)!;
      expect(office, usps).not.toBeNull();
      resolved += 1;
      expect(office.seatOfficeKey).toBe(seat.officeKey);
      expect(office.governmentName.length, usps).toBeGreaterThan(0);
      expect(office.clerkTitle.length, usps).toBeGreaterThan(0);
      if (rule?.kind === "known") {
        expect(office.administration, usps).toBe(rule.value);
        expect(office.administrationBasis).toEqual({
          kind: "read",
          citation: rule.source.citation,
        });
      } else {
        expect(office.administration, usps).toBe(territory!.administration);
        expect(office.administrationBasis).toEqual({
          kind: "estimated",
          estimatedFrom: territory!.estimatedFrom,
        });
      }
      // A county seat files with the county. A town seat files with the
      // county where the state's rule says the county runs elections and a
      // county government sits above the town; otherwise with the town.
      const county =
        seat.unit.unitType !== "county" && seat.unit.countyGeoid
          ? countyGovernmentUnit(seat.unit.countyGeoid)
          : null;
      const expected =
        seat.unit.unitType === "county"
          ? seat.unit
          : office.administration === "county-election-board-coordinated" &&
              county
            ? county
            : seat.unit;
      expect(office.unit.id, usps).toBe(expected.id);
    }
    // Guam, the Virgin Islands, American Samoa and the Northern Mariana
    // Islands have no local seat on record (see governing-body-seat-age).
    expect(resolved).toBe(52);
  });

  it("is null for an office that is not a local seat", () => {
    expect(
      filingOfficeForSeat(world, "us-ky-general-assembly-v1:house"),
    ).toBeNull();
  });
});
