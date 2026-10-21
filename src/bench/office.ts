/**
 * The officeholder's screens on the play page (office play, OFFICE-LOCAL):
 * the meeting scene at the meeting's hour, the desk the morning a passed
 * bill reaches it, and what stops the player. Records and control names
 * only; the words of each act come from the engines that kept them.
 */
import { billTitleOf } from "../english/bill-names";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import {
  billOf,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  votesOn,
  type BillRow,
} from "../core2/modules/legislature";
import { remarksOn } from "../core2/modules/meetings";
import {
  followersOf,
  interviewsFor,
  outletsHere,
} from "../core2/modules/press";
import {
  adjourn,
  decideDesk,
  deskWaiting,
  leaveDeskToCharacter,
  meetingInProgress,
  officeActsOf,
  officeHost,
  officeJobsOf,
  prepareAct,
  setStops,
  speakOnItem,
  stopsOf,
  stopKinds,
  takeUpItem,
  upcomingMeeting,
} from "../core2/modules/office-day";
import { bodyScene, personName } from "./legislature";
import { headCandidates, postsToFill } from "../core2/modules/executive";
import { budgetProposalDue } from "../core2/office-day-acts";
import { budgetsOf, governments } from "../core2/modules/budgets";
import { lineName } from "./budget";

/** A bill as the meeting and the desk show it: its real name, number, sponsor, sections, remarks and votes. */
export function billItem(core: CoreState, bill: BillRow) {
  const api = coreAPI(core);
  return {
    billId: bill.id,
    // The bill's real name from its title record, never its description.
    title: billTitleOf(bill)?.title ?? null,
    number: bill.number,
    status: bill.status,
    sponsor: personName(core, bill.sponsorId),
    provisions: bill.provisions,
    remarks: remarksOn(api, bill.id).map((r) => ({
      name: personName(core, r.personId),
      position: r.position,
      kind: r.kind,
    })),
    votes: votesOn(api, bill.id).map((v) => ({
      name: personName(core, v.memberId),
      vote: v.vote,
    })),
  };
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
    ...bodyScene(core, personId, meeting.officeId, minute),
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

export function meetingAdjourn(core: CoreState, meetingId: string) {
  adjourn(coreAPI(core), meetingId);
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
      nextMeeting: upcomingMeeting(api, j.officeId)?.date ?? null,
    })),
    stops: stopKinds().map((kind) => ({
      kind,
      on: stopsOf(api, personId)[kind],
    })),
    // The town's outlets the official may ask for an interview, widest reach first; one that has had them on is marked.
    outlets: (() => {
      const had = new Set(
        interviewsFor(api, personId).map((row) => row.outletId),
      );
      return outletsHere(api)
        .map((o) => ({
          id: o.id,
          name: core.organizations.get(o.organizationId)?.name ?? o.id,
          kind: o.kind,
          reach: followersOf(api, o.id).length,
          hadThem: had.has(o.id),
        }))
        .sort((a, b) => b.reach - a.reach || a.id.localeCompare(b.id));
    })(),
    // The town posts the official appoints that stand open, each with the people it could go to, best first by the official's own reasons.
    heads: postsToFill(api, personId).map((post) => ({
      post: post.key,
      title: post.title,
      candidates: headCandidates(api, post.key)
        .slice(0, 8)
        .map((reasons) => {
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
    // The budget the official may send now, line by line, with the change set for each (null outside the season).
    budget: budgetToSend(core, personId),
    // Each of the player's bills waiting for a vote, with the colleagues who will vote and the deal set to offer each when they talk.
    deals: pendingBills(api, personId).map((bill) => ({
      billId: bill.id,
      number: bill.number,
      colleagues: colleaguesOn(api, bill, personId).map((key) => ({
        key,
        name: personName(core, key),
        deal: dealsSet(api, personId)[key] ?? null,
      })),
    })),
    acts: officeActsOf(api, personId)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20),
  };
}

export function officeStops(
  core: CoreState,
  personId: string,
  kind: string,
  on: boolean,
) {
  if (!stopKinds().includes(kind)) throw new Error("Unknown stop.");
  return setStops(coreAPI(core), personId, { [kind]: on });
}

/** The player picks which outlet the next interview asks; the character's own pick (the widest reach) stands until they do. */
export function interviewOutlet(
  core: CoreState,
  personId: string,
  outletId: string,
) {
  const api = coreAPI(core);
  if (!outletsHere(api).some((o) => o.id === outletId))
    throw new Error("Not an outlet in this town.");
  prepareAct(api, personId, "interview", { outletId });
  return officeView(core, personId);
}

/** The player picks who the next "name a department head" names to an open post; left alone, the official's own first choice stands. */
export function nameHeadPick(
  core: CoreState,
  personId: string,
  post: string,
  nomineeId: string,
) {
  const api = coreAPI(core);
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
  const due = budgetProposalDue(api, officeHost, personId);
  if (!due) return null;
  const gov = governments(api).find((g) => g.id === due.governmentId);
  const latest = gov
    ? [...budgetsOf(api, gov.id)].sort((a, b) => b.fiscalYear - a.fiscalYear)[0]
    : undefined;
  if (!gov || !latest) return null;
  const changes =
    officeHost.prepared(api, personId, "propose-budget")?.budget?.changes ?? {};
  return {
    governmentId: gov.id,
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
