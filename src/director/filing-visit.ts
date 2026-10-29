/**
 * The filing visit (golden path step 3): the player at the office that takes
 * filings, where that place's records say it is. The clerk asks which office,
 * states the deadline from the record, explains each
 * rule that stops the filing, and otherwise offers the ways to file. The
 * records are GOV's (`openContests`, `filingOfficeFor`, `checkEligibility`),
 * passed in as plain data; the filing itself is GOV's `fileCandidacy`. The
 * visit says which move each line makes and the facts it stands on; the
 * English engine (`src/english/filing-visit-words.ts`) words it.
 */
import type { CoreState, PersonId } from "../core2/types";
import { spokenDate } from "./words";
import { wordSceneMove } from "../english/scene-talk-words";
import {
  wordFilingMove,
  type Fact,
  type FilingMove,
  type VisitWords,
} from "../english/filing-visit-words";

export interface FilingContest {
  id: string;
  title: string;
  filingDeadline: string;
  /** The general election and the primary, where the place holds one. */
  electionDate?: string;
  primaryDate?: string | null;
  /** The office's term in years, from its record. */
  termYears?: number | null;
  /** The kind of office, for what the clerk says it does: family and body or single seat. */
  kind?: string;
  sourceIds: readonly string[];
}
/** GOV's `FilingRequirements`. */
export interface FilingTerms {
  filedWith: string;
  source: string;
}
/** GOV's `RequirementCheck`. */
export interface FilingCheck {
  rule: string;
  met: boolean;
  required: string;
  actual: string;
  source: string;
}

export type FilingAction =
  | { kind: "pick"; contestId: string }
  | { kind: "file"; contestId: string }
  | { kind: "done" };

export interface FilingVisit {
  playerId: PersonId;
  clerkId?: PersonId;
  contests: readonly FilingContest[];
  lines: {
    speaker: "clerk" | "player";
    text: string;
    sourceRecordIds: readonly string[];
  }[];
  choices: {
    key: string;
    text: string;
    /**
     * What the screen's control is: filing is its own control, named by the
     * screen, so it never reads like acknowledging a refusal.
     */
    control: "pick" | "file" | "acknowledge";
    action: FilingAction;
    sourceRecordIds: readonly string[];
  }[];
}

function say(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  speaker: "clerk" | "player",
  move: FilingMove,
  facts: Record<string, Fact>,
  words: VisitWords | undefined,
  stage?: string,
) {
  return wordFilingMove({
    seed: core.seed,
    move,
    speakerId:
      speaker === "clerk" ? (visit.clerkId ?? visit.playerId) : visit.playerId,
    fallbackSourceId: visit.playerId,
    facts,
    momentKey: `${visit.playerId}:${core.date}:${visit.lines.length}:${move}`,
    ...(stage ? { stage } : {}),
    ...(words ? { words } : {}),
  });
}

export function openFilingVisit(
  core: Readonly<CoreState>,
  playerId: PersonId,
  contests: readonly FilingContest[],
  clerkId?: PersonId,
  words?: VisitWords,
): FilingVisit {
  const visit: FilingVisit = {
    playerId,
    ...(clerkId ? { clerkId } : {}),
    contests,
    lines: [],
    choices: [],
  };
  const greet = say(core, visit, "clerk", "greet", {}, words);
  if (greet) visit.lines.push({ speaker: "clerk", ...greet });
  for (const contest of contests) {
    const line = say(
      core,
      visit,
      "player",
      "pick",
      { office: { text: contest.title, sourceRecordIds: [contest.id] } },
      words,
    );
    if (line)
      visit.choices.push({
        key: `pick:${contest.id}`,
        text: line.text,
        control: "pick",
        action: { kind: "pick", contestId: contest.id },
        sourceRecordIds: line.sourceRecordIds,
      });
  }
  return visit;
}

