/**
 * The filing visit (golden path step 3): the player at the office that takes
 * filings, where that place's records say it is. The clerk asks which office,
 * states the deadline from the record, explains each
 * rule that stops the filing, and otherwise offers the ways to file. The
 * records are GOV's (`openContests`, `filingOfficeFor`, `checkEligibility`),
 * passed in as plain data; the filing itself is GOV's `fileCandidacy`. The
 * visit says which move each line makes and the facts it stands on; the
 * English engine words it from the filing-clerk scene's own pieces
 * (`wordSceneMove`), the one word maker every scene uses. Once the filing
 * is taken, the clerk's talk about the petition is the director's `filing`
 * scene, staged from the filing's record, so the clerk says it once.
 *
 * stopgapId: SG-WORDS-filing-counter-prompts (the talk before filing is
 * still this visit's own sequence, until one scene ends in the counter).
 */
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { spoken, spokenDate } from "./words";
import {
  wordSceneMove,
  type Fact,
  type SceneTalkStep,
} from "../english/scene-talk-words";
import { dayOpening } from "../english/day-words";
import { filedSaid } from "../english/count-words";
import { seatSaid, type SeatRecord } from "../english/journal-words";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";

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
  /**
   * The place's own council or board, as its office record names it ("City
   * Council", "Board of Selectmen"): the body a seat sits on, or the one an
   * executive's work answers to.
   */
  body?: { name: string; recordId: string } | null;
  /** The seat as its records hold it, for how a sentence says it (`seatSaid`). */
  seat?: SeatRecord;
  /**
   * Who else has filed for this office so far, from the elections engine's
   * filings (`ballot`), the player left out: how many, the first by name,
   * and the filing records.
   */
  filed?: {
    count: number;
    first?: { name: string; recordId: string };
    recordIds: readonly string[];
  };
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
  /** A question about the race: who else has filed, or its dates. */
  | { kind: "ask"; contestId: string; about: CounterQuestion }
  | { kind: "done" };

/** What the player may ask the clerk about the race before filing. */
export type CounterQuestion = "filed" | "dates";

export interface FilingVisit {
  playerId: PersonId;
  clerkId?: PersonId;
  contests: readonly FilingContest[];
  /** The race the player named, with the facts the clerk speaks from, and what they have asked. */
  picked?: {
    contestId: string;
    facts: Readonly<Record<string, Fact>>;
    asked: readonly CounterQuestion[];
  };
  lines: {
    speaker: "clerk" | "player";
    text: string;
    sourceRecordIds: readonly string[];
  }[];
  choices: {
    key: string;
    text: string;
    /**
     * What the choice does: pick a race, file, or take a refusal. Each shows
     * the player's own words, and the words that file are never those that
     * acknowledge a refusal.
     */
    control: "pick" | "file" | "ask" | "leave" | "acknowledge";
    action: FilingAction;
    sourceRecordIds: readonly string[];
  }[];
}

