/* global process, console */
// The golden path as the play screen plays it, headless, in the place the
// golden-path runner draws: file at the real office, campaign, election
// night, then a resident officeholder drafts a bill and the body votes.
// Prints the furthest step reached. Usage: node --import tsx src/bench/path-check.ts
import { coreAPI } from "../core2/state";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { committeeRecords } from "../core2/modules/legislature";
import { billTally } from "./bill-tally";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { governmentView } from "./government";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { campaignDay } from "./campaign";
import { electionResults } from "./results";
import { seatAct, seatView } from "./legislature";
import {
  adjourn,
  deskWaiting,
  leaveDeskToCharacter,
  meetingInProgress,
  officeHost,
  takeUpItem,
  upcomingMeeting,
} from "../core2/modules/office-day";
import { colleagueDeal, officeView } from "./office";
import { officeActHandlers } from "../core2/office-day-acts";
import {
  actOn,
  askLeaderForHearing,
  waitingEntries,
} from "../core2/office-day-state";
import { reachedSteps } from "./reached";
import { setBookkeeping } from "../core2/bookkeeping";
import { benchScene } from "./scene";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { ContestRow } from "../core2/modules/elections";

const seed = process.env.GOLDEN_PATH_SEED ?? "path-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const started = performance.now();
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const player = new BenchPlayer(w.core, w.director);
const log: string[] = [];
/** Steps seen along the way, since a later step can forget what an earlier one saw. */
const seen = new Set<number>();
/** The day the check drafts its own bill: the steps after it are this bill's, not the town's own legislating before. */
let since: string | undefined;
const me = w.playerId!;
player.select(me);
benchScene(w.core, me, player.packet);

/** Live until the date, the character answering its own choices. */
function liveUntil(date: string) {
  for (let guard = 0; w.core.date < date && guard < 400; guard++) {
    // The character leaves the polls when the day stops there; the races left unmarked are their own to decide.
    if (player.pollingPlace) player.leavePolls();
    const packet =
      player.packet?.kind === "stop"
        ? player.packet
        : player.advance(
            "calendar",
            addDays(makeIsoDate(player.packet?.at.date ?? w.core.date), 7),
          ).packet;
    if (packet.kind === "stop") {
      // A meeting or the desk holds the clock: the player votes their own
      // bill and leaves the rest, and the desk, to the character.
      const api = coreAPI(w.core);
      const meeting = meetingInProgress(api);
      if (meeting) {
        for (const billId of meeting.agenda)
          takeUpItem(api, meeting.id, billId, "own");
        adjourn(api, meeting.id);
      }
      for (const bill of deskWaiting(api)) leaveDeskToCharacter(api, bill.id);
      // A state legislator's own hearing or session day holds the clock too:
      // the character does it on their own choice.
      const holderId = (packet as { controlledPersonId?: string })
        .controlledPersonId;
      if (holderId)
        for (const entry of waitingEntries(api, holderId)) actOn(api, entry);
      player.resume({ kind: "stop", pauseId: packet.pauseId });
    }
  }
  if (w.core.date < date && !log.some((l) => l.startsWith("the day stopped")))
    log.push(
      `the day stopped at ${w.core.date}, before ${date}: ${JSON.stringify((player.packet as { stop?: unknown } | undefined)?.stop).slice(0, 700)}`,
    );
}

// The path starts at 18: the player is the resident who turns 18 soonest, so
// the check lives to the day after their birthday before it walks in to file.
const born = w.core.people.get(me)!.birthDate;
const eighteenth = `${Number(born.slice(0, 4)) + 18}${born.slice(4)}`;
if (w.core.date <= eighteenth) liveUntil(addDays(makeIsoDate(eighteenth), 1));

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
    const day = campaignDay(w.core, me, {
      filingId: filing.id,
      kind: "canvass",
    });
    log.push(`doors knocked ${day.doorsKnocked}, reached ${day.reached}`);
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
// A resident officeholder on a body that meets (a council or a state
// legislature votes at its meetings); else any member of any body.
const meets = (personId: string) =>
  seatView(w.core, personId).bodies.some((body) =>
    upcomingMeeting(coreAPI(w.core), body.officeId),
  );
const seated = governmentView(w.core, me).seats.filter(
  (row) =>
    row.holder?.personId && seatView(w.core, row.holder.personId).bodies.length,
);
// One whose term runs past the bill and its law, so their seat's next
// election comes after the law (step 11).
const longTerm = (row: (typeof seated)[number]) =>
  !row.holder?.endDate ||
  row.holder.endDate > addDays(makeIsoDate(w.core.date), 500);
