/**
 * The federal day in the world the owner plays: the bench world, a place and
 * seed nobody chose, every module installed. Dev mode's custom start seats a
 * town adult in the town's House seat; the member's week follows Congress's
 * published calendar unless they choose otherwise; the official salary is
 * paid; their own bill's vote stops them on its day and their vote is the
 * one counted; an interview the character answers is printed like one the
 * player answers; a child cannot be seated.
 */
import { randomBytes, createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "../simulation/dates";
import { townSeats } from "./modules/offices";
import { draftBill, scheduleVote, votesOn } from "./modules/legislature";
import { lawInForce } from "./modules/laws";
import { washingtonWeek } from "./office-day-federal-calendar";
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

const seed = process.env.OFFICE_FEDERAL_SEED ?? randomBytes(8).toString("hex");
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
    const voteOn = scheduleVote(api, bill.id);
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
});
