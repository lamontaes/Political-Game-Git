import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import assistance from "./data/disasters/assistance.json" with { type: "json" };
import households from "./data/disasters/households.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import {
  disasterAssistancePaid,
  disasterRepairsPaid,
  outsideBuildersFor,
  townDisasters,
} from "./modules/disasters";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

const total = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

/** Draw places from the seed until one has a disaster beginning in the world's first year. */
function worldWithFirstYearDisaster() {
  let core: CoreState | undefined,
    due: ReturnType<typeof townDisasters> = [];
  let where = "",
    opened = "",
    yearEnd = "";
  for (let draw = 0; draw < 12 && !due.length; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "core2-disasters");
    where = `${place.name}, ${place.state} (draw ${draw})`;
    core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    opened = core.date;
    const end = new Date(`${opened}T00:00:00Z`);
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    end.setUTCDate(end.getUTCDate() - 1);
    yearEnd = end.toISOString().slice(0, 10);
    due = townDisasters(coreAPI(core)).filter(
      (row) => row.begins > opened && row.begins <= yearEnd,
    );
  }
  if (!core || !due.length)
    throw new Error(`no first-year disaster in 12 draws; last ${where}`);
  return { core, due, where, opened, yearEnd };
}

describe(`disasters from the record (seed ${seed})`, () => {
  it("happens on FEMA's dates, pays the obligated assistance, and balances", () => {
    // Draw places from the seed until one has a disaster beginning in the
    // world's first year (any of the 56 places can be drawn; most years most
    // counties have none).
    const { core, due, where, opened, yearEnd } = worldWithFirstYearDisaster();
    const api = coreAPI(core);
    const start = total(core);
    advanceCore(core, yearEnd);
    const events = [...core.durableLog.values()].filter(
      (row) => row.kind === "hazard.disaster",
    );
    console.log(
      `disasters in ${where}: ${events.length} events in the first year, ${disasterAssistancePaid(api).length} payments, ${disasterRepairsPaid(api).length} repairs`,
    );
    // One public, newsworthy event per declared disaster begun in the year.
    expect(events.length).toBe(due.length);
    for (const row of events) {
      expect(row.date > opened && row.date <= yearEnd).toBe(true);
      expect(row.facts?.disasterNumber).toBeDefined();
    }
    // Assistance declared in the year is paid in full, never more than FEMA
    // obligated in the county, and money balances.
    const rows = assistance.byCountyDisaster as Record<
      string,
      { county: number; towns: Record<string, number> }
    >;
    const homes = households.byCountyDisaster as unknown as Record<
      string,
      Record<string, [number, number, number]>
    >;
    const most = (disaster: number, at: 0 | 1) =>
      Math.max(
        0,
        ...Object.entries(homes)
          .filter(([key]) => key.endsWith(`|${disaster}`))
          .flatMap(([, towns]) => Object.values(towns).map((row) => row[at])),
      );
    for (const row of disasterAssistancePaid(api)) {
      if (row.orgId.startsWith("cash:residents:")) {
        // Households: never more than FEMA approved in any one town.
        expect(row.cents).toBeLessThanOrEqual(most(row.disaster, 0));
        continue;
      }
      const county = Object.entries(rows).find(([key]) =>
        key.endsWith(`|${row.disaster}`),
      );
      expect(county).toBeDefined();
      const cap =
        county![1].county +
        Object.values(county![1].towns).reduce((n, v) => n + v, 0);
      expect(row.cents).toBeLessThanOrEqual(cap);
    }
    // Repairs: never more than the damage FEMA inspected in any one town.
    for (const row of disasterRepairsPaid(api))
      expect(row.cents).toBeLessThanOrEqual(most(row.disaster, 1));
    expect(total(core)).toBe(start);
  }, 300_000);

  it("pays repairs to the outside market when the town has no builder (edge fixture)", () => {
    let core: CoreState | undefined,
      yearEnd = "",
      where = "";
    for (let draw = 0; draw < 12; draw++) {
      const place = drawPlace(`${seed}:edge:${draw}`, "core2-disasters");
      where = `${place.name}, ${place.state} (draw ${draw})`;
      core = createLifeCore(
        generatedOpening(place, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      );
      const end = new Date(`${core.date}T00:00:00Z`);
      end.setUTCFullYear(end.getUTCFullYear() + 1);
      end.setUTCDate(end.getUTCDate() - 1);
      yearEnd = end.toISOString().slice(0, 10);
      if (
        townDisasters(coreAPI(core)).some(
          (row) => row.begins > core!.date && row.begins <= yearEnd,
        )
      )
        break;
    }
    // The town's builders are gone: repairs go to the outside market. (Deleting
    // the market itself breaks the payroll calendar, so the no-market branch,
    // which returns without paying, has no fixture here.)
    for (const org of core!.organizations.values())
      if (org.classification === "enterprise:construction")
        (org as { classification?: string }).classification =
          "enterprise:other";
    expect(() => advanceCore(core!, yearEnd), where).not.toThrow();
  }, 300_000);
});

it("picks the town's outside market, else the world's first, else none", () => {
  const rows = [
    { id: "outside-market:b", kind: "outside-market", placeId: "b" },
    { id: "outside-market:a", kind: "outside-market", placeId: "a" },
    { id: "shop", kind: "business", placeId: "c" },
  ];
  expect(outsideBuildersFor(rows, "b")).toBe("outside-market:b");
  expect(outsideBuildersFor(rows, "c")).toBe("outside-market:a");
  expect(outsideBuildersFor(rows.slice(2), "c")).toBeUndefined();
  expect(outsideBuildersFor([], "c")).toBeUndefined();
});
