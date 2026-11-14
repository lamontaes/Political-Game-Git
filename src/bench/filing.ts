import { raceTitle } from "./race-words";
import { coreAPI } from "../core2/state";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { workSpansOf } from "./places";
import officeHours from "./data/office-hours.json" with { type: "json" };
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  checkEligibility,
  filingOfficeFor,
  openContests,
  playerContests,
  type FilingRow,
  type RequirementCheck,
} from "../core2/modules/elections";
import {
  PARTIES_MODULE_ID,
  partiesHere,
  partyTie,
} from "../core2/modules/parties";
import { contestPositions } from "../core2/contest-positions";
import { seatHolder } from "../core2/modules/voting";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import {
  sayAtCounter,
  counterNarration,
  saidOffice,
  counterFilingReplyId,
  filedAtCounter,
  openFilingVisit,
  pickContest,
  type FilingContest,
  type FilingVisit,
} from "../director/filing-visit";
import { backdropFor, peopleHere, type StageReason } from "./scene";
import { fileForOffice } from "./government";
import { hasBackdrop } from "./backdrop-places";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState } from "../core2/types";
import { petitionView, raceLive } from "./campaign";

/** The picture for the office that takes a contest's filings. */
export function officePlace(filedWith: string): string {
  const name = filedWith.toLowerCase();
  for (const row of scenePlaces.filingOffices)
    if (!row.match || new RegExp(row.match).test(name)) {
      const place = row.places.find((p) => hasBackdrop(p));
      if (place) return place;
    }
  return "clerk-counter";
}

export interface BenchFilingVisit {
  visit: FilingVisit;
  filedWith: string;
  place: string;
  backdrop: ReturnType<typeof backdropFor>;
  people: ReturnType<typeof peopleHere>["people"];
  names: Record<string, string>;
  /**
   * Each offered race told apart before the player picks, from its records:
   * the seat (its district, or its place among the body's seats up that
   * day), the election date and who holds the seat now.
   */
  seats: Record<string, SeatFacts>;
  /** What the counter shows once an office is named: its rules and the choices made with the filing. */
  overlay?: FilingOverlay;
  result?: unknown;
  /**
   * The narrator's setup before the clerk speaks: who is behind the counter
   * and what the player came for, worded by the English engine from the
   * filing-clerk scene's narration and citing the records it stands on.
   */
  intro: { text: string; sourceRecordIds: readonly string[] }[];
}

export interface SeatFacts {
  seat: string | null;
  electionDate: string;
  holder: string | null;
}

export interface FilingOverlay {
  contestId: string;
  title: string;
  filingDeadline: string;
  checks: readonly RequirementCheck[];
  /** The positions the seat's own government decides (`contestPositions`); none where it decides none. */
  questions: readonly string[];
  /** The ballot labels of the parties here. */
  parties: readonly string[];
  /** The label of the party the player is tied to, if any; the form starts there. */
  party: string | null;
}

/** The contest's rules and the platform and party choices, read from the records. */
function overlayFor(
  core: CoreState,
  playerId: string,
  contestId: string,
): FilingOverlay {
  const api = coreAPI(core);
  const contest = openContests(api).find((row) => row.id === contestId)!;
  const parties = core.modules.has(PARTIES_MODULE_ID) ? partiesHere(api) : [];
  const tie = parties.length ? partyTie(api, playerId) : null;
  return {
    contestId,
    title: raceTitle(contest.title, contest.district),
    filingDeadline: contest.filingDeadline,
    checks: checkEligibility(api, playerId, contestId),
    questions: contestPositions(api, contest),
    parties: parties.map((row) => row.name),
    party: parties.find((row) => row.id === tie?.partyId)?.name ?? null,
  };
}

/** Nothing at this counter for the player: no race to file for and no petition out. */
export class NothingAtCounter extends Error {
  constructor() {
    super("Nothing to file at this office.");
  }
}

