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
  onTreasuryBeforePaying,
  registerGovernmentExecutive,
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

// One drawn place: its strained officials, tried one after another.
function tryPlace(
  label: string,
): { took: number; declined: number; where: string } | null {
  const place = drawPlace(seed, label);
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
  if (!gov) return null;
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
        // Residents, not the named officials of other bodies (who now keep
        // households of their own and would crowd out the residents).
        !p.id.startsWith("official:") &&
        p.tier !== "husk" &&
        p.livingCostDailyMinor > 0 &&
        accounts.balance(accounts.main(p.id)) >= 0,
    )
    .sort(
      (a, b) =>
        a.liquidMinor / a.livingCostDailyMinor -
          b.liquidMinor / b.livingCostDailyMinor || a.id.localeCompare(b.id),
    )
    .slice(0, 40);
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
    const moved =
      accounts.balance(accounts.main(official.id)) - before.official;
    const record = moved > 0 ? { amountMinor: moved } : undefined;
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
  // Honest officials are the rule: most decline.
  expect(
    declined,
    `${where}: ${took} took, ${declined} declined`,
  ).toBeGreaterThan(took);
  return { took, declined, where };
}

it("an official who diverts moves money from the treasury's line to themselves, and the others take nothing", () => {
  // A small town has few strained officials: draw on until someone weighs it.
  let tried = 0;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = tryPlace(
      attempt ? `treasury-diversion-${attempt}` : "treasury-diversion",
    );
    if (!result) continue;
    tried += 1;
    if (result.took > 0) return;
  }
  // Never a skip: a world with no closed treasury, or one where nobody weighs
  // taking, is a failure to reach the case, not a pass.
  throw new Error(
    tried
      ? `seed ${seed}: nobody took any in ${tried} places`
      : `seed ${seed}: no drawn place had a treasury that closed a month`,
  );
}, 900_000);
