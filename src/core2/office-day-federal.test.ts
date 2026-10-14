/**
 * The federal day in the world the owner plays: the bench world, a place and
 * seed nobody chose, every module installed. Dev mode's custom start seats a
 * town adult in the town's House seat; the member's week follows Congress's
 * published calendar unless they choose otherwise; the official salary is
 * paid; their own bill's vote stops them on its day and their vote is the
 * one counted; an interview the character answers is printed like one the
 * player answers; a child cannot be seated. Then a second town adult is
 * seated as president: a nomination goes to the Senate and is voted on its
 * sitting day by the senators' own sides; the budget request due on its
 * statutory day is sent by the character when the player lets the day pass,
 * and the budgets engine's proposed budget carries it; a trip to a town drawn
 * at random meets people there; the daily brief leaves facts the president
 * now knows.
 */
import { randomBytes, createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "../simulation/dates";
import { townSeats } from "./modules/offices";
import {
  billOf,
  committeeRecords,
  draftBill,
  LEGISLATURE_MODULE_ID,
  votesOn,
} from "./modules/legislature";
import { lawInForce } from "./modules/laws";
import {
  budgetRequestDate,
  nthSitting,
  washingtonWeek,
} from "./office-day-federal-calendar";
import {
  actsOf,
  askForInterview,
  chooseWeek,
  federalDay,
  giveInterview,
  holderRow,
  minimumAge,
  startAsFederalOfficeholder,
  voteOnFloor,
  whereOn,
} from "./office-day-federal";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  budgetPriorities,
  governments,
  proposedBudget,
} from "./modules/budgets";
import {
  cabinetOf,
  dailyBrief,
  nominate,
  nominationCandidates,
  travelToTown,
} from "./office-day-federal-president";

const seed = process.env.OFFICE_FEDERAL_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "office-federal");
console.log(`office-day-federal: ${place.name} (${place.key}), seed ${seed}`);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const house = townSeats(api).find((s) => s.office.kind.startsWith("us-house"))!;
const age = (birth: string) =>
  Number(core.date.slice(0, 4)) -
  Number(birth.slice(0, 4)) -
  (core.date.slice(5) < birth.slice(5) ? 1 : 0);
const hash = (id: string) =>
  createHash("sha256")
    .update(seed + id)
    .digest("hex");
const adults = [...core.people.values()]
  .filter(
    (p) =>
      p.alive &&
      p.placeId === world.placeId &&
      age(p.birthDate) >= minimumAge(house.office.kind)!,
  )
  .sort((a, b) => hash(a.id).localeCompare(hash(b.id)));
const step = (days = 1) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

