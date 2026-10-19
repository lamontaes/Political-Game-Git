/**
 * The federal day in the world the owner plays: the bench world, a place and
 * seed nobody chose, every module installed, played through the bench's own
 * player. The player takes the town's sitting U.S. representative: the week
 * follows Congress's published calendar unless they choose otherwise; their
 * own bill's vote holds them the evening before and their vote is the one
 * counted; a week spent at home misses a vote, recorded as an abstention;
 * the office is paid. Then the player takes the sitting president: a vacant
 * cabinet post holds them; their nominee goes to the Senate, which votes on
 * its sitting day by the senators' own sides; the character nominates the
 * rest once the player turns that stop off; the budget request due on its
 * statutory day is sent by the character, and the budgets engine's proposed
 * budget carries it; a trip to a town drawn at random meets people there;
 * the daily brief comes each working day.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./modules/offices";
import {
  billOf,
  committeeRecords,
  draftBill,
  floorAgendaOn,
  holdVote,
  LEGISLATURE_MODULE_ID,
  votesOn,
} from "./modules/legislature";
import { lawInForce } from "./modules/laws";
import {
  deskWaiting,
  leaveDeskToCharacter,
  officeActsOf,
  setStops,
} from "./modules/office-day";
import {
  addDays,
  budgetRequestDate,
  nthSitting,
  washingtonWeek,
  weekOf,
} from "./office-day-federal-calendar";
import {
  chooseWeek,
  federalSeatOf,
  heldFederal,
  releaseFederal,
  voteOnFloor,
  whereOn,
} from "./office-day-federal";
import {
  NOMINATIONS,
  cabinetOf,
  nominate,
  nominationCandidates,
  travelToTown,
} from "./office-day-federal-president";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  budgetPriorities,
  governments,
  proposedBudget,
} from "./modules/budgets";

const seed = process.env.OFFICE_FEDERAL_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "office-federal");
console.log(`office-day-federal: ${place.name} (${place.key}), seed ${seed}`);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const player = new BenchPlayer(core, world.director);
const holderOf = (seatId: string) =>
  (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[]
  )[0]?.personId;
const house = townSeats(api).find((s) => s.office.kind.startsWith("us-house"))!;
const member = holderOf(house.seat.id)!;
const voter = house.office.kind === "us-house";

/** The House's first sitting in a later week than `date`'s. */
function sittingAfterWeekOf(date: string): string {
  for (let n = 1; ; n++) {
    const day = nthSitting("house", date, n);
    if (weekOf(day) !== weekOf(date)) return day;
  }
}

/** A bill of the member's own, its vote on a House sitting day (see the fixture note below). */
function ownBill(n: number, voteOn: string) {
  const snap = lawInForce(api, "snap-maximum").value ?? 0;
  const bill = draftBill(api, {
    bodyOfficeId: house.office.id,
    sponsorId: member,
    provisions: [
      { kind: "law-amount", series: "snap-maximum", value: snap + 100 * n },
    ],
  });
  // Fixture: the vote goes on a real House sitting day. The legislature's
  // own floor week for Congress does not read the House calendar yet; that
  // is OPUS-GOV's, reported on the PR.
  api.moduleCalendar(LEGISLATURE_MODULE_ID).schedule({
    key: `meeting:${bill.id}`,
    date: voteOn,
    kind: "council-meeting",
    source: {
      tag: "ESTIMATED",
      citation: "test fixture: a House sitting day",
      asOf: core.date,
      estimatedFrom: "office-day-federal test",
    },
    sourceRecordIds: [bill.id],
  });
  return { bill, voteOn };
}

/**
 * Play day by day through `date`. A federal hold is handed to `onHold`; what
 * it leaves is left to the character. The polls and a bill on the desk are
 * left to the character too.
 */
function playThrough(date: string, onHold: (key: string) => void = () => {}) {
  for (let guard = 0; guard < 2_000; guard++) {
    if (player.pollingPlace) player.leavePolls();
    const packet = player.packet;
    if (packet?.kind === "stop") {
      for (const key of heldFederal(api)) onHold(key);
      for (const key of heldFederal(api)) releaseFederal(api, key);
      for (const bill of deskWaiting(api)) leaveDeskToCharacter(api, bill.id);
      player.resume({ kind: "stop", pauseId: packet.pauseId });
      continue;
    }
    if (packet?.kind === "choice") {
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      continue;
    }
    if (core.date >= date) return;
    player.advance("day");
  }
  throw new Error(`The day did not reach ${date}`);
}

