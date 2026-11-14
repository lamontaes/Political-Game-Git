/**
 * The officeholder's screens on the play page (office play, OFFICE-LOCAL):
 * the meeting scene at the meeting's hour, the desk the morning a passed
 * bill reaches it, and what stops the player. Records and control names
 * only; the words of each act come from the engines that kept them.
 */
import { billTitleOf, spokenDesignation } from "../english/bill-names";
import { coreAPI, personOrFillIn } from "../core2/state";
import {
  leavePostOpen,
  nominate,
  nominationsOpen,
} from "../core2/modules/office-day";
import {
  controlledPerson,
  heldFederal,
  leaveVoteToCharacter,
  voteOnFloor,
} from "../core2/modules/office-day";
import {
  OFFICE_DAY_STATE_MODULE_ID,
  stateFloorHolds,
  voteOnStateFloor,
} from "../core2/modules/office-day";
import {
  BUDGET_REQUEST,
  deliverAddress,
  JOINT_ADDRESS,
  requestBudget,
} from "../core2/modules/office-day";
import {
  appointGovernor,
  actOn,
  doEntry,
  stopKindOf,
  waitingEntries,
} from "../core2/modules/office-day";
import {
  orderQuestionOf,
  pendingGovernorOrders,
} from "../core2/modules/executive";
import { policyNames } from "./words";
import {
  hireReasons,
  hireStaff,
  servingStaffOf,
  staffCandidates,
} from "../core2/modules/staff";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { billOf as legislatureBillOf } from "../core2/modules/legislature";
import type { CoreState } from "../core2/types";
import {
  billOf,
  bodyOf,
  learnedStakesOf,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  votesOn,
  type BillRow,
} from "../core2/modules/legislature";
import { remarksOn } from "../core2/modules/meetings";
import {
  adjourn,
  attendMeeting,
  clearPrepared,
  decideDesk,
  deskWaiting,
  leaveDeskToCharacter,
  leaveMeeting,
  meetingInProgress,
  meetingOf,
  officeActsOf,
  officeHost,
  officeJobsOf,
  prepareAct,
  setStops,
  speakOnItem,
  stopKinds,
  stopsOf,
  takeUpItem,
  federalSeatOf,
  stateOfficeOf,
  votesOnPassage,
  type MeetingRow,
  nextMeetingDate,
} from "../core2/modules/office-day";
import { dateWords } from "../english/plain-words.mjs";
import { screenPick, screenWays } from "../english/screen-words";
import { count } from "./printed-words";
import { bodyMembers, bodyScene, personName } from "./legislature";
import {
  headCandidates,
  postsToFill,
  stateCandidates,
  statePostsToFill,
} from "../core2/modules/executive";
import { budgetProposalDue } from "../core2/modules/office-day";
import { budgetsOf, governmentOfJurisdiction } from "../core2/modules/budgets";
import { lineName } from "./budget";

/** A bill as the meeting and the desk show it: its real name, number, sponsor, remarks and votes; its sections are on the paper (Read the bill). */
export function billItem(core: CoreState, bill: BillRow) {
  const api = coreAPI(core);
  return {
    billId: bill.id,
    // The bill's real name from its title record, never its description.
    title: billTitleOf(bill)?.title ?? null,
    // The number as a clerk reads it ("Ordinance 2025-6"): a bare "2025-6"
    // under a title reads as a date (owner, Nov 11).
    number: spokenDesignation(bill.number, bill.form.kind),
    status: bill.status,
    sponsor: personName(core, bill.sponsorId),
    // Opening the bill is meeting the people who spoke on it: a speaker still in the wider
    // population is filled in now (two-level population), and the name is theirs.
    remarks: remarksOn(api, bill.id).map((r) => ({
      name: personName(
        core,
        personOrFillIn(core, r.personId)?.id ?? r.personId,
      ),
      position: r.position,
      kind: r.kind,
    })),
    votes: votesOn(api, bill.id).map((v) => ({
      memberKey: v.memberId,
      name: personName(core, v.memberId),
      vote: v.vote,
    })),
  };
}

