import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { treasuryMonthsOf } from "./budgets-treasury";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// The budget season (office play): a government's budget is proposed by its
// executive, heard in public and voted in the weeks before its fiscal year
// starts, then takes effect on the year's first day. The bench world, a place
// drawn from all 56 on a seed nobody chose, one year from the start.
const seed = process.env.BUDGET_SEASON_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "budget-season");

interface Seen {
  id: string;
  kind: string;
  date: string;
  facts: Record<string, string>;
}

describe(`the budget season (${place.name}, seed ${seed})`, () => {
  it("proposes, hears and votes a budget before the year starts, and adopts it on the first day", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as unknown as CoreState;
    const api = coreAPI(core);
    const seen: Seen[] = [];
    api.subscribeEvents(
      "budget-season-test",
      [
        "budget-proposed",
        "budget-hearing",
        "legislative-vote",
        "budget-adopted",
      ],
      (_api, event: unknown) => {
        const e = event as Seen;
        if (e.kind !== "legislative-vote" || e.facts?.subjects === "budget")
          seen.push({ id: e.id, kind: e.kind, date: e.date, facts: e.facts });
      },
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    writeFileSync(
      process.env.BUDGET_SEASON_DUMP ?? "/dev/null",
      JSON.stringify(seen, null, 1),
    );
    const adopted = seen.filter(
      (e) =>
        e.kind === "budget-adopted" && e.facts.adoptedBy.includes(" vote "),
    );
    expect(
      adopted.length,
      `${place.name}: a budget the body voted`,
    ).toBeGreaterThan(0);
    let proven = 0;
    for (const a of adopted) {
      const gov = a.facts.governmentId;
      const fy = a.facts.fiscalYear;
      const proposed = seen.find(
        (e) =>
          e.kind === "budget-proposed" &&
          e.facts.governmentId === gov &&
          e.facts.fiscalYear === fy,
      );
      const heard = seen.find(
        (e) =>
          e.kind === "budget-hearing" &&
          e.facts.governmentId === gov &&
          e.facts.fiscalYear === fy,
      );
      if (!proposed || !heard) continue;
      const votes = seen.filter(
        (e) =>
          e.kind === "legislative-vote" &&
          a.facts.adoptedBy.includes(e.facts.number ?? "?"),
      );
      expect(
        votes.length,
        `${gov} ${fy}: the body's roll call`,
      ).toBeGreaterThan(0);
      for (const v of votes) {
        expect(proposed.date <= heard.date, "proposal before hearing").toBe(
          true,
        );
        expect(heard.date <= v.date, "hearing before the vote").toBe(true);
        expect(v.date < a.date, "vote before the year starts").toBe(true);
      }
      // The treasury pays the voted budget after the year starts: a close
      // under this budget's id moves money on its lines.
      const paid = treasuryMonthsOf(api, gov).filter(
        (m) =>
          m.budgetId === `budget:${gov}:${fy}` &&
          m.date >= a.date &&
          m.paymentIds.length > 0,
      );
      expect(
        paid.length,
        `${gov} ${fy}: a close paid under the voted budget`,
      ).toBeGreaterThan(0);
      proven += 1;
    }
    expect(proven, "a government that ran the whole season").toBeGreaterThan(0);
  }, 1_800_000);
});
