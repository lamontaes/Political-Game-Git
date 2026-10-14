/**
 * The federal day played (office play, FEDERAL): ten days as the town's U.S.
 * representative, as the owner plays it. A drawn place and seed; dev mode's
 * custom start seats the player; they set what stops them, do one interview
 * and simulate another, hold a town hall, file a bill, skip a week at home,
 * and read what the press printed and what the character did on its own.
 *
 * Run: node --max-old-space-size=10000 --import tsx scripts/office-day-federal/play.ts [seed]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { townSeats } from "../../src/core2/modules/offices";
import {
  LEGISLATURE_MODULE_ID,
  draftBill,
  scheduleVote,
  votesOn,
} from "../../src/core2/modules/legislature";
import { lawInForce } from "../../src/core2/modules/laws";
import {
  interviewsFor,
  outletsHere,
  storiesPrinted,
  candidateAnswers,
  officeholderSpeaker,
} from "../../src/core2/modules/press";
import {
  actsOf,
  askForInterview,
  federalDay,
  holderRow,
  giveInterview,
  holdDistrictTownHall,
  minimumAge,
  setFederalStops,
  startAsFederalOfficeholder,
  voteOnFloor,
} from "../../src/core2/office-day-federal";
import { composeJournal } from "../../src/director/journal";
import { drawPlace } from "../core2-year/place";

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
const out: Record<string, unknown> = {
  seed,
  place: `${place.name} (${place.key})`,
};

// Who the player continues as: an adult of the starting player's own
// household old enough to sit in the House, else the town's eligible full
// person whose id hashes nearest the seed (dev mode's choice, not an actor's).
const house = townSeats(api).find((s) => s.office.kind.startsWith("us-house"));
if (!house) throw new Error("No House seat covers the town");
const floor = minimumAge(house.office.kind)!;
const age = (birth: string) =>
  Number(core.date.slice(0, 4)) -
  Number(birth.slice(0, 4)) -
  (core.date.slice(5) < birth.slice(5) ? 1 : 0);
const start = world.playerId ? core.people.get(world.playerId) : undefined;
const household = start ? core.households.get(start.householdId) : undefined;
const eligible = [...core.people.values()].filter(
  (p) => p.alive && p.placeId === world.placeId && age(p.birthDate) >= floor,
);
const hash = (id: string) =>
  createHash("sha256")
    .update(seed + id)
    .digest("hex");
const me =
  eligible.find((p) => household?.memberIds.includes(p.id)) ??
  eligible.sort((a, b) => hash(a.id).localeCompare(hash(b.id)))[0];
if (!me) throw new Error("No one in town is old enough to sit in the House");
startAsFederalOfficeholder(core, me.id, house.seat.id);
// The director keeps the journal of the person the player now is.
world.director.watch(core, me.id);
out.player = {
  id: me.id,
  age: age(me.birthDate),
  seat: house.seat.id,
  startingPlayer: world.playerId,
};

// The owner's settings: stop for interviews too, and for every floor vote.
setFederalStops(api, me.id, { "interview-invite": true, "floor-vote": true });

const days: unknown[] = [];
const step = () => advanceCore(core, addDays(makeIsoDate(core.date), 1));
let billId: string | null = null;
for (let i = 0; i < 10; i++) {
  const day = federalDay(api, me.id);
  const did: string[] = [];
  if (i === 0) {
    // File a bill of their own: raise the federal SNAP maximum by a dollar a month.
    const snap = lawInForce(api, "snap-maximum").value ?? 0;
    const bill = draftBill(api, {
      bodyOfficeId: house.office.id,
      sponsorId: me.id,
      provisions: [
        { kind: "law-amount", series: "snap-maximum", value: snap + 100 },
      ],
    });
    billId = bill.id;
    did.push(
      `filed ${bill.id} (${bill.status}), vote ${bill.status === "drafted" ? scheduleVote(api, bill.id) : "none"}`,
    );
  }
  if (i === 1) {
    // Do one interview: the player answers, each a little more strongly than their own view.
    const asked = askForInterview(api, me.id);
    did.push(
      `asked ${asked.outletId}: ${asked.status}${asked.reason ? ` (${asked.reason})` : ""}`,
    );
    if (asked.status === "invited") {
      const speaker = officeholderSpeaker(api, me.id)!;
      const own = candidateAnswers(api, asked.questions, speaker);
      const answers = own.map((a) => ({
        ...a,
        position:
          a.position === null
            ? null
            : Math.max(-1, Math.min(1, a.position * 1.5)),
      }));
      did.push(
        `did interview ${giveInterview(api, me.id, asked.id, answers).id}`,
      );
    }
  }
  if (i === 2) {
    // Simulate another: ask a second outlet and let the character answer.
    const second = outletsHere(api).filter((o) => o.tier !== "national")[1]?.id;
    const asked = askForInterview(api, me.id, second);
    did.push(
      `asked ${asked.outletId}: ${asked.status}${asked.reason ? ` (${asked.reason})` : ""}`,
    );
    if (asked.status === "invited")
      did.push(`simulated interview ${giveInterview(api, me.id, asked.id).id}`);
  }
  for (const item of day.items)
    if (item.stops && item.kind.endsWith("vote") && item.sourceRecordIds[0])
      did.push(
        `stopped for ${item.id}: voted ${voteOnFloor(api, me.id, item.sourceRecordIds[0], "yes").facts.vote}`,
      );
  if (i === 6) {
    did.push(
      `town hall ${holdDistrictTownHall(api, me.id, undefined).sourceRecordIds[0]}`,
    );
  }
  days.push({ ...day, did });
  step();
  if (i === 4) {
    // Skip a week: nothing stops the player for seven days; the character
    // lives them and the director turns waiting scenes into journal lines.
    const stops = holderRow(api, me.id)!.stops;
    const skipFrom = core.date;
    setFederalStops(
      api,
      me.id,
      Object.fromEntries(Object.keys(stops).map((k) => [k, false])),
    );
    world.director.setMode("skipping");
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    world.director.setMode("live");
    setFederalStops(api, me.id, stops);
    out.skippedWeek = { from: skipFrom, to: core.date };
  }
}

out.days = days;

out.acts = actsOf(api, me.id);
out.interviews = interviewsFor(api, me.id).map((i) => ({
  id: i.id,
  status: i.status,
  reason: i.reason,
  outlet: i.outletId,
  questions: i.questions,
}));
out.stories = outletsHere(api).flatMap((o) =>
  storiesPrinted(api, o.id)
    .filter((s) => JSON.stringify(s).includes(me.id))
    .map((s) => ({ outlet: o.id, ...(s as object) })),
);
out.bill = billId
  ? {
      row: api.moduleState(LEGISLATURE_MODULE_ID).table("bills").get(billId),
      myVote:
        votesOn(api, billId).find((v) => v.memberId === me.id)?.vote ?? null,
      tally: votesOn(api, billId).reduce<Record<string, number>>(
        (t, v) => ({ ...t, [v.vote]: (t[v.vote] ?? 0) + 1 }),
        {},
      ),
    }
  : null;
out.pay = {
  row: api.moduleState("core2-official-pay-v1").table("pay").get(me.id) ?? null,
  jobId: core.people.get(me.id)?.jobId ?? null,
};
out.journal = composeJournal(core, world.director, me.id).map((c) =>
  JSON.stringify(c).slice(0, 400),
);
console.log(JSON.stringify(out, null, 1));
