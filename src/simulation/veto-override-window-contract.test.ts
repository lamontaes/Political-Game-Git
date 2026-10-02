import { describe, expect, it } from "vitest";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import {
  assertRulePackIntegrity,
  knownRule,
  notApplicableRule,
  unknownRule,
  type ExecutiveRule,
  type LegislativeRulePack,
  type RuleSourceRef,
} from "./legislature-rules";

type Window = NonNullable<ExecutiveRule["vetoOverrideWindow"]>;
const SOURCE: RuleSourceRef = {
  authority: "statute",
  citation: "Controlled override-window schema fixture",
  sourceTitle: "Fictional schema source, not a jurisdiction's deadline",
  sourceUrl: "https://example.invalid/a82/schema-fixture",
  retrievedAt: "2026-10-02",
  verification: "verified",
  note: "Structural contract only; no actual override deadline is admitted.",
};

function withWindow(
  pack: LegislativeRulePack,
  window: Window,
): LegislativeRulePack {
  return {
    ...pack,
    executive: { ...pack.executive, vetoOverrideWindow: window },
  };
}

describe("A82 optional source-backed veto override window contract", () => {
  it.each(LEGISLATIVE_RULE_PACKS.map((pack) => [pack.packId, pack] as const))(
    "%s preserves absent, unresolved and not-applicable periods",
    (_id, pack) => {
      expect(() => assertRulePackIntegrity(pack)).not.toThrow();
      expect(Object.hasOwn(pack.executive, "vetoOverrideWindow")).toBe(false);
      const unresolved = unknownRule(
        "The override period has not been sourced.",
      );
      const absent = notApplicableRule<never>(
        "No override deadline exists in this controlled case.",
      );
      expect(() =>
        assertRulePackIntegrity(withWindow(pack, unresolved)),
      ).not.toThrow();
      expect(() =>
        assertRulePackIntegrity(withWindow(pack, absent)),
      ).not.toThrow();
      expect(unresolved).not.toHaveProperty("value");
      expect(absent).not.toHaveProperty("value");
    },
  );

  it.each(LEGISLATIVE_RULE_PACKS.map((pack) => [pack.packId, pack] as const))(
    "%s keeps both day bases and actual event anchors distinct",
    (_id, pack) => {
      for (const dayBasis of ["CALENDAR", "BUSINESS"] as const) {
        for (const anchor of ["executive-return", "clerk-receipt"] as const) {
          const window = knownRule({ days: 0, dayBasis, anchor }, SOURCE);
          const admitted = withWindow(pack, window);
          expect(() => assertRulePackIntegrity(admitted)).not.toThrow();
          expect(admitted.executive.vetoOverrideWindow).toBe(window);
          expect(admitted.executive.vetoOverrideWindow).toMatchObject({
            kind: "known",
            value: { days: 0, dayBasis, anchor },
            source: SOURCE,
          });
        }
      }
    },
  );

  it.each(LEGISLATIVE_RULE_PACKS.map((pack) => [pack.packId, pack] as const))(
    "%s rejects corrupt saved periods and unsupported provenance",
    (_id, pack) => {
      const original = knownRule(
        {
          days: 2,
          dayBasis: "CALENDAR" as const,
          anchor: "executive-return" as const,
        },
        SOURCE,
      );
      for (const days of [
        -1,
        0.5,
        NaN,
        Infinity,
        Number.MAX_SAFE_INTEGER + 1,
      ]) {
        expect(() =>
          assertRulePackIntegrity(
            withWindow(pack, {
              ...original,
              value: { ...original.value, days },
            }),
          ),
        ).toThrow(/whole days/);
      }
      for (const invalid of [
        null,
        { ...original, value: { ...original.value, dayBasis: "WEEKDAYS" } },
        { ...original, value: { ...original.value, anchor: "veto-issued" } },
        { ...original, source: { ...SOURCE, citation: "" } },
        { kind: "unknown", note: "" },
      ]) {
        // Deliberately corrupt loaded data must pass the runtime integrity boundary.
        const corrupt = {
          ...pack,
          executive: { ...pack.executive, vetoOverrideWindow: invalid },
        };
        expect(() =>
          assertRulePackIntegrity(corrupt as LegislativeRulePack),
        ).toThrow();
      }
    },
  );

  it.todo(
    "actual source-backed override deadlines and event-anchor routes in all 56 jurisdictions belong to the Team8 consumer/data proof",
  );
});
