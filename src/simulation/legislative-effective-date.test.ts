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

describe("legislative effective dates", () => {
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
