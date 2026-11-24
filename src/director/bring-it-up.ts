/**
 * People bring it up (M4-05). A person mentions a change they learned of and
 * who they believe caused it, and that belief follows only what they heard:
 * a blame someone told them (which can be wrong), the record they saw (the
 * business its closure names), or, with neither, someone they know holds a
 * public role, when their temperament runs to blaming authority. Telling it
 * passes the change and the blame on, so the next person's belief follows
 * this one's words. The director says which change and which blame; the
 * English engine (`src/english/bring-it-up-words.ts`) words them.
 */
import { P } from "../core2/parameters";
import { newsKey, storyOfReadEvent } from "../core2/modules/news";
import {
  PRESS_MODULE_ID,
  outletMedium,
  outletsHere,
  printedStoryOf,
} from "../core2/modules/press";
import { LEGISLATURE_MODULE_ID, billOf } from "../core2/modules/legislature";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { decisionLean } from "../core2/trait-decisions";
import { partyLean } from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
import {
  ballotOf,
  resultOf,
  voterLean,
  winningPersonId,
} from "../core2/modules/voting";
import type { CoreState, PersonId, PersonState, Source } from "../core2/types";
import { storyTopicName } from "../english/policy-names";
import {
  wordBringMove,
  type BillOutcome,
  type BlameHow,
  type BringMove,
  type BringWords,
  type LeanSide,
} from "../english/bring-it-up-words";
import rowsJson from "./data/bring-it-up-rows.json" with { type: "json" };
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import { seatFact } from "./sitting-ties";
import { organizationName, possessive } from "./words";

/** `data/bring-it-up-rows.json`: the structure, holding no sentences. */
export interface BringRows {
  version: string;
  toldEvent: string;
  heardKey: string;
  blameKey: string;
  changes: readonly {
    eventKind: string;
    institutionFact: { prefix: string; suffix: string };
    story?: boolean;
    eventIdPrefix?: string;
  }[];
  blame: readonly Attribution["how"][];
}
export const BRING_IT_UP_ROWS = rowsJson as unknown as BringRows;

export interface KnownChange {
  eventId: string;
  /** The change row it matched (its event kind); heard changes keep the first. */
  kind: string;
  institutionId: string;
  learnedAt: string;
  /** "seen" from the record itself, or "heard" from someone. */
  route: "seen" | "heard";
}

export interface Attribution {
  eventId: string;
  how: BlameHow;
  blamedId?: string;
  /** The record the belief came from: a told event, the change, a public role. */
  sourceId?: string;
}

/** The changes a person learned of, newest first. */
export function changesKnownTo(
  core: Readonly<CoreState>,
  personId: PersonId,
  data: BringRows = BRING_IT_UP_ROWS,
): KnownChange[] {
  const known = core.knowledgeByPerson.get(personId);
  if (!known) return [];
  const out = new Map<string, KnownChange>();
  for (const fact of known.values()) {
    for (const change of data.changes) {
      const { prefix, suffix } = change.institutionFact;
      if (
        fact.key.startsWith(prefix) &&
        fact.key.endsWith(suffix) &&
        fact.access === "perceived"
      )
        out.set(fact.sourceId, {
          eventId: fact.sourceId,
          kind: change.eventKind,
          // A story's fact is kept per story read and holds the outlet that
          // printed it; another change's fact is named for its institution.
          institutionId: change.story
            ? fact.value
            : fact.key.slice(prefix.length, fact.key.length - suffix.length),
          learnedAt: fact.learnedAt,
          route: "seen",
        });
    }
    if (fact.key.startsWith(`${data.heardKey}:`)) {
      const eventId = fact.key.slice(data.heardKey.length + P.one);
      if (!out.has(eventId))
        out.set(eventId, {
          eventId,
          kind: (
            data.changes.find(
              (row) =>
                row.eventIdPrefix && eventId.startsWith(row.eventIdPrefix),
            ) ?? data.changes[P.zero]!
          ).eventKind,
          institutionId: fact.value,
          learnedAt: fact.learnedAt,
          route: "heard",
        });
    }
  }
  return [...out.values()].sort(
    (a, b) =>
      b.learnedAt.localeCompare(a.learnedAt) ||
      a.eventId.localeCompare(b.eventId),
  );
}

