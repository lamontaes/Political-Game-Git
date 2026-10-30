/* global process, console */
// The golden path as the play screen plays it, headless, in the place the
// golden-path runner draws: file at the real office, campaign, election
// night, then a resident officeholder drafts a bill and the body votes.
// Prints the furthest step reached. Usage: node --import tsx src/bench/path-check.ts
import { coreAPI } from "../core2/state";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { resultOf } from "../core2/modules/voting";
import { committeeRecords } from "../core2/modules/legislature";
import { billTally } from "./bill-tally";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { governmentView } from "./government";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { campaignDay } from "./campaign";
import { campaignDayChoices } from "../core2/campaign-day";
import {
  CAMPAIGNS_MODULE_ID,
  candidatePlatform,
  contestPositions,
  signaturesToGather,
} from "../core2/modules/campaigns";
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
import {
  petitionCirculating,
  petitionOf,
  type ContestRow,
} from "../core2/modules/elections";

const seed = process.env.GOLDEN_PATH_SEED ?? "path-check";

/** Whether a contest's office is a council seat, from its office row's kind. */
function isCouncil(officeId: string): boolean {
  const office = coreAPI(w.core)
    .moduleState("core2-offices-v1")
    .table("offices")
    .get(officeId) as { kind?: string } | undefined;
  return (office?.kind ?? "").startsWith("council");
}
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

/** The contest the player is running in, whose ballot they mark for themselves. */
let running: string | undefined;