/** The player walks into the office that takes filings for these contests. */
export function openBenchFilingVisit(
  core: CoreState,
  playerId: string,
  filedWith: string,
  minuteOfDay: number,
): BenchFilingVisit {
  const api = coreAPI(core);
  // A race the player has already filed in is not offered again (P1,
  // Commack, New York: the clerk offered the race the player was in).
  const mine = new Set(
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byPerson", [playerId]) as unknown as {
        contestId: string;
        status: string;
      }[]
    )
      .filter(
        (row) => row.status === "petitioning" || row.status === "on-ballot",
      )
      .map((row) => row.contestId),
  );
  const open = playerContests(api).filter(
    (row) =>
      !mine.has(row.id) && filingOfficeFor(api, row.id).filedWith === filedWith,
  );
  // A contest's title is its office, with its district where it has one. Races of the
  // same office are told apart in the choice menu by their seat, election day and
  // holder (`seats` below), never by a code in the title.
  const titled = open.map((row) => `${row.title}|${row.district ?? ""}`);
  // What the clerk tells a candidate about the race, from the contest and
  // its office records: the dates, the term and the kind of office.
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  type OfficeRecord = {
    id: string;
    jurisdiction?: string;
    termYears?: number;
    seats?: number;
    bodyName?: string;
  };
  // The place's own council or board, by its office record: the body a seat
  // sits on, or for a single office the body of the same government (owner,
  // Nov 1: "Do you mean city council?").
  const bodyOf = (office: OfficeRecord | undefined) => {
    const named = (row: OfficeRecord | undefined) =>
      row?.bodyName && (row.seats ?? 1) > 1
        ? { name: row.bodyName, recordId: row.id }
        : null;
    if (!office) return null;
    return (
      named(office) ??
      named(
        (
          offices.query("byJurisdiction", [
            office.jurisdiction ?? "",
          ]) as unknown as OfficeRecord[]
        ).find((row) => named(row)),
      )
    );
  };
  // Who else has filed for each race so far, the earliest first, from the
  // elections engine's filings; the player is never one of them.
  const filedFor = (contestId: string): FilingContest["filed"] => {
    const others = [...ballot(api, contestId)]
      .filter((row) => row.personId !== playerId)
      .sort(
        (a, b) =>
          a.filedOn.localeCompare(b.filedOn) || a.id.localeCompare(b.id),
      );
    const first = others[0];
    const person = first ? core.people.get(first.personId) : undefined;
    return {
      count: others.length,
      ...(first && person
        ? {
            first: {
              name: `${person.givenName} ${person.familyName}`,
              recordId: first.id,
              filedOn: first.filedOn,
            },
          }
        : {}),
      recordIds: others.map((row) => row.id),
    };
  };
  const contests = open.map((row) => {
    const office = offices.get(row.officeId) as unknown as
      OfficeRecord | undefined;
    return {
      filed: filedFor(row.id),
      id: row.id,
      title: raceTitle(row.title, row.district),
      filingDeadline: row.filingDeadline,
      electionDate: row.electionDate,
      primaryDate: row.primaryDate,
      termYears: office?.termYears ?? null,
      kind: `${row.family}-${(office?.seats ?? 1) > 1 ? "body" : "single"}`,
      body: bodyOf(office),
      // The seat as its records hold it, for how the talk says it.
      seat: {
        title: row.title,
        seats: office?.seats ?? 1,
        bodyName: (office?.seats ?? 1) > 1 ? (office?.bodyName ?? null) : null,
        district: row.district,
        level: row.level,
      },
      sourceIds: [...row.sources, row.officeId],
    };
  });
  const seats = Object.fromEntries(
    open.map((row, i) => {
      const sameDay = titled.flatMap((t, j) =>
        t === titled[i] && open[j]!.electionDate === row.electionDate
          ? [j]
          : [],
      );
      const holder = seatHolder(api, row);
      return [
        row.id,
        {
          // Seats of one office on one day (at large) are numbered among
          // themselves; the district is in the title, never said twice.
          seat: sameDay.length > 1 ? String(sameDay.indexOf(i) + 1) : null,
          electionDate: row.electionDate,
          holder: holder
            ? `${holder.identity.givenName} ${holder.identity.familyName}`
            : null,
        },
      ];
    }),
  );
  // With no race left to file for here there is no scene (Fable A, Nov 13,
  // rule 19; owner, Nov 14: the clerk never says how many signatures are in,
  // so a petition still gathering gives the counter nothing to say).
  const mineHere = filedHere(core, playerId, filedWith);
  // Back for another race with one already filed here: the clerk opens from
  // that filing (Fable A, Nov 13, Miracle Valley, Arizona).
  const filedRow =
    contests.length && mineHere
      ? (api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .get(mineHere.contestId) as unknown as
          | {
              title: string;
              officeId: string;
              district?: string | null;
              level: string;
            }
          | undefined)
      : undefined;
  const filedOffice = filedRow
    ? (offices.get(filedRow.officeId) as unknown as OfficeRecord | undefined)
    : undefined;
  const back =
    mineHere && filedRow
      ? {
          filingId: mineHere.id,
          seat: {
            title: filedRow.title,
            seats: filedOffice?.seats ?? 1,
            bodyName:
              (filedOffice?.seats ?? 1) > 1
                ? (filedOffice?.bodyName ?? null)
                : null,
            district: filedRow.district ?? null,
            level: filedRow.level,
          },
        }
      : undefined;
  if (!contests.length) throw new NothingAtCounter();
  // The clerk the contest's filing office records name (none for a state or federal counter).
  const clerkRow = filingClerkFor(api, contests[0]!.id);
  const clerk = clerkRow?.personId;
  const visit = openFilingVisit(
    core,
    playerId,
    contests,
    clerk ?? undefined,
    filedWith,
    back,
  );
  const place = officePlace(filedWith);
  const player = core.people.get(playerId)!;
  const cast: { id: string; name: string; reason: StageReason }[] = [
    {
      id: playerId,
      name: `${player.givenName} ${player.familyName}`,
      reason: "you",
    },
  ];
  if (clerk) {
    const row = core.people.get(clerk)!;
    cast.push({
      id: clerk,
      name: `${row.givenName} ${row.familyName}`,
      reason: "clerk",
    });
  }
  const backdrop = backdropFor(core, place, minuteOfDay);
  return {
    visit,
    filedWith,
    place,
    // A first visit asks for the papers; back for another race with one
    // already filed here, the clerk opens from that filing.
    // The clerk's office is named one way, from the place's filing record
    // (Fable A, Nov 13, rule 8: "Town clerk" in a town, never "City Clerk"
    // beside it); the clerk's own title only where that record names a choice.
    intro: clerkRow
      ? counterNarration(
          core,
          visit,
          saidOffice(filedWith, contests)
            ? { ...clerkRow, title: saidOffice(filedWith, contests)! }
            : clerkRow,
          // The visit is for a race left here to file for, never "back with
          // your petition" (Miracle Valley, Arizona, seed w3-return-1); with
          // a filing already here, it is a return.
          back ? mineHere : null,
          minuteOfDay,
        )
      : [],
    backdrop,
    people: peopleHere(core, backdrop.file, cast).people,
    names: Object.fromEntries(cast.map((row) => [row.id, row.name])),
    seats,
  };
}

