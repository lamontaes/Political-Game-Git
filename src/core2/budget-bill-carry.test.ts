/**
 * A passed budget bill's line change carries into later years: it joins the
 * government's enacted lines, which every next budget starts from (the
 * budgets module's carry rule), while a one-time change, such as an emergency
 * grant, lasts its own fiscal year. In a place drawn from all 56 on a seed
 * nobody chose (BUDGET_CARRY_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { baseLine } from "./law-reach/group-a-money";
import { lineRaisedByBills } from "./law-reach/group-a-staffing";
import { advanceCore } from "./life";
import {
  amendBudget,
  budgetsOf,
  enactedBudgetChanges,
  governments,
} from "./modules/budgets";
import { coreAPI } from "./state";

const seed = process.env.BUDGET_CARRY_SEED ?? randomBytes(8).toString("hex");

it("a passed bill's line change carries into the next fiscal year, and a one-time change does not", () => {
  setBookkeeping(false);
  try {
    const place = drawPlace(seed, "budget-carry");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // The town's governments, state first: the first whose budget this year
    // funds at least two lines (a territory's or a district's state level
    // may fund fewer).
    const order = ["state", "county", "city"];
    const currentOf = (id: string) =>
      budgetsOf(api, id)
        .filter((b) => b.startsOn <= api.state.date)
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
        .at(-1);
    const funded = (id: string) =>
      Object.keys(currentOf(id)?.spendingMinor ?? {})
        .filter((line) => (currentOf(id)!.spendingMinor[line] ?? 0) > 0)
        .sort();
    const gov = governments(api)
      .filter((g) => order.includes(g.level))
      .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
      .find((g) => funded(g.id).length >= 2);
    expect(gov, `${where}: a government funding two lines`).toBeDefined();
    const current = () => currentOf(gov!.id)!;
    const before = current();
    const [carried, once] = funded(gov!.id);
    const enactedBefore = { ...enactedBudgetChanges(api, gov!.id) };
    const delta = 100_000_000;
    amendBudget(api, {
      governmentId: gov!.id,
      line: carried!,
      deltaMinor: delta,
      measureId: "test:passed-bill",
      carry: true,
    });
    amendBudget(api, {
      governmentId: gov!.id,
      line: once!,
      deltaMinor: delta,
      measureId: "test:one-time-grant",
    });
    expect(
      current().spendingMinor[carried!],
      `${where}: the passed bill changed this year's ${carried}`,
    ).toBe((before.spendingMinor[carried!] ?? 0) + delta);
    expect(
      current().spendingMinor[once!],
      `${where}: the one-time change changed this year's ${once}`,
    ).toBe((before.spendingMinor[once!] ?? 0) + delta);
    // This year the carried change is still a change: what a line's service
    // is measured against is the line before the bill.
    expect(
      baseLine(api, gov!, current(), carried!),
      `${where}: ${carried}'s base this year is the line before the bill`,
    ).toBe(before.spendingMinor[carried!] ?? 0);
    // The government's enacted lines, which every later year starts from.
    const enacted = enactedBudgetChanges(api, gov!.id);
    expect(
      (enacted[carried!] ?? 0) - (enactedBefore[carried!] ?? 0),
      `${where}: ${carried} carries into later years`,
    ).toBe(delta);
    expect(
      (enacted[once!] ?? 0) - (enactedBefore[once!] ?? 0),
      `${where}: the one-time ${once} change does not carry`,
    ).toBe(0);
    // Into the next fiscal year: the next budget is adopted and the carried
    // change is still among the lines it starts from.
    const nextStart = `${before.fiscalYear + 1}-${gov!.fiscalYearStart}`;
    advanceCore(core, addDays(makeIsoDate(nextStart), 2));
    expect(
      current().fiscalYear,
      `${where}: the next fiscal year's budget`,
    ).toBe(before.fiscalYear + 1);
    expect(
      (enactedBudgetChanges(api, gov!.id)[carried!] ?? 0) -
        (enactedBefore[carried!] ?? 0),
      `${where}: ${carried} still carried in fiscal ${before.fiscalYear + 1}`,
    ).toBe(delta);
    // A bill's raise still counts in the new year (a staffing line's hires
    // stay its reach), and putting the old amount back leaves none, whatever
    // the new year's own adoption added to the line.
    expect(
      lineRaisedByBills(api, gov!, carried!),
      `${where}: ${carried} raised by a bill in fiscal ${before.fiscalYear + 1}`,
    ).toBe(true);
    amendBudget(api, {
      governmentId: gov!.id,
      line: carried!,
      deltaMinor: -delta,
      measureId: "test:passed-bill-repealed",
      carry: true,
    });
    expect(
      lineRaisedByBills(api, gov!, carried!),
      `${where}: ${carried} back at its amount without the bill`,
    ).toBe(false);
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);