/** A key of a held floor vote in the federal day's holds (office-day-federal.ts). */
const FLOOR_HOLD = "federal-floor:";

/** The bills on tomorrow's floor that hold the player's clock for their own vote. */
export function floorView(core: CoreState) {
  const api = coreAPI(core);
  const held = [
    ...heldFederal(api)
      .filter((key) => key.startsWith(FLOOR_HOLD))
      .map((key) => key.slice(FLOOR_HOLD.length)),
    ...(api.state.modules.has(OFFICE_DAY_STATE_MODULE_ID)
      ? stateFloorHolds(api)
      : []),
  ];
  return held.map((billId) => ({
    ...billItem(core, legislatureBillOf(api, billId)),
    // What each member will do is not shown before the vote: the paper has what they told you.
    votes: [],
  }));
}

/** The player's own vote on a held floor bill, or the bill left to the character. */
export function floorDecide(core: CoreState, billId: string, how: string) {
  const api = coreAPI(core);
  const person = controlledPerson(api);
  if (how !== "own" && how !== "yes" && how !== "no" && how !== "abstain")
    throw new Error("Vote yes, no or abstain.");
  // A state legislator's floor hold, else a member of Congress's.
  if (
    api.state.modules.has(OFFICE_DAY_STATE_MODULE_ID) &&
    stateFloorHolds(api).includes(billId)
  ) {
    if (!person) throw new Error("Choose a resident first.");
    return voteOnStateFloor(api, person, billId, how);
  }
  if (how === "own") return leaveVoteToCharacter(api, billId);
  if (!person) throw new Error("Choose a resident first.");
  voteOnFloor(api, person, billId, how);
}

/**
 * The one line a resident in the room reads under the meeting's title, in the English
 * engine's words: that nothing is on the agenda, or, the first time they come to any
 * meeting with an item before it (none such is on their record yet), what they can do here.
 */
function residentNote(
  core: CoreState,
  personId: string,
  meeting: MeetingRow,
  body: string,
): string | null {
  const request = { momentKey: meeting.id, sourceIds: [meeting.id] };
  const pick = (key: string, facts: Record<string, string>) =>
    screenPick("meeting", screenWays("meeting", key), facts, request)?.text ??
    null;
  const items = meeting.agenda.length;
  if (!items)
    return pick("meeting.empty-agenda.1", {
      body,
      date: dateWords(meeting.date, { year: false }),
    });
  // Said once: not again after a meeting they came to that had an item before it.
  if (
    officeActsOf(coreAPI(core), personId).some(
      (act) => act.kind === "attend" && act.detail !== "0",
    )
  )
    return null;
  // The line counts the items a resident can speak on: not one already taken up, nor one
  // a committee already decided (those show only "Read the bill").
  const api = coreAPI(core);
  const openIds = meeting.agenda.filter(
    (id) =>
      !meeting.takenUp.includes(id) &&
      legislatureBillOf(api, id).status === "drafted",
  );
  const open = openIds.length;
  if (!open) return null;
  // One open among more on the agenda: named, so the reader need not hunt for which.
  const [only] = openIds;
  if (open === 1 && items > 1 && only) {
    const title = billTitleOf(legislatureBillOf(api, only))?.title;
    if (title)
      return pick("meeting.resident-can-speak-one-named.1", {
        body,
        item: title,
      });
  }
  // Of two, "either"; of more, "any of the three" (Words lead, Nov 13).
  if (open === 1) return pick("meeting.resident-can-speak-one.1", { body });
  if (open === 2) return pick("meeting.resident-can-speak-two.1", { body });
  return pick("meeting.resident-can-speak.1", { body, count: count(open) });
}

