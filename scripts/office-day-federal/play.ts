/**
 * The federal day played (office play, FEDERAL), as the owner plays it: ten
 * days as the town's sitting U.S. representative, then ten as the sitting
 * president, through the bench's own player. A drawn place and seed. As the
 * member: what stops them, their own bill's vote, a week at home that misses
 * one, committee seats. As the president: a nomination of their own, the
 * rest left to the character, the Senate's votes, the budget request, a trip
 * to a town drawn at random. Prints each act on the record, who did it (the
 * player or the character) and why.
 *
 * Run: node --max-old-space-size=10000 --import tsx scripts/office-day-federal/play.ts [seed]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import {
  OFFICES_MODULE_ID,
  townSeats,
  type TermRow,
} from "../../src/core2/modules/offices";
import {
  LEGISLATURE_MODULE_ID,
  draftBill,
  votesOn,
} from "../../src/core2/modules/legislature";
import { lawInForce } from "../../src/core2/modules/laws";
import { officeActsOf, setStops } from "../../src/core2/modules/office-day";
import {
  addDays,
  nthSitting,
  weekOf,
} from "../../src/core2/office-day-federal-calendar";
import {
  chooseWeek,
  committeeSeats,
  voteOnFloor,
  whereOn,
} from "../../src/core2/office-day-federal";
import {
  NOMINATIONS,
  cabinetOf,
  nominate,
  nominationCandidates,
  travelToTown,
} from "../../src/core2/office-day-federal-president";
import { budgetPriorities } from "../../src/core2/modules/budgets";
import { drawPlace } from "../core2-year/place";
import { playThrough } from "./drive";

setBookkeeping(false);
const seed =
  process.argv[2] ??
  createHash("sha256").update(String(Date.now())).digest("hex").slice(0, 16);
const place = drawPlace(seed, "office-federal");
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const player = new BenchPlayer(core, world.director);
const out: Record<string, unknown> = {
  seed,
  place: `${place.name} (${place.key})`,
  start: core.date,
};
const holderOf = (seatId: string) =>
  (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[]
  )[0]?.personId;

// ---- Ten days as the member ------------------------------------------------
const house = townSeats(api).find((s) => s.office.kind.startsWith("us-house"));
if (!house) throw new Error("No House seat covers the town");
const member = holderOf(house.seat.id)!;
player.select(member);
setStops(api, member, { "floor-vote": true, "whip-ask": true });
// The House's second sitting, then its first sitting in a later week.
const first = nthSitting("house", core.date, 2);
let later = first;
for (let n = 3; weekOf(later) === weekOf(first); n++)
  later = nthSitting("house", core.date, n);
const bills = [first, later].map((voteOn, n) => {
  const bill = draftBill(api, {
    bodyOfficeId: house.office.id,
    sponsorId: member,
    provisions: [
      {
        kind: "law-amount",
        series: "snap-maximum",
        value: (lawInForce(api, "snap-maximum").value ?? 0) + 100 * (n + 1),
      },
    ],
  });
  // As in the test: the vote goes on a real House sitting day (GOV's floor
  // week does not read the House calendar yet).
  api.moduleCalendar(LEGISLATURE_MODULE_ID).schedule({
    key: `meeting:${bill.id}`,
    date: voteOn,
    kind: "council-meeting",
    source: {
      tag: "ESTIMATED",
      citation: "play script: a House sitting day",
      asOf: core.date,
      estimatedFrom: "office-day-federal play",
    },
    sourceRecordIds: [bill.id],
  });
  return { id: bill.id, voteOn };
});
// The second bill's week is spent at home.
chooseWeek(api, member, bills[1]!.voteOn, "district");
const memberHolds: string[] = [];
playThrough(player, api, addDays(core.date, 10), (key) => {
  memberHolds.push(`${core.date} ${key}`);
  const bill = bills.find((b) => key === `federal-floor:${b.id}`);
  if (bill) voteOnFloor(api, member, bill.id, "yes");
});
out.member = {
  id: member,
  seat: house.seat.id,
  holds: memberHolds,
  weeks: bills.map((b) => ({
    voteOn: b.voteOn,
    where: whereOn(api, member, b.voteOn),
  })),
  votes: bills.map((b) => ({
    bill: b.id,
    voteOn: b.voteOn,
    mine: votesOn(api, b.id).find((v) => v.memberId === member)?.vote ?? null,
    yes: votesOn(api, b.id).filter((v) => v.vote === "yes").length,
    no: votesOn(api, b.id).filter((v) => v.vote === "no").length,
  })),
  committees: committeeSeats(api, member),
  acts: officeActsOf(api, member).map(
    (a) => `${a.date} ${a.kind} ${a.how} ${a.recordId} ${a.detail}`,
  ),
};

// ---- Ten days as the president -------------------------------------------------
const president = holderOf("seat:US:president")!;
player.select(president);
const presidentHolds: string[] = [];
let mine = "";
playThrough(player, api, addDays(core.date, 3), (key) => {
  presidentHolds.push(`${core.date} ${key}`);
  if (key !== NOMINATIONS || mine) return;
  const pool = nominationCandidates(api, president);
  mine = nominate(api, president, "state", pool[0]!.id);
});
setStops(api, president, { nomination: false });
const town = drawPlace(`${seed}:trip`, "office-federal-trip");
const trip = travelToTown(api, president, town.key);
playThrough(player, api, addDays(core.date, 7), (key) =>
  presidentHolds.push(`${core.date} ${key}`),
);
out.president = {
  id: president,
  holds: presidentHolds,
  ownNominee: mine,
  trip: { town: `${town.name} (${town.key})`, record: trip },
  cabinet: cabinetOf(api).map(
    (c) =>
      `${c.postId} ${c.status} ${c.nomineeId} vote ${c.voteOn} ${c.yes}-${c.no}`,
  ),
  budgetRequest: budgetPriorities(api, "US") ?? null,
  acts: officeActsOf(api, president).map(
    (a) => `${a.date} ${a.kind} ${a.how} ${a.recordId} ${a.detail}`,
  ),
};
out.end = core.date;
console.log(JSON.stringify(out, null, 2));
