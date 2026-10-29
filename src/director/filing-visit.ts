/**
 * The filing visit (golden path step 3): the player at the office that takes
 * filings, where that place's records say it is. The clerk asks which office,
 * states the deadline from the record, explains each
 * rule that stops the filing, and otherwise offers the ways to file. The
 * records are GOV's (`openContests`, `filingOfficeFor`, `checkEligibility`),
 * passed in as plain data; the filing itself is GOV's `fileCandidacy`. The
 * visit says which move each line makes and the facts it stands on; the
 * English engine words it from the filing-clerk scene's own pieces
 * (`wordSceneMove`), the one word maker every scene uses.
 */
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { spokenDate } from "./words";
import { wordSceneMove, type Fact } from "../english/scene-talk-words";

const zero = P.zero;
const one = P.one;

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

export function openFilingVisit(
  core: Readonly<CoreState>,
  playerId: PersonId,
  contests: readonly FilingContest[],
  clerkId?: PersonId,
): FilingVisit {
  const visit: FilingVisit = {
    playerId,
    ...(clerkId ? { clerkId } : {}),
    contests,
    lines: [],
    choices: [],
  };
  const greet = visitLine(core, visit, "clerk", "greet-counter", {});
  if (greet) visit.lines.push({ speaker: "clerk", ...greet });
  for (const contest of contests) {
    const line = visitLine(
      core,
      visit,
      "player",
      "pick-office",
      { office: { text: contest.title, sourceRecordIds: [contest.id] } },
      `${visit.playerId}:${core.date}:${contest.id}:pick-office`,
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
    where: { text: terms.filedWith, sourceRecordIds: ids },
  };
  // The clerk tells the candidate about the race before the paperwork
  // (owner, Oct 28 sitting, 32: "you're running for Trustee ... the primary
  // is this date and the general is this date ... here is what a trustee
  // does, here is the term"), each line from the contest's records.
  for (const line of raceTold(core, visit, contest, ids))
    visit.lines.push({ speaker: "clerk", ...line });
  const stated = visitLine(core, visit, "clerk", "tell-deadline", facts);
  if (stated) visit.lines.push({ speaker: "clerk", ...stated });

  // Each rule that stops the filing, in the clerk's words, from its record.
  const unmet = checks.filter((row) => !row.met);
  for (const check of unmet) {
    const required =
      check.rule === "filing-deadline"
        ? spokenDate(check.required, core.date)
        : check.required;
    const actual = check.actual;
    const line = visitLine(core, visit, "clerk", `rule-${check.rule}`, {
      ...facts,
      required: { text: required, sourceRecordIds: ids },
      actual: { text: actual, sourceRecordIds: [visit.playerId] },
    });
    if (line) visit.lines.push({ speaker: "clerk", ...line });
  }
  visit.choices = [];
  const offer = (key: "accept" | "file", action: FilingAction) => {
    const line = visitLine(core, visit, "player", "accept-terms", facts);
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
 * term, the work.
 */
const RACE_MOVES = ["tell-running", "tell-dates", "tell-term", "tell-duty"];

/**
 * A line of the filing-clerk scene in the speaker's own voice: the clerk's,
 * or the player's when they name an office or answer.
 */
function visitLine(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  speaker: "clerk" | "player",
  move: string,
  facts: Readonly<Record<string, Fact>>,
  momentKey = `${visit.playerId}:${core.date}:${visit.lines.length}:${move}`,
  said: Set<string> = new Set(),
  step: "state" | "narrate" = "state",
): { text: string; sourceRecordIds: readonly string[] } | null {
  const speakerId =
    speaker === "clerk" ? (visit.clerkId ?? visit.playerId) : visit.playerId;
  const worded = wordSceneMove({
    move: {
      step,
      move,
      role:
        step === "narrate"
          ? "narrator"
          : speaker === "clerk"
            ? "asker"
            : "asked",
      purpose: "filing-clerk",
      key: "routine",
    },
    facts,
    seed: core.seed,
    speakerId,
    traits:
      step === "narrate" ? {} : (core.people.get(speakerId)?.traits ?? {}),
    momentKey,
    said,
  });
  if (!worded || !("text" in worded)) return null;
  said.add(worded.pieceKey);
  return {
    text: worded.text,
    sourceRecordIds: [
      ...new Set([
        ...Object.values(facts).flatMap((fact) => fact.sourceRecordIds),
        ...worded.slotRecordIds,
      ]),
    ],
  };
}

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
    const line = visitLine(
      core,
      visit,
      "clerk",
      move,
      facts,
      `${visit.playerId}:${core.date}:${contest.id}:${move}`,
      said,
    );
    return line ? [line] : [];
  });
}

/** The petition the elections engine opened with a filing: its signatures and the day they are due. */
export interface FilingPetition {
  id: string;
  needed: number;
  due: string;
}

/**
 * Once the filing is taken, the clerk says what comes next from the
 * petition record the elections engine opened with it: the signatures the
 * place's law asks and the day they are due, or that this office takes no
 * petition (owner, Oct 28: filing is a petition, signatures, the clerk's
 * check, then the ballot).
 */
export function filedAtCounter(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  petition: FilingPetition | null,
): FilingVisit {
  if (!petition) return visit;
  const fact = (text: string) => ({ text, sourceRecordIds: [petition.id] });
  const facts: Record<string, Fact> =
    petition.needed > one
      ? {
          signatures: fact(petition.needed.toLocaleString("en-US")),
          due: fact(spokenDate(petition.due, core.date)),
        }
      : petition.needed === one
        ? {
            "one-signature": fact("yes"),
            due: fact(spokenDate(petition.due, core.date)),
          }
        : { "no-petition": fact("yes") };
  const line = visitLine(
    core,
    visit,
    "clerk",
    petition.needed > zero ? "tell-signatures" : "tell-no-petition",
    facts,
    `${visit.playerId}:${petition.id}:filed`,
  );
  if (line) visit.lines.push({ speaker: "clerk", ...line });
  return visit;
}

/**
 * The narrator's setup at the counter, from the filing-clerk scene's own
 * narration (the director fires the same scene when a filing is made): who
 * is behind the counter and what the player came for. The seat is named
 * only when the counter takes one race, so the line never says a seat the
 * player did not pick.
 */
export function counterNarration(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  clerk: { title: string; recordId: string },
): { text: string; sourceRecordIds: readonly string[] }[] {
  const person = visit.clerkId ? core.people.get(visit.clerkId) : undefined;
  if (!person) return [];
  const facts: Record<string, Fact> = {
    name: {
      text: `${person.givenName} ${person.familyName}`,
      sourceRecordIds: [person.id],
    },
    // A title the record capitalizes only at its start ("County clerk") is said
    // in running text as a common noun; one with proper names stays as written.
    post: {
      text: /^\S+( [a-z]+)*$/.test(clerk.title)
        ? `${clerk.title.charAt(zero).toLowerCase()}${clerk.title.slice(one)}`
        : clerk.title,
      sourceRecordIds: [clerk.recordId],
    },
  };
  if (visit.contests.length === one)
    facts.office = {
      text: visit.contests[zero]!.title,
      sourceRecordIds: [visit.contests[zero]!.id],
    };
  const line = visitLine(
    core,
    visit,
    "clerk",
    "narrate",
    facts,
    `counter:${visit.playerId}:${person.id}:${clerk.recordId}`,
    new Set(),
    "narrate",
  );
  return line ? [line] : [];
}
