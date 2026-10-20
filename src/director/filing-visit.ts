/**
 * The filing visit (golden path step 3): the player at the office that takes
 * filings, where that place's records say it is. The clerk asks which office,
 * states the deadline from the record, explains each
 * rule that stops the filing, and otherwise offers the ways to file. The
 * records are GOV's (`openContests`, `filingOfficeFor`, `checkEligibility`),
 * passed in as plain data; the filing itself is GOV's `fileCandidacy`.
 */
import type { CoreState, PersonId } from "../core2/types";
import { renderLine, type Fact, type Variant } from "./render";
import { filingWordsFromBank } from "./mined/filing-bank";

export interface VisitWords {
  version: string;
  greet: Variant[];
  pick: Variant[];
  terms: Variant[];
  rules: Readonly<Record<string, Variant[]>>;
  accept: Variant[];
  /** The player saying they file for the office, and the clerk's word that it is filed. */
  file: Variant[];
  filed: Variant[];
}
/** The default words are the mined clerk bank's. */
export const FILING_VISIT_WORDS: VisitWords = filingWordsFromBank();

export interface FilingContest {
  id: string;
  title: string;
  filingDeadline: string;
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

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

function say(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  speaker: "clerk" | "player",
  part: string,
  variants: readonly Variant[] | undefined,
  facts: Record<string, Fact>,
  version: string,
  stage?: string,
) {
  return renderLine({
    seed: core.seed,
    surface: "dialogue",
    holderId:
      speaker === "clerk" ? (visit.clerkId ?? visit.playerId) : visit.playerId,
    bankKey: `filing-visit:${part}`,
    version,
    variants,
    facts,
    momentKey: `${visit.playerId}:${core.date}:${visit.lines.length}:${part}`,
    ...(stage ? { stage } : {}),
    fallbackSourceId: visit.playerId,
  });
}

export function openFilingVisit(
  core: Readonly<CoreState>,
  playerId: PersonId,
  contests: readonly FilingContest[],
  clerkId?: PersonId,
  words: VisitWords = FILING_VISIT_WORDS,
): FilingVisit {
  const visit: FilingVisit = {
    playerId,
    ...(clerkId ? { clerkId } : {}),
    contests,
    lines: [],
    choices: [],
  };
  const greet = say(
    core,
    visit,
    "clerk",
    "greet",
    words.greet,
    {},
    words.version,
  );
  if (greet) visit.lines.push({ speaker: "clerk", ...greet });
  for (const contest of contests) {
    const line = say(
      core,
      visit,
      "player",
      "pick",
      words.pick,
      { office: { text: contest.title, sourceRecordIds: [contest.id] } },
      words.version,
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
  words: VisitWords = FILING_VISIT_WORDS,
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
    deadline: { text: longDate(contest.filingDeadline), sourceRecordIds: ids },
    "filing-office": { text: terms.filedWith, sourceRecordIds: ids },
  };
  const stated = say(
    core,
    visit,
    "clerk",
    "terms",
    words.terms,
    facts,
    words.version,
    "none",
  );
  if (stated) visit.lines.push({ speaker: "clerk", ...stated });

  // Each rule that stops the filing, in the clerk's words, from its record.
  const unmet = checks.filter((row) => !row.met);
  for (const check of unmet) {
    const required =
      check.rule === "filing-deadline"
        ? longDate(check.required)
        : check.required;
    const actual = check.actual;
    const line = say(
      core,
      visit,
      "clerk",
      `rule:${check.rule}`,
      words.rules[check.rule],
      {
        ...facts,
        required: { text: required, sourceRecordIds: ids },
        actual: { text: actual, sourceRecordIds: [visit.playerId] },
      },
      words.version,
    );
    if (line) visit.lines.push({ speaker: "clerk", ...line });
  }
  visit.choices = [];
  const offer = (key: string, variants: Variant[], action: FilingAction) => {
    const line = say(
      core,
      visit,
      "player",
      key,
      variants,
      facts,
      words.version,
    );
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
    offer("accept", words.accept, { kind: "done" });
    return visit;
  }
  offer("file", words.file.length ? words.file : words.accept, {
    kind: "file",
    contestId,
  });
  return visit;
}

/**
 * The clerk's word that the papers are in, citing the filing record the
 * filing wrote; said after the player files.
 */
export function confirmFiled(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  contestId: string,
  filingId: string,
  words: VisitWords = FILING_VISIT_WORDS,
): FilingVisit {
  const contest = visit.contests.find((row) => row.id === contestId);
  if (!contest) throw new Error(`Not an offered office: ${contestId}`);
  const line = say(
    core,
    visit,
    "clerk",
    "filed",
    words.filed,
    {
      office: {
        text: contest.title,
        sourceRecordIds: [contest.id, filingId],
      },
    },
    words.version,
  );
  if (line) visit.lines.push({ speaker: "clerk", ...line });
  return visit;
}
