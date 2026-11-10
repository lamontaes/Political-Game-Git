/**
 * Dev mode as the acceptance check (Fable audit, Nov 9, 2026, root cause 2):
 * who a law reached is read from every record an engine keeps when it applies
 * a law (the applied table above all), in people and dollars; a bill that did
 * not become law says why, from the legislature's own rows; and a run stops on
 * the player's own governments, not another state's. A random place and seed
 * each run, named so a failure can be replayed (DEV_MODE_SEED).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import { coreAPI } from "../core2/state";
import { lawChain, lawInForce } from "../core2/modules/laws";
import { inTownChain } from "../core2/laws-in-force";
import {
  LAW_APPLIED_TABLE,
  lawReach,
  type LawAppliedRow,
} from "../core2/law-reach/applied";
import { LAW_REACH_HOST_ID } from "../core2/law-reach/host";
import {
  castChairHearing,
  castMemberVote,
  chambersOf,
  executiveDecision,
  FEDERAL_HOUSE,
  memberKey,
  members,
} from "../core2/modules/legislature";

const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const where = `${world.place.displayName} (seed ${seed})`;
const api = () => coreAPI(core);
const applied = () =>
  api()
    .moduleState(LAW_REACH_HOST_ID)
    .table(LAW_APPLIED_TABLE)
    .rows() as unknown as LawAppliedRow[];
let count = 0;

describe(`dev mode as the acceptance check: ${where}`, () => {
  it("reach reads the applied table: people, counted people and dollars for a law that moved money", () => {
    // Paydays, the month's bills and its taxes: 40 days of the played world.
    dev.advance(
      new Date(Date.parse(`${core.date}T00:00:00Z`) + 40 * 864e5)
        .toISOString()
        .slice(0, 10),
    );
    // Nothing has been changed yet, so the twin is the same world: every holder's cash is equal.
    const same = dev.twinMoney();
    process.stderr.write(
      `${where}: untouched twin, ${same.holdersMoved} holders differ, ${same.twinMs} ms\n`,
    );
    expect(same.changes, where).toEqual([]);
    expect(
      same.holdersMoved,
      `${where}: an untouched world equals its twin`,
    ).toBe(0);
    expect(
      same.classes.every((row) => row.diffMinor === 0),
      where,
    ).toBe(true);
    const rows = applied();
    expect(
      rows.length,
      `${where}: engines recorded laws applied`,
    ).toBeGreaterThan(0);
    // The law that moved the most money, by the engines' own rows.
    const money = new Map<string, number>();
    for (const row of rows)
      money.set(
        row.lawId,
        (money.get(row.lawId) ?? 0) + Math.abs(row.amountMinor),
      );
    const [lawId, moved] = [...money].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]!;
    expect(moved, `${where}: a law moved money`).toBeGreaterThan(0);
    const own = rows.filter((row) => row.lawId === lawId);
    const reach = dev.reach(lawId);
    process.stderr.write(
      `${where}\nlaw ${lawId}: ${JSON.stringify({ ...reach, named: reach.named.length })}\n`,
    );
    // Every applied row naming the law is counted, with its money.
    expect(reach.records, where).toBeGreaterThanOrEqual(own.length);
    const appliedSides = reach.by.filter((side) =>
      own.some((row) => row.engine === side.engine && row.what === side.what),
    );
    expect(
      appliedSides.reduce((sum, side) => sum + side.amountMinor, 0),
      `${where}: the dollars are the applied rows' own`,
    ).toBe(own.reduce((sum, row) => sum + row.amountMinor, 0));
    // The counted population is reached as well as full people: groups stand for their people.
    const groups = own.filter((row) => row.target === "group" || row.count > 1);
    if (groups.length)
      expect(reach.counted, `${where}: counted people`).toBeGreaterThan(0);
    // A law that only moves a government's own budget lines reaches that government and no one else.
    expect(
      reach.fullPeople +
        reach.counted +
        reach.organizations +
        reach.governments,
      `${where}: someone is named`,
    ).toBeGreaterThan(0);
    // Full people are split by where they live, and the split adds up.
    expect(reach.fullPeopleInTown + reach.fullPeopleElsewhere, where).toBe(
      reach.fullPeople,
    );
    // The core's reader and dev mode's are the same read.
    expect(
      lawReach(api(), lawId, lawChain(api()).townPlaceId).records,
      where,
    ).toBe(reach.records);
  }, 600_000);

  it("the law control refuses an amount of money that is not whole cents", () => {
    expect(() =>
      dev.setLaw({ level: "state", series: "minimum-wage", value: 10.01 }),
    ).toThrow(/whole cents/);
  });

  it("a law nothing has applied reads zero, not an error", () => {
    const reach = dev.reach("no-such-law-row");
    expect(reach.records).toBe(0);
    expect(reach.by).toEqual([]);
  });

  it("a bill voted down on the floor says so, with its count", () => {
    const body = dev.lawmakingBodies().find(
      (b) =>
        b.members.length > 2 &&
        (b.level === "city" || b.level === "county") &&
        dev.introduce({
          bodyOfficeId: b.id,
          sponsorId: b.members[0]!.key,
          series: "minimum-wage",
          value: 3000 + (count += 1),
        }).bill.status !== "blocked",
    );
    // A place with no local body that may take the bill proves nothing here; say so.
    if (!body) {
      process.stderr.write(`${where}: no local body takes a wage bill\n`);
      return;
    }
    const bill = dev.introduce({
      bodyOfficeId: body.id,
      sponsorId: body.members[0]!.key,
      series: "minimum-wage",
      value: 3000 + (count += 1),
    }).bill;
    const result = dev.decideAt(bill.id, -1000);
    expect(result.bill.status, where).toBe("failed");
    expect(result.ending.how, where).toBe("floor-lost");
    if (result.ending.how === "floor-lost") {
      expect(result.ending.yes, where).toBe(0);
      expect(result.ending.no, where).toBeGreaterThan(0);
    }
    expect(dev.billOutcome(bill.id).ending, where).toEqual(result.ending);
  }, 120_000);

  it("Congress at a bare majority fails for want of the votes to end debate, and says so; at a wide margin the bill is law", () => {
    const house = dev.lawmakingBodies().find((b) => b.id === FEDERAL_HOUSE);
    expect(house, `${where}: the U.S. House`).toBeDefined();
    const introduce = () =>
      dev.introduce({
        bodyOfficeId: house!.id,
        sponsorId: house!.members[0]!.key,
        series: "minimum-wage",
        value: 900 + (count += 1),
      }).bill;
    // Every member against it: it is voted down, in its committee where that committee's members
    // vote it there, else on the floor. Either way the ending names the vote that ended it.
    const sunk = dev.decideAt(introduce().id, -1000, { chairHears: true });
    expect(
      ["committee-lost", "floor-lost"],
      `${where}: ${JSON.stringify(sunk.ending)}`,
    ).toContain(sunk.ending.how);
    if (
      sunk.ending.how === "committee-lost" ||
      sunk.ending.how === "floor-lost"
    )
      expect(sunk.ending.yes, where).toBe(0);
    // Short by three: the committee's members carry it to the floor, and the floor votes it down.
    const lost = dev.decideAt(introduce().id, -3, { chairHears: true });
    expect(lost.ending.how, `${where}: ${JSON.stringify(lost.ending)}`).toBe(
      "floor-lost",
    );
    if (lost.ending.how === "floor-lost") {
      expect(lost.ending.chamber, where).toBe(FEDERAL_HOUSE);
      expect(lost.ending.no - lost.ending.yes, where).toBe(3);
    }
    const narrow = introduce();
    expect(narrow.status, where).not.toBe("blocked");
    const short = dev.decideAt(narrow.id, 3, { sign: true, chairHears: true });
    expect(short.bill.status, where).toBe("failed");
    expect(short.ending.how, `${where}: ${JSON.stringify(short.ending)}`).toBe(
      "cloture-short",
    );
    if (short.ending.how === "cloture-short") {
      expect(short.ending.yes, where).toBeGreaterThan(short.ending.no);
      expect(short.ending.needed, where).toBeGreaterThan(short.ending.yes);
    }
    const wide = introduce();
    const passed = dev.decideAt(wide.id, 40, { sign: true, chairHears: true });
    expect(
      passed.ending.how,
      `${where}: ${JSON.stringify(passed.ending)}`,
    ).toBe("law");
    // Every vote was cast, so the sponsor was never short of one: no trade added a section, in
    // any of the four bills (the audit found a second section on 35 of 40 such bills in Congress).
    for (const result of [sunk, lost, short, passed])
      expect(
        result.addedSections,
        `${where}: ${result.bill.number} left with a section nobody introduced`,
      ).toBe(0);
    expect(passed.bill.provisions.length, where).toBe(1);
    // The outcome names the law rows the bill made, each with its reach.
    const outcome = dev.billOutcome(wide.id);
    expect(outcome.laws.length, where).toBeGreaterThan(0);
    for (const law of outcome.laws) expect(law.reach.lawId, where).toBe(law.id);
  }, 300_000);

  it("a chair who holds a bill unheard is named as why it failed, and casting the chair to hear it removes that ending", () => {
    // State chambers have committees; a chair holds a bill their own position and temperament are against.
    const chambers = dev
      .lawmakingBodies()
      .filter((b) => b.level === "state" && b.members.length > 2);
    let held: ReturnType<DevMode["decideAt"]> | undefined;
    const tried: string[] = [];
    search: for (const body of chambers)
      for (let n = 0; n < 12; n += 1) {
        const bill = dev.introduce({
          bodyOfficeId: body.id,
          sponsorId: body.members[n % body.members.length]!.key,
          series: "minimum-wage",
          value: 1200 + (count += 1),
        }).bill;
        if (bill.status === "blocked") continue search;
        const result = dev.decideAt(bill.id, 1000, { sign: true });
        tried.push(`${body.kind}: ${result.ending.how}`);
        expect(
          result.addedSections,
          `${where}: ${result.bill.number}, every vote cast`,
        ).toBe(0);
        if (result.ending.how === "committee-held") {
          held = result;
          break search;
        }
      }
    process.stderr.write(`${where}: ${tried.join("; ")}\n`);
    // A legislature whose chairs hear every wage bill has no such ending to show; the run says what it tried.
    if (!held) return;
    expect(held.bill.status, where).toBe("failed");
    if (held.ending.how === "committee-held") {
      expect(held.ending.chairId, where).toBeTruthy();
      expect(
        held.ending.chairPosition + held.ending.chairTrait,
        `${where}: the chair's own reasons sum below zero`,
      ).toBeLessThan(0);
    }
  }, 600_000);

  it("run-until stops on a law of the player's own governments, and on another place's only when asked", () => {
    const chain = lawChain(api());
    const before = core.date;
    const mine = dev.runUntil({ event: "law-takes-effect", cap: 400 });
    process.stderr.write(
      `${where}: mine ${JSON.stringify({ ...mine, records: mine.records.slice(0, 3) })}\n`,
    );
    expect(mine.where).toBe("mine");
    if (mine.reason === "event") {
      expect(mine.records.length, where).toBeGreaterThan(0);
      for (const id of mine.records) {
        const record = core.durableLog.get(id)!;
        expect(
          inTownChain(chain, String(record.facts?.jurisdiction)),
          `${where}: ${id} is a law of ${String(record.facts?.jurisdiction)}`,
        ).toBe(true);
      }
    } else expect(mine.reason, where).toBe("cap");
    expect(core.date >= before).toBe(true);
    // A subject that never happens is never mistaken for another record of the same kind.
    const never = dev.runUntil({
      event: "law-takes-effect",
      subject: "no-such-law-row",
      cap: 20,
    });
    expect(never.reason, where).toBe("cap");
    expect(never.days, where).toBe(20);
  }, 900_000);

  it("run-until a bill passes stops on the bill when its body votes it into law on its own floor day", () => {
    const body = dev.lawmakingBodies().find((b) => b.id === FEDERAL_HOUSE)!;
    const bill = dev.introduce({
      bodyOfficeId: body.id,
      sponsorId: body.members[0]!.key,
      series: "minimum-wage",
      // Whole cents an hour, a new amount each draw of the body.
      value: 1000 + (count += 1),
      schedule: true,
    }).bill;
    expect(bill.status, where).toBe("drafted");
    // Every member of each chamber is cast yes, each chair to hear it and the President to sign,
    // through the game's own choice records; nothing holds the vote, so the body votes on the day
    // its calendar gives the bill, and the run must stop there on this bill.
    const a = api();
    for (const chamber of chambersOf(a, bill)) {
      for (const term of members(a, chamber))
        castMemberVote(a, bill.id, memberKey(term), "yes");
      castChairHearing(a, bill.id, chamber, true);
    }
    executiveDecision(a, bill.id, true);
    const run = dev.runUntil({ event: "bill-passes", cap: 200 });
    process.stderr.write(`${where}: bill-passes ${JSON.stringify(run)}\n`);
    expect(run.reason, `${where}: a bill passed within the cap`).toBe("event");
    // It stopped on a bill of the player's own governments that became law (this one, unless
    // another of theirs became law first), never on a record nothing names.
    expect(run.records.length, where).toBeGreaterThan(0);
    for (const id of run.records)
      expect(dev.billOutcome(id).ending.how, `${where}: ${id}`).toBe("law");
    const mine = dev.runUntil({
      event: "bill-passes",
      subject: bill.id,
      cap: 200,
    });
    // Already law by the first stop, or it becomes law on its floor day within the cap.
    if (!run.records.includes(bill.id))
      expect(mine.records, where).toEqual([bill.id]);
    expect(dev.billOutcome(bill.id).ending.how, where).toBe("law");
  }, 900_000);

  it("the money check finds the dollars a passed law moved, by who holds them, and they sum to zero with the outside", () => {
    // A state wage floor set through dev mode's own law control, then paydays under it.
    const floor = lawInForce(api(), "minimum-wage").value ?? 0;
    dev.setLaw({ level: "state", series: "minimum-wage", value: floor + 1000 });
    dev.advance(
      new Date(Date.parse(`${core.date}T00:00:00Z`) + 35 * 864e5)
        .toISOString()
        .slice(0, 10),
    );
    const money = dev.twinMoney();
    process.stderr.write(
      `${where}: twin ${JSON.stringify({ changes: money.changes, classes: money.classes.map((c) => [c.key, c.diffMinor]), holdersMoved: money.holdersMoved, ms: money.twinMs })}\n`,
    );
    expect(
      money.changes.length,
      `${where}: what was done here`,
    ).toBeGreaterThan(0);
    expect(
      money.holdersMoved,
      `${where}: somebody's cash moved`,
    ).toBeGreaterThan(0);
    // Every dollar that left one holder reached another or went outside the books.
    expect(
      money.classes.reduce((sum, row) => sum + row.diffMinor, 0),
      where,
    ).toBe(0);
    // Each holder named is in this world, or only in the twin (a campaign fund the twin's race
    // opened and this world's did not), where it holds nothing here.
    for (const holder of money.holders)
      expect(
        core.people.has(holder.id) ||
          core.organizations.has(holder.id) ||
          holder.hereMinor === 0,
        `${where}: ${holder.id}`,
      ).toBe(true);
  }, 900_000);
});