/** The meeting holding the player's clock: the room, the agenda, and what was taken up. */
export function meetingSceneView(
  core: CoreState,
  personId: string,
  minute: number,
) {
  const api = coreAPI(core);
  const meeting = meetingInProgress(api);
  if (!meeting) return null;
  return {
    id: meeting.id,
    date: meeting.date,
    startMinute: meeting.startMinute,
    citation: meeting.citation,
    items: meeting.agenda.map((billId) => ({
      ...billItem(core, billOf(api, billId)),
      takenUp: meeting.takenUp.includes(billId),
    })),
    ...(() => {
      // A resident who came to speak is in the room and not at the table.
      const watching = meeting.audience !== undefined;
      const named = bodyOf(api, meeting.officeId);
      const bodyName = named?.bodyName ?? named?.kind ?? "";
      const scene = bodyScene(
        core,
        personId,
        meeting.officeId,
        minute,
        watching,
      );
      // The members, with their faces, for the panel's tally (the chamber's own
      // figures are drawn where the room has a mannequin plate for them).
      return {
        ...scene,
        members: bodyMembers(
          core,
          personId,
          meeting.officeId,
          scene.place,
          watching,
        ),
        // A resident has no vote and cannot adjourn.
        seated: !watching,
        // A resident reads the body by its own name, as the Calendar says it
        // (the seat's title names one member, not the body).
        ...(watching ? { title: bodyName } : {}),
        note: watching ? residentNote(core, personId, meeting, bodyName) : null,
      };
    })(),
  };
}

export function meetingItem(
  core: CoreState,
  meetingId: string,
  billId: string,
  vote: string,
) {
  if (!["yes", "no", "abstain", "own"].includes(vote))
    throw new Error("Unknown vote.");
  takeUpItem(
    coreAPI(core),
    meetingId,
    billId,
    vote as "yes" | "no" | "abstain" | "own",
  );
}

export function meetingSpeak(
  core: CoreState,
  meetingId: string,
  billId: string,
  position: string,
) {
  speakOnItem(coreAPI(core), meetingId, billId, position === "for" ? 1 : -1);
}

/** The chair's adjournment for a member; for a resident in the room, their leaving. */
export function meetingAdjourn(core: CoreState, meetingId: string) {
  const api = coreAPI(core);
  if (meetingOf(api, meetingId)?.audience !== undefined)
    leaveMeeting(api, meetingId);
  else adjourn(api, meetingId);
}

/** The player marks a body's posted meeting to attend as a resident, or takes the mark back. */
export function meetingAttend(
  core: CoreState,
  officeId: string,
  date: string,
  attend: boolean,
) {
  attendMeeting(coreAPI(core), officeId, date, attend);
}

/** Bills waiting on the player's desk this morning. */
export function deskView(core: CoreState) {
  const api = coreAPI(core);
  return deskWaiting(api).map((bill) => ({
    ...billItem(core, bill),
    signBy: (bill as BillRow & { signBy?: string }).signBy ?? null,
  }));
}

export function deskDecide(core: CoreState, billId: string, how: string) {
  const api = coreAPI(core);
  if (how === "sign" || how === "veto")
    return decideDesk(api, billId, how === "sign");
  if (how === "own") return leaveDeskToCharacter(api, billId);
  throw new Error("Unknown desk decision.");
}

/**
 * Whatever holds the player's clock now, left to the character: a meeting's
 * agenda voted by the character's own choice and adjourned, the bills on the
 * desk signed or vetoed by the character's own lean, and a state legislator's
 * waiting hearing or session day done on their own choice. A held stop stays
 * until its owner releases it, so a check that presses on through a week
 * answers it here, the way a player who leaves it to the character would.
 */
export function leaveHoldsToCharacter(core: CoreState, holderId?: string) {
  const api = coreAPI(core);
  const meeting = meetingInProgress(api);
  if (meeting?.audience !== undefined) leaveMeeting(api, meeting.id);
  else if (meeting) {
    for (const billId of meeting.agenda)
      takeUpItem(api, meeting.id, billId, "own");
    adjourn(api, meeting.id);
  }
  for (const bill of deskWaiting(api, true)) leaveDeskToCharacter(api, bill.id);
  if (holderId)
    for (const entry of waitingEntries(api, holderId)) actOn(api, entry);
}

