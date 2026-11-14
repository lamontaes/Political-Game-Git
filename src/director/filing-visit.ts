/**
 * The filing visit (golden path step 3): the player at the office that takes
 * filings, where that place's records say it is. The clerk asks which office,
 * states the deadline from the record, explains each
 * rule that stops the filing, and otherwise offers the ways to file. The
 * records are GOV's (`openContests`, `filingOfficeFor`, `checkEligibility`),
 * passed in as plain data; the filing itself is GOV's `fileCandidacy`. The
 * visit says which move each line makes and the facts it stands on; the
 * English engine words it from the filing-clerk scene's own pieces
 * (`wordSceneMove`), the one word maker every scene uses. Once a race is
 * named, the talk is one scene of the scene engine (`composeSceneTalk`, the
 * `filing-clerk` arc): the clerk tells the race, the player files, asks or
 * leaves, and each reply is a `scene.reply` record. Filing ends it; the
 * clerk's talk about the petition is the director's `filing` scene, staged
 * from the filing's record, so the clerk says it once.
 */
import { P } from "../core2/parameters";
import { applyCoreEvent } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import {
  composeSceneTalk,
  type PurposeType,
  type TreeNode,
} from "./scene-talk";
import { spoken, spokenDate, spokenWhen } from "./words";
import {
  wordSceneMove,
  type Fact,
  type SceneTalkStep,
} from "../english/scene-talk-words";
import { dayOpening } from "../english/day-words";
import { filedSaid, filedSoFarSaid } from "../english/count-words";
import { seatSaid, type SeatRecord } from "../english/journal-words";
import { agencyHeadSaid, counterSaid } from "../english/said-as";
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
    first?: { name: string; recordId: string; filedOn?: string };
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
  /** A reply in the clerk's scene that is not filing or leaving: its place among the replies offered. */
  | { kind: "say"; contestId: string; index: number }
  | { kind: "done" };

