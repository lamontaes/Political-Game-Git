import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import type { LawInForce } from "./governing/law-in-force";
import { isLawEffectStamp, lawEffectStamp } from "./law-effect-stamp";
import type { EntityId } from "./types";

const law: LawInForce = {
  answer: "yes",
  measureId: "measure_education" as EntityId,
  origin: "enacted",
  level: "state-statute",
  operativeAt: makeIsoDate("2026-08-01"),
  operativeBasis: "enacted-date",
};
const context = {
  effectKind: "education.enrollment-charge",
  questionKey:
    "us-policy-positions:education.public-funds-for-private-schooling",
  jurisdictionId: "jurisdiction_subject" as EntityId,
  appliedAt: makeIsoDate("2026-09-01"),
  sourceRecordIds: ["enrollment_1", "school_1", "spending_1"] as EntityId[],
};

describe("saved law-effect attribution", () => {
  it("preserves a consumer's canonical law and enrollment/payment chain without changing inputs", () => {
    const before = JSON.stringify({ law, context });
    const stamp = lawEffectStamp(law, context)!;
    expect(stamp.governingLawKey).toBe(law.measureId);
    expect(stamp.source).toBe(law.origin);
    expect(stamp.operativeAt).toBe(law.operativeAt);
    expect(stamp.sourceRecordIds).toEqual(context.sourceRecordIds);
    expect(stamp.sourceRecordIds).not.toBe(context.sourceRecordIds);
    expect(isLawEffectStamp(JSON.parse(JSON.stringify(stamp)))).toBe(true);
    expect(JSON.stringify({ law, context })).toBe(before);
  });
  it("keeps an actual starting-law key separate from enacted measures, including a no answer", () => {
    const starting: LawInForce = {
      ...law,
      answer: "no",
      origin: "in-force-at-start",
      measureId: `starting-law:US:${context.questionKey}` as EntityId,
      level: "federal-statute",
    };
    expect(lawEffectStamp(starting, context)?.governingLawKey).toBe(
      starting.measureId,
    );
    expect(lawEffectStamp(starting, context)?.source).toBe("in-force-at-start");
  });
  it("refuses unknown or future law and malformed saved dates/source identities", () => {
    expect(lawEffectStamp(null, context)).toBeNull();
    expect(
      lawEffectStamp(
        { ...law, operativeAt: makeIsoDate("2027-01-01") },
        context,
      ),
    ).toBeNull();
    const stamp = lawEffectStamp(law, context)!;
    for (const invalid of [
      { ...stamp, appliedAt: "2026-02-30" },
      { ...stamp, source: "in-force-at-start" },
      { ...stamp, governingLawKey: "starting-law:US:question" },
      { ...stamp, sourceRecordIds: [null] },
      { ...stamp, effectKind: "" },
      { ...stamp, version: "law-effect-stamp/v2" },
    ])
      expect(isLawEffectStamp(invalid)).toBe(false);
    expect(isLawEffectStamp({})).toBe(false);
    expect(isLawEffectStamp(null)).toBe(false);
  });
});
