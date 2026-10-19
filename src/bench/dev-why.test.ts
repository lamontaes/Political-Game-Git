/**
 * Dev mode's why panels in a generated world (a random place and seed each
 * run, named so a failure can be replayed): the record ids come from the
 * played world, not from a fixture.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { votesOn } from "../core2/modules/legislature";
import { findRecord, traceNode } from "./dev-trace";
import { whyPanels } from "./dev-why";

const seed = process.env.DEV_WHY_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const why = (id: string) => whyPanels(core, id, findRecord(core, id));

describe(`dev why panels: ${world.place.displayName} (seed ${seed})`, () => {
  it("a person's year ledger lists pay, hours and cash, and says when receipts are not itemized", () => {
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const worker = [...core.people.values()].find(
      (p) => p.alive && p.jobId && core.cashJournal.detailedByOwner.has(p.id),
    );
    const followed = worker ?? [...core.people.values()].find((p) => p.alive)!;
    const [ledger] = why(followed.id);
    expect(ledger!.title).toContain(core.date);
    expect(ledger!.rows.map((r) => r.label)).toEqual(
      expect.arrayContaining(["hours worked / planned", "cash now"]),
    );
    if (worker) expect(ledger!.rows.some((r) => r.label === "pay")).toBe(true);
    else expect(ledger!.gap).toContain("not itemized");
  }, 240_000);

  it("a vote lists each member's recorded reasons and the sum", () => {
    const api = coreAPI(core);
    let bill: string | undefined;
    for (let step = 0; step < 6 && !bill; step++) {
      for (const row of api
        .moduleState("core2-legislature-v1")
        .table("bills")
        .rows() as unknown as { id: string }[])
        if (votesOn(api, row.id).length) {
          bill = row.id;
          break;
        }
      if (!bill) advanceCore(core, addDays(makeIsoDate(core.date), 90));
    }
    expect(bill, "a bill was voted within 21 months").toBeDefined();
    const panels = why(bill!);
    const everyone = panels.at(-1)!;
    expect(everyone.rows.length).toBe(votesOn(api, bill!).length);
    expect(everyone.rows[0]!.value).toMatch(/total .*:/);
    // One member's own panel carries each reason and the total.
    const vote = votesOn(api, bill!)[0]!;
    const own = why(`vote:${bill}:${vote.memberId}`)[0]!;
    expect(own.rows.at(-1)!.label).toContain("total");
    expect(own.rows.at(-1)!.value).toBe(
      Math.round(vote.position.total * 1000) / 1000,
    );
    // The trace node carries the same panels.
    expect(traceNode(core, world.director, bill!).why.length).toBe(
      panels.length,
    );
  }, 240_000);

  it("a business shows its books, and a closing its recorded reason", () => {
    const [orgId] = [...core.finance.businesses.keys()];
    expect(orgId).toBeDefined();
    const [books] = why(orgId!);
    expect(books!.title).toContain("Books behind");
    expect(books!.rows.map((r) => r.label)).toEqual(
      expect.arrayContaining(["sales received", "wages paid", "closed"]),
    );
    const closed = [...core.finance.businesses].find(
      ([, book]) => book.closedAt,
    );
    if (closed) {
      const [panel] = why(`closure:${closed[0]}`);
      expect(panel!.rows.find((r) => r.label === "closed")!.value).toContain(
        closed[1].closingReasonKey ?? "no reason kept",
      );
    }
  });

  it("a budget line change names its measure and lists the line's history", () => {
    const changes = [...(core.logByKind.get("budget-line-changed") ?? [])];
    expect(
      changes.length,
      "a budget line changed within the run",
    ).toBeGreaterThan(0);
    const panels = why(changes[0]!);
    expect(panels[0]!.title).toContain("changed");
    expect(panels[0]!.rows.map((r) => r.label)).toEqual(
      expect.arrayContaining(["government", "line", "change", "measure"]),
    );
    expect(panels[1]!.title).toContain("History of");
    expect(panels[1]!.rows.length).toBeGreaterThan(0);
  });
});
