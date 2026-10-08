import { describe, expect, it } from "vitest";
import { enactedTaxFixture } from "../../tests/fixtures/tax-policy-fixture";
import { makeIsoDate } from "./dates";
import { MARYLAND_RULE_PACK } from "./legislature-rule-packs";
import { knownRule, type LegislativeRulePack } from "./legislature-rules";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  stateStatuteOperativeAt,
  resolveLegislativeEffectiveDate,
  operativeDateForEnactment,
  resolveCouncilEffectiveDate,
  resolveTaxEffectiveDate,
} from "./legislative-effective-date";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";

// Captured from the pre-consolidation implementation at 1a2976660.
const ORIGINAL_STATE_DATES: Readonly<Record<string, string>> = {
  AL: "2026-07-09",
  AK: "2026-06-13",
  AZ: "2026-09-12",
  AR: "2026-07-29",
  CA: "2027-01-01",
  CO: "2026-03-15",
  CT: "2026-10-01",
  DE: "2026-03-15",
  DC: "2026-07-15",
  FL: "2026-05-12",
  GA: "2026-07-01",
  HI: "2026-08-07",
  ID: "2026-07-01",
  IL: "2027-01-01",
  IN: "2026-07-01",
  IA: "2026-07-01",
  KS: "2026-07-10",
  KY: "2026-07-15",
  LA: "2026-08-01",
  ME: "2026-07-29",
  MD: "2026-06-01",
  MA: "2026-06-13",
  MI: "2026-07-15",
  MN: "2026-08-01",
  MS: "2026-05-14",
  MO: "2026-08-28",
  MT: "2026-10-01",
  NE: "2026-07-18",
  NV: "2026-10-01",
  NH: "2026-05-14",
  NJ: "2026-07-04",
  NM: "2026-05-20",
  NY: "2026-04-04",
  NC: "2026-06-14",
  ND: "2026-08-01",
  OH: "2026-06-13",
  OK: "2026-08-12",
  OR: "2027-01-01",
  PA: "2026-05-14",
  RI: "2026-07-01",
  SC: "2026-04-04",
  SD: "2026-07-01",
  TN: "2026-04-24",
  TX: "2026-06-14",
  UT: "2026-05-06",
  VT: "2026-07-01",
  VA: "2026-07-01",
  WA: "2026-06-11",
  WV: "2026-06-13",
  WI: "2026-03-17",
  WY: "2026-06-09",
  PR: "2026-03-15",
  GU: "2026-03-15",
  VI: "2026-03-15",
  AS: "2026-04-26",
  MP: "2026-03-15",
};
const enactedAt = makeIsoDate("2026-03-15");
const context = { finalPassageAt: () => makeIsoDate("2026-03-10") };
function localFixture(
  usps: string,
  level: string,
  days: number,
): LegislativeRulePack {
  const source = {
    ...MARYLAND_RULE_PACK.enactment.source,
    authority: "game-profile" as const,
    verification: "game-profile" as const,
  };
  return {
    ...MARYLAND_RULE_PACK,
    packId: `date-fixture:${level}:${usps}`,
    jurisdictionKey: `US-${usps}`,
    enactment: {
      ...MARYLAND_RULE_PACK.enactment,
      defaultEffectiveSchedule: knownRule(
        { kind: "days-after-enactment", days },
        source,
      ),
    },
  };
}

describe("one date evaluator preserves body rules", () => {
  it("covers all 56 jurisdiction keys in the original date baseline", () => {
    expect(Object.keys(ORIGINAL_STATE_DATES).sort()).toEqual(
      [...CHIEF_EXECUTIVE_JURISDICTIONS].sort(),
    );
  });
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "%s retains its state date and both local pack delays",
    (usps) => {
      expect(stateStatuteOperativeAt(`US-${usps}`, enactedAt, context)).toBe(
        ORIGINAL_STATE_DATES[usps],
      );
      // Explicit fixture packs prove a surrounding state never overrides a
      // county/city declaration; they do not invent territorial local bodies.
      for (const level of ["county", "city"]) {
        expect(
          resolveLegislativeEffectiveDate(
            localFixture(usps, level, 30),
            enactedAt,
            context,
          ).effectiveAt,
        ).toBe("2026-04-14");
        expect(
          resolveLegislativeEffectiveDate(
            localFixture(usps, level, 0),
            enactedAt,
            context,
          ).effectiveAt,
        ).toBe(enactedAt);
      }
    },
  );
  it("uses an emergency date only when the pack declares it and the act invokes it", () => {
    const pack = localFixture("AK", "city", 30);
    const emergency = {
      ...pack,
      enactment: {
        ...pack.enactment,
        emergencyEffectiveSchedule: knownRule(
          { kind: "days-after-enactment" as const, days: 0 },
          pack.enactment.source,
        ),
      },
    };
    expect(
      resolveLegislativeEffectiveDate(emergency, enactedAt, { emergency: true })
        .effectiveAt,
    ).toBe(enactedAt);
    expect(
      resolveLegislativeEffectiveDate(emergency, enactedAt).effectiveAt,
    ).toBe("2026-04-14");
    expect(
      resolveLegislativeEffectiveDate(pack, enactedAt, { emergency: true })
        .effectiveAt,
    ).toBe("2026-04-14");
  });
  it("keeps ordinary and criminal D.C. review periods and a tax text's later date", () => {
    const rules = municipalRulePackFor(
      municipalGovernmentByKey("us-dc-washington")!,
    );
    if (!rules.ok) throw new Error("Expected the compiled Council pack.");
    expect(
      resolveCouncilEffectiveDate(rules.pack, makeIsoDate("2026-03-02")),
    ).toBe("2026-04-11");
    expect(
      resolveCouncilEffectiveDate(rules.pack, makeIsoDate("2026-03-02"), true),
    ).toBe("2026-05-23");
    expect(
      resolveTaxEffectiveDate(enactedAt, 30, makeIsoDate("2026-05-01")),
    ).toBe("2026-05-01");
  });
  it("keeps every recorded effective date in an actual enacted save through Continue", () => {
    const { world } = enactedTaxFixture();
    const before = world.history.legislativeEnactments!;
    expect(before.length).toBeGreaterThan(0);
    const restored = deserializeWorld(serializeWorld(world));
    expect(restored.history.legislativeEnactments).toEqual(before);
    for (const record of restored.history.legislativeEnactments!) {
      expect(record.effectiveAt).not.toBeNull();
      expect(operativeDateForEnactment(record, "US-MD", context)?.date).toBe(
        record.effectiveAt,
      );
    }
  });
});