/** The player's filing at this office still gathering signatures or on the ballot, if any. */
export function filedHere(
  core: CoreState,
  playerId: string,
  filedWith: string,
): { id: string; status: string; contestId: string } | null {
  const api = coreAPI(core);
  const filings = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [playerId]) as unknown as FilingRow[];
  // The filing the player made at this counter comes first: a filing in
  // their name they did not make here (a running mate's place on a ticket,
  // Miracle Valley, Arizona, seed w3-return-1) is not what they came back
  // about.
  const here = filings.filter(
    (row) =>
      row.filedWith === filedWith &&
      (row.status === "petitioning" || row.status === "on-ballot") &&
      raceLive(api, row),
  );
  const made = (row: { id: string }) =>
    core.durableLog.has(counterFilingReplyId(row.id));
  const held =
    here.find((row) => made(row) && row.status === "petitioning") ??
    here.find((row) => made(row)) ??
    here.find((row) => row.status === "petitioning") ??
    here[0];
  return held
    ? { id: held.id, status: held.status, contestId: held.contestId }
    : null;
}

/** The player's choice at the counter: name an office, file, or leave. */
export function chooseAtCounter(
  core: CoreState,
  state: BenchFilingVisit,
  key: string,
  /** Stances as "question=position" and a party id, or null to run without one. */
  filing: { platform?: readonly string[]; party?: string | null } = {},
): BenchFilingVisit {
  const choice = state.visit.choices.find((row) => row.key === key);
  if (!choice) throw new Error("Not an offered choice.");
  const api = coreAPI(core);
  const action = choice.action;
  if (action.kind === "pick") {
    const visit = pickContest(
      core,
      state.visit,
      action.contestId,
      filingOfficeFor(api, action.contestId),
      checkEligibility(api, state.visit.playerId, action.contestId),
    );
    return {
      ...state,
      visit,
      overlay: overlayFor(core, state.visit.playerId, action.contestId),
    };
  }
  if (action.kind === "say")
    return { ...state, visit: sayAtCounter(core, state.visit, key) };
  if (action.kind === "file") {
    const result = fileForOffice(
      core,
      state.visit.playerId,
      action.contestId,
      filing,
    );
    // The clerk takes the papers and names the day that counts next; what
    // the petition asks is the clerk's next scene, staged from the filing's
    // record by the director (the `filing` situation type), so the clerk
    // says it once.
    const refused =
      (result as { status?: string } | undefined)?.status === "refused";
    const visit = refused
      ? {
          ...state.visit,
          lines: [
            ...state.visit.lines,
            {
              speaker: "player" as const,
              text: choice.text,
              sourceRecordIds: choice.sourceRecordIds,
            },
          ],
          choices: [],
        }
      : filedAtCounter(
          core,
          state.visit,
          choice,
          (result as { filing?: { id: string } }).filing?.id,
        );
    const made = (result as { filing?: { id: string } }).filing;
    return {
      ...state,
      visit,
      result: {
        ...result,
        petition: made ? petitionView(api, made.id) : null,
      },
    };
  }
  return { ...state, visit: { ...state.visit, choices: [] } };
}