/** Live until the date, the character answering its own choices. */
function liveUntil(date: string) {
  for (let guard = 0; w.core.date < date && guard < 400; guard++) {
    // At the polls the player marks their own race for themselves (the
    // engine never casts the player's ballot); the races left unmarked are
    // their own to decide.
    if (player.pollingPlace && running)
      try {
        player.markBallot(running, me);
      } catch (error) {
        log.push(`no ballot of their own: ${(error as Error).message}`);
      }
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

/** The player's id at every step: the check is one life or it is nothing. */
const lives = new Set<string>([me]);
const stillMe = () => lives.add(player.personId ?? me);

/** Steps 3 to 5 once: file for a contest the player can enter, campaign, live to the election and read it. */
function stand(): { held: boolean; takesOffice: string | null } {
  // Step 3: walk into the office that takes filings for a contest you can
  // enter, a council seat first where the place has one (the golden path is
  // a council race; owner, Oct 29: the player runs for six offices).
  const gov = governmentView(w.core, me);
  const open = gov.contests.filter((c) => c.checks.every((k) => k.met));
  const enterable = open.find((c) => isCouncil(c.contest.officeId)) ?? open[0];
  if (!enterable) {
    log.push("no contest the player can enter");
    return { held: false, takesOffice: null };
  }
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
  // The player files on a platform, as the counter asks: their own views on
  // the questions the office decides (the stances a world candidate of their
  // views would run on), so their doors, events and forums have something to
  // say.
  const platform = candidatePlatform(
    coreAPI(w.core),
    me,
    null,
    contestPositions(coreAPI(w.core), enterable.contest),
  ).map((stance) => `${stance.question}=${stance.position}`);
  if (file) visit = chooseAtCounter(w.core, visit, file.key, { platform });
  log.push(`platform ${platform.join(", ") || "none"}`);
  log.push(
    `filed ${enterable.contest.title} with ${enterable.filingOffice.filedWith}: ${(visit.result as { status?: string } | undefined)?.status ?? "no filing"}`,
  );
  if (!visit.result) return { held: false, takesOffice: null };
  running = enterable.contest.id;
  stillMe();
  // Step 4: campaign. Filing is a petition: the player canvasses each week
  // until it holds the signatures the clerk will count, or the deadline
  // comes; the clerk checks it the morning after.
  const filing = governmentView(w.core, me).filings.find(
    (row) => row.contestId === enterable.contest.id,
  );
  if (filing) {
    const api = coreAPI(w.core);
    let doors = 0;
    let reached = 0;
    for (let week = 0; week < 60; week++) {
      const day = campaignDay(w.core, me, {
        filingId: filing.id,
        kind: "canvass",
      });
      doors += day.doorsKnocked;
      reached += day.reached;
      const petition = petitionOf(api, filing.id);
      if (
        !petition ||
        !petitionCirculating(api, filing.id) ||
        petition.signers.length >= signaturesToGather(petition.needed)
      )
        break;
      liveUntil(addDays(makeIsoDate(w.core.date), 1));
    }
    log.push(`doors knocked ${doors}, reached ${reached}`);
    const petition = petitionOf(api, filing.id);
    if (petition) {
      liveUntil(addDays(makeIsoDate(petition.due), 1));
      log.push(
        `petition: ${petition.signers.length} of ${petition.needed} signatures by ${petition.due}; the clerk's check: ${governmentView(w.core, me).filings.find((row) => row.id === filing.id)?.status ?? "none"}`,
      );
    }
  }
  stillMe();
  // Then the campaign itself, every week to election day, as a player who
  // means to win spends it: three evenings at the doors (each one asking
  // for the vote now the petition is in), an evening of calls to donors and
  // an event when the campaign can hold one, every outing's hours off the
  // same clock the play screen spends them from.
  const day = enterable.contest.electionDate;
  if (filing) {
    const week = {
      doors: 0,
      reached: 0,
      raised: 0,
      events: 0,
      forums: 0,
      donorMeetings: 0,
      weeks: 0,
    };
    while (addDays(makeIsoDate(w.core.date), 7) <= day) {
      // A forum one week and a donor meeting the next, where the campaign
      // can hold them.
      for (const kind of [
        "canvass",
        "canvass",
        "raise-money",
        "canvass",
        "event",
        week.weeks % 2 ? "donor-meeting" : "forum",
      ]) {
        const choice = campaignDayChoices(coreAPI(w.core), filing.id).find(
          (c) => c.kind === kind,
        );
        if (!choice?.available) continue;
        const out = campaignDay(w.core, me, { filingId: filing.id, kind });
        week.doors += out.doorsKnocked;
        week.reached += out.reached;
        week.raised += out.raisedMinor;
        if (kind === "event") week.events += 1;
        if (kind === "forum") week.forums += 1;
        if (kind === "donor-meeting") week.donorMeetings += 1;
        player.spend(out.hours);
      }
      week.weeks += 1;
      liveUntil(addDays(makeIsoDate(w.core.date), 7));
    }
    const pledged = coreAPI(w.core)
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("pledges")
      .query("byCandidate", [me]) as unknown as { contestId: string }[];
    log.push(
      `campaign ${week.weeks} weeks: doors ${week.doors}, reached ${week.reached}, raised $${Math.round(week.raised / 100)}, events ${week.events}, forums ${week.forums}, donor meetings ${week.donorMeetings}, door yes ${pledged.filter((p) => p.contestId === enterable.contest.id).length}`,
    );
  }
  // Step 5: live to the election day, then read election night.
  liveUntil(day);
  liveUntil(addDays(makeIsoDate(day), 1));
  const races = electionResults(w.core, me);
  const result = resultOf(coreAPI(w.core), enterable.contest.id);
  const won = result?.winnerId === me;
  log.push(
    `election night ${day}: ${races.length} races, ${won ? "the player won" : "the player did not win"}`,
  );
  stillMe();
  return { held: won, takesOffice: won ? (result?.takesOffice ?? null) : null };
}

// The player stands until they win, up to three races.
let won = false;
let takesOffice: string | null = null;
for (let race = 0; race < 3 && !won; race++) {
  const result = stand();
  won = result.held;
  takesOffice = result.takesOffice;
  if (!won && race < 2) {
    // Lose, and the next contest they can enter is the next try (a
    // council seat first, as stand() picks it).
    const open = governmentView(w.core, me).contests.filter((c) =>
      c.checks.every((k) => k.met),
    );
    const next = open.find((c) => isCouncil(c.contest.officeId)) ?? open[0];
    if (!next) break;
    log.push(`lost; trying ${next.contest.title}`);
  }
}

// Steps 6 to 8: the player, now holding the seat they won, drafts and the
// body votes. Nobody else is ever selected: this is one life.
if (won && takesOffice) liveUntil(addDays(makeIsoDate(takesOffice), 1));
const holder = won && seatView(w.core, me).bodies.length ? me : undefined;
if (won && !holder)
  log.push(
    "the player won a seat on no body that votes, so there is no bill to propose",
  );
let member: string | undefined;
if (holder) {
  member = holder;
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
      let request = askLeaderForHearing(coreAPI(w.core), holder, bill.id);
      log.push(
        `the majority leader ${request.granted ? `put it on the floor for ${request.scheduledFor}` : "left it off the floor"}`,
      );
      // A refused member goes back to the leader with something to offer: the
      // talk carries the deal, and an accepted one is read in the new answer.
      for (const deal of request.granted ? [] : ["favor", "back-their-item"]) {
        try {
          colleagueDeal(w.core, holder, request.leaderId, deal);
          officeActHandlers(officeHost)["talk-to-colleague"](
            coreAPI(w.core),
            holder,
            { targetId: request.leaderId } as never,
          );
        } catch (error) {
          log.push(`no offer to the leader: ${(error as Error).message}`);
          break;
        }
        request = askLeaderForHearing(coreAPI(w.core), holder, bill.id);
        if (request.offer) {
          log.push(
            `the leader accepted ${request.offer.kind} (${request.offer.obligationId}) and ${request.granted ? `put it on the floor for ${request.scheduledFor}` : "still left it off the floor"}`,
          );
          break;
        }
      }
      leaderDate = request.scheduledFor ?? undefined;
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
  stillMe();
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
      for (const row of reachedSteps(w.core, me, since)) seen.add(row.step);
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
stillMe();
log.push(
  lives.size === 1
    ? `one life: ${me}`
    : `the player changed: ${[...lives].join(", ")}`,
);
const place = w.place.displayName ?? w.place.key;
console.log(
  `path-check: ${place} (${w.place.key}), seed ${seed}; steps reached ${steps.join(", ") || "none"}; furthest ${steps.at(-1) ?? "none"}. ${log.join("; ")} (${((performance.now() - started) / 1000).toFixed(0)} s)`,
);
if (!steps.length || lives.size !== 1) process.exit(1);
