import { describe, expect, it } from "vitest";

import stateSessionCalendar from "../../../data/research/laws/state-session-calendars-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";

type RegularSessionRow = {
  readonly conveneAt: string;
  readonly adjournAt: string | "full-year";
  readonly source: string;
  readonly sourceUrl: string;
};

const calendar = stateSessionCalendar as unknown as {
  readonly sources: Readonly<Record<string, { readonly url: string }>>;
  readonly regularSessions: Readonly<
    Record<string, readonly RegularSessionRow[]>
  >;
};

describe("2026 state session calendar source rows", () => {
  it("covers each state, district, and territory with a traceable session row", () => {
    const expectedKeys = CHIEF_EXECUTIVE_JURISDICTIONS.map(
      (code) => `US-${code}`,
    ).sort();
    const entries = calendar.regularSessions;
    expect(Object.keys(entries).sort()).toEqual(expectedKeys);

    for (const [key, sessions] of Object.entries(entries)) {
      for (const session of sessions) {
        expect(calendar.sources[session.source], key).toBeDefined();
        expect(session.sourceUrl, key).toMatch(/^https:\/\//);
        const convenes = makeIsoDate(session.conveneAt);
        if (session.adjournAt === "full-year") continue;
        expect(makeIsoDate(session.adjournAt) >= convenes, key).toBe(true);
      }
    }
  });

  it("records the 2026 regular-session off-years explicitly", () => {
    for (const code of ["MT", "NV", "ND", "TX"])
      expect(calendar.regularSessions[`US-${code}`]).toEqual([]);
  });
});
