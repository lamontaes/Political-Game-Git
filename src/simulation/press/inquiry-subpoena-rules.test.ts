import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../life-places";
import { municipalGovernments } from "../municipal-government";

import {
  inquirySubpoenaRuleFor,
  municipalInquirySubpoenaRule,
} from "./inquiry-subpoena-rules";

describe("inquiry subpoena rules", () => {
  it("separates federal authority from explicitly estimated state body rows", () => {
    expect(inquirySubpoenaRuleFor("congressional-committee")).toMatchObject({
      subpoenaPower: true,
      basis: "known",
      citation: "2 U.S.C. § 192",
    });
    expect(inquirySubpoenaRuleFor("state-legislature")).toMatchObject({
      subpoenaPower: true,
      basis: "estimated",
    });
    expect(inquirySubpoenaRuleFor("state-ethics-board")).toMatchObject({
      subpoenaPower: true,
      basis: "estimated",
    });
  });

  it("grants municipal subpoena authority only when its compiled record says so", () => {
    expect(
      municipalInquirySubpoenaRule(["INQUIRY_SUBPOENA"]).subpoenaPower,
    ).toBe(true);
    expect(municipalInquirySubpoenaRule([]).subpoenaPower).toBe(false);
  });

  it("keeps compiled local powers separate from state estimates across all 56 places", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    const governments = municipalGovernments();
    for (const place of places) {
      const stateRule = inquirySubpoenaRuleFor("state-legislature");
      expect(stateRule, place.usps).toMatchObject({
        basis: "estimated",
        estimatedFrom: expect.stringContaining("NCSL"),
        sourceUrl: expect.stringMatching(/^https:\/\//),
      });
      const readings = governments
        .filter((government) => government.state === place.usps)
        .flatMap((government) => government.readings);
      for (const reading of readings) {
        const held = reading.powers
          .filter((row) => row.heldState === "KNOWN" && row.held === true)
          .map((row) => row.power);
        const rule = municipalInquirySubpoenaRule(held);
        if (rule.subpoenaPower)
          expect(reading.powers, `${place.usps}:${reading.key}`).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                power: "INQUIRY_SUBPOENA",
                heldState: "KNOWN",
                held: true,
              }),
            ]),
          );
        expect(
          municipalInquirySubpoenaRule(
            held.filter((power) => power !== "INQUIRY_SUBPOENA"),
          ).subpoenaPower,
          place.usps,
        ).toBe(false);
      }
      // An absent local reading never inherits the estimated state power.
      expect(municipalInquirySubpoenaRule([]).subpoenaPower, place.usps).toBe(
        false,
      );
    }
  });
});