const holder = (
  seated.find((row) => meets(row.holder!.personId!) && longTerm(row)) ??
  seated.find((row) => meets(row.holder!.personId!)) ??
  seated[0]
)?.holder?.personId;
let member: string | undefined;
if (holder) {
  member = holder;
  player.select(holder);
  const seat = seatView(w.core, holder);
  const body =
    seat.bodies.find((row) => upcomingMeeting(coreAPI(w.core), row.officeId)) ??
    seat.bodies[0]!;
  const wage = seat.amounts.find((a) => a.series === "minimum-wage");
  since = w.core.date;
  let bill = seatAct(w.core, holder, {
    kind: "draft",
    officeId: body.officeId,
    series: "minimum-wage",
    value: (wage?.current ?? 0) + 200,
  }) as { id: string; number: string; status: string };
  // Where the state rules a local wage out, a cataloged policy instead.
  for (const question of seat.questions) {
    if (bill.status !== "blocked") break;
    bill = seatAct(w.core, holder, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; number: string; status: string };
  }
  // Step 7: the member sets a favor to offer a colleague and talks to them
  // about the bill; the colleague decides it from their own position.
  const colleague = officeView(w.core, holder).deals.find(
    (row) => row.billId === bill.id,
  )?.colleagues[0]?.key;
  if (colleague) {
    colleagueDeal(w.core, holder, colleague, "favor");
    officeActHandlers(officeHost)["talk-to-colleague"](
      coreAPI(w.core),
      holder,
      { targetId: colleague } as never,
    );
  }
  // Drafting puts the bill on the body's next agenda (office-day).
  // A legislature sits in session windows, with no agenda to be put on: the
  // member asks the majority leader to schedule the bill, who answers from
  // their party, their tie to the member and their own traits.
  let leaderDate: string | undefined;
  if (
    !(bill as { agendaDate?: string }).agendaDate &&
    bill.status === "drafted"
  )
    try {
      const request = askLeaderForHearing(coreAPI(w.core), holder, bill.id);
      leaderDate = request.scheduledFor ?? undefined;
      log.push(
        `the majority leader ${request.granted ? `put it on the floor for ${leaderDate}` : "left it off the floor"}`,
      );
    } catch (error) {
      log.push(`no leader to ask: ${(error as Error).message}`);
    }
  const date =
    (bill as { agendaDate?: string }).agendaDate ?? leaderDate ?? w.core.date;
  liveUntil(date);
  liveUntil(
    new Date(Date.parse(`${date}T00:00:00Z`) + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
  // A law it made takes effect on its own date: live until then (step 9).
  const lawEffective = () =>
    (
      coreAPI(w.core)
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as {
        effectiveDate: string;
        terms?: { enactedBy?: string; enactedByBill?: string };
      }[]
    )
      // The bill's own law: numbers repeat across years, its id does not.
      .filter((law) => law.terms?.enactedByBill === bill.id)
      .map((law) => law.effectiveDate)
      .sort()
      .at(-1);
  // A passed bill waits on its executive (a mayor or governor has days to
  // sign), and an enacted law is recorded on its own date: live on a week at
  // a time, up to five months, until its law exists.
  let effective = lawEffective();
  for (let week = 0; week < 22 && !effective; week++) {
    const status = seatView(w.core, holder).bills.find(
      (b) => b.bill.id === bill.id,
    )?.bill.status;
    if (status !== "passed" && status !== "enacted") break;
    liveUntil(addDays(makeIsoDate(w.core.date), 7));
    effective = lawEffective();
  }
  log.push(
    `its law takes effect ${effective ?? "never"} (checked ${w.core.date})`,
  );
  // Step 10 needs the press to print the law and its readers to take it in:
  // live three months past the day it took effect.
  // A reader forgets a story's key after the news's retention days (30), so
  // the check looks every week at first and keeps the steps it has seen.
  if (effective)
    for (const days of [7, 14, 21, 28, 35, 42, 60, 90]) {
      liveUntil(addDays(makeIsoDate(effective), days));
      for (const id of [me, holder])
        for (const row of reachedSteps(w.core, id, since)) seen.add(row.step);
    }
  // Step 11 (behind GOLDEN_PATH_TO_NEXT_ELECTION=1, since it lives years on):
  // live through the next election for the seat, the ballots keeping why.
  if (effective && process.env.GOLDEN_PATH_TO_NEXT_ELECTION === "1") {
    const api = coreAPI(w.core);
    const terms = api
      .moduleState("core2-offices-v1")
      .table("terms")
      .query("byPerson", [holder]) as unknown as {
      seatId: string;
      status: string;
      endDate: string | null;
    }[];
    const term = terms.find((row) => row.status === "serving");
    const next = (
      api
        .moduleState("core2-elections-v1")
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .filter((c) => c.seatId === term?.seatId && c.electionDate > w.core.date)
      .map((c) => c.electionDate)
      .sort()[0];
    if (next) {
      setBookkeeping(true);
      liveUntil(next);
      liveUntil(addDays(makeIsoDate(next), 1));
      log.push(`lived through the ${next} election for the seat`);
    } else log.push("no later election for the seat");
  }
  const after = seatView(w.core, holder).bills.find(
    (b) => b.bill.id === bill.id,
  );
  const committee = committeeRecords(coreAPI(w.core), bill.id).at(-1);
  const tally = billTally(after?.votes ?? [], committee);
  log.push(
    `${body.title} bill ${bill.number}: ${after?.bill.status} (${tally})`,
  );
} else log.push("no resident officeholder on a body");

const steps = [
  ...new Set([
    ...seen,
    ...reachedSteps(w.core, me, since).map((row) => row.step),
    ...(member
      ? reachedSteps(w.core, member, since).map((row) => row.step)
      : []),
  ]),
].sort((a, b) => a - b);
const eleventh = [me, ...(member ? [member] : [])]
  .flatMap((id) => reachedSteps(w.core, id, since))
  .find((row) => row.step === 11);
if (eleventh)
  log.push(
    `step 11: ballot ${eleventh.recordIds[0]} weighed ${eleventh.recordIds[1]}`,
  );
const ninth = [me, ...(member ? [member] : [])]
  .flatMap((id) => reachedSteps(w.core, id, since))
  .find((row) => row.step === 9);
if (ninth) log.push(`step 9: law read, ${ninth.recordIds[0]}`);
log.push(`the character's day ended ${w.core.date}`);
const place = w.place.displayName ?? w.place.key;
console.log(
  `path-check: ${place} (${w.place.key}), seed ${seed}; steps reached ${steps.join(", ") || "none"}; furthest ${steps.at(-1) ?? "none"}. ${log.join("; ")} (${((performance.now() - started) / 1000).toFixed(0)} s)`,
);
if (!steps.length) process.exit(1);
