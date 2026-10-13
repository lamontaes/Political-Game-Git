import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import assistance from "./data/disasters/assistance.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import { disasterAssistancePaid, townDisasters } from "./modules/disasters";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-disasters");

const total = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

describe(`disasters from the record in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("happens on FEMA's dates, pays the obligated assistance, and balances", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    const api = coreAPI(core);
    const due = townDisasters(api).filter((row) => row.begins <= "2021-12-31");
    const start = total(core);
    advanceCore(core, "2021-12-31");
    const events = [...core.durableLog.values()].filter(
      (row) => row.kind === "hazard.disaster",
    );
    // One public, newsworthy event per declared disaster begun in the year.
    expect(events.length).toBe(due.length);
    for (const row of events) {
      expect(row.date >= "2021-01-01" && row.date <= "2021-12-31").toBe(true);
      expect(row.facts?.disasterNumber).toBeDefined();
    }
    // Assistance declared in the year is paid in full, never more than FEMA
    // obligated in the county, and money balances.
    const rows = assistance.byCountyDisaster as Record<
      string,
      { county: number; towns: Record<string, number> }
    >;
    for (const row of disasterAssistancePaid(api)) {
      const county = Object.entries(rows).find(([key]) =>
        key.endsWith(`|${row.disaster}`),
      );
      expect(county).toBeDefined();
      const cap =
        county![1].county +
        Object.values(county![1].towns).reduce((n, v) => n + v, 0);
      expect(row.cents).toBeLessThanOrEqual(cap);
    }
    expect(total(core)).toBe(start);
  }, 300_000);
});