/** Whether a person's traits lean toward blaming an official over withholding blame. */
export function leansToBlame(
  core: Pick<CoreState, "data">,
  person: Pick<PersonState, "traits">,
): boolean {
  return (
    decisionLean(
      core,
      person,
      "bring-it-up.blame",
      "blame-official",
      "withhold-blame",
    ) > P.zero
  );
}

/** Who a person believes caused a change, from what they heard. */
export function believedCause(
  core: Readonly<CoreState>,
  personId: PersonId,
  change: KnownChange,
  data: BringRows = BRING_IT_UP_ROWS,
): Attribution {
  const known = core.knowledgeByPerson.get(personId);
  const told = known?.get(`${data.blameKey}:${change.eventId}`);
  if (told)
    return {
      eventId: change.eventId,
      how: "told",
      blamedId: told.value,
      sourceId: told.sourceId,
    };
  if (change.route === "seen")
    return {
      eventId: change.eventId,
      how: "record",
      blamedId: change.institutionId,
      sourceId: change.eventId,
    };
  // Heard only that it happened: someone whose traits lean more toward
  // blaming authority than withholding blame puts it on the public figure
  // they know of (every trait, through the shared trait table).
  const person = core.people.get(personId);
  if (person && leansToBlame(core, person)) {
    const official = [...(known?.values() ?? [])]
      .filter(
        (fact) =>
          fact.key.endsWith(":public-role") && fact.key.startsWith("person:"),
      )
      .sort(
        (a, b) =>
          b.learnedAt.localeCompare(a.learnedAt) || a.key.localeCompare(b.key),
      )[P.zero];
    if (official)
      return {
        eventId: change.eventId,
        how: "assumed",
        blamedId: official.key.slice(
          "person:".length,
          official.key.length - ":public-role".length,
        ),
        sourceId: official.sourceId,
      };
  }
  return { eventId: change.eventId, how: "unknown" };
}

function nameOf(core: Readonly<CoreState>, id: string): string | null {
  const org = core.organizations.get(id);
  if (org) return organizationName(org);
  const person = core.people.get(id);
  return person ? `${person.givenName} ${person.familyName}` : null;
}

/** The vote on the listener's own bill a story printed, and how it came out. */
function ownBillVote(
  core: Readonly<CoreState>,
  api: ReturnType<typeof coreAPI>,
  change: KnownChange,
  listenerId: PersonId,
): { outcome: BillOutcome; form: string; recordId: string } | null {
  const storyId = storyOfReadEvent(change.eventId);
  const story = storyId ? printedStoryOf(api, storyId) : undefined;
  const record = story ? core.durableLog.get(story.wireId as never) : undefined;
  if (!record) return null;
  const facts = record.facts ?? {};
  const outcome: BillOutcome | null =
    record.kind === "bill-failed"
      ? "failed"
      : record.kind === "legislative-vote" &&
          facts.yes !== undefined &&
          facts.no !== undefined
        ? Number(facts.yes) > Number(facts.no)
          ? "passed"
          : "failed"
        : null;
  // What the bill is in its body (an ordinance, a bill), from its own row.
  const billId = String(facts.billId ?? "");
  const bill =
    billId && api.state.modules.has(LEGISLATURE_MODULE_ID)
      ? billOf(api, billId)
      : undefined;
  const form = bill?.form?.kind;
  // Theirs only when they sponsored it: a vote they merely cast on another's
  // bill is not "your ordinance".
  if (bill?.sponsorId !== listenerId) return null;
  return outcome && form ? { outcome, form, recordId: record.id } : null;
}

/** The kind of record a race's count writes (src/core2/modules/voting.ts). */
const ELECTION_RESULT = "election-result";

