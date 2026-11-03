import { coreAPI } from "../core2/state";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { workSpansOf } from "./places";
import officeHours from "./data/office-hours.json" with { type: "json" };
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  filingOfficeFor,
  openContests,
  playerContests,
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
  counterNarration,
  openFilingVisit,
  pickContest,
  type FilingVisit,
} from "../director/filing-visit";
import { backdropFor, stagePeople, type StageReason } from "./scene";
import { fileForOffice } from "./government";
import { hasBackdrop } from "./backdrop-places";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState } from "../core2/types";

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
  people: ReturnType<typeof stagePeople>["people"];
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
    title: contest.district
      ? `${contest.title} (${contest.district})`
      : contest.title,
    filingDeadline: contest.filingDeadline,
    checks: checkEligibility(api, playerId, contestId),
    questions: contestPositions(api, contest),
    parties: parties.map((row) => row.name),
    party: parties.find((row) => row.id === tie?.partyId)?.name ?? null,
  };
}

/** The player walks into the office that takes filings for these contests. */
export function openBenchFilingVisit(
  core: CoreState,
  playerId: string,
  filedWith: string,
  minuteOfDay: number,
): BenchFilingVisit {
  const api = coreAPI(core);
  const open = playerContests(api).filter(
    (row) => filingOfficeFor(api, row.id).filedWith === filedWith,
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
  const contests = open.map((row) => {
    const office = offices.get(row.officeId) as unknown as
      OfficeRecord | undefined;
    return {
      id: row.id,
      title: row.district ? `${row.title} (${row.district})` : row.title,
      filingDeadline: row.filingDeadline,
      electionDate: row.electionDate,
      primaryDate: row.primaryDate,
      termYears: office?.termYears ?? null,
      kind: `${row.family}-${(office?.seats ?? 1) > 1 ? "body" : "single"}`,
      body: bodyOf(office),
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
          // Seats sharing a district (at large) are numbered among themselves.
          seat:
            sameDay.length > 1
              ? [row.district, String(sameDay.indexOf(i) + 1)]
                  .filter(Boolean)
                  .join(" ")
              : row.district,
          electionDate: row.electionDate,
          holder: holder
            ? `${holder.identity.givenName} ${holder.identity.familyName}`
            : null,
        },
      ];
    }),
  );
  if (!contests.length) throw new Error("No open contest files there.");
  // The clerk the contest's filing office records name (none for a state or federal counter).
  const clerkRow = filingClerkFor(api, contests[0]!.id);
  const clerk = clerkRow?.personId;
  const visit = openFilingVisit(core, playerId, contests, clerk ?? undefined);
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
    // A first visit asks for the papers; a filing here still gathering
    // signatures brings the petition back, and one already on the ballot
    // comes back with nothing to bring, each by its record.
    intro: clerkRow
      ? counterNarration(
          core,
          visit,
          clerkRow,
          filedHere(core, playerId, filedWith),
        )
      : [],
    backdrop,
    people: stagePeople(core, backdrop.file, cast).people,
    names: Object.fromEntries(cast.map((row) => [row.id, row.name])),
    seats,
  };
}

/** The player's filing at this office still gathering signatures or on the ballot, if any. */
function filedHere(
  core: CoreState,
  playerId: string,
  filedWith: string,
): { id: string; status: string } | null {
  const filings = coreAPI(core)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [playerId]) as unknown as {
    id: string;
    personId: string;
    filedWith: string;
    status: string;
  }[];
  const held =
    filings.find(
      (row) => row.filedWith === filedWith && row.status === "petitioning",
    ) ??
    filings.find(
      (row) => row.filedWith === filedWith && row.status === "on-ballot",
    );
  return held ? { id: held.id, status: held.status } : null;
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
  if (action.kind === "file") {
    const result = fileForOffice(
      core,
      state.visit.playerId,
      action.contestId,
      filing,
    );
    state.visit.lines.push({
      speaker: "player",
      text: choice.text,
      sourceRecordIds: choice.sourceRecordIds,
    });
    // What the petition asks is the clerk's next scene, staged from the
    // filing's record by the director (the `filing` situation type), so the
    // clerk says it once.
    return { ...state, visit: { ...state.visit, choices: [] }, result };
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
 * weekday hours (`data/office-hours.json`), a stopgap that every office has
 * hours until the records give them.
 * stopgapId: SG-PLAY-office-hours-assumed
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