/**
 * The switches Your office offers (owner's card, Nov 14, 2026: "Stop me at every vote"): each is
 * one name the player knows over the registered stop kinds it sets together, and shows only when
 * the seat has that kind of moment. On by default; off leaves the player away from that kind of
 * vote (the engine records them absent, a desk bill waits, nothing is cast or signed for them).
 */
const STOP_SWITCHES = [
  // The own-bill and deciding-vote stops are moments of the same meetings and floor votes: left on
  // under an Off switch they would still hold the player at some of them.
  {
    key: "meetings",
    kinds: ["every-meeting", "own-bill-vote", "deciding-vote"],
  },
  { key: "floor", kinds: ["floor-vote", "state-floor-vote", "own-bill-vote"] },
  { key: "desk", kinds: ["desk"] },
] as const;

/** The elected executive seats whose desk a passed bill reaches (the legislature engine's own set). */
const EXECUTIVE_OFFICE = /^(mayor|governor|county-executive|president)$/;

/** Which switches this seat has: a local body's meetings, a legislator's floor, an executive's desk. */
function seatSwitches(api: ReturnType<typeof coreAPI>, personId: string) {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const executive = (
    offices.table("terms").query("byPerson", [personId]) as unknown as {
      status: string;
      officeId: string;
    }[]
  ).some((term) => {
    const office = offices.table("offices").get(term.officeId) as unknown as
      { kind: string } | undefined;
    return (
      term.status === "serving" && EXECUTIVE_OFFICE.test(office?.kind ?? "")
    );
  });
  const federal = federalSeatOf(api, personId);
  const has: Record<(typeof STOP_SWITCHES)[number]["key"], boolean> = {
    meetings: officeJobsOf(api, personId).length > 0,
    floor:
      stateOfficeOf(api, personId)?.role === "legislator" ||
      (federal !== null && votesOnPassage(federal.kind)),
    desk: executive,
  };
  return STOP_SWITCHES.filter((row) => has[row.key]);
}

/** The player switches one kind of stop off or on; the view comes back with it. */
export function officeStops(
  core: CoreState,
  personId: string,
  key: string,
  on: boolean,
) {
  const api = coreAPI(core);
  const row = seatSwitches(api, personId).find((r) => r.key === key);
  if (!row) throw new Error("Your seat has no such stop.");
  const known = stopKinds();
  setStops(
    api,
    personId,
    Object.fromEntries(
      row.kinds.filter((k) => known.includes(k)).map((k) => [k, on]),
    ),
  );
  return officeView(core, personId);
}