type LogRecord = NonNullable<ReturnType<CoreState["durableLog"]["get"]>>;

/** The count a printed story reports, when the story is a race's result. */
function electionResultOf(
  core: Readonly<CoreState>,
  api: ReturnType<typeof coreAPI>,
  eventId: string,
): LogRecord | null {
  const storyId = storyOfReadEvent(eventId);
  const story = storyId ? printedStoryOf(api, storyId) : undefined;
  const record = story ? core.durableLog.get(story.wireId as never) : undefined;
  return record?.kind === ELECTION_RESULT && record.facts?.winnerId
    ? record
    : null;
}

/**
 * The race results a person already knows: from a story they read about it,
 * or from someone who told them (the told record's heard key), by the
 * result's record id.
 */
export function resultsKnownTo(
  core: Readonly<CoreState>,
  api: ReturnType<typeof coreAPI>,
  personId: PersonId,
  data: Pick<BringRows, "heardKey"> = BRING_IT_UP_ROWS,
): Set<string> {
  const known = new Set<string>();
  for (const fact of core.knowledgeByPerson.get(personId)?.values() ?? []) {
    const storyId = fact.key.startsWith("news:printed:")
      ? fact.key.slice("news:".length)
      : fact.key.startsWith(`${data.heardKey}:`)
        ? storyOfReadEvent(fact.key.slice(data.heardKey.length + P.one))
        : null;
    const story = storyId ? printedStoryOf(api, storyId) : undefined;
    const record = story
      ? core.durableLog.get(story.wireId as never)
      : undefined;
    if (record?.kind === ELECTION_RESULT) known.add(record.id);
  }
  return known;
}

/** The race a result's seat belongs to: its own contest, then its race's. */
function raceContests(result: LogRecord): string[] {
  const facts = result.facts ?? {};
  return [
    ...new Set(
      [String(facts.contestId ?? ""), String(facts.race ?? "")].filter(Boolean),
    ),
  ];
}

/** Whether a person stood in the race a result counts. */
function stoodIn(result: LogRecord, personId: PersonId): boolean {
  if (result.personIds.includes(personId)) return true;
  try {
    return personId in JSON.parse(String(result.facts?.totals ?? "{}"));
  } catch {
    return false;
  }
}

/**
 * Where a person stands on a race's result: "with" when their own lean and
 * the winner's party lean are on the same side of the middle, "against" when
 * on opposite sides, and null for a person or a party in the middle (each
 * within the director's lean minimum of it), a winner with no party, or a
 * ballot that says otherwise (a vote for the winner is never "against").
 */
export function resultLean(
  core: Readonly<CoreState>,
  result: LogRecord,
  personId: PersonId,
): { side: LeanSide; votedForWinner: boolean; ballotId?: string } | null {
  const api = coreAPI(core as CoreState);
  const person = core.people.get(personId);
  const winnerId = String(result.facts?.winnerId ?? "");
  if (!person || !winnerId || !api.state.modules.has(ELECTIONS_MODULE_ID))
    return null;
  const contests = raceContests(result);
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  const winnerFiling = contests
    .flatMap((id) => filings.query("byContest", [id]) as unknown as FilingRow[])
    .find(
      (f) =>
        f.personId === winnerId ||
        winningPersonId(api, f.personId) === winnerId,
    );
  const party = partyLean(api, winnerFiling?.party)?.lean;
  if (party === undefined) return null;
  const own = voterLean(api, person);
  const minimum = DEFAULT_DIRECTOR_DATA.parameters.bringItUpLeanMinimum!.value;
  if (Math.abs(party) < minimum || Math.abs(own) < minimum) return null;
  const side: LeanSide =
    Math.sign(party) === Math.sign(own) ? "with" : "against";
  const ballot = contests
    .map((id) => ballotOf(api, id, personId))
    .find((row) => row?.voted);
  const picked = ballot
    ? (ballot.choices ?? (ballot.choice ? [ballot.choice] : [])).map((id) =>
        winningPersonId(api, id),
      )
    : [];
  const votedForWinner = picked.includes(winnerId);
  // The ballot is the record of what they did: someone who voted for the
  // winner is not against the result, and someone who voted for another is
  // not with it.
  if (side === "against" && votedForWinner) return null;
  if (side === "with" && picked.length && !votedForWinner) return null;
  return {
    side,
    votedForWinner,
    ...(ballot && votedForWinner ? { ballotId: ballot.id } : {}),
  };
}

