import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import type { TreasuryMonthRow } from "./budgets-treasury";
import {
  CORRUPTION_MODULE_ID,
  onTreasuryBeforePaying,
  registerGovernmentExecutive,
  type DiversionRecord,
} from "./modules/corruption";
import { governmentExecutive } from "./modules/legislature";
import parameters from "./data/corruption/parameters.json" with { type: "json" };

// An official who diverts a budget line's money (pool item
// gov-treasury-diversion): in the world the owner plays (a place drawn from
// all 56), after the treasuries have closed a month, strained officials weigh
// taking a small part of the line that paid out the most. Each who takes it
// moves real money from the treasury's account to their own; the rest take
// nothing. The officials here are residents standing in for the chief
// executive, tried one after another on the same month's rows.
const seed = process.env.DIVERSION_SEED ?? randomBytes(8).toString("hex");

it("an official who diverts moves money from the treasury's line to themselves, and the others take nothing", (context) => {
  const place = drawPlace(seed, "treasury-diversion");
  const where = `seed ${seed}, ${place.name} (${place.key})`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  const api = coreAPI(core);
  const accounts = api.accounts();
  const months = api
    .moduleState(BUDGETS_MODULE_ID)
    .table("treasuryMonths")
    .rows() as unknown as TreasuryMonthRow[];
  const gov = governments(api).find((g) =>
    months.some((m) => m.governmentId === g.id),
  );
  if (!gov) {
    context.skip(`${where}: no treasury has closed a month.`);
    return;
  }
  const outside = [...core.organizations.values()].find(
    (org) => org.outsideFlow !== undefined,
  )!;
  const row = months
    .filter((m) => m.governmentId === gov.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0]!;
  const strained = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.tier !== "husk" &&
        p.livingCostDailyMinor > 0 &&
        accounts.balance(accounts.main(p.id)) >= 0,
    )
    .sort(
      (a, b) =>
        a.liquidMinor / a.livingCostDailyMinor -
          b.liquidMinor / b.livingCostDailyMinor || a.id.localeCompare(b.id),
    )
    .slice(0, 80);
  const diversions = () =>
    api.moduleState(CORRUPTION_MODULE_ID).table("diversions") as unknown as {
      rows(): DiversionRecord[];
    };
  let took = 0;
  let declined = 0;
  strained.forEach((official, at) => {
    registerGovernmentExecutive(() => official.id);
    const treasury = accounts.main(gov.organizationId);
    const before = {
      treasury: 0,
      official: accounts.balance(accounts.main(official.id)),
    };
    // The month's revenue is in: fund the treasury as the close does.
    accounts.transfer({
      id: `test-funding:${at}`,
      from: accounts.main(outside.id),
      to: treasury,
      amountMinor: 1_000_000_000,
      reasonKey: "test.funding",
      source: {
        tag: "ESTIMATED",
        citation: "Test funding.",
        asOf: core.date,
        estimatedFrom: "test",
      },
    });
    const funded = accounts.balance(treasury);
    before.treasury = funded;
    onTreasuryBeforePaying(
      api,
      gov,
      Object.fromEntries(
        Object.entries(row.lines).map(([line, l]) => [line, l.dueMinor]),
      ),
    );
    const record = diversions()
      .rows()
      .find((d) => d.officialId === official.id);
    if (!record) {
      declined += 1;
      expect(accounts.balance(treasury), where).toBe(before.treasury);
      return;
    }
    took += 1;
    expect(record.amountMinor, where).toBeGreaterThan(0);
    // At most a share of the line and a few months of the official's own costs.
    expect(record.amountMinor, where).toBeLessThanOrEqual(
      Math.round(
        official.livingCostDailyMinor *
          parameters.daysPerMonth.value *
          parameters.diversionMonthsOfLiving.value,
      ),
    );
    expect(accounts.balance(treasury), where).toBe(
      before.treasury - record.amountMinor,
    );
    expect(accounts.balance(accounts.main(official.id)), where).toBe(
      before.official + record.amountMinor,
    );
  });
  registerGovernmentExecutive(governmentExecutive);
  expect(took + declined, where).toBe(strained.length);
  expect(
    took,
    `${where}: nobody among ${strained.length} took any`,
  ).toBeGreaterThan(0);
  // Honest officials are the rule: most decline.
  expect(
    declined,
    `${where}: ${took} took, ${declined} declined`,
  ).toBeGreaterThan(took);
}, 300_000);
