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
import { DevMode } from "./dev-mode";
import { parameter } from "../core2/parameters";

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

  it("a followed resident's decisions list each kept act by record id, and an unfollowed one says its acts keep no reasons", () => {
    const where = `${world.place.displayName} (seed ${seed})`;
    const dev = new DevMode(core, world.director, undefined, world.placeId);
    const strangers = [...core.people.values()].filter(
      (p) =>
        p.alive &&
        p.jobId &&
        p.id !== core.playerId &&
        !core.focusPersonIds.has(p.id),
    );
    expect(strangers.length, where).toBeGreaterThan(2);
    const [first, second, unfollowed] = strangers as [
      (typeof strangers)[number],
      (typeof strangers)[number],
      (typeof strangers)[number],
    ];

    // Following spends no time and writes no record; it only puts them in focus.
    const date = core.date;
    const records = core.durableLog.size;
    expect(dev.follow(first.id).status).toBe("dev-mode");
    expect(dev.follow(second.id).status).toBe("dev-mode");
    expect(core.date).toBe(date);
    expect(core.durableLog.size).toBe(records);
    expect(core.focusPersonIds.has(first.id)).toBe(true);
    expect(dev.followStatus(first.id).tier).toBe(first.tier);
    expect(dev.followStatus(unfollowed.id).status).toBe("none");

    // Before any time passes, a followed person has nothing kept yet and says so.
    const [, empty] = why(first.id);
    expect(empty!.title).toBe(
      `${first.givenName} ${first.familyName}: decisions`,
    );
    expect(empty!.rows).toEqual([]);
    expect(empty!.gap, where).toContain("No act of this person has been kept");

    // Thirty-five days: the oldest acts have condensed to the chosen option's reasons.
    advanceCore(core, addDays(makeIsoDate(core.date), 35));
    const detailDays = parameter(
      "circleDecisionDetailDays",
      core.data.parameters,
    );
    let condensed = 0;
    for (const person of [first, second]) {
      const [, decisions] = why(person.id);
      expect(decisions!.title, where).toContain("decisions");
      expect(decisions!.rows.length, where).toBeGreaterThan(0);
      expect(decisions!.gap, where).toBeUndefined();
      // Every row names its act record: kept, by this person, and the page links it.
      for (const row of decisions!.rows) {
        const act = core.durableLog.get(row.id!);
        expect(act?.kind, `${where} ${row.id}`).toBe("person.acted");
        expect(act!.actorId).toBe(person.id);
        expect(row.label).toContain(act!.date);
        expect(row.label).toContain(act!.actionId!);
        expect(row.label).toContain(row.id!);
      }
      // Newest first.
      const dates = decisions!.rows.map((r) => r.label.slice(0, 10));
      expect(dates, where).toEqual([...dates].sort().reverse());
      // A recent act lists every option it offered with the trait reason shown,
      // the picked one marked; the same act, read from its record.
      const recent = decisions!.rows.find((r) =>
        r.value.toString().includes("offered"),
      );
      expect(recent, `${where}: an act with full scores`).toBeDefined();
      const record = core.durableLog.get(recent!.id!)!;
      const scores = record.decision!.scores!;
      expect(recent!.value.toString().split("\n").length).toBe(scores.length);
      expect(
        recent!.value
          .toString()
          .split("\n")
          .filter((l) => l.startsWith("picked")).length,
      ).toBe(1);
      for (const line of recent!.value.toString().split("\n"))
        expect(line).toMatch(/trait [+-]?\d/);
      expect(recent!.value.toString()).toContain(
        `trait ${scores[0]!.reasons.trait > 0 ? "+" : ""}${Math.round(scores[0]!.reasons.trait * 1000) / 1000}`,
      );
      // An old act keeps only the chosen option's reasons (act-record detail window).
      const cutoff = new Date(`${core.date}T00:00:00Z`);
      cutoff.setUTCDate(cutoff.getUTCDate() - detailDays);
      const old = decisions!.rows.filter(
        (r) => r.label.slice(0, 10) < cutoff.toISOString().slice(0, 10),
      );
      for (const row of old) {
        expect(row.value.toString()).toContain(
          "only the chosen option's reasons",
        );
        expect(row.value.toString()).toMatch(/trait [+-]?\d/);
      }
      condensed += old.length;
      // The trace node carries the same panel beside the ledger.
      expect(
        traceNode(core, world.director, person.id).why.map((p) => p.title),
      ).toEqual([expect.stringContaining("the year to"), decisions!.title]);
    }

    expect(
      condensed,
      `${where}: acts older than ${detailDays} days condensed`,
    ).toBeGreaterThan(0);

    // Someone nobody follows kept no act with reasons.
    const [, quiet] = why(unfollowed.id);
    expect(quiet!.rows, where).toEqual([]);
    expect(quiet!.gap, where).toContain("keep no reasons until followed");

    // Stopping returns them to the quiet case for new acts (their old rows stay).
    expect(dev.unfollow(first.id).status).toBe("none");
    expect(core.focusPersonIds.has(first.id)).toBe(false);
    expect(why(first.id)[1]!.gap).toContain("keep no reasons until followed");
    expect(why(first.id)[1]!.rows.length).toBeGreaterThan(0);
  }, 240_000);

  it("following someone the player deals with changes nothing, and stopping leaves them kept", () => {
    const dev = new DevMode(core, world.director, undefined, world.placeId);
    const player = core.people.get(core.playerId!)!;
    const circle = [...player.knownIds, ...player.familyIds].find(
      (id) => core.people.get(id)?.alive && core.focusPersonIds.has(id),
    );
    expect(circle, "the player knows someone alive").toBeDefined();
    const before = new Set(core.focusPersonIds);
    expect(dev.follow(circle!).status).toBe("player-circle");
    expect(dev.unfollow(circle!).status).toBe("player-circle");
    expect(core.focusPersonIds).toEqual(before);
    expect(dev.followed().map((row) => row.view.personId)).not.toContain(
      circle,
    );
  });

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