type Said = { text: string; sourceRecordIds: readonly string[] };

/**
 * A race's result as the speaker tells it: the line that says who won, and,
 * for a speaker clearly with or against the winner's side, the line that
 * says how it sits with them. A line that claims a ballot, a side shared
 * with the listener is said only where the record holds it (the `ballot`
 * and `ourSide` facts its bank part requires).
 * Every telling names the seat once (Words lead, Nov 14). Told to a listener
 * who already knows the result, it is one line: who won what, and how it
 * sits with them (`known`; only a speaker with a lean raises it then).
 */
function electionLines(
  core: Readonly<CoreState>,
  result: LogRecord,
  speakerId: PersonId,
  listenerId: PersonId,
  subject: Said,
  outletId: string,
  known: boolean,
  say: (
    move: BringMove,
    facts: Record<string, Said>,
  ) => ReturnType<typeof wordBringMove>,
): [Said] | [Said, Said] | null {
  const winnerId = String(result.facts?.winnerId ?? "");
  const winnerName = nameOf(core, winnerId);
  if (!winnerName) return null;
  const winner = { text: winnerName, sourceRecordIds: [result.id, winnerId] };
  const lastName = core.people.get(winnerId)?.familyName ?? winnerName;
  const seat = seatFact(
    core,
    String(result.facts?.contestId ?? ""),
    result.id,
  ).seat;
  if (!seat) return null;
  // Where they read it stands on the result it reported, too.
  const paper = {
    ...subject,
    sourceRecordIds: [...subject.sourceRecordIds, result.id],
  };
  // How the outlet carried it: read in a paper, seen on television, heard on
  // the radio, from the outlet's own record.
  const outlet = core.modules.has(PRESS_MODULE_ID)
    ? outletsHere(coreAPI(core as CoreState)).find(
        (row) => row.organizationId === outletId,
      )
    : undefined;
  const medium = outlet ? outletMedium(outlet.kind) : null;
  const carried = medium
    ? { [medium]: { text: medium, sourceRecordIds: [outlet!.id] } }
    : {};
  const lean = resultLean(core, result, speakerId);
  const listener = lean ? resultLean(core, result, listenerId) : null;
  if (known && !lean) return null;
  const leanLine = lean
    ? say(
        { part: "lean", side: lean.side },
        {
          subject: paper,
          // Told as one line after who won, the feeling names them by
          // their last name ("I voted for Hill, so I'm not complaining.").
          winner: known ? { ...winner, text: lastName } : winner,
          lean: {
            text: lean.side,
            sourceRecordIds: [result.id, speakerId],
          },
          ...(lean.ballotId
            ? {
                ballot: {
                  text: winnerName,
                  sourceRecordIds: [lean.ballotId],
                },
              }
            : {}),
          ...(listener?.side === lean.side && lean.side === "with"
            ? {
                ourSide: {
                  text: lean.side,
                  sourceRecordIds: [result.id, listenerId],
                },
              }
            : {}),
        },
      )
    : null;
  if (known) {
    const told = say({ part: "election", form: "known" }, { winner, seat });
    if (!told || !leanLine) return null;
    return [
      {
        text: `${told.text} ${leanLine.text}`,
        sourceRecordIds: [
          ...new Set([...told.sourceRecordIds, ...leanLine.sourceRecordIds]),
        ],
      },
    ];
  }
  const named = !leanLine?.factKeys?.includes("winner");
  const told = say(
    { part: "election", form: named ? "named" : "unnamed" },
    named
      ? { subject: paper, winner, seat, ...carried }
      : { subject: paper, seat, ...carried },
  );
  if (!told) return null;
  return leanLine ? [told, leanLine] : [told];
}

