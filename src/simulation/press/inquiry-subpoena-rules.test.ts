import { describe, expect, it } from "vitest";

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
});