describe(`the federal day (${place.name}, seed ${seed})`, () => {
  const president = holderOf("seat:US:president")!;
  let stateVoteOn = "";
  it("holds the president on a vacant cabinet post and sends the nominee to the Senate", () => {
    player.select(president);
    expect(federalSeatOf(api, president)?.kind).toBe("president");
    let held = false;
    // The next morning holds them: every post is vacant in Inauguration Week.
    playThrough(addDays(core.date, 2), (key) => {
      if (key !== NOMINATIONS || held) return;
      held = true;
      const pool = nominationCandidates(api, president);
      expect(pool.length).toBeGreaterThan(0);
      nominate(api, president, "state", pool[0]!.id);
    });
    expect(held).toBe(true);
    const state = cabinetOf(api).find((c) => c.postId === "state")!;
    expect(state.status).toBe("nominated");
    stateVoteOn = state.voteOn!;
    expect(stateVoteOn > core.date).toBe(true);
  });

  it("lets the character nominate the rest once that stop is off", () => {
    setStops(api, president, { nomination: false });
    playThrough(addDays(core.date, 2));
    expect(
      cabinetOf(api).every(
        (c) =>
          c.status === "nominated" ||
          c.status === "confirmed" ||
          c.status === "rejected",
      ),
    ).toBe(true);
    expect(
      officeActsOf(api, president).some(
        (a) => a.kind === "nominate" && a.how === "own-choice",
      ),
    ).toBe(true);
  });

  it("sends the budget request on its day, and the proposed budget carries it", () => {
    // The first Monday in February (31 U.S.C. 1105(a)).
    const due = budgetRequestDate(Number(core.date.slice(0, 4))).date;
    playThrough(due);
    const set = budgetPriorities(api, "US");
    expect(set?.setBy).toBe(president);
    const gov = governments(api).find((g) => g.id === "US")!;
    const [line, delta] = Object.entries(set!.changes)[0] ?? ["", 0];
    if (line) {
      const proposed = proposedBudget(
        api,
        gov,
        Number(due.slice(0, 4)) + 1,
        president,
      );
      expect(proposed.spendingMinor[line]).toBeGreaterThan(0);
      expect(Math.abs(delta)).toBeGreaterThan(0);
    }
  });

  it("meets people in a town drawn at random, and has the brief each working day", () => {
    const town = drawPlace(`${seed}:trip`, "office-federal-trip");
    const tripId = travelToTown(api, president, town.key);
    const trip = officeActsOf(api, president).find(
      (a) => a.recordId === tripId,
    )!;
    expect(trip.kind).toBe("trip");
    const met = [...core.people.values()].filter((p) =>
      p.id.startsWith(`person:trip:${town.key}:${core.date}:`),
    );
    expect(met.length).toBeGreaterThan(0);
    for (const p of met)
      expect(core.people.get(president)!.knownIds.has(p.id)).toBe(true);
    expect(
      officeActsOf(api, president).filter((a) => a.kind === "daily-brief")
        .length,
    ).toBeGreaterThan(0);
    expect(api.knows(president, "brief:cabinet-vacancies")).toBeDefined();
  });

  it("takes the sitting member and keeps Congress's weeks", () => {
    expect(federalSeatOf(api, member)?.kind).toBe(house.office.kind);
    // Control moves from the president to the member; the president's day goes on as the character's.
    player.select(member);
    setStops(api, member, { "floor-vote": true });
    expect(whereOn(api, member, core.date)).toBe(
      washingtonWeek("house", core.date) ? "washington" : "district",
    );
    // The player chooses a week at home whatever the House does.
    chooseWeek(api, member, core.date, "district");
    expect(whereOn(api, member, core.date)).toBe("district");
    chooseWeek(api, member, core.date, "washington");
  });

  it("holds the player the morning of their own bill's vote and counts the vote they cast", () => {
    // The second sitting: the first may fall on the day ahead, before any morning holds.
    const { bill, voteOn } = ownBill(1, nthSitting("house", core.date, 2));
    chooseWeek(api, member, voteOn, "washington");
    // The floor's agenda for the vote's day lists the bill, read from the legislature.
    if (bill.status === "drafted")
      expect(floorAgendaOn(api, voteOn).map((b) => b.id)).toContain(bill.id);
    const held: string[] = [];
    playThrough(voteOn, (key) => {
      if (key !== `federal-floor:${bill.id}`) return;
      held.push(core.date);
      voteOnFloor(api, member, bill.id, "no");
    });
    // A committee chair who opposes a bill does not hear it, and it dies
    // there with no floor vote (the legislature's committee stage).
    const committee = committeeRecords(api, bill.id)[0];
    if (committee && !committee.reported) {
      expect(votesOn(api, bill.id)).toHaveLength(0);
      expect(billOf(api, bill.id).status).toBe("failed");
      return;
    }
    const mine = votesOn(api, bill.id).find((v) => v.memberId === member);
    if (!voter) {
      // A delegate does not vote on final passage (House Rule III).
      expect(held).toEqual([]);
      expect(mine).toBeUndefined();
      return;
    }
    expect(held.length).toBeGreaterThan(0);
    expect(mine?.vote).toBe("no");
    expect(
      officeActsOf(api, member).some(
        (a) => a.kind === "vote" && a.recordId === bill.id && a.how === "did",
      ),
    ).toBe(true);
  });

  it("misses a vote in a week spent at home", () => {
    const { bill, voteOn } = ownBill(2, sittingAfterWeekOf(core.date));
    chooseWeek(api, member, voteOn, "district");
    playThrough(voteOn);
    if (!voter || !votesOn(api, bill.id).length) return;
    expect(votesOn(api, bill.id).find((v) => v.memberId === member)?.vote).toBe(
      "abstain",
    );
    expect(
      officeActsOf(api, member).find((a) => a.recordId === bill.id)?.detail,
    ).toMatch(/missed/);
  });

  it("puts the nominee to the Senate's vote on its sitting day", () => {
    playThrough(stateVoteOn);
    const post = cabinetOf(api).find((c) => c.postId === "state")!;
    expect(["confirmed", "rejected"]).toContain(post.status);
    expect(post.yes + post.no).toBe(100);
    expect(post.status === "confirmed").toBe(post.yes > post.no);
  });

  it("casts and records the vote of a senator the player controls on a House bill", () => {
    const seat = townSeats(api).find((s) => s.office.kind === "us-senate");
    // A territory has no senators: its town has no Senate seat to play.
    if (!seat) {
      expect(place.state, `${place.name}, seed ${seed}`).toMatch(
        /^US-(AS|GU|MP|PR|VI)$/,
      );
      return;
    }
    const senator = holderOf(seat.seat.id)!;
    expect(senator, "the town's state has a sitting senator").toBeTruthy();
    // A bill filed in the House reaches the Senate in the same count; the
    // player, now a senator, has not chosen, so the character votes it and
    // the act is on the record (it was cast with no act before).
    player.select(senator);
    // The clock binds to the character the day it runs for them.
    playThrough(addDays(core.date, 1));
    const { bill } = ownBill(3, nthSitting("house", core.date, 3));
    holdVote(api, bill.id);
    expect(
      officeActsOf(api, senator).some(
        (a) =>
          a.kind === "vote" && a.recordId === bill.id && a.how === "own-choice",
      ),
    ).toBe(true);
    expect(
      votesOn(api, bill.id).some((v) => v.memberId === senator) ||
        billOf(api, bill.id).status === "failed",
      "the senator's vote is counted, or the bill died in committee first",
    ).toBe(true);
    player.select(member);
  });

  it("pays the member through official pay", () => {
    const pay = api
      .moduleState("core2-official-pay-v1")
      .table("pay")
      .get(member) as unknown as { annualMinor: number; payerId: string };
    expect(pay.annualMinor).toBeGreaterThan(0);
    expect(pay.payerId).toContain("US");
  });
});