/** A moment the counter next opens: its day and the minute of that day. */
export interface CounterOpening {
  date: string;
  minuteOfDay: number;
}

/**
 * The spans of an office with no work record for its clerk: its estimated
 * weekday hours, an ESTIMATED place row (`data/office-hours.json`, with its
 * source and spread), so that every office has hours.
 */
function assumedSpans(
  date: string,
): { startMinute: number; endMinute: number }[] {
  const hours = officeHours.estimated;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return hours.weekdays.includes(weekday)
    ? [{ startMinute: hours.opensMinute, endMinute: hours.closesMinute }]
    : [];
}

/**
 * When the office that takes these filings is next open (owner, Nov 1:
 * "obviously the office isn't open at 8:30 p.m."): its clerk's own work spans,
 * the record Travel's "who is there now" reads, and where the records hold no
 * hours for the clerk (or name no clerk), the estimated weekday hours of every
 * office. Null when the office is open at this minute. A day off (a weekend, a
 * holiday the spans leave out) is skipped.
 */
export function counterOpening(
  core: CoreState,
  filedWith: string,
  at: { date: string; minuteOfDay: number },
): CounterOpening | null {
  const api = coreAPI(core);
  const contest = playerContests(api).find(
    (row) => filingOfficeFor(api, row.id).filedWith === filedWith,
  );
  const clerk = contest ? filingClerkFor(api, contest.id) : null;
  // Looks a fortnight ahead: no week is without a day the office is open.
  const days = Array.from({ length: 14 }, (_, ahead) =>
    addDays(makeIsoDate(at.date), ahead),
  );
  // A clerk whose records hold no work in that fortnight has no hours on
  // record: the office keeps the assumed ones.
  const recorded =
    clerk !== null &&
    days.some(
      (date) => (workSpansOf(core, clerk.personId, date)?.length ?? 0) > 0,
    );
  for (const [ahead, date] of days.entries()) {
    const spans =
      (recorded ? workSpansOf(core, clerk!.personId, date) : null) ??
      assumedSpans(date);
    if (
      ahead === 0 &&
      spans.some(
        (span) =>
          span.startMinute <= at.minuteOfDay && at.minuteOfDay < span.endMinute,
      )
    )
      return null;
    const starts = spans
      .filter((span) => ahead > 0 || span.startMinute > at.minuteOfDay)
      .map((span) => span.startMinute);
    if (starts.length) return { date, minuteOfDay: Math.min(...starts) };
  }
  return null;
}
