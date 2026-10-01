import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { EntityId } from "../types";
import {
  memberFilingCap,
  type MemberBillLimitRow,
  type MemberBillLimitsTable,
  type MemberFilingCapInput,
  type MemberFilingCapMeasure,
} from "./member-filing-caps";

// Authored legal controls, not sourced production limits for any place.
const input: MemberFilingCapInput = {
  place: "controlled-place",
  jurisdictionId: "controlled-jurisdiction" as EntityId,
  chamberKey: "house",
  sponsorPersonId: "controlled-member" as EntityId,
  subjectClass: "general-policy",
  introducedAt: makeIsoDate("2027-02-01"),
  numberingSession: {
    key: "2027",
    label: "Controlled session",
    fullDesignation: "HB 3",
  },
};
const row: MemberBillLimitRow = {
  place: input.place,
  chamber: "house",
  limit: 2,
  period: "session",
  exempts: [],
  status: "sourced",
  citation: "Authored test rule",
  url: "https://example.com/test-rule",
  quote: "Controlled two-bill limit.",
  note: "Not production research.",
};
const table = (rows: readonly MemberBillLimitRow[]): MemberBillLimitsTable => ({
  version: "member-bill-limits-2026-v1",
  rows,
});
const bill = (
  changes: Partial<MemberFilingCapMeasure> = {},
): MemberFilingCapMeasure => ({
  jurisdictionId: input.jurisdictionId,
  sponsorPersonId: input.sponsorPersonId,
  originChamberKey: input.chamberKey,
  introducedAt: input.introducedAt,
  subjectClass: input.subjectClass,
  numberingSession: input.numberingSession,
  ...changes,
});

describe("sourced member bill cap reader", () => {
  it("leaves empty, absent, unread and no-limit rows uncapped", () => {
    const many = Array.from({ length: 10 }, () => bill());
    for (const rows of [
      [],
      [{ ...row, place: "another-place" }],

      [{ ...row, status: "no-limit-found" as const }],
      [{ ...row, limit: null }],
    ])
      expect(memberFilingCap(many, input, table(rows))).toEqual({
        allowed: true,
        reason: "no-recorded-cap",
      });
    expect(
      memberFilingCap(many, input, table([{ ...row, status: "unread" }])),
    ).toEqual({ allowed: true, reason: "unread-cap" });
    expect(memberFilingCap(many, input)).toEqual({
      allowed: true,
      reason: "no-recorded-cap",
    });
  });
  it("counts only the actual sponsor, jurisdiction, chamber and recorded session", () => {
    const others = [
      bill({ sponsorPersonId: "other-member" as EntityId }),
      bill({ jurisdictionId: "other-jurisdiction" as EntityId }),
      bill({ originChamberKey: "senate" }),
      bill({ numberingSession: { ...input.numberingSession, key: "2026" } }),
      bill({ introducedAt: makeIsoDate("2027-03-01") }),
    ];
    expect(
      memberFilingCap([...others, bill()], input, table([row])).allowed,
    ).toBe(true);
    expect(
      memberFilingCap([...others, bill(), bill()], input, table([row])),
    ).toEqual({
      allowed: false,
      reason: "cap-reached",
      citation: row.citation,
    });
  });
  it("applies a joint row across both chambers and honors declared subject exemptions", () => {
    const joint = {
      ...row,
      chamber: "joint" as const,
      exempts: ["appropriation"],
    };
    expect(
      memberFilingCap(
        [
          bill(),
          bill({ originChamberKey: "senate" }),
          bill({ subjectClass: "appropriation" }),
        ],
        input,
        table([joint]),
      ).allowed,
    ).toBe(false);
    expect(
      memberFilingCap(
        [bill(), bill()],
        { ...input, subjectClass: "appropriation" },
        table([joint]),
      ),
    ).toEqual({ allowed: true, reason: "exempt" });
    expect(
      memberFilingCap(
        [bill(), bill({ subjectClass: "appropriation" })],
        input,
        table([joint]),
      ).allowed,
    ).toBe(true);
  });
  it("reads a unicameral limit for its existing legislature key", () => {
    const unicameral = { ...input, chamberKey: "legislature" };
    expect(
      memberFilingCap(
        [
          bill({ originChamberKey: "legislature" }),
          bill({ originChamberKey: "legislature" }),
        ],
        unicameral,
        table([{ ...row, chamber: "unicameral" }]),
      ).allowed,
    ).toBe(false);
  });
  it("counts annual limits by actual introduction date without a session guess", () => {
    expect(
      memberFilingCap(
        [
          bill({ introducedAt: makeIsoDate("2026-02-01") }),
          bill({ numberingSession: undefined }),
        ],
        input,
        table([{ ...row, period: "year" }]),
      ).allowed,
    ).toBe(true);
    expect(
      memberFilingCap(
        [bill(), bill()],
        input,
        table([{ ...row, period: "year" }]),
      ).allowed,
    ).toBe(false);
  });
  it("requires an actual biennium window instead of inferring parity", () => {
    const limits = table([{ ...row, period: "biennium" }]);
    expect(memberFilingCap([], input, limits)).toMatchObject({
      allowed: false,
      reason: "unbound-rule",
    });
    const dated = {
      ...input,
      bienniumWindow: {
        start: makeIsoDate("2026-01-01"),
        end: makeIsoDate("2027-12-31"),
      },
    };
    expect(
      memberFilingCap(
        [bill({ introducedAt: makeIsoDate("2026-02-01") }), bill()],
        dated,
        limits,
      ),
    ).toMatchObject({ allowed: false, reason: "cap-reached" });
  });
  it("refuses unbound exemption prose and missing historical session evidence", () => {
    expect(
      memberFilingCap([], input, table([{ ...row, exempts: ["local bills"] }])),
    ).toMatchObject({ allowed: false, reason: "unbound-rule" });
    expect(
      memberFilingCap(
        [bill({ numberingSession: undefined })],
        input,
        table([row]),
      ),
    ).toMatchObject({ allowed: false, reason: "unbound-rule" });
    expect(
      memberFilingCap([], input, table([{ ...row, limit: -1 }])),
    ).toMatchObject({ allowed: false, reason: "unbound-rule" });
  });
  it("does not let an exemption in one row override another applicable cap", () => {
    expect(
      memberFilingCap(
        [bill(), bill()],
        input,
        table([
          { ...row, exempts: ["general-policy"] },
          { ...row, chamber: "joint" },
        ]),
      ),
    ).toMatchObject({ allowed: false, reason: "cap-reached" });
  });
  it("labels quoted unbound exemptions without silently applying or dropping them", () => {
    const limits = table([{ ...row, unboundExemptions: ["local bills"] }]);
    expect(memberFilingCap([bill()], input, limits)).toEqual({
      allowed: true,
      reason: "within-cap",
      unboundExemptions: ["local bills"],
    });
    expect(memberFilingCap([bill(), bill()], input, limits)).toEqual({
      allowed: false,
      reason: "unbound-rule",
      citation: row.citation,
      unboundExemptions: ["local bills"],
    });
    expect(
      memberFilingCap(
        [bill(), bill()],
        input,
        table([
          {
            ...row,
            exempts: ["general-policy"],
            unboundExemptions: ["local bills"],
          },
        ]),
      ),
    ).toEqual({
      allowed: true,
      reason: "exempt",
      unboundExemptions: ["local bills"],
    });
  });
});