/** The office panel: the seat as a job, the next meetings, what stops the player, and the acts kept. */
export function officeView(core: CoreState, personId: string) {
  const api = coreAPI(core);
  const jobs = officeJobsOf(api, personId);
  return {
    jobs: jobs.map((j) => ({
      title: j.title,
      annualMinor: j.annualMinor,
      weeklyHours: j.weeklyHours,
      fullTime: j.fullTime,
      payer: core.organizations.get(j.payerId)?.name ?? j.payerId,
      lastPaid: j.lastPaid ?? null,
      citation: j.citation,
      nextMeeting: nextMeetingDate(api, j.officeId),
    })),
    // The body's own name for the meetings switch ("City Council"), as the Calendar says it; none for a seat with no body.
    stopsBody:
      jobs
        .map((j) => bodyOf(api, j.officeId)?.bodyName)
        .find((name) => !!name) ?? null,
    stops: seatSwitches(api, personId).map((row) => ({
      key: row.key,
      on: row.kinds.every((k) => stopsOf(api, personId)[k] !== false),
    })),
    // The town posts the official appoints that stand open, each with the people it could go to, best first by the official's own reasons.
    heads: [
      ...postsToFill(api, personId).map((post) => ({
        post,
        candidates: headCandidates(api, post.key),
      })),
      // A governor's open cabinet posts: the state chamber confirms the one they name.
      ...statePostsToFill(api, personId).map((post) => ({
        post,
        candidates: stateCandidates(api, personId, post.key),
      })),
    ].map(({ post, candidates }) => ({
      post: post.key,
      title: post.title,
      candidates: candidates.slice(0, 8).map((reasons) => {
        const person = core.people.get(reasons.candidateId);
        const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
        return {
          id: reasons.candidateId,
          name: personName(core, reasons.candidateId),
          job: job && job.endsAt === undefined ? job.title : null,
          total: reasons.total,
        };
      }),
    })),
    // The aides who serve now and the people the staff engine would weigh for the post, best first by its own score, each with its reasons.
    aides: jobs.length
      ? aidesView(core, personId)
      : { serving: [], candidates: [] },
    // The budget the official may send now, line by line, with the change set for each (null outside the season).
    budget: budgetToSend(core, personId),
    // Each of the player's bills waiting for a vote, with the colleagues who will vote and the deal set to offer each when they talk.
    deals: pendingBills(api, personId).map((bill) => ({
      billId: bill.id,
      number: bill.number,
      colleagues: colleaguesOn(api, bill, personId).map((key) => {
        // Where the player learned this colleague stands, and how (a talk or
        // an aide's brief), from the legislature's record of it.
        const stake = learnedStakesOf(api, personId, bill.id).find(
          (row) => row.memberId === key,
        );
        return {
          key,
          name: personName(core, key),
          deal: dealsSet(api, personId)[key] ?? null,
          stake: stake
            ? {
                recordId: stake.id,
                leaning:
                  stake.total > 0
                    ? "for"
                    : stake.total < 0
                      ? "against"
                      : "undecided",
                route: stake.route,
                date: stake.date,
              }
            : null,
        };
      }),
    })),
    acts: officeActsOf(api, personId)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20),
  };
}

/** The most candidates the office screen lists for the player's staff. Engineering value (a screen's page). */
const AIDE_CANDIDATES_SHOWN = 8;

