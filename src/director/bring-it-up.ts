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
import { storyOfReadEvent } from "../core2/modules/news";
import { printedStoryOf } from "../core2/modules/press";
import { LEGISLATURE_MODULE_ID, billOf } from "../core2/modules/legislature";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { decisionLean } from "../core2/trait-decisions";
import type { CoreState, PersonId, PersonState, Source } from "../core2/types";
import { storyTopicName } from "../english/policy-names";
import {
  wordBringMove,
  type BillOutcome,
  type BlameHow,
  type BringMove,
  type BringWords,
} from "../english/bring-it-up-words";
import rowsJson from "./data/bring-it-up-rows.json" with { type: "json" };
import { possessive, properName } from "./words";

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
          institutionId: fact.key.slice(
            prefix.length,
            fact.key.length - suffix.length,
          ),
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
  if (org) return properName(org.name);
  const person = core.people.get(id);
  return person ? `${person.givenName} ${person.familyName}` : null;
}

/** The vote on the listener's own bill a story printed, and how it came out. */
function ownBillVote(
  core: Readonly<CoreState>,
  api: ReturnType<typeof coreAPI>,
  change: KnownChange,
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
  return outcome && form ? { outcome, form, recordId: record.id } : null;
}

export interface BroughtUp {
  lines: { text: string; sourceRecordIds: readonly string[] }[];
  change: KnownChange;
  attribution: Attribution;
  toldEventId: string;
}

/** The speaker brings up the newest change they know of, and tells the listener. */
export function bringItUp(
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
  const speakable = (change: KnownChange) =>
    !!nameOf(core, change.institutionId) &&
    (!data.changes.find((row) => row.eventKind === change.kind)?.story ||
      storyTopic(change) !== null);
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
  // What they read about the listener, by story: an outlet's latest story
  // replaces the one before it, but each story read is kept as its own
  // news fact, so a vote on the listener's bill printed beside newer stories
  // is still theirs to raise with them, the newest first.
  const storyRow = data.changes.find((row) => row.story);
  let readAbout: KnownChange | undefined;
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
    if (
      aboutListener(known) &&
      speakable(known) &&
      (!readAbout || known.learnedAt > readAbout.learnedAt)
    )
      readAbout = known;
  }
  const change = readAbout ?? speakables.find(aboutListener) ?? speakables[0];
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
  const lines = [];
  const topic = story ? storyTopic(change) : null;
  const facts = {
    subject: {
      text: subject,
      sourceRecordIds: [change.eventId, change.institutionId],
    },
    ...(topic
      ? { topic: { text: topic, sourceRecordIds: [change.eventId] } }
      : {}),
  };
  // A story about the listener's own bill is told as theirs, with how the
  // vote came out ("I read in the Courier that your ordinance on transit
  // failed."), from the vote's own record.
  const own = change === readAbout ? ownBillVote(core, api, change) : null;
  const first =
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
      )) ||
    say({ part: "change", eventKind: change.kind }, facts);
  if (first) lines.push(first);
  // A printed story blames no one: the outlet only printed it.
  const who =
    attribution.blamedId && !story ? nameOf(core, attribution.blamedId) : null;
  const second = story
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
  // What was said reaches the listener: the change, and the blame if any.
  const speaker = core.people.get(speakerId)!;
  const source: Source = {
    tag: "SOURCED",
    citation:
      "Recorded conversation: a person brought up a change and who they believe caused it.",
    asOf: core.date,
  };
  const toldEventId = `${data.toldEvent}:${speakerId}:${listenerId}:${change.eventId}:${core.date}`;
  applyCoreEvent(core, {
    id: toldEventId,
    date: core.date,
    kind: data.toldEvent,
    personIds: [listenerId],
    placeId: speaker.placeId,
    facts: {
      [`${data.heardKey}:${change.eventId}`]: change.institutionId,
      ...(attribution.blamedId
        ? { [`${data.blameKey}:${change.eventId}`]: attribution.blamedId }
        : {}),
    },
    source,
  });
  return { lines, change, attribution, toldEventId };
}