export function openFilingVisit(
  core: Readonly<CoreState>,
  playerId: PersonId,
  contests: readonly FilingContest[],
  clerkId?: PersonId,
  /** The office that takes these filings, as its record names it. */
  filedWith?: string,
): FilingVisit {
  const visit: FilingVisit = {
    playerId,
    ...(clerkId ? { clerkId } : {}),
    contests,
    lines: [],
    choices: [],
  };
  // The clerk greets the player by the town and the office they are in, and
  // says who they are where the records name the clerk.
  const greet = visitLine(core, visit, "clerk", "greet-counter", {
    ...placeFact(core, playerId),
    // An office the record names only as a choice ("City or town clerk")
    // is no name a clerk says of their own office; the town is said instead.
    ...(filedWith && !/ or /i.test(spokenOffice(filedWith))
      ? {
          where: {
            text: titleInSentence(spokenOffice(filedWith)),
            sourceRecordIds: contests.map((row) => row.id),
          },
        }
      : {}),
    ...clerkFact(core, clerkId),
  });
  if (greet) visit.lines.push({ speaker: "clerk", ...greet });
  for (const contest of contests) {
    const line = visitLine(
      core,
      visit,
      "player",
      "pick-office",
      {
        office: {
          text: seatSaid(contest.seat ?? { title: contest.title }),
          sourceRecordIds: [contest.id],
        },
      },
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

/**
 * The filing office as a clerk names it: the research note's first office,
 * without its asides. The note reads "Town clerk (party endorsements by town
 * committee/caucus; petitions certified by registrars of voters)" or "State
 * party chair (party candidates); Secretary of State (independents)"; a
 * person names the office.
 */
export function spokenOffice(note: string): string {
  const first = note.split(/\s*[;(]|\s+\/\s+|,\s/)[P.zero]!.trim();
  return first || note.trim();
}

/**
 * A title as it is said inside a sentence: one the record capitalizes only at
 * its start ("Town clerk") is a common noun ("the town clerk"); one with
 * proper names ("Secretary of State") stays as written.
 */
export function titleInSentence(title: string): string {
  return /^\S+( [a-z]+)*$/.test(title)
    ? `${title.charAt(zero).toLowerCase()}${title.slice(one)}`
    : title;
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
    ...placeFact(core, visit.playerId),
    ...clerkFact(core, visit.clerkId),
    ...raceFacts(core, contest, ids),
    deadline: {
      text: spokenDate(contest.filingDeadline, core.date),
      sourceRecordIds: ids,
    },
    where: {
      text: titleInSentence(spokenOffice(terms.filedWith)),
      sourceRecordIds: ids,
    },
  };
  // The clerk tells the candidate about the race before the paperwork
  // (owner, Oct 28 sitting, 32: "you're running for Trustee ... the primary
  // is this date and the general is this date ... here is what a trustee
  // does, here is the term"), from the contest's records, as one answer in
  // connected sentences, never a list of facts (owner, Nov 1: "it shouldn't
  // read as a list. That's not how normal people talk.").
  const told = [
    ...raceTold(core, visit, contest, facts),
    visitLine(core, visit, "clerk", "tell-deadline", facts),
  ].filter((line) => line !== null);
  if (told.length)
    visit.lines.push({
      speaker: "clerk",
      text: told.map((line) => line.text).join(" "),
      sourceRecordIds: [
        ...new Set(told.flatMap((line) => line.sourceRecordIds)),
      ],
    });

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
  visit.picked = { contestId, facts, asked: [] };
  // A rule stops the filing: the player takes the refusal, in their own
  // words; the transcript shows only the line they chose.
  if (unmet.length) {
    const line = visitLine(core, visit, "player", "accept-terms", facts);
    if (line)
      visit.choices.push({
        key: "accept",
        text: line.text,
        control: "acknowledge",
        action: { kind: "done" },
        sourceRecordIds: line.sourceRecordIds,
      });
    return visit;
  }
  offerReplies(core, visit);
  return visit;
}

/**
 * The player's replies once the clerk has told the race, up to four, each a
 * different move about it: file (agree), ask who else has filed (ask), ask
 * about the dates (tell), and leave without filing (leave). A question asked
 * is not offered again.
 */
const REPLIES: readonly {
  move: string;
  key: string;
  control: FilingVisit["choices"][number]["control"];
  action: (contestId: string) => FilingAction;
  about?: CounterQuestion;
}[] = [
  {
    move: "agree",
    key: "file",
    control: "file",
    action: (contestId) => ({ kind: "file", contestId }),
  },
  {
    move: "ask",
    key: "ask-filed",
    control: "ask",
    about: "filed",
    action: (contestId) => ({ kind: "ask", contestId, about: "filed" }),
  },
  {
    move: "tell",
    key: "ask-dates",
    control: "ask",
    about: "dates",
    action: (contestId) => ({ kind: "ask", contestId, about: "dates" }),
  },
  {
    move: "leave",
    key: "leave",
    control: "leave",
    action: () => ({ kind: "done" }),
  },
];

function offerReplies(core: Readonly<CoreState>, visit: FilingVisit): void {
  const picked = visit.picked!;
  visit.choices = [];
  const said = new Set<string>();
  for (const reply of REPLIES) {
    if (reply.about && picked.asked.includes(reply.about)) continue;
    const line = visitLine(
      core,
      visit,
      "player",
      reply.move,
      picked.facts,
      `${visit.playerId}:${core.date}:${picked.contestId}:${reply.key}:${picked.asked.length}`,
      said,
      "reply",
    );
    if (line)
      visit.choices.push({
        key: reply.key,
        text: line.text,
        control: reply.control,
        action: reply.action(picked.contestId),
        sourceRecordIds: line.sourceRecordIds,
      });
  }
}

/** The move each question is, the clerk's answer to it answers. */
const QUESTION_MOVE: Readonly<Record<CounterQuestion, string>> = {
  filed: "ask",
  dates: "tell",
};

/**
 * The player asks the clerk about the race: who else has filed, answered
 * from the elections engine's filings, or the dates, answered from the
 * contest's record. Then the replies left are offered again.
 */
export function askAtCounter(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  key: string,
): FilingVisit {
  const choice = visit.choices.find((row) => row.key === key);
  if (!choice || choice.action.kind !== "ask" || !visit.picked)
    throw new Error(`Not an offered question: ${key}`);
  const about = choice.action.about;
  visit.lines.push({
    speaker: "player",
    text: choice.text,
    sourceRecordIds: choice.sourceRecordIds,
  });
  const line = visitLine(
    core,
    visit,
    "clerk",
    "answer",
    visit.picked.facts,
    undefined,
    new Set(),
    "follow",
    QUESTION_MOVE[about],
  );
  if (line) visit.lines.push({ speaker: "clerk", ...line });
  visit.picked = {
    ...visit.picked,
    asked: [...visit.picked.asked, about],
  };
  offerReplies(core, visit);
  return visit;
}

/**
 * The player has filed: their own words, then the clerk takes the papers and
 * sends them off with the day that counts next, from the contest's record.
 * The petition is the clerk's next scene, staged from the filing's record.
 */
export function filedAtCounter(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  choice: FilingVisit["choices"][number],
): FilingVisit {
  visit.lines.push({
    speaker: "player",
    text: choice.text,
    sourceRecordIds: choice.sourceRecordIds,
  });
  const facts = visit.picked?.facts ?? {};
  const said = new Set<string>();
  const told = [
    visitLine(
      core,
      visit,
      "clerk",
      "accept",
      facts,
      undefined,
      said,
      "follow",
      "agree",
    ),
    visitLine(core, visit, "clerk", "thank", facts, undefined, said, "close"),
  ].filter((line) => line !== null);
  if (told.length)
    visit.lines.push({
      speaker: "clerk",
      text: told.map((line) => line.text).join(" "),
      sourceRecordIds: [
        ...new Set(told.flatMap((line) => line.sourceRecordIds)),
      ],
    });
  visit.choices = [];
  return visit;
}

/** The player's town, as people name it, from the place record. */
function placeFact(
  core: Readonly<CoreState>,
  playerId: PersonId,
): Record<string, Fact> {
  const person = core.people.get(playerId);
  const town = person
    ? corePlaceByJurisdictionId(person.placeId as never)
    : null;
  return town
    ? { place: { text: spoken(town), sourceRecordIds: [person!.placeId] } }
    : {};
}

/** The clerk by name, where the filing office's records name one. */
function clerkFact(
  core: Readonly<CoreState>,
  clerkId: PersonId | undefined,
): Record<string, Fact> {
  const clerk = clerkId ? core.people.get(clerkId) : undefined;
  return clerk
    ? {
        name: {
          text: `${clerk.givenName} ${clerk.familyName}`,
          sourceRecordIds: [clerk.id],
        },
        // Spoken to, the clerk is called by first name.
        clerk: { text: clerk.givenName, sourceRecordIds: [clerk.id] },
      }
    : {};
}

/**
 * What the clerk says about the race, in order: the office, then the term and
 * the dates in one breath, then the work.
 */
const RACE_MOVES = ["tell-running", "tell-race", "tell-duty"];

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
  step: SceneTalkStep = "state",
  /** The move this line answers, for a clerk's answer to a question. */
  after?: string,
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
      ...(after ? { after } : {}),
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

/**
 * What the contest's records say about the race: the office, its dates, the
 * term, the kind of office and its body, and who else has filed for it so far.
 */
function raceFacts(
  core: Readonly<CoreState>,
  contest: FilingContest,
  ids: readonly string[],
): Record<string, Fact> {
  const fact = (text: string) => ({ text, sourceRecordIds: ids });
  // The seat as people say it: in full the first time a screen says it
  // (`office`: "the Mutual Village Council", "mayor"), short after (`seat`:
  // "the council"); never the form's title with its parenthesis.
  const record = contest.seat ?? { title: contest.title };
  const facts: Record<string, Fact> = {
    office: fact(seatSaid(record)),
    seat: fact(seatSaid(record, { first: false })),
  };
  if (contest.electionDate)
    facts.general = fact(spokenDate(contest.electionDate, core.date));
  if (contest.primaryDate)
    facts.primary = fact(spokenDate(contest.primaryDate, core.date));
  else if (contest.electionDate) facts["no-primary"] = fact("yes");
  if (contest.termYears) facts.term = fact(String(contest.termYears));
  if (contest.kind) facts[`office-${contest.kind}`] = fact("yes");
  if (contest.body)
    facts.body = {
      text: contest.body.name,
      sourceRecordIds: [contest.body.recordId],
    };
  // Who else has filed, from the elections engine's filings: how many, and
  // the first of them by name; or that nobody has yet.
  const filed = contest.filed;
  if (filed && filed.count > zero) {
    facts.filed = {
      text: filedSaid(filed.count),
      sourceRecordIds: [contest.id, ...filed.recordIds],
    };
    if (filed.first)
      facts.opponent = {
        text: filed.first.name,
        sourceRecordIds: [contest.id, filed.first.recordId],
      };
  } else if (filed)
    facts["none-filed"] = { text: "yes", sourceRecordIds: [contest.id] };
  return facts;
}

function raceTold(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  contest: FilingContest,
  facts: Readonly<Record<string, Fact>>,
): { text: string; sourceRecordIds: readonly string[] }[] {
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
  /**
   * The player's filing at this counter, when there is one: still gathering
   * signatures, they are back with the petition; already on the ballot, they
   * are back with nothing left to bring. Without one, this is their first
   * visit, to ask for the papers (owner, Nov 1: "You filled out the forms
   * there").
   */
  filing?: { id: string; status: string } | null,
  /** The minute of the day the player walks in, so the narrator can name the day. */
  minuteOfDay?: number,
): { text: string; sourceRecordIds: readonly string[] }[] {
  const person = visit.clerkId ? core.people.get(visit.clerkId) : undefined;
  if (!person) return [];
  const facts: Record<string, Fact> = {
    ...(minuteOfDay !== undefined
      ? {
          begins: {
            text: dayOpening(core.date, minuteOfDay),
            sourceRecordIds: [clerk.recordId],
          },
        }
      : {}),
    ...(filing
      ? {
          [filing.status === "petitioning" ? "returning" : "on-ballot"]: {
            text: "yes",
            sourceRecordIds: [filing.id],
          },
        }
      : {
          "first-visit": {
            text: "yes",
            sourceRecordIds: visit.contests.map((row) => row.id),
          },
        }),
    name: {
      text: `${person.givenName} ${person.familyName}`,
      sourceRecordIds: [person.id],
    },
    // A title the record capitalizes only at its start ("County clerk") is said
    // in running text as a common noun; one with proper names stays as written.
    post: {
      text: titleInSentence(clerk.title),
      sourceRecordIds: [clerk.recordId],
    },
  };
  if (visit.contests.length === one)
    facts.office = {
      text: seatSaid(
        visit.contests[zero]!.seat ?? { title: visit.contests[zero]!.title },
      ),
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