/** The player's aides serving now, and the staff engine's own candidates for the post with the reasons it weighs. */
function aidesView(core: CoreState, personId: string) {
  const api = coreAPI(core);
  // The engine can return one person twice (a counted resident and the person
  // filled in from them); the screen offers each person once.
  const seen = new Set<string>();
  const ranked = staffCandidates(api, personId)
    .filter(
      (candidate) =>
        !seen.has(candidate.personId) && seen.add(candidate.personId),
    )
    .map((candidate) => ({ candidate, ...hireReasons(candidate) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.candidate.personId.localeCompare(b.candidate.personId),
    )
    .slice(0, AIDE_CANDIDATES_SHOWN);
  return {
    serving: servingStaffOf(api, personId).map((row) => ({
      id: row.personId,
      name: personName(core, row.personId),
      role: row.role,
    })),
    candidates: ranked.map(({ candidate, score, reasons }) => ({
      id: candidate.personId,
      // A counted resident is filled in as the person they are the moment the player's office weighs them.
      name: personName(
        core,
        personOrFillIn(core, candidate.personId)?.id ?? candidate.personId,
      ),
      from: candidate.from,
      family: !!candidate.familyLinkId,
      score,
      reasons,
    })),
  };
}

/** The player hires one of the staff engine's candidates as an aide, paid from the same post the engine's own hires are. */
export function hireAide(core: CoreState, personId: string, hireId: string) {
  const api = coreAPI(core);
  if (!staffCandidates(api, personId).some((row) => row.personId === hireId))
    throw new Error("Not someone this office could hire.");
  const row = hireStaff(api, {
    officialId: personId,
    personId: hireId,
    role: "aide",
  });
  return { staffId: row.id, view: officeView(core, personId) };
}

/** The player picks who the next "name a department head" names to an open post; left alone, the official's own first choice stands. */
export function nameHeadPick(
  core: CoreState,
  personId: string,
  post: string,
  nomineeId: string,
) {
  const api = coreAPI(core);
  // A governor names a state post at once: the chamber's confirmation is on the record they get back.
  if (statePostsToFill(api, personId).some((row) => row.key === post)) {
    if (
      !stateCandidates(api, personId, post).some(
        (r) => r.candidateId === nomineeId,
      )
    )
      throw new Error("Not someone this post could go to.");
    appointGovernor(api, post, nomineeId);
    return officeView(core, personId);
  }
  if (!postsToFill(api, personId).some((row) => row.key === post))
    throw new Error("Not an open post you appoint.");
  if (!headCandidates(api, post).some((row) => row.candidateId === nomineeId))
    throw new Error("Not someone this post could go to.");
  prepareAct(api, personId, "name-department-head", {
    nominee: { post, personId: nomineeId },
  });
  return officeView(core, personId);
}

/** The budget the official may send now, with each line and the change set to send with it. */
function budgetToSend(core: CoreState, personId: string) {
  const api = coreAPI(core);
  // A governor's state budget waits as an entry on their desk the day it is due.
  const stateEntry = waitingEntries(api, personId).find(
    (entry) => entry.kind === "budget-proposal",
  );
  const due = stateEntry
    ? { governmentId: stateEntry.subject, fiscalYearStarts: stateEntry.date }
    : budgetProposalDue(api, officeHost, personId);
  if (!due) return null;
  // Another state's budget is kept without a government row of its own.
  const governmentId =
    governmentOfJurisdiction(api, due.governmentId)?.id ?? due.governmentId;
  const latest = [...budgetsOf(api, governmentId)].sort(
    (a, b) => b.fiscalYear - a.fiscalYear,
  )[0];
  if (!latest) return null;
  const changes =
    officeHost.prepared(api, personId, "propose-budget")?.budget?.changes ?? {};
  return {
    governmentId,
    fiscalYearStarts: due.fiscalYearStarts,
    lines: Object.entries(latest.spendingMinor)
      .map(([line, amountMinor]) => ({
        line,
        name: lineName(line) ?? line,
        amountMinor,
        changeMinor: changes[line] ?? 0,
      }))
      .sort(
        (a, b) => b.amountMinor - a.amountMinor || a.line.localeCompare(b.line),
      ),
  };
}

/**
 * The official sets the change to one line of the budget they will send (the
 * "Send the budget" act sends exactly these); a line left alone is not
 * changed, and the budgets engine's own rule fills the changes of an
 * official who sets none.
 */
export function budgetLinePick(
  core: CoreState,
  personId: string,
  line: string,
  changeMinor: number,
) {
  const api = coreAPI(core);
  const send = budgetToSend(core, personId);
  if (!send) throw new Error("There is no budget to send now.");
  if (!send.lines.some((row) => row.line === line))
    throw new Error("Not a line of this budget.");
  if (!Number.isSafeInteger(changeMinor))
    throw new Error("A change is a whole number of cents.");
  const changes: Record<string, number> = {
    ...(officeHost.prepared(api, personId, "propose-budget")?.budget?.changes ??
      {}),
  };
  if (changeMinor === 0) delete changes[line];
  else changes[line] = changeMinor;
  prepareAct(api, personId, "propose-budget", { budget: { changes } });
  return officeView(core, personId);
}

const DEALS = ["favor", "back-their-item"] as const;

/** The player's own bills drafted and waiting for a vote. */
function pendingBills(api: ReturnType<typeof coreAPI>, personId: string) {
  return (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter((b) => b.sponsorId === personId && b.status === "drafted")
    .sort((a, b) => a.id.localeCompare(b.id));
}

const colleaguesOn = (
  api: ReturnType<typeof coreAPI>,
  bill: BillRow,
  personId: string,
) =>
  members(api, bill.bodyOfficeId)
    .map(memberKey)
    .filter((key) => key !== personId)
    .sort();

const dealsSet = (api: ReturnType<typeof coreAPI>, personId: string) =>
  officeHost.prepared(api, personId, "talk-to-colleague")?.deals ?? {};

/**
 * The player sets the deal to offer a colleague the next time they talk
 * about the bill (a favor, or backing the colleague's own item); "none"
 * offers nothing. The colleague decides it when the talk happens.
 */
export function colleagueDeal(
  core: CoreState,
  personId: string,
  memberId: string,
  deal: string,
) {
  const api = coreAPI(core);
  const bills = pendingBills(api, personId);
  if (!bills.some((b) => colleaguesOn(api, b, personId).includes(memberId)))
    throw new Error("That is not a colleague who votes on your bill.");
  const kept = { ...dealsSet(api, personId) };
  if (deal === "none") delete kept[memberId];
  else if ((DEALS as readonly string[]).includes(deal))
    kept[memberId] = deal as (typeof DEALS)[number];
  else throw new Error("Unknown deal.");
  prepareAct(api, personId, "talk-to-colleague", { deals: kept });
  return officeView(core, personId);
}

/** What the governor's staff has brought for the player to decide today: executive orders and emergency offers. */
export function ordersView(core: CoreState) {
  const api = coreAPI(core);
  const person = controlledPerson(api);
  // The president's holds that stop the day: the budget request and the joint address, each the
  // president's to make or to leave to their own rule.
  const held: { entryId: string; kind: "request" | "joint" }[] = person
    ? heldFederal(api).flatMap<{ entryId: string; kind: "request" | "joint" }>(
        (key) =>
          key === BUDGET_REQUEST
            ? [{ entryId: key, kind: "request" as const }]
            : key === JOINT_ADDRESS
              ? [{ entryId: key, kind: "joint" as const }]
              : [],
      )
    : [];
  if (held.length)
    return held.map((item) => ({
      ...item,
      order: item.entryId,
      name: null,
      revoke: false,
    }));
  if (!person || !api.state.modules.has(OFFICE_DAY_STATE_MODULE_ID)) return [];
  const names = policyNames();
  const brought = pendingGovernorOrders(api, person);
  return waitingEntries(api, person)
    .filter(
      (entry) =>
        entry.kind === "executive-order" ||
        entry.kind === "emergency" ||
        entry.kind === "state-of-the-state" ||
        stopKindOf(api, entry) === "own-hearing" ||
        entry.kind === "appointment" ||
        entry.kind === "budget-proposal",
    )
    .map((entry) =>
      entry.kind === "budget-proposal"
        ? {
            entryId: entry.id,
            kind: "budget" as const,
            order: entry.subject,
            name: null,
            revoke: false,
            lines: budgetToSend(core, person)?.lines ?? [],
          }
        : entry.kind === "appointment"
          ? {
              entryId: entry.id,
              kind: "post" as const,
              order: entry.subject,
              name:
                statePostsToFill(api, person).find(
                  (p) => p.key === entry.subject,
                )?.title ?? null,
              revoke: false,
              candidates: stateCandidates(api, person, entry.subject)
                .slice(0, 8)
                .map((reasons) => {
                  const who = core.people.get(reasons.candidateId);
                  const job = who?.jobId ? core.jobs.get(who.jobId) : undefined;
                  return {
                    id: reasons.candidateId,
                    name: personName(core, reasons.candidateId),
                    job: job && job.endsAt === undefined ? job.title : null,
                  };
                }),
            }
          : stopKindOf(api, entry) === "own-hearing"
            ? {
                entryId: entry.id,
                kind: "hearing" as const,
                order: entry.subject,
                name: null,
                revoke: false,
              }
            : entry.kind === "state-of-the-state"
              ? {
                  entryId: entry.id,
                  kind: "address" as const,
                  order: entry.subject,
                  name: null,
                  revoke: false,
                }
              : entry.kind === "emergency"
                ? {
                    entryId: entry.id,
                    kind: "emergency" as const,
                    order: entry.subject,
                    name: null,
                    revoke: false,
                  }
                : {
                    entryId: entry.id,
                    kind: "order" as const,
                    order: entry.subject,
                    // The order's own question, worded by the bill catalog's name for it.
                    name: names[orderQuestionOf(entry.subject) ?? ""] ?? null,
                    revoke:
                      brought.find((row) => row.order === entry.subject)
                        ?.revoke ?? false,
                  },
    );
}

/** The player issues the order (or declares the emergency), or sets it aside. */
export function ordersDecide(
  core: CoreState,
  entryId: string,
  how: string,
  nomineeId?: string,
) {
  const api = coreAPI(core);
  const person = controlledPerson(api);
  if (!person) throw new Error("Choose a resident first.");
  if (how !== "issue" && how !== "decline")
    throw new Error("Issue it or set it aside.");
  if (entryId === BUDGET_REQUEST || entryId === JOINT_ADDRESS) {
    if (!heldFederal(api).includes(entryId))
      throw new Error("Nothing is waiting on you.");
    // The president makes the request or gives the address by their own rule (their
    // prepared answers are read on the day itself); either clears the hold.
    if (entryId === BUDGET_REQUEST) requestBudget(api, person);
    else deliverAddress(api, person);
    return;
  }
  const entry = waitingEntries(api, person).find((row) => row.id === entryId);
  if (!entry) throw new Error("Nothing is waiting on you.");
  if (entry.kind === "budget-proposal") {
    // Send the lines the player set, or leave the budget to the governor's own rule.
    const changes =
      how === "issue"
        ? (officeHost.prepared(api, person, "propose-budget")?.budget
            ?.changes ?? {})
        : undefined;
    if (changes) clearPrepared(api, person, "propose-budget");
    doEntry(
      api,
      entryId,
      changes
        ? { kind: "budget", changes }
        : { kind: "budget", changes: {}, byRule: true },
    );
    return;
  }
  if (entry.kind === "appointment") {
    if (how === "issue" && nomineeId)
      if (
        !stateCandidates(api, person, entry.subject).some(
          (r) => r.candidateId === nomineeId,
        )
      )
        throw new Error("Not someone this post could go to.");
    doEntry(api, entryId, {
      kind: "appointment",
      ...(how === "issue" && nomineeId ? { personId: nomineeId } : {}),
      ...(how === "decline" ? { leave: true } : {}),
    });
    return;
  }
  if (stopKindOf(api, entry) === "own-hearing") {
    // The chair holds the hearing (their time is spent at the committee) or lets the day pass.
    doEntry(api, entryId, { kind: "attend", attend: how === "issue" });
    return;
  }
  if (entry.kind === "state-of-the-state") {
    // The address is given by the governor's own priorities (the staff's draft); it has no
    // "set aside": the day's hold ends once it is given.
    actOn(api, entry);
    return;
  }
  if (entry.kind === "emergency") {
    doEntry(api, entryId, { kind: "emergency", declare: how === "issue" });
    return;
  }
  const revoke =
    pendingGovernorOrders(api, person).find(
      (row) => row.order === entry.subject,
    )?.revoke ?? false;
  doEntry(api, entryId, { kind: "order", revoke, issue: how === "issue" });
}

/** The president's open cabinet posts, each with the people it could go to, best first. */
export function nominationsView(core: CoreState) {
  const api = coreAPI(core);
  const person = controlledPerson(api);
  if (!person) return [];
  return nominationsOpen(api, person).map((post) => ({
    post: post.postId,
    title: post.title,
    candidates: post.candidates.slice(0, 8).map((c) => {
      const who = core.people.get(c.id);
      const job = who?.jobId ? core.jobs.get(who.jobId) : undefined;
      return {
        id: c.id,
        name: personName(core, c.id),
        job: job && job.endsAt === undefined ? job.title : null,
      };
    }),
  }));
}

/** The president names someone to an open post (left unnamed, the president's own first choice), for the Senate to vote on. */
export function nominationDecide(
  core: CoreState,
  post: string,
  nomineeId?: string,
  leave = false,
) {
  const api = coreAPI(core);
  const person = controlledPerson(api);
  if (!person) throw new Error("Choose a resident first.");
  if (leave) leavePostOpen(api, person, post);
  else nominate(api, person, post, nomineeId || undefined);
}
