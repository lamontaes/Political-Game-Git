/**
 * Who the player is, read from records only (owner, Nov 15: "these 10 scenes
 * can only play if you're a state legislator, and that's combined with 5
 * scenes that are played at state legislator or as an executive for state,
 * federal, and local, or as a person reading"): each office they serve with
 * its branch and level, the contests they have filed in that are still
 * ahead, and whether they work. A scene's `holds` words gate on it (any one
 * passing admits the scene); an amount never gates here. The rest of who
 * they are (party, household facts, decisions owed) joins it with the
 * reader that gates on it, so nothing here is read by nobody.
 *
 * Kept on the ledger's person book and recomputed only when a record about
 * the person changes: an event that names them (ledger.ts drops the kept
 * standing), a job of theirs, or the day passing an election
 * or a term's end the standing was read against. Under bookkeeping every
 * kept standing is checked against a fresh read.
 */
import { bookkeeping } from "../core2/bookkeeping";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { bodyRow } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { executiveRow } from "../core2/offices-executives";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { PersonLedger } from "./types";

const zero = P.zero;

/** The branch of government an office is in: a lawmaking body's seat, an executive office, or neither (a sheriff, a clerk). */
export type Branch = "lawmaking" | "executive" | "other";
/** The level a `holds` word names: a city's, township's or county's government is local. */
export type HoldsLevel = "local" | "state" | "federal";

export interface StandingOffice {
  officeId: string;
  kind: string;
  branch: Branch;
  level: HoldsLevel;
}

export interface PlayerStanding {
  /** Every office the person serves a term in now. */
  offices: StandingOffice[];
  /** The office ids, for a record about one body. */
  officeIds: Set<string>;
  /** The contests the person filed in that are still ahead. */
  filedIn: string[];
  /** They hold a job that has not ended. */
  working: boolean;
}

/** What a kept standing was read against, so a later day knows whether it still holds. */
interface KeptStanding {
  standing: PlayerStanding;
  /** The day it stops holding: the next election day of a filed contest or the end of a term. */
  until: string | null;
  jobId: string | undefined;
}

const LEVEL_OF: Record<string, HoldsLevel> = {
  city: "local",
  township: "local",
  county: "local",
  state: "state",
  federal: "federal",
};

/** An office kind's branch and level, from the bodies' and the executives' rows (bodies.json, executives.json). */
function officeOf(
  officeId: string,
  office: { kind: string; level?: string } | undefined,
): StandingOffice {
  const kind = office?.kind ?? "";
  const body = bodyRow(kind);
  const executive = executiveRow(kind);
  const level = body?.level ?? executive?.level ?? office?.level ?? "city";
  return {
    officeId,
    kind,
    branch: body ? "lawmaking" : executive ? "executive" : "other",
    level: LEVEL_OF[level] ?? "local",
  };
}

/** The contests a person has filed in that are still ahead, with each one's election day. */
function filingsAhead(
  core: Readonly<CoreState>,
  personId: PersonId,
): { contestId: string; electionDate?: string }[] {
  const api = coreAPI(core as CoreState);
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return [];
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const out: { contestId: string; electionDate?: string }[] = [];
  for (const filing of elections
    .table("filings")
    .query("byPerson", [personId]) as unknown as { contestId: string }[]) {
    const contest = elections.table("contests").get(filing.contestId) as
      { electionDate?: string } | undefined;
    if (!contest?.electionDate || contest.electionDate >= core.date)
      out.push({
        contestId: filing.contestId,
        electionDate: contest?.electionDate,
      });
  }
  return out;
}

/** The contests a person has filed in that are still ahead. */
export function openContests(
  core: Readonly<CoreState>,
  personId: PersonId,
): string[] {
  return filingsAhead(core, personId).map((row) => row.contestId);
}