export interface BroughtUp {
  lines: {
    text: string;
    sourceRecordIds: readonly string[];
    /** How the teller feels about the news, not the news itself. */
    feeling?: boolean;
  }[];
  change: KnownChange;
  attribution: Attribution;
  toldEventId: string;
  /** Who they blamed aloud, when the blame line is among the lines. */
  blamedId?: string;
  /** The race result the lines tell, when it is one: said in place of the story's headline. */
  resultId?: string;
}

/**
 * The speaker brings up the newest change they know of, and tells the
 * listener: the lines worded (`wordBringItUp`) and what they said reaching
 * the listener (`tellBroughtUp`).
 */
export function bringItUp(
  core: CoreState,
  speakerId: PersonId,
  listenerId: PersonId,
  options: { rows?: BringRows; words?: BringWords } = {},
): BroughtUp | null {
  const brought = wordBringItUp(core, speakerId, listenerId, options);
  if (brought) tellBroughtUp(core, speakerId, listenerId, brought, options);
  return brought;
}

/**
 * The lines the speaker would bring up the newest change they know of with,
 * worded and not yet said: nothing reaches the listener until the talk says
 * them (`tellBroughtUp`). A talk that passes the news over, or a room only
 * looked at, tells nobody anything (Account lead, Nov 15: the player was on
 * record as told a change and a blame nobody said).
 */
