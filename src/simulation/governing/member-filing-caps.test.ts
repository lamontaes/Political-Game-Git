import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import actualTable from "../../../data/research/legislature/member-bill-limits-2026.json" with { type: "json" };
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
  origin: "member-introduction",
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
  applied: true,
  exemptionBindings: [{ kind: "period", window: "session" }],
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
  origin: input.origin,
  numberingSession: input.numberingSession,
  ...changes,
});

describe("sourced member bill cap reader", () => {
  it("reads the two admitted production rows and skips all 23 unbound rows", () => {
    const data = actualTable as MemberBillLimitsTable;
    const sourced = data.rows.filter((item) => item.status === "sourced");
    expect(sourced.filter((item) => item.applied)).toHaveLength(2);
    expect(sourced.filter((item) => !item.applied)).toHaveLength(23);
    for (const item of sourced) {
      const binding = item.exemptionBindings!.find(
        (part) => part.kind === "period",
      )!;
      const even =
        binding.kind === "period" &&
        binding.condition?.kind === "calendar-year-parity" &&
        binding.condition.parity === "even";
      const date = makeIsoDate(even ? "2026-02-01" : "2027-02-01");
      const context = {
        ...input,
        place: item.place,
        chamberKey:
          item.chamber === "joint"
            ? "house"
            : item.chamber === "unicameral"
              ? "legislature"
              : item.chamber,
        introducedAt: date,
      };
      const records = Array.from({ length: item.limit! + 1 }, () =>
        bill({ introducedAt: date, originChamberKey: context.chamberKey }),
      );
      const result = memberFilingCap(records, context, data);
      if (item.applied)
        expect(result).toMatchObject({
          allowed: false,
          reason: "cap-reached",
          citation: item.citation,
        });
      else {
        expect(result).toMatchObject({
          allowed: true,
          reason: "exemption-unread",
        });
        expect(
          result.notAppliedLimits!.some(
            (part) =>
              part.quote === item.quote &&
              part.detail === item.notAppliedReason,
          ),
        ).toBe(true);
      }
    }
  });
  it("uses actual sponsor origins and subject tokens from the admitted source", () => {
    const data = actualTable as MemberBillLimitsTable;
    const source = data.rows.find(
      (item) =>
        item.applied &&
        item.exemptionBindings?.some((part) => part.kind === "sponsor"),
    )!;
    const context = { ...input, place: source.place };
    const references = Array.from({ length: source.limit! }, () =>
      bill({ origin: "committee-introduction" }),
    );
    expect(memberFilingCap(references, context, data)).toMatchObject({
      allowed: true,
      reason: "within-cap",
    });
    const full = Array.from({ length: source.limit! }, () => bill());
    expect(
      memberFilingCap(
        full,
        { ...context, origin: "committee-introduction" },
        data,
      ),
    ).toMatchObject({ allowed: true, reason: "exempt" });
    expect(
      memberFilingCap(
        full,
        { ...context, subjectClass: "appropriation" },
        data,
      ),
    ).toMatchObject({ allowed: true, reason: "exempt" });
  });
  it("selects the recorded odd-year condition without applying its unread even-year row", () => {
    const data = actualTable as MemberBillLimitsTable;
    const source = data.rows.find(
      (item) =>
        item.applied &&
        item.exemptionBindings?.some(
          (part) =>
            part.kind === "period" &&
            part.condition?.kind === "calendar-year-parity",
        ),
    )!;
    const context = { ...input, place: source.place };
    const full = Array.from({ length: source.limit! }, () => bill());
    expect(memberFilingCap(full, context, data)).toMatchObject({
      allowed: false,
      reason: "cap-reached",
    });
    const even = makeIsoDate("2026-02-01");
    expect(
      memberFilingCap(
        full.map((item) => ({ ...item, introducedAt: even })),
        { ...context, introducedAt: even },
        data,
      ),
    ).toMatchObject({ allowed: true, reason: "exemption-unread" });
  });
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
        table([
          {
            ...row,
            period: "year",
            exemptionBindings: [{ kind: "period", window: "year" }],
          },
        ]),
      ).allowed,
    ).toBe(true);
    expect(
      memberFilingCap(
        [bill(), bill()],
        input,
        table([
          {
            ...row,
            period: "year",
            exemptionBindings: [{ kind: "period", window: "year" }],
          },
        ]),
      ).allowed,
    ).toBe(false);
  });
  it("requires an actual biennium window instead of inferring parity", () => {
    const limits = table([
      {
        ...row,
        period: "biennium",
        exemptionBindings: [{ kind: "period", window: "biennium" }],
      },
    ]);
    expect(memberFilingCap([], input, limits)).toMatchObject({
      allowed: true,
      reason: "exemption-unread",
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
  it("does not apply unbound exemption prose or missing historical session evidence", () => {
    expect(
      memberFilingCap([], input, table([{ ...row, exempts: ["local bills"] }])),
    ).toMatchObject({ allowed: true, reason: "exemption-unread" });
    expect(
      memberFilingCap(
        [bill({ numberingSession: undefined })],
        input,
        table([row]),
      ),
    ).toMatchObject({ allowed: true, reason: "exemption-unread" });
    expect(
      memberFilingCap([], input, table([{ ...row, limit: -1 }])),
    ).toMatchObject({ allowed: false, reason: "unbound-rule" });
  });
  it("does not apply competing conditional rows without an actual selector", () => {
    const result = memberFilingCap(
      [bill(), bill()],
      input,
      table([
        { ...row, limit: 1 },
        { ...row, chamber: "joint", limit: 5 },
      ]),
    );
    expect(result).toMatchObject({ allowed: true, reason: "exemption-unread" });
    expect(result.notAppliedLimits).toHaveLength(2);
    expect(
      result.notAppliedLimits!.every(
        (item) => item.message === "limit not applied: exemption unread",
      ),
    ).toBe(true);
  });
  it("does not apply a whole sourced row with any unread exemption, even at the cap", () => {
    const limits = table([{ ...row, unboundExemptions: ["local bills"] }]);
    for (const measures of [
      [],
      [bill()],
      [bill(), bill()],
      Array.from({ length: 20 }, () => bill()),
    ]) {
      expect(memberFilingCap(measures, input, limits)).toMatchObject({
        allowed: true,
        reason: "exemption-unread",
        unboundExemptions: ["local bills"],
        notAppliedLimits: [
          {
            citation: row.citation,
            quote: row.quote,
            message: "limit not applied: exemption unread",
          },
        ],
      });
    }
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
    ).toMatchObject({ allowed: true, reason: "exemption-unread" });
  });
});