function read(core: Readonly<CoreState>, personId: PersonId): KeptStanding {
  const api = coreAPI(core as CoreState);
  const person = core.people.get(personId);
  const offices: StandingOffice[] = [];
  let until: string | null = null;
  const sooner = (date: string | null | undefined) => {
    if (date && date >= core.date && (until === null || date < until))
      until = date;
  };
  if (api.state.modules.has(OFFICES_MODULE_ID)) {
    const state = api.moduleState(OFFICES_MODULE_ID);
    for (const term of state
      .table("terms")
      .query("byPerson", [personId]) as unknown as TermRow[]) {
      if (term.status !== "serving") continue;
      offices.push(
        officeOf(
          term.officeId,
          state.table("offices").get(term.officeId) as
            { kind: string; level?: string } | undefined,
        ),
      );
      sooner(term.endDate);
    }
  }
  const filed = filingsAhead(core, personId);
  for (const row of filed) sooner(row.electionDate);
  const jobId = person?.jobId;
  return {
    standing: {
      offices,
      officeIds: new Set(offices.map((row) => row.officeId)),
      filedIn: filed.map((row) => row.contestId),
      working: !!jobId && core.jobs.get(jobId)?.endsAt === undefined,
    },
    until,
    jobId,
  };
}

const kept = new WeakMap<PersonLedger, KeptStanding>();

/**
 * The person's standing today. With their ledger book, the kept read is used
 * until a record about them changes (`dropStanding`, a new job,
 * or the day passing what it was read against).
 */
export function playerStanding(
  core: Readonly<CoreState>,
  personId: PersonId,
  book?: PersonLedger,
): PlayerStanding {
  if (!book) return read(core, personId).standing;
  const person = core.people.get(personId);
  const held = kept.get(book);
  if (
    held &&
    (held.until === null || core.date <= held.until) &&
    held.jobId === person?.jobId
  ) {
    if (bookkeeping()) {
      const fresh = read(core, personId).standing;
      if (standingKey(fresh) !== standingKey(held.standing))
        throw new Error(
          `Kept standing of ${personId} is stale on ${core.date}: ${standingKey(held.standing)} against ${standingKey(fresh)}`,
        );
    }
    return held.standing;
  }
  const fresh = read(core, personId);
  kept.set(book, fresh);
  return fresh.standing;
}

/** A record about the person changed (an event named them): their standing is read again when next asked. */
export function dropStanding(book: PersonLedger): void {
  kept.delete(book);
}

function standingKey(standing: PlayerStanding): string {
  return JSON.stringify([standing.offices, standing.filedIn, standing.working]);
}

/**
 * Whether one `holds` word passes: "none" (no office and no contest filed),
 * "filed", "working", "office", "office:lawmaking", "office:executive", each
 * office word optionally ending ":local", ":state" or ":federal".
 */
export function holdsWord(word: string, standing: PlayerStanding): boolean {
  switch (word) {
    case "none":
      return !standing.offices.length && !standing.filedIn.length;
    case "filed":
      return standing.filedIn.length > zero;
    case "working":
      return standing.working;
  }
  const [head, branchOrLevel, last] = word.split(":");
  if (head !== "office") throw new Error(`Unknown holds word: ${word}`);
  const levels: readonly string[] = ["local", "state", "federal"];
  const branch =
    branchOrLevel && !levels.includes(branchOrLevel)
      ? branchOrLevel
      : undefined;
  const level = branch ? last : branchOrLevel;
  if (branch && branch !== "lawmaking" && branch !== "executive")
    throw new Error(`Unknown holds word: ${word}`);
  if (level && !levels.includes(level))
    throw new Error(`Unknown holds word: ${word}`);
  return standing.offices.some(
    (row) =>
      (!branch || row.branch === branch) && (!level || row.level === level),
  );
}

/** Whether any one of a row's `holds` words passes; a row without any admits everyone. */
export function holdsAny(
  holds: readonly string[] | undefined,
  standing: PlayerStanding,
): boolean {
  return !holds || holds.some((word) => holdsWord(word, standing));
}