export function wordBringItUp(
  core: CoreState,
  speakerId: PersonId,
  listenerId: PersonId,
  options: { rows?: BringRows; words?: BringWords } = {},
): BroughtUp | null {
  const data = options.rows ?? BRING_IT_UP_ROWS;
  // The newest change they know of that can be put into words: a printed
  // story is remembered only when the catalog names its topic.
  const api = coreAPI(core);
  const storyTopic = (change: KnownChange): string | null => {
    const storyId = storyOfReadEvent(change.eventId);
    const story = storyId ? printedStoryOf(api, storyId) : undefined;
    const topic = story ? storyTopicName(story.topic) : null;
    return topic ? topic.toLowerCase() : null;
  };
  // A race's result is told by who won, so it needs no topic; it is not
  // told to someone who stood in that race (they know how it came out).
  // A result the listener already knows (they read it, or were told it) is
  // raised again only by someone with a lean, and only as how it sits with
  // them (Words lead, Nov 14: the whole town does not tell the same news).
  const knownResults = resultsKnownTo(core, api, listenerId, data);
  const electionFor = (change: KnownChange): LogRecord | null => {
    const result = electionResultOf(core, api, change.eventId);
    if (!result || stoodIn(result, listenerId)) return null;
    if (knownResults.has(result.id) && !resultLean(core, result, speakerId))
      return null;
    return result;
  };
  const speakable = (change: KnownChange) =>
    !!nameOf(core, change.institutionId) &&
    (!data.changes.find((row) => row.eventKind === change.kind)?.story ||
      storyTopic(change) !== null ||
      !!electionFor(change));
  // A story about the listener (a vote they cast, a bill they sponsored) is
  // what one brings up to them first; otherwise the newest change (the
  // owner's council member heard nothing of his own ordinance, Oct 29).
  const aboutListener = (known: KnownChange): boolean => {
    const storyId = storyOfReadEvent(known.eventId);
    const story = storyId ? printedStoryOf(api, storyId) : undefined;
    if (!story) return false;
    const record = core.durableLog.get(story.wireId as never);
    return (
      story.subjectIds.includes(listenerId) ||
      record?.facts?.sponsorId === listenerId
    );
  };
  const speakables = changesKnownTo(core, speakerId, data).filter(speakable);
  // What they read about the listener, by story: each story read is kept as
  // its own news fact, so a vote on the listener's bill printed beside newer
  // stories is still theirs to raise with them, the newest first.
  const storyRow = data.changes.find((row) => row.story);
  let readAbout: KnownChange | undefined;
  // The newest race result they read whose winner has not yet taken the
  // seat: until then it is the news of the town, brought up before an
  // ordinary story the same paper printed after it.
  let resultRead: KnownChange | undefined;
  for (const fact of core.knowledgeByPerson.get(speakerId)?.values() ?? []) {
    if (!storyRow || !fact.key.startsWith("news:printed:")) continue;
    if (fact.key.endsWith(":outlet")) continue;
    const storyId = fact.key.slice("news:".length);
    const story = printedStoryOf(api, storyId);
    if (!story) continue;
    const known: KnownChange = {
      eventId: `${storyRow.eventIdPrefix ?? `${storyRow.eventKind}:`}${storyId}:${fact.learnedAt}`,
      kind: storyRow.eventKind,
      institutionId: story.organizationId,
      learnedAt: fact.learnedAt,
      route: "seen",
    };
    // The vote on a bill the listener sponsored comes before a vote they
    // only cast on another's; then the newest.
    const ownRank = (change: KnownChange) =>
      ownBillVote(core, api, change, listenerId) ? P.one : P.zero;
    const result = electionFor(known);
    if (
      result &&
      (!resultRead || known.learnedAt > resultRead.learnedAt) &&
      raceContests(result).some(
        (id) => (resultOf(api, id)?.takesOffice ?? "") > core.date,
      ) &&
      speakable(known)
    )
      resultRead = known;
    if (
      aboutListener(known) &&
      speakable(known) &&
      (!readAbout ||
        ownRank(known) > ownRank(readAbout) ||
        (ownRank(known) === ownRank(readAbout) &&
          known.learnedAt > readAbout.learnedAt))
    )
      readAbout = known;
  }
  const change =
    readAbout ??
    speakables.find(aboutListener) ??
    resultRead ??
    speakables[P.zero];
  const subject = change ? nameOf(core, change.institutionId) : null;
  if (!change || !subject) return null;
  const attribution = believedCause(core, speakerId, change, data);
  const story = data.changes.find(
    (row) => row.eventKind === change.kind,
  )!.story;
  const say = (
    move: BringMove,
    facts: Record<string, { text: string; sourceRecordIds: readonly string[] }>,
  ) =>
    wordBringMove({
      seed: core.seed,
      move,
      speakerId,
      traits: core.people.get(speakerId)?.traits ?? {},
      facts,
      momentKey: `${speakerId}:${listenerId}:${change.eventId}:${core.date}`,
      fallbackSourceId: change.eventId,
      ...(options.words ? { words: options.words } : {}),
    });
  const lines: BroughtUp["lines"] = [];
  const topic = story ? storyTopic(change) : null;
  // A story's outlet is what the speaker holds of that story (its
  // news:<story>:outlet fact, read in print or told of it).
  const storyId = story ? storyOfReadEvent(change.eventId) : null;
  const facts = {
    subject: {
      text: subject,
      sourceRecordIds: [
        change.eventId,
        change.institutionId,
        ...(storyId ? [`${newsKey(storyId)}:outlet`] : []),
      ],
    },
    ...(topic
      ? { topic: { text: topic, sourceRecordIds: [change.eventId] } }
      : {}),
  };
  // A story about the listener's own bill is told as theirs, with how the
  // vote came out ("I read in the Courier that your ordinance on transit
  // failed."), from the vote's own record.
  const own =
    change === readAbout ? ownBillVote(core, api, change, listenerId) : null;
  // A race's result: who won, then how it sits with them, by their lean
  // against the winner's party. The winner is named once in the talk: when
  // the lean line names them, the line before it says only where they read
  // the results.
  const result = own ? null : electionFor(change);
  const election = result
    ? electionLines(
        core,
        result,
        speakerId,
        listenerId,
        facts.subject,
        change.institutionId,
        knownResults.has(result.id),
        say,
      )
    : null;
  const first =
    (election?.[P.zero] ??
      (own &&
        say(
          { part: "yours", outcome: own.outcome, form: own.form },
          {
            ...facts,
            subject: {
              ...facts.subject,
              sourceRecordIds: [...facts.subject.sourceRecordIds, own.recordId],
            },
          },
        ))) ||
    say({ part: "change", eventKind: change.kind }, facts);
  // A known result is told in one line that ends on the feeling.
  if (first)
    lines.push(
      result && knownResults.has(result.id)
        ? { ...first, feeling: true }
        : first,
    );
  const leanLine = election?.[P.one];
  if (leanLine) lines.push({ ...leanLine, feeling: true });
  // A printed story blames no one: the outlet only printed it. Someone who
  // holds no cause, or none they can name, says nothing more ("I have no
  // idea" answers nothing; owner, Nov 12, on non-replies): the change is
  // told alone.
  const who =
    attribution.blamedId && !story ? nameOf(core, attribution.blamedId) : null;
  const second =
    story || attribution.how === "unknown" || !who
      ? null
      : say(
          { part: "blame", how: attribution.how, named: !!who },
          who
            ? {
                who: {
                  text: who,
                  sourceRecordIds: [attribution.sourceId ?? change.eventId],
                },
                whose: {
                  text: possessive(who),
                  sourceRecordIds: [attribution.sourceId ?? change.eventId],
                },
              }
            : {},
        );
  if (second) lines.push(second);
  const toldEventId = `${data.toldEvent}:${speakerId}:${listenerId}:${change.eventId}:${core.date}`;
  return {
    lines,
    change,
    attribution,
    toldEventId,
    // A blame reaches the listener only when it is said aloud.
    ...(attribution.blamedId && second
      ? { blamedId: attribution.blamedId }
      : {}),
    ...(election && result ? { resultId: result.id } : {}),
  };
}

