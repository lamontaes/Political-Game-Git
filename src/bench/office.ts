/**
 * The officeholder's screens on the play page (office play, OFFICE-LOCAL):
 * the meeting scene at the meeting's hour, the desk the morning a passed
 * bill reaches it, and what stops the player. Records and control names
 * only; the words of each act come from the engines that kept them.
 */
import { billTitleOf } from "../english/bill-names";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { billOf, votesOn, type BillRow } from "../core2/modules/legislature";
import { remarksOn } from "../core2/modules/meetings";
import {
  adjourn,
  decideDesk,
  deskWaiting,
  leaveDeskToCharacter,
  meetingInProgress,
  officeActsOf,
  officeJobsOf,
  setStops,
  speakOnItem,
  stopsOf,
  stopKinds,
  takeUpItem,
  upcomingMeeting,
} from "../core2/modules/office-day";
import { bodyScene, personName } from "./legislature";

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
