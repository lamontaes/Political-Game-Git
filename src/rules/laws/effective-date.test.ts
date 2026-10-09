import { describe, expect, it } from "vitest";
import {
  statuteEffectiveDateEstimated,
  statuteEffectiveRule,
  stateSessionEnds,
  stateStatuteOperativeAt as legacyStateStatuteOperativeAt,
} from "../../simulation/governing/statute-effective-date";
import { operativeDateForEnactment as legacyOperativeDateForEnactment } from "../../simulation/legislative-effective-date";
import { makeIsoDate } from "../../simulation/dates";
import { STATES } from "../../simulation/state-reference";
import type { LegislativeEnactmentRecord } from "../../simulation/types";
import {
  knownSessionEnds,
  medianSessionEnd,
  operativeDateForEnactment,
  stateStatuteOperativeAt,
} from "./effective-date";

const date = makeIsoDate("2026-03-01");

describe("standalone effective-date rules", () => {
  it.each(Object.keys(STATES).map((usps) => `US-${usps}`))(
    "matches the legacy rule for %s",
    (key) => {
      const rule = statuteEffectiveRule(key);
      if (!rule) return;
      const context = {
        sessionEnds: (year: number) => stateSessionEnds(key, year),
      };
      expect(stateStatuteOperativeAt(rule, date, context), key).toBe(
        legacyStateStatuteOperativeAt(key, date),
      );
    },
  );

  it("preserves enacted dates, source-default absence, and the labeled game default", () => {
    expect(
      operativeDateForEnactment({
        resolvedAt: "2026-01-01",
        effectiveAt: "2026-06-01",
      }),
    ).toEqual({ date: "2026-06-01", basis: "enacted-date" });
    expect(
      operativeDateForEnactment({
        resolvedAt: "2026-01-01",
        effectiveDateBasis: "source-default",
      }),
    ).toBeNull();
    expect(operativeDateForEnactment({ resolvedAt: "2026-01-01" })).toEqual({
      date: "2026-04-01",
      basis: "game-default",
    });
    const legacyDefault = legacyOperativeDateForEnactment({
      resolvedAt: makeIsoDate("2026-01-01"),
      effectiveAt: null,
      effectiveDateBasis: "game-default",
    } as LegislativeEnactmentRecord);
    expect(operativeDateForEnactment({ resolvedAt: "2026-01-01" })).toEqual({
      date: legacyDefault!.date,
      basis: legacyDefault!.basis,
    });
  });

  it("preserves estimated state-rule basis from the place data", () => {
    for (const usps of Object.keys(STATES)) {
      const key = `US-${usps}`;
      const rule = statuteEffectiveRule(key);
      if (!rule) continue;
      const context = {
        sessionEnds: (year: number) => stateSessionEnds(key, year),
      };
      const estimate = statuteEffectiveDateEstimated(key, date);
      const result = operativeDateForEnactment({
        resolvedAt: date,
        stateKey: key,
        stateRule: rule,
        estimatedStateRule: estimate,
        context,
      });
      const expectedDate = legacyStateStatuteOperativeAt(key, date);
      if (expectedDate)
        expect(result).toEqual({
          date: expectedDate,
          basis: estimate ? "estimated-state-rule" : "state-rule",
        });
    }
  });

  it("uses the passage date for a rule that is keyed to final passage", () => {
    const key = "US-IL";
    const rule = statuteEffectiveRule(key)!;
    const context = {
      finalPassageAt: () => makeIsoDate("2026-05-31"),
    };
    expect(stateStatuteOperativeAt(rule, date, context)).toBe(
      legacyStateStatuteOperativeAt(key, date, context),
    );
  });

  it("keeps published adjournments ahead of limits and estimates from the lower median", () => {
    expect(
      knownSessionEnds(
        {
          adjourned: { "2026": { dates: ["2026-05-01", "2026-04-30"] } },
          evenYear: [{ kind: "on", day: { month: 6, day: 1 } }],
        },
        2026,
      ),
    ).toEqual(["2026-04-30", "2026-05-01"]);
    expect(
      medianSessionEnd(
        [
          { evenYear: [{ kind: "on", day: { month: 4, day: 1 } }] },
          { evenYear: [{ kind: "on", day: { month: 5, day: 1 } }] },
          { evenYear: [{ kind: "on", day: { month: 6, day: 1 } }] },
        ],
        2026,
      ),
    ).toEqual(["2026-05-01"]);
  });
});