/**
 * A printed story the talk said as its topic reaches the listener as told,
 * the same record `tellBroughtUp` writes for the speaker's newest change: the
 * change the story's read event names, with no blame (none was said). Nothing
 * is written, and null returned, when the speaker knows no such change or the
 * listener already has it; else the told record's id.
 */
export function tellStorySaid(
  core: CoreState,
  speakerId: PersonId,
  listenerId: PersonId,
  storyId: string,
  options: { rows?: BringRows } = {},
): string | null {
  const data = options.rows ?? BRING_IT_UP_ROWS;
  const change = changesKnownTo(core, speakerId, data).find(
    (row) => storyOfReadEvent(row.eventId) === storyId,
  );
  if (!change) return null;
  if (
    core.knowledgeByPerson
      .get(listenerId)
      ?.has(`${data.heardKey}:${change.eventId}`)
  )
    return null;
  const toldEventId = `${data.toldEvent}:${speakerId}:${listenerId}:${change.eventId}:${core.date}`;
  tellBroughtUp(
    core,
    speakerId,
    listenerId,
    {
      lines: [],
      change,
      attribution: { eventId: change.eventId, how: "unknown" },
      toldEventId,
    },
    options,
  );
  return toldEventId;
}

/** What was said reaches the listener: the change, and the blame if it was said. */
export function tellBroughtUp(
  core: CoreState,
  speakerId: PersonId,
  listenerId: PersonId,
  brought: BroughtUp,
  options: { rows?: BringRows } = {},
): void {
  const data = options.rows ?? BRING_IT_UP_ROWS;
  const { change } = brought;
  const speaker = core.people.get(speakerId)!;
  const source: Source = {
    tag: "SOURCED",
    citation:
      "Recorded conversation: a person brought up a change and who they believe caused it.",
    asOf: core.date,
  };
  applyCoreEvent(core, {
    id: brought.toldEventId,
    date: core.date,
    kind: data.toldEvent,
    personIds: [listenerId],
    placeId: speaker.placeId,
    facts: {
      [`${data.heardKey}:${change.eventId}`]: change.institutionId,
      ...(brought.blamedId
        ? { [`${data.blameKey}:${change.eventId}`]: brought.blamedId }
        : {}),
    },
    source,
  });
}
