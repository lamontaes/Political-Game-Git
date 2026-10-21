import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import assistance from "./data/disasters/assistance.json" with { type: "json" };
import households from "./data/disasters/households.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore, createLifeCore } from "./life";
import {
  disasterAssistancePaid,
  disasterRepairsPaid,
  townDisasters,
} from "./modules/disasters";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";
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

  it("pays repairs to the town's outside market when no builder is open", () => {
    // Draw places from the seed; the town's builders are closed to a trade
    // other than building, so the repairs have only the outside market to go
    // to. Every draw is listed if none yields a declared disaster that paid.
    const tried: string[] = [];
    for (let draw = 0; draw < 12; draw++) {
      const place = drawPlace(`${seed}:edge:${draw}`, "core2-disasters");
      const where = `${place.name}, ${place.state} (seed ${seed}:edge:${draw})`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const end = new Date(`${core.date}T00:00:00Z`);
      end.setUTCFullYear(end.getUTCFullYear() + 1);
      end.setUTCDate(end.getUTCDate() - 1);
      const yearEnd = end.toISOString().slice(0, 10);
      const api = coreAPI(core);
      const due = townDisasters(api).filter(
        (row) => row.declared > core.date && row.declared <= yearEnd,
      );
      const town = core.people.get(core.playerId ?? "")?.placeId;
      const market = [...core.organizations.values()].find(
        (org) => org.kind === OUTSIDE_MARKET_KIND && org.placeId === town,
      );
      if (!due.length || !market) {
        tried.push(
          `${where}: ${due.length} disasters declared, outside market ${market ? "recorded" : "absent"}`,
        );
        continue;
      }
      for (const org of core.organizations.values())
        if (org.classification === "enterprise:construction")
          (org as { classification?: string }).classification =
            "enterprise:other";
      advanceCore(core, yearEnd);
      const payee = api.accounts().main(market.id);
      const repairs = disasterRepairsPaid(api).filter((row) => row.cents > 0);
      if (!repairs.length) {
        tried.push(`${where}: ${due.length} disasters declared, no repairs`);
        continue;
      }
      const events = [...core.durableLog.values()].filter(
        (row) => row.kind === "hazard.disaster",
      );
      expect(events.length, where).toBeGreaterThan(0);
      for (const row of repairs) {
        expect(row.to, `${where}: disaster ${row.disaster} payee`).toBe(payee);
        expect(
          events.some((e) => Number(e.facts?.disasterNumber) === row.disaster),
          where,
        ).toBe(true);
      }
      // The payment is in the journal: the payee's account took in at least
      // what the repairs paid.
      const credited = core.cashJournal.totalsByAccount.get(payee);
      const paid = repairs.reduce((n, row) => n + row.cents, 0);
      expect(credited?.grossCreditMinor ?? 0, where).toBeGreaterThanOrEqual(
        paid,
      );
      expect(core.cashJournal.latestByAccount.get(payee), where).toBeDefined();
      process.stdout.write(
        `disaster repairs to the outside market: ${where}; disaster ${events.find((e) => Number(e.facts?.disasterNumber) === repairs[0]!.disaster)!.id}; repair ${repairs[0]!.disaster} ${repairs[0]!.cents} cents to ${payee}; journal ${core.cashJournal.latestByAccount.get(payee)?.id ?? ""}\n`,
      );
      return;
    }
    throw new Error(
      `no declared disaster paid repairs to an outside market in 12 draws:\n${tried.join("\n")}`,
    );
    // One drawn town's year with a disaster took about 270 seconds on a
    // 4-core container, past the 300 seconds the other case has; about twice that.
  }, 600_000);
});