/** The player names an office; the clerk answers from that contest's records. */
export function pickContest(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  contestId: string,
  terms: FilingTerms,
  checks: readonly FilingCheck[],
  words?: VisitWords,
): FilingVisit {
  const choice = visit.choices.find(
    (row) => row.action.kind === "pick" && row.action.contestId === contestId,
  );
  const contest = visit.contests.find((row) => row.id === contestId);
  if (!choice || !contest)
    throw new Error(`Not an offered office: ${contestId}`);
  visit.lines.push({
    speaker: "player",
    text: choice.text,
    sourceRecordIds: choice.sourceRecordIds,
  });
  const ids = [contest.id, ...contest.sourceIds];
  const facts: Record<string, Fact> = {
    office: { text: contest.title, sourceRecordIds: ids },
    deadline: {
      text: spokenDate(contest.filingDeadline, core.date),
      sourceRecordIds: ids,
    },
    "filing-office": { text: terms.filedWith, sourceRecordIds: ids },
  };
  // The clerk tells the candidate about the race before the paperwork
  // (owner, Oct 28 sitting, 32: "you're running for Trustee ... the primary
  // is this date and the general is this date ... here is what a trustee
  // does, here is the term"), each line from the contest's records.
  for (const line of raceTold(core, visit, contest, ids))
    visit.lines.push({ speaker: "clerk", ...line });
  const stated = say(core, visit, "clerk", "terms", facts, words, "none");
  if (stated) visit.lines.push({ speaker: "clerk", ...stated });

  // Each rule that stops the filing, in the clerk's words, from its record.
  const unmet = checks.filter((row) => !row.met);
  for (const check of unmet) {
    const required =
      check.rule === "filing-deadline"
        ? spokenDate(check.required, core.date)
        : check.required;
    const actual = check.actual;
    const line = say(
      core,
      visit,
      "clerk",
      `rule:${check.rule}`,
      {
        ...facts,
        required: { text: required, sourceRecordIds: ids },
        actual: { text: actual, sourceRecordIds: [visit.playerId] },
      },
      words,
    );
    if (line) visit.lines.push({ speaker: "clerk", ...line });
  }
  visit.choices = [];
  const offer = (key: "accept" | "file", action: FilingAction) => {
    const line = say(core, visit, "player", key, facts, words);
    if (line)
      visit.choices.push({
        key,
        text: line.text,
        control: action.kind === "file" ? "file" : "acknowledge",
        action,
        sourceRecordIds: line.sourceRecordIds,
      });
  };
  if (unmet.length) {
    offer("accept", { kind: "done" });
    return visit;
  }
  offer("file", { kind: "file", contestId });
  return visit;
}

/**
 * What the clerk says about the race, in order: the office, the dates, the
 * term, the work. The petition's signature count waits on its record.
 * stopgapId: SG-WORDS-clerk-petition-awaits-record
 */
const RACE_MOVES = ["tell-running", "tell-dates", "tell-term", "tell-duty"];

function raceTold(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  contest: FilingContest,
  ids: readonly string[],
): { text: string; sourceRecordIds: readonly string[] }[] {
  const fact = (text: string) => ({ text, sourceRecordIds: ids });
  const facts: Record<string, Fact> = { office: fact(contest.title) };
  if (contest.electionDate)
    facts.general = fact(spokenDate(contest.electionDate, core.date));
  if (contest.primaryDate)
    facts.primary = fact(spokenDate(contest.primaryDate, core.date));
  else if (contest.electionDate) facts["no-primary"] = fact("yes");
  if (contest.termYears) facts.term = fact(String(contest.termYears));
  if (contest.kind) facts[`office-${contest.kind}`] = fact("yes");
  const said = new Set<string>();
  return RACE_MOVES.flatMap((move) => {
    const worded = wordSceneMove({
      move: {
        step: "state",
        move,
        role: "asker",
        purpose: "filing-clerk",
        key: "routine",
      },
      facts,
      seed: core.seed,
      speakerId: visit.clerkId ?? visit.playerId,
      traits: core.people.get(visit.clerkId ?? visit.playerId)?.traits ?? {},
      momentKey: `${visit.playerId}:${core.date}:${contest.id}:${move}`,
      said,
    });
    if (!worded || !("text" in worded)) return [];
    said.add(worded.pieceKey);
    return [
      { text: worded.text, sourceRecordIds: [...ids, ...worded.slotRecordIds] },
    ];
  });
}
