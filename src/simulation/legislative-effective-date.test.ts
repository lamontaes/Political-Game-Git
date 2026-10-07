import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import {
  operativeDateForEnactment,
  resolveLegislativeEffectiveDate,
} from "./legislative-effective-date";
import {
  ALASKA_RULE_PACK,
  KENTUCKY_RULE_PACK,
  MARYLAND_RULE_PACK,
} from "./legislature-rule-packs";
import type { LegislativeEnactmentRecord } from "./types";
import {
  stateStatuteOperativeAt,
  statuteEffectiveDateEstimated,
} from "./governing/statute-effective-date";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { stateJurisdictionForKey } from "./life-places";
import type { LegislativeRulePack } from "./legislature-rules";

const missingDatePacks: string[] = [];
const datePacks = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap((usps) => {
  const jurisdiction = stateJurisdictionForKey(`US-${usps}`)!;
  const pack = legislativePackForJurisdiction(jurisdiction.id);
  if (pack) return [{ usps, pack }];
  missingDatePacks.push(usps);
  return [];
});

describe("legislative effective dates", () => {
  it("uses the declared on-adoption date without parsing a prose rule", () => {
    const enacted = makeIsoDate("2026-01-20");
    const pack: LegislativeRulePack = {
      ...MARYLAND_RULE_PACK,
      enactment: {
        ...MARYLAND_RULE_PACK.enactment,
        defaultEffectiveSchedule: undefined,
        defaultEffectiveRule: {
          kind: "unknown",
          note: "No prose date parser.",
        },
        effectiveDateDistinctFromEnactment: {
          kind: "known",
          value: false,
          source: {
            ...MARYLAND_RULE_PACK.enactment.source,
            authority: "game-profile",
            verification: "game-profile",
            note: "Explicit fictional on-adoption fixture.",
          },
        },
      },
    };
    expect(resolveLegislativeEffectiveDate(pack, enacted)).toEqual({
      kind: "game-default",
      effectiveAt: enacted,
    });
    expect(
      resolveLegislativeEffectiveDate(
        {
          ...pack,
          enactment: {
            ...pack.enactment,
            effectiveDateDistinctFromEnactment: {
              kind: "unknown",
              note: "The fixture does not supply an adoption date.",
            },
          },
        },
        enacted,
      ),
    ).toEqual({
      kind: "game-default",
      effectiveAt: makeIsoDate("2026-04-20"),
    });
  });
  it("computes Alaska's sourced default and labels Maryland's fallback as fictional", () => {
    const enacted = makeIsoDate("2026-01-20");
    expect(resolveLegislativeEffectiveDate(ALASKA_RULE_PACK, enacted)).toEqual({
      kind: "source-default",
      effectiveAt: makeIsoDate("2026-04-20"),
    });
    expect(
      resolveLegislativeEffectiveDate(MARYLAND_RULE_PACK, enacted),
    ).toEqual({
      kind: "game-default",
      effectiveAt: makeIsoDate("2026-04-20"),
    });
    expect(
      resolveLegislativeEffectiveDate(KENTUCKY_RULE_PACK, enacted),
    ).toEqual({
      kind: "game-default",
      effectiveAt: makeIsoDate("2026-04-20"),
    });
  });

  it("accounts for all 56 jurisdiction choices without passing missing packs", () => {
    expect(datePacks.length + missingDatePacks.length).toBe(56);
    expect(
      new Set([...datePacks.map((row) => row.usps), ...missingDatePacks]).size,
    ).toBe(56);
  });
  for (const usps of missingDatePacks)
    it.todo(
      `${usps} needs an admitted legislature pack before a state-default writer proof`,
    );
  it.each(datePacks)(
    "$usps resolves its state default from the shared rule and recorded date anchors",
    ({ usps, pack }) => {
      const stateKey = `US-${usps}`;
      const enactedAt = makeIsoDate("2026-03-15");
      const context = { finalPassageAt: () => makeIsoDate("2026-03-10") };
      const effectiveAt = stateStatuteOperativeAt(stateKey, enactedAt, context);
      expect(resolveLegislativeEffectiveDate(pack, enactedAt, context)).toEqual(
        {
          effectiveAt,
          kind:
            effectiveAt !== null &&
            statuteEffectiveDateEstimated(stateKey, enactedAt, context)
              ? "game-default"
              : "source-default",
        },
      );
    },
  );

  it("preserves old saves and distinguishes an explicit fictional date", () => {
    const enactment = {
      resolvedAt: makeIsoDate("2026-01-20"),
      effectiveAt: null,
      effectiveDateBasis: "game-default",
    } as LegislativeEnactmentRecord;
    expect(operativeDateForEnactment(enactment)).toEqual({
      date: makeIsoDate("2026-04-20"),
      basis: "game-default",
    });
    const oldSave = { ...enactment, effectiveDateBasis: undefined };
    expect(operativeDateForEnactment(oldSave)).toEqual({
      date: makeIsoDate("2026-04-20"),
      basis: "game-default",
    });
    expect(
      operativeDateForEnactment({
        ...enactment,
        effectiveAt: makeIsoDate("2026-03-06"),
        effectiveDateBasis: "game-default",
        effectiveDateGameProfile: {
          version: "fixture-date/v1",
          days: 45,
        },
      }),
    ).toEqual({ date: makeIsoDate("2026-03-06"), basis: "game-default" });
  });
});
