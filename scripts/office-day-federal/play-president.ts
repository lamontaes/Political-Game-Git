/**
 * The federal day played as president (office play, FEDERAL): ten days as
 * the owner plays it. A drawn place and seed; dev mode's custom start seats
 * the player on Inauguration Day; they nominate part of the cabinet and let
 * the character name the rest, read the daily brief, do one interview and
 * simulate another, fly to a town drawn at random, send the vice president to
 * another, skip a week, and send the budget request on its day.
 *
 * Run: node --max-old-space-size=10000 --import tsx scripts/office-day-federal/play-president.ts [seed]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { budgetPriorities } from "../../src/core2/modules/budgets";
import {
  candidateAnswers,
  interviewsFor,
  officeholderSpeaker,
  outletsHere,
  storiesPrinted,
} from "../../src/core2/modules/press";
import {
  actsOf,
  askForInterview,
  federalDay,
  giveInterview,
  holderRow,
  minimumAge,
  setFederalStops,
  startAsFederalOfficeholder,
} from "../../src/core2/office-day-federal";
import {
  cabinetOf,
  dailyBrief,
  nominate,
  nominationCandidates,
  requestBudget,
  travelToTown,
  vicePresidentOf,
} from "../../src/core2/office-day-federal-president";
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

const floor = minimumAge("president")!;
const age = (birth: string) =>
  Number(core.date.slice(0, 4)) -
  Number(birth.slice(0, 4)) -
  (core.date.slice(5) < birth.slice(5) ? 1 : 0);
const start = world.playerId ? core.people.get(world.playerId) : undefined;
const household = start ? core.households.get(start.householdId) : undefined;
const hash = (id: string) =>
  createHash("sha256")
    .update(seed + id)
    .digest("hex");
const eligible = [...core.people.values()]
  .filter(
    (p) => p.alive && p.placeId === world.placeId && age(p.birthDate) >= floor,
  )
  .sort((a, b) => hash(a.id).localeCompare(hash(b.id)));
const me =
  eligible.find((p) => household?.memberIds.includes(p.id)) ?? eligible[0];
if (!me) throw new Error("No one in town is old enough to be president");
startAsFederalOfficeholder(core, me.id, "seat:US:president");
world.director.watch(core, me.id);
out.player = {
  id: me.id,
  age: age(me.birthDate),
  startingPlayer: world.playerId,
  vicePresident: vicePresidentOf(api),
};

const step = () => advanceCore(core, addDays(makeIsoDate(core.date), 1));
const days: unknown[] = [];
const trips = [
  drawPlace(`${seed}:trip:1`, "office-federal-trip"),
  drawPlace(`${seed}:trip:2`, "office-federal-trip"),
];
for (let i = 0; i < 10; i++) {
  const day = federalDay(api, me.id);
  const did: string[] = [];
  if (i === 0) {
    // Name the first three secretaries by hand: the most experienced
    // candidate the president knows, else the most experienced.
    for (const post of cabinetOf(api).slice(0, 3)) {
      const pool = nominationCandidates(api, me.id);
      const pick =
        [...pool].sort(
          (a, b) =>
            Number(b.known) - Number(a.known) ||
            b.qualification - a.qualification ||
            a.id.localeCompare(b.id),
        )[0] ?? null;
      if (pick) {
        const act = nominate(api, me.id, post.postId, pick.id);
        did.push(
          `nominated ${pick.id} for ${post.postId}: vote ${act.facts.voteOn}`,
        );
      }
    }
    // The rest the character names at the end of the day.
    setFederalStops(api, me.id, { nomination: false });
    did.push(`brief ${dailyBrief(api, me.id).sourceRecordIds.join(",")}`);
  }
  if (i === 1) {
    const national = outletsHere(api).find((o) => o.tier === "national");
    const asked = askForInterview(api, me.id, national?.id);
    did.push(`asked ${asked.outletId}: ${asked.status}`);
    if (asked.status === "invited") {
      const speaker = officeholderSpeaker(api, me.id)!;
      const answers = candidateAnswers(api, asked.questions, speaker).map(
        (a) => ({
          ...a,
          position: a.position === null ? null : -a.position * 0.5,
        }),
      );
      did.push(
        `did interview ${giveInterview(api, me.id, asked.id, answers).id}`,
      );
    }
  }
  if (i === 2) {
    const asked = askForInterview(api, me.id);
    did.push(`asked ${asked.outletId}: ${asked.status}`);
    if (asked.status === "invited")
      did.push(`simulated interview ${giveInterview(api, me.id, asked.id).id}`);
  }
  if (i === 3) {
    const act = travelToTown(api, me.id, trips[0]!.key);
    did.push(
      `flew to ${trips[0]!.name} (${trips[0]!.key}): met ${act.facts.met}, moved ${act.facts.moved}`,
    );
  }
  if (i === 5) {
    const act = travelToTown(api, me.id, trips[1]!.key, {
      sendVicePresident: true,
    });
    did.push(
      `sent the vice president to ${trips[1]!.name} (${trips[1]!.key}): met ${act.facts.met}`,
    );
  }
  for (const item of day.items)
    if (item.stops && item.kind === "budget-request") {
      // The player raises veterans' care by one billion dollars, nothing else.
      const act = requestBudget(api, me.id, { veterans: 100_000_000_000 });
      did.push(`budget request ${act.id}`);
    }
  days.push({
    ...day,
    items: day.items.map((i) => `${i.kind}${i.stops ? "*" : ""}`),
    did,
  });
  step();
  if (i === 4) {
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
out.cabinet = cabinetOf(api);
out.acts = actsOf(api, me.id).map((a) => ({
  ...a,
  sourceRecordIds: a.sourceRecordIds.slice(0, 4),
}));
out.interviews = interviewsFor(api, me.id).map((i) => ({
  id: i.id,
  status: i.status,
  reason: i.reason,
}));
out.stories = outletsHere(api).flatMap((o) =>
  storiesPrinted(api, o.id)
    .filter((s) => JSON.stringify(s).includes(me.id))
    .map((s) => (s as unknown as { id: string }).id),
);
out.budgetPriorities = budgetPriorities(api, "US");
out.pay = {
  row: api.moduleState("core2-official-pay-v1").table("pay").get(me.id) ?? null,
  jobId: core.people.get(me.id)?.jobId ?? null,
};
out.journal = composeJournal(core, world.director, me.id).map((c) =>
  JSON.stringify(c).slice(0, 300),
);
console.log(JSON.stringify(out, null, 1));