describe(`the federal day (${place.name}, seed ${seed})`, () => {
  it("never seats someone under the Constitution's age", () => {
    const child = [...core.people.values()].find(
      (p) => p.alive && age(p.birthDate) < 25,
    )!;
    expect(() =>
      startAsFederalOfficeholder(core, child.id, house.seat.id),
    ).toThrow(/under 25/);
  });

  const me = adults[0]!;
  it("seats the player and keeps Congress's weeks", () => {
    const row = startAsFederalOfficeholder(core, me.id, house.seat.id);
    expect(core.playerId).toBe(me.id);
    expect(row.kind).toBe(house.office.kind);
    const day = federalDay(api, me.id);
    expect(day.where).toBe(
      washingtonWeek("house", day.date) ? "washington" : "district",
    );
    // The player chooses a week at home whatever the House does.
    chooseWeek(api, me.id, day.date, "district");
    expect(whereOn(holderRow(api, me.id)!, day.date)).toBe("district");
    chooseWeek(api, me.id, day.date, "washington");
  });

  const president = adults.find(
    (p) => p.id !== me.id && age(p.birthDate) >= minimumAge("president")!,
  )!;
  let stateVoteOn = "";
  it("seats a president on Inauguration Day and sends a nominee to the Senate", () => {
    startAsFederalOfficeholder(core, president.id, "seat:US:president");
    const pool = nominationCandidates(api, president.id);
    expect(pool.length).toBeGreaterThan(0);
    const act = nominate(api, president.id, "state", pool[0]!.id);
    stateVoteOn = String(act.facts.voteOn);
    expect(stateVoteOn > core.date).toBe(true);
    expect(cabinetOf(api).find((c) => c.postId === "state")!.status).toBe(
      "nominated",
    );
  });

  it("stops the player for their own bill's vote and counts the vote they cast", () => {
    const snap = lawInForce(api, "snap-maximum").value ?? 0;
    const bill = draftBill(api, {
      bodyOfficeId: house.office.id,
      sponsorId: me.id,
      provisions: [
        { kind: "law-amount", series: "snap-maximum", value: snap + 100 },
      ],
    });
    expect(bill.status).toBe("drafted");
    // Fixture: the vote goes on the House's next real sitting day. The
    // legislature's own floor week for Congress (scheduleVote) does not read
    // the House calendar yet; that is OPUS-GOV's, reported on the PR.
    const voteOn = nthSitting("house", core.date, 1);
    api.moduleCalendar(LEGISLATURE_MODULE_ID).schedule({
      key: `meeting:${bill.id}`,
      date: voteOn,
      kind: "council-meeting",
      source: {
        tag: "ESTIMATED",
        citation: "test fixture: the House's next sitting",
        asOf: core.date,
        estimatedFrom: "office-day-federal test",
      },
      sourceRecordIds: [bill.id],
    });
    while (addDays(makeIsoDate(core.date), 1) < voteOn) step();
    const day = federalDay(api, me.id);
    expect(day.date).toBe(voteOn);
    const item = day.items.find((i) => i.sourceRecordIds[0] === bill.id);
    if (house.office.kind === "us-house-delegate") {
      // A delegate does not vote on final passage (House Rule III).
      expect(item).toBeUndefined();
      expect(() => voteOnFloor(api, me.id, bill.id, "yes")).toThrow();
    } else {
      expect(item).toMatchObject({ kind: "own-bill-vote", stops: true });
      voteOnFloor(api, me.id, bill.id, "no");
    }
    step();
    // A committee chair who opposes a bill does not hear it, and it dies
    // there with no floor vote (the legislature's committee stage).
    const committee = committeeRecords(api, bill.id)[0];
    if (committee && !committee.reported) {
      expect(votesOn(api, bill.id)).toHaveLength(0);
      expect(billOf(api, bill.id).status).toBe("failed");
      return;
    }
    const mine = votesOn(api, bill.id).find((v) => v.memberId === me.id);
    if (house.office.kind === "us-house-delegate") expect(mine).toBeUndefined();
    else expect(mine?.vote).toBe("no");
  });

  it("pays the office through official pay", () => {
    while (core.date < "2025-02-02") step();
    const pay = api
      .moduleState("core2-official-pay-v1")
      .table("pay")
      .get(me.id) as unknown as { annualMinor: number; payerId: string };
    expect(pay.annualMinor).toBeGreaterThan(0);
    expect(pay.payerId).toContain("US");
  });

  it("prints an interview the character answered, as one the player answered", () => {
    const asked = askForInterview(api, me.id);
    if (asked.status !== "invited") {
      // The outlet's own reasons (room, newsworthiness) may turn the member down.
      expect(asked.reason).not.toBeNull();
      return;
    }
    const act = giveInterview(api, me.id, asked.id);
    expect(act.mode).toBe("simulated");
    expect(act.facts.status).toBe("published");
    expect(actsOf(api, me.id).some((a) => a.id === act.id)).toBe(true);
  });

  it("puts the nominee to the Senate's vote on its sitting day", () => {
    while (core.date < stateVoteOn) step();
    const post = cabinetOf(api).find((c) => c.postId === "state")!;
    expect(["confirmed", "rejected"]).toContain(post.status);
    expect(post.yes + post.no).toBe(100);
    expect(post.status === "confirmed").toBe(post.yes > post.no);
  });

  it("sends the budget request on its day, and the proposed budget carries it", () => {
    // The first Monday in February (31 U.S.C. 1105(a)); it passes while the nomination waits.
    const due = budgetRequestDate(2025).date;
    expect(core.date >= due).toBe(true);
    const set = budgetPriorities(api, "US");
    expect(set?.setBy).toBe(president.id);
    const gov = governments(api).find((g) => g.id === "US")!;
    const [line, delta] = Object.entries(set!.changes)[0] ?? ["", 0];
    if (line) {
      const proposed = proposedBudget(
        api,
        gov,
        Number(due.slice(0, 4)) + 1,
        president.id,
      );
      expect(proposed.spendingMinor[line]).toBeGreaterThan(0);
      expect(Math.abs(delta)).toBeGreaterThan(0);
    }
  });

  it("meets people in a town drawn at random, and learns from the brief", () => {
    const town = drawPlace(`${seed}:trip`, "office-federal-trip");
    const act = travelToTown(api, president.id, town.key);
    expect(act.facts.met).toBeGreaterThan(0);
    for (const id of act.sourceRecordIds.slice(1))
      expect(core.people.get(president.id)!.knownIds.has(id)).toBe(true);
    dailyBrief(api, president.id);
    expect(api.knows(president.id, "brief:cabinet-vacancies")).toBeDefined();
  });
});