export interface FilingVisit {
  playerId: PersonId;
  clerkId?: PersonId;
  contests: readonly FilingContest[];
  /**
   * The race the player named, with the facts the clerk speaks from, and the
   * path of replies chosen through the clerk's scene so far.
   */
  picked?: {
    contestId: string;
    facts: Readonly<Record<string, Fact>>;
    path: readonly number[];
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
    /** The move the reply makes in the clerk's scene (agree, ask, confront, leave). */
    move?: string;
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
  /**
   * The player's own filing at this counter, when they are back for another
   * race: the clerk who took it does not introduce themself again and opens
   * from it (Fable A, Nov 13: "Back again? Your papers for {office} are in.").
   */
  back?: { filingId: string; seat: SeatRecord },
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
  const greet = back
    ? visitLine(core, visit, "clerk", "greet-back", {
        "filed-office": {
          text: seatSaid(back.seat, { asMember: true }),
          sourceRecordIds: [back.filingId],
        },
        ...clerkFact(core, clerkId),
      })
    : visitLine(core, visit, "clerk", "greet-counter", {
        ...placeFact(core, playerId),
        // An office the record names only as a choice ("City or town clerk") is
        // said as the place's own kind; where the records do not settle it, the
        // town is said instead.
        ...(filedWith && saidOffice(filedWith, contests)
          ? {
              where: {
                text: titleInSentence(saidOffice(filedWith, contests)!),
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
          text: seatSaid(contest.seat ?? { title: contest.title }, {
            asMember: true,
          }),
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
 * person names the office. Whose county or town it is ("of the candidate's
 * home county", "in the candidate's city or town") is the research note's
 * gloss, never said aloud (P1, Richburg, South Carolina, Nov 13, rule 8).
 */
export function spokenOffice(note: string): string {
  // An aside inside the name ("County (local) board of elections") is
  // dropped, not where the name ends.
  const parts = note
    .replace(/\s*\([^)]*\)(?=\s+(?!and\b|or\b)[a-z])/g, "")
    .split(/\s*[;(]|\s+\/\s+|,\s/);
  const first = parts[P.zero]!.replace(
    /\s+(?:of|in) the candidate's\b.*$/i,
    "",
  ).trim();
  return first || note.trim();
}

/**
 * The filing office as the place says it. A research note that names a choice
 * ("City or town clerk") is settled by the kind of place the races here are
 * for, read from their own names ("Town of Wareham Select Board": the town
 * clerk; Fable A, Nov 13, rule 8). Null when the records do not settle it.
 */
export function saidOffice(
  note: string,
  races: readonly {
    title: string;
    seat?: { bodyName?: string | null } | null;
  }[],
): string | null {
  const office = spokenOffice(note);
  const choice = /^(?<one>\w+) or (?<other>\w+) (?<rest>.+)$/i.exec(
    office,
  )?.groups;
  if (!choice) return / or /i.test(office) ? null : office;
  const kind = races
    .map(
      (race) =>
        /\b(?<kind>Town|City|Village|Borough) of\b/.exec(
          `${race.seat?.bodyName ?? ""} ${race.title}`,
        )?.groups?.kind,
    )
    .find((word) => word !== undefined);
  if (!kind) return null;
  const word = [choice.one!, choice.other!].find(
    (option) => option.toLowerCase() === kind.toLowerCase(),
  );
  return word ? `${kind} ${choice.rest!}` : null;
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
    // "In {place}" is the town only for a town's seat filed at another
    // government's counter (Words lead, Nov 14: "for the senate in Edgar").
    ...seatPlaceFact(core, visit.playerId, contest),
    ...clerkFact(core, visit.clerkId),
    ...raceFacts(core, contest, ids),
    deadline: {
      text: spokenDate(contest.filingDeadline, core.date),
      sourceRecordIds: ids,
    },
    ...(saidOffice(terms.filedWith, visit.contests)
      ? {
          where: {
            text: titleInSentence(saidOffice(terms.filedWith, visit.contests)!),
            sourceRecordIds: ids,
          },
        }
      : {}),
  };
  visit.choices = [];
  visit.picked = { contestId, facts, path: [] };
  // The clerk tells the candidate about the race before the paperwork
  // (owner, Oct 28 sitting, 32: "you're running for Trustee ... the primary
  // is this date and the general is this date ... here is what a trustee
  // does, here is the term"), from the contest's records, as one answer in
  // connected sentences, never a list of facts (owner, Nov 1: "it shouldn't
  // read as a list. That's not how normal people talk."): the statement of
  // the clerk's scene, and its replies are the player's choices.
  const talk = clerkScene(core, visit);
  if (talk) visit.lines.push(clerkSaid(talk.state));
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
      // Where the records put them, when they say a place; "somewhere else"
      // only when they do not (T47's line lost the found place).
      ...(check.rule === "residency" && !/^lives /.test(actual)
        ? { actual: { text: actual, sourceRecordIds: [visit.playerId] } }
        : check.rule === "residency"
          ? { "no-actual": { text: "yes", sourceRecordIds: [visit.playerId] } }
          : { actual: { text: actual, sourceRecordIds: [visit.playerId] } }),
    });
    if (line) visit.lines.push({ speaker: "clerk", ...line });
  }
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
  if (talk) {
    for (const line of talk.tree.lines) visit.lines.push(clerkSaid(line));
    offerReplies(visit, talk.tree);
  }
  return visit;
}

/** The clerk's scene at the counter: the `filing-clerk` arc, cast by the records. */
const FILING_CLERK: PurposeType = {
  key: "filing-clerk",
  purpose: "filing-clerk",
  asker: "clerk",
  asked: "candidate",
  tag: { key: "routine", endpoint: "political" },
};

/**
 * The clerk's scene for the race named, from the visit's facts; the same
 * records give the same scene, so each step composes it again and follows
 * the path of replies chosen.
 */
function clerkScene(core: Readonly<CoreState>, visit: FilingVisit) {
  const picked = visit.picked;
  if (!picked) return null;
  const result = composeSceneTalk(
    core,
    undefined,
    {
      askerId: visit.clerkId ?? visit.playerId,
      askedId: visit.playerId,
      causeId: picked.contestId,
    },
    FILING_CLERK,
    picked.facts,
    {},
    // The counter narrates the clerk and the office as the player walks in.
    { setupTold: true },
  );
  return result.kind === "composed" ? result.talk : null;
}

/** A line of the clerk's scene as the counter shows it: who says it and its records. */
function clerkSaid(line: {
  role: string;
  text: string;
  slotRecordIds: readonly string[];
}): FilingVisit["lines"][number] {
  return {
    speaker: line.role === "asked" ? "player" : "clerk",
    text: line.text,
    sourceRecordIds: line.slotRecordIds,
  };
}

/**
 * The player's replies at a point in the clerk's scene: filing (agree),
 * leaving, and the others (asking, a rival) by their place among them.
 */
function offerReplies(visit: FilingVisit, node: TreeNode): void {
  const contestId = visit.picked!.contestId;
  visit.choices = node.replies.map((reply, index) => {
    const move = reply.line.move;
    const base = {
      text: reply.line.text,
      move,
      sourceRecordIds: reply.line.slotRecordIds,
    };
    if (move === "agree")
      return {
        ...base,
        key: "file",
        control: "file" as const,
        action: { kind: "file" as const, contestId },
      };
    if (move === "leave")
      return {
        ...base,
        key: "leave",
        control: "leave" as const,
        action: { kind: "done" as const },
      };
    return {
      ...base,
      key: `say:${index}`,
      control: "ask" as const,
      action: { kind: "say" as const, contestId, index },
    };
  });
}

/**
 * Follows a reply through the clerk's scene: the player's line, then what
 * follows it, then the replies offered next or nothing when the scene ends.
 * The reply is a `scene.reply` record, the kind every scene's reply is,
 * which the Journal and the next day's `filing` scene read.
 */
function followReply(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  index: number,
  filingId?: string,
): FilingVisit {
  const talk = clerkScene(core, visit);
  if (!talk) throw new Error("The clerk's scene cannot be worded here.");
  let node: TreeNode | null = talk.tree;
  for (const step of visit.picked!.path)
    node = node?.replies[step]?.next ?? null;
  const reply = node?.replies[index];
  if (!reply) throw new Error("Not an offered reply.");
  visit.lines.push(clerkSaid(reply.line));
  const next = reply.next;
  for (const line of next?.lines ?? []) visit.lines.push(clerkSaid(line));
  if (next?.end?.close) visit.lines.push(clerkSaid(next.end.close));
  const path = [...visit.picked!.path, index];
  visit.picked = { ...visit.picked!, path };
  recordReply(core, visit, reply.line, path, next?.end?.ending, filingId);
  visit.choices = [];
  if (next && !next.end) offerReplies(visit, next);
  return visit;
}

/** The reply as a record: the kind `replyInScene` writes for a scheduled scene. */
function recordReply(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  line: { move: string; text: string },
  path: readonly number[],
  ending?: { id: string; keeps: string },
  filingId?: string,
): void {
  const contestId = visit.picked!.contestId;
  const player = core.people.get(visit.playerId);
  if (!player || !visit.clerkId) return;
  applyCoreEvent(core as CoreState, {
    id: filingId
      ? counterFilingReplyId(filingId)
      : `scene-reply:filing-counter:${contestId}:${visit.playerId}:${path.join(".")}`,
    date: core.date,
    kind: "scene.reply",
    personIds: [visit.playerId, visit.clerkId],
    placeId: player.placeId,
    facts: {
      typeKey: FILING_CLERK.key,
      causeId: contestId,
      move: line.move,
      line: line.text,
      ...(filingId ? { filingId } : {}),
      ...(ending ? { ending: ending.id, keeps: ending.keeps } : {}),
    },
    source: {
      tag: "SOURCED",
      citation: "Recorded scene: the reply the player chose to say.",
      asOf: core.date,
    },
  });
}

/** The player says a reply in the clerk's scene that is not filing or leaving. */
export function sayAtCounter(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  key: string,
): FilingVisit {
  const choice = visit.choices.find((row) => row.key === key);
  if (!choice || choice.action.kind !== "say" || !visit.picked)
    throw new Error(`Not an offered reply: ${key}`);
  return followReply(core, visit, choice.action.index);
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
  /** The filing the elections engine took: the reply that filed is cited by it. */
  filingId?: string,
): FilingVisit {
  const index = visit.choices.indexOf(choice);
  return followReply(core, visit, index, filingId);
}

/**
 * The record of the reply that filed at the counter, by the filing it made:
 * the next day's `filing` scene reads it, so the clerk does not take the
 * papers a second time.
 */
export const counterFilingReplyId = (filingId: string) =>
  `scene-reply:filing-counter:${filingId}`;

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

/**
 * The "in {seat-place}" of a filing line's closer says the town only where a
 * town's seat is filed at another government's counter (a county or the
 * state); at the town's own counter, and for any seat above the town, no
 * place is said (Words lead, Nov 14, rule 100: "Your name's in for mayor.",
 * "for governor"). The town itself stays `place` for the lines that talk
 * about the town.
 */
function seatPlaceFact(
  core: Readonly<CoreState>,
  playerId: PersonId,
  contest: FilingContest,
): Record<string, Fact> {
  const level = contest.seat?.level;
  const townsOwn = !level || level === "city" || level === "township";
  const town = placeFact(core, playerId);
  return townsOwn && !contest.kind?.startsWith("municipalOffice") && town.place
    ? { ...town, "seat-place": town.place }
    : town;
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
    office: fact(seatSaid(record, { asMember: true })),
    seat: fact(seatSaid(record, { first: false, asMember: true })),
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
    // Before the player files, the count is said without "other".
    facts["filed-so-far"] = {
      text: filedSoFarSaid(filed.count),
      sourceRecordIds: [contest.id, ...filed.recordIds],
    };
    if (filed.first)
      facts.opponent = {
        text: filed.first.name,
        sourceRecordIds: [contest.id, filed.first.recordId],
      };
    // When the first of them filed, from their filing's record ("last week").
    if (filed.first?.filedOn)
      facts.when = {
        text: spokenWhen(filed.first.filedOn, core.date),
        sourceRecordIds: [filed.first.recordId],
      };
  } else if (filed)
    facts["none-filed"] = { text: "yes", sourceRecordIds: [contest.id] };
  return facts;
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
  clerk: { title: string; recordId: string; heads?: string },
  /**
   * The player's filing at this counter, when there is one: they are back
   * for another race. Without one, this is their first visit, to ask for the
   * papers (owner, Nov 1: "You filled out the forms there").
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
          // Back for another race while the first is filed: a return.
          "back-again": {
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
      text: clerk.heads
        ? agencyHeadSaid(clerk.heads)
        : titleInSentence(clerk.title),
      sourceRecordIds: [clerk.recordId],
    },
    // Where the player goes: the clerk's office, or the agency itself.
    counter: {
      text: counterSaid(titleInSentence(clerk.title), clerk.heads),
      sourceRecordIds: [clerk.recordId],
    },
  };
  if (visit.contests.length === one)
    facts.office = {
      text: seatSaid(
        visit.contests[zero]!.seat ?? { title: visit.contests[zero]!.title },
        { asMember: true },
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
