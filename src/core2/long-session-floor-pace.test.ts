/**
 * A year-long legislature takes its bills to the floor all year, not in the
 * autumn (Account lead, Nov 15, from the lying thread's trace: Ohio sits Jan 6
 * to Dec 31 with nine filings, so the floor's share, nine over forty-six
 * weeks, rounded to no bills a week until about August). Pinned at Cuyahoga
 * Heights, Ohio (seed aa11, played by the game's own days) and at Red Hook,
 * U.S. Virgin Islands (the seed the ask-vote probe drew, opening day only).
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  floorAgendaOn,
  floorDateOf,
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "./modules/legislature";
import { legislativeSessionsOf } from "./modules/world-legislating";
import { coreAPI } from "./state";

const OHIO = { place: "3919806", seed: "aa11", state: "US-OH" }; // Cuyahoga Heights: the General Assembly sits all year
const VIRGIN_ISLANDS = {
  place: "territory:VI:red-hook",
  seed: "669e51daf65de3d4039d0e2d88e443f63335abde356140aecdd5775faffdbfc6",
  state: "US-VI",
};

const open = (at: typeof OHIO) => {
  const built = buildBenchWorld(at.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: at.place,
  });
  const core = built.core;
  const api = coreAPI(core);
  const session = () =>
    legislativeSessionsOf(api).find((s) => s.jurisdiction === at.state)!;
  const opened = session();
  // The premise: a year-long session with a handful of filings, so the
  // floor's share per week is well under one bill.
  expect(opened.adjournAt).toBe("2025-12-31");
  expect(opened.perWeek).toBeGreaterThan(0);
  expect(opened.filings.length).toBeGreaterThan(3);
  expect(opened.filings.length).toBeLessThan(20);
  // The first drafted bill of the session's own chamber by floor date.
  const first = (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter(
      (b) => b.status === "drafted" && b.bodyOfficeId === opened.bodyOfficeId,
    )
    .map((b) => ({ id: b.id, number: b.number, day: floorDateOf(api, b.id) }))
    .filter((b) => b.day)
    .sort((a, b) => a.day!.localeCompare(b.day!))[0]!;
  return { core, api, session, opened, first };
};

describe("a year-long legislature takes bills to the floor from its first floor week", () => {
  it("votes the first bills in the first weeks and spreads the rest (Ohio)", () => {
    const { core, api, session, opened, first } = open(OHIO);
    // The three readers agree on the first bill's day: the date its paper
    // names (the one the leader calendared), the agenda the evening ask reads,
    // and the day the floor holds the vote.
    expect(first, "a drafted bill has a floor date").toBeTruthy();
    expect(first.day, "named for the first floor week").toBe(opened.firstFloor);
    expect(floorAgendaOn(api, first.day!).map((b) => b.id)).toContain(first.id);
    const voted = (by: string) => {
      while (core.date < by)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      return session().bills.length;
    };
    expect(voted(addDays(first.day!, 1))).toBeGreaterThanOrEqual(1);
    expect(
      session().bills.find((b) => b.number === first.number)?.decidedOn,
    ).toBe(first.day);
    // By early April, the floor has taken up more, and the filings are not all spent.
    const april = voted("2025-04-07");
    expect(april).toBeGreaterThanOrEqual(2);
    expect(april).toBeLessThan(opened.filings.length);
  }, 400_000);

  it("names the first floor week for the first bill at Red Hook, Virgin Islands", () => {
    const { api, opened, first } = open(VIRGIN_ISLANDS);
    expect(first, "a drafted bill has a floor date").toBeTruthy();
    expect(first.day).toBe(opened.firstFloor);
    expect(floorAgendaOn(api, first.day!).map((b) => b.id)).toContain(first.id);
  }, 120_000);
});
