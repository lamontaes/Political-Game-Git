/* global process, console */
// The golden path as the play screen plays it, headless, in the place the
// golden-path runner draws: file at the real office, campaign, election
// night, then a resident officeholder drafts a bill and the body votes.
// Prints the furthest step reached. Usage: node --import tsx src/bench/path-check.ts
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { governmentView } from "./government";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { campaignAct } from "./campaign";
import { electionResults } from "./results";
import { seatAct, seatView } from "./legislature";
import { reachedSteps } from "./reached";
import { benchScene } from "./scene";
import type { ContestRow } from "../core2/modules/elections";

const seed = process.env.GOLDEN_PATH_SEED ?? "path-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const started = performance.now();
const w = buildBenchWorld(seed, "2026-10-12", {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const player = new BenchPlayer(w.core, w.director);
const log: string[] = [];
const me = w.playerId!;
player.select(me);
benchScene(w.core, me, player.packet);

/** Live until the date, the character answering its own choices. */
function liveUntil(date: string) {
  for (let guard = 0; w.core.date < date && guard < 400; guard++) {
    const packet =
      player.packet?.kind === "stop"
        ? player.packet
        : player.advance("skip", undefined, 7).packet;
    if (packet.kind === "stop")
      player.resume({ kind: "stop", pauseId: packet.pauseId });
  }
}

// Step 3: walk into the office that takes filings for a contest you can enter.
const gov = governmentView(w.core, me);
const enterable = gov.contests.find((c) => c.checks.every((k) => k.met));
let filed = false;
if (enterable) {
  let visit = openBenchFilingVisit(
    w.core,
    me,
    enterable.filingOffice.filedWith,
    0,
  );
  const pick = visit.visit.choices.find(
    (row) =>
      row.action.kind === "pick" &&
      row.action.contestId === enterable.contest.id,
  );
  if (pick) visit = chooseAtCounter(w.core, visit, pick.key);
  const file = visit.visit.choices.find((row) => row.action.kind === "file");
  if (file) visit = chooseAtCounter(w.core, visit, file.key);
  filed = Boolean(visit.result);
  log.push(
    `filed ${enterable.contest.title} with ${enterable.filingOffice.filedWith}: ${(visit.result as { status?: string } | undefined)?.status ?? "no filing"}`,
  );
} else log.push("no contest the 18-year-old can enter");

// Step 4: campaign.
if (filed) {
  const view = governmentView(w.core, me);
  const filing = view.filings[0];
  if (filing) {
    const doors = campaignAct(w.core, me, {
      filingId: filing.id,
      kind: "doors",
      hours: 2,
    }) as { reached: number };
    log.push(`doors reached ${doors.reached}`);
  }
}

// Step 5: live to the first election day, then read election night.
const contests = coreAPI(w.core)
  .moduleState("core2-elections-v1")
  .table("contests")
  .rows() as unknown as ContestRow[];
// The player's own race when they filed, else the first election ahead.
const mine = governmentView(w.core, me).filings[0];
const ownElection = contests.find(
  (c) => c.id === mine?.contestId,
)?.electionDate;
const firstElection =
  ownElection ??
  contests
    .map((c) => c.electionDate)
    .filter((d) => d > w.core.date)
    .sort()[0];
if (firstElection) {
  liveUntil(firstElection);
  liveUntil(
    new Date(Date.parse(`${firstElection}T00:00:00Z`) + 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
  const races = electionResults(w.core, me);
  log.push(`election night ${firstElection}: ${races.length} races`);
}

// Steps 6 to 8: a resident officeholder on a body drafts and the body votes.
const holder = governmentView(w.core, me).seats.find(
  (row) =>
    row.holder?.personId && seatView(w.core, row.holder.personId).bodies.length,
)?.holder?.personId;
let member: string | undefined;
if (holder) {
  member = holder;
  player.select(holder);
  const seat = seatView(w.core, holder);
  const body = seat.bodies[0]!;
  const wage = seat.amounts.find((a) => a.series === "minimum-wage");
  let bill = seatAct(w.core, holder, {
    kind: "draft",
    officeId: body.officeId,
    series: "minimum-wage",
    value: (wage?.current ?? 0) + 200,
  }) as { id: string; number: string; status: string };
  // Where the state rules a local wage out, a catalogued policy instead.
  for (const question of seat.questions) {
    if (bill.status !== "blocked") break;
    bill = seatAct(w.core, holder, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; number: string; status: string };
  }
  const colleague = body.members.find((m) => !m.you);
  if (colleague)
    seatAct(w.core, holder, {
      kind: "deal",
      billId: bill.id,
      memberId: colleague.key,
      deal: "favor",
    });
  const { date } = seatAct(w.core, holder, {
    kind: "schedule",
    billId: bill.id,
  }) as { date: string };
  liveUntil(date);
  liveUntil(
    new Date(Date.parse(`${date}T00:00:00Z`) + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
  const after = seatView(w.core, holder).bills.find(
    (b) => b.bill.id === bill.id,
  );
  log.push(
    `${body.title} bill ${bill.number}: ${after?.bill.status} (${after?.votes.filter((v) => v.vote === "yes").length ?? 0}–${after?.votes.filter((v) => v.vote === "no").length ?? 0})`,
  );
} else log.push("no resident officeholder on a body");

const steps = [
  ...new Set([
    ...reachedSteps(w.core, me).map((row) => row.step),
    ...(member ? reachedSteps(w.core, member).map((row) => row.step) : []),
  ]),
].sort((a, b) => a - b);
const place = w.place.displayName ?? w.place.key;
console.log(
  `path-check: ${place} (${w.place.key}), seed ${seed}; steps reached ${steps.join(", ") || "none"}; furthest ${steps.at(-1) ?? "none"}. ${log.join("; ")} (${((performance.now() - started) / 1000).toFixed(0)} s)`,
);
if (!steps.length) process.exit(1);
