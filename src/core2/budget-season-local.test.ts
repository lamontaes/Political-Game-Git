/**
 * A town's council runs the budget season (office play): the mayor's or
 * executive's proposal, the council's public hearing and its vote fall before
 * the fiscal year, the hearing and the vote on the council's regular meeting
 * days, and the year's budget carries the lines the council passed. The bench
 * world, a place and seed nobody chose, every module installed, one year.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { worldWith } from "./tooling/world-with";
import { coreAPI } from "./state";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { townSeats } from "./modules/offices";
import {
  baseBudget,
  budgetsOf,
  enactedBudgetChanges,
  governments,
} from "./modules/budgets";
import { treasuryMonthsOf } from "./budgets-treasury";
import { meetingRule, meetsOn } from "./office-day-calendar";

const seed = process.env.BUDGET_LOCAL_SEED || randomBytes(8).toString("hex");
const { world, place } = worldWith(seed, "budget-season-local", (w) => {
  const api = coreAPI(w.core);
  return (
    governments(api).some((g) => g.level === "city") &&
    townSeats(api).some(
      (s) =>
        ["council", "township-board"].includes(s.office.kind) &&
        s.office.seats >= 2,
    )
  );
});
const core = world.core;
const api = coreAPI(core);

interface Seen {
  id: string;
  kind: string;
  date: string;
  facts: Record<string, string>;
}

describe(`a town's budget season (${place.name}, seed ${seed})`, () => {
  it("hears and votes on meeting days before the year, then pays the passed lines", () => {
    const gov = governments(api).find((g) => g.level === "city")!;
    const seen: Seen[] = [];
    api.subscribeEvents(
      "budget-season-local",
      [
        "budget-proposed",
        "budget-hearing",
        "legislative-vote",
        "budget-adopted",
      ],
      (_api, event: unknown) => {
        const e = event as Seen;
        if (e.kind === "legislative-vote" && e.facts?.subjects !== "budget")
          return;
        if (e.facts?.governmentId && e.facts.governmentId !== gov.id) return;
        seen.push({ id: e.id, kind: e.kind, date: e.date, facts: e.facts });
      },
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    if (process.env.BUDGET_LOCAL_DUMP)
      writeFileSync(
        process.env.BUDGET_LOCAL_DUMP,
        JSON.stringify(seen, null, 1),
      );
    const adopted = seen.find(
      (e) =>
        e.kind === "budget-adopted" && e.facts.adoptedBy.includes(" vote "),
    );
    expect(adopted, `${place.name}: the council voted a budget`).toBeTruthy();
    const fy = adopted!.facts.fiscalYear;
    const proposed = seen.find(
      (e) => e.kind === "budget-proposed" && e.facts.fiscalYear === fy,
    );
    const heard = seen.find(
      (e) => e.kind === "budget-hearing" && e.facts.fiscalYear === fy,
    );
    const vote = seen.find(
      (e) =>
        e.kind === "legislative-vote" &&
        adopted!.facts.adoptedBy.includes(e.facts.number ?? "?"),
    );
    expect(heard, "the hearing").toBeTruthy();
    // A body with no executive (a township board) has no proposal to hear:
    // the hearing names none and the body votes on its own lines.
    if (heard!.facts.proposal === "none") expect(proposed).toBeUndefined();
    else expect(proposed, "the proposal").toBeTruthy();
    expect(vote, "the council's roll call").toBeTruthy();
    if (proposed) expect(proposed.date <= heard!.date).toBe(true);
    expect(heard!.date <= vote!.date).toBe(true);
    expect(vote!.date < adopted!.date).toBe(true);
    // The hearing and the vote sit on the council's regular meeting days.
    const body = (
      api
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as {
        id: string;
        kind: string;
      }[]
    ).find((o) => ["council", "township-board"].includes(o.kind))!;
    const rule = meetingRule(api, body.id)!;
    expect(meetsOn(rule, heard!.date), `${heard!.date} is a meeting day`).toBe(
      true,
    );
    expect(meetsOn(rule, vote!.date), `${vote!.date} is a meeting day`).toBe(
      true,
    );
    // The year's budget carries what the council passed, and the treasury pays under it.
    const budget = budgetsOf(api, gov.id).find(
      (b) => b.id === `budget:${gov.id}:${fy}`,
    )!;
    const base = baseBudget(api, gov, Number(fy));
    const changed = Object.entries(enactedBudgetChanges(api, gov.id)).filter(
      ([, d]) => d !== 0,
    );
    for (const [line, delta] of changed)
      expect(
        budget.spendingMinor[line],
        `${line} carries the passed change`,
      ).toBe(Math.max(0, (base.spendingMinor[line] ?? 0) + delta));
    const months = treasuryMonthsOf(api, gov.id);
    const paid = months.filter(
      (m) =>
        m.budgetId === budget.id &&
        m.date >= adopted!.date &&
        m.paymentIds.length > 0,
    );
    // A town whose treasury paid nothing under any budget this year (a small
    // township with no department payees) has no close to read.
    if (months.some((m) => m.paymentIds.length > 0))
      expect(
        paid.length,
        "a close paid under the voted budget",
      ).toBeGreaterThan(0);
  }, 1_800_000);
});
