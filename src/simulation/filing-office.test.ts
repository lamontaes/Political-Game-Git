import { describe, expect, it } from "vitest";
import filingOfficeData from "../../data/research/elections/filing-office.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { localGoverningBodiesForJurisdiction } from "./candidacy";
import { filingOfficeForSeat } from "./filing-office";
import { countyGovernmentUnit } from "./government-units";
import { searchLifePlaces } from "./life-places";
import { municipalRulePackFor } from "./municipal-election-rule-packs";
import { STATES } from "./state-reference";

const OFFICERS = (
  filingOfficeData.filingOfficers as {
    readonly states: Readonly<
      Record<
        string,
        {
          readonly municipal: {
            readonly level: string;
            readonly title: string | null;
            readonly body?: boolean;
            readonly citation: string;
            readonly counterTitle?: string;
          };
          readonly county: {
            readonly title: string | null;
            readonly body?: boolean;
            readonly citation: string;
            readonly counterTitle?: string;
          } | null;
        }
      >
    >;
  }
).states;

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

  it("follows each state's election code for who takes the papers, and the territories' rows", () => {
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
      expect(office.officeTitle.length, usps).toBeGreaterThan(0);
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
      // county where the state's election code sends its papers there and a
      // county government sits above the town; otherwise with the town.
      const officers = OFFICERS[usps];
      // Every state whose local elections a county office runs has its
      // filing officer read from its code.
      if (office.administration === "county-election-board-coordinated")
        expect(officers, usps).toBeDefined();
      const county =
        seat.unit.unitType !== "county" && seat.unit.countyGeoid
          ? countyGovernmentUnit(seat.unit.countyGeoid)
          : null;
      const toCounty =
        seat.unit.unitType !== "county" &&
        officers?.municipal.level === "county" &&
        county !== null;
      const expected =
        seat.unit.unitType === "county"
          ? seat.unit
          : toCounty
            ? county!
            : seat.unit;
      expect(office.unit.id, usps).toBe(expected.id);
      // The office's title is the one the code names, where it names one.
      const row =
        seat.unit.unitType === "county"
          ? officers?.county
          : toCounty || officers?.municipal.level === "municipality"
            ? officers?.municipal
            : null;
      if (row?.title) {
        expect(office.officeTitle, usps).toBe(row.title);
        expect(office.officerCitation, usps).toBe(row.citation);
        // A board's counter is kept by the official read for it, or else by
        // the government's own clerk; never by a person titled as the board.
        if (row.counterTitle)
          expect(office.clerkTitle, usps).toBe(row.counterTitle);
        else if (row.body) expect(office.clerkTitle, usps).not.toBe(row.title);
        else expect(office.clerkTitle, usps).toBe(row.title);
      }
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
