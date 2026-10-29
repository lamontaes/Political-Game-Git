import type { EntityId } from "../core2/kernel/brands";
import { spokenDate } from "../core2/kernel/dates";
import type { CoreState } from "../core2/types";
import { composeNewsStory, type StoryKind } from "../english/english-newscast";
import type { GroundedEnglishPacket } from "../english/grounded-english";
import { archivedFacts, printedFacts } from "./printed-words";
import type { ownRace } from "./results";
import { policyNames } from "./words";

/** A story as the news engine keeps it. */
interface StoredStory {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly facts: Readonly<Record<string, unknown>>;
}

export interface WordedStory {
  readonly headline?: string;
  readonly lede?: string;
  /** The lede and the sentences after it, when the record gives more to say. */
  readonly paragraphs?: readonly string[];
  /** A side item: a headline and one line, never paragraphs; the screen does not open it. */
  readonly brief?: true;
  readonly sourceRecordIds: readonly string[];
}

/**
 * The words for a story the press archived from the year before day one.
 * The press engine keeps the record (kind, winner, votes); the English engine
 * words it here from those facts: an election, a vote, a budget, a business
 * that closed or a parent who died, from the record itself (printed-words), and
 * a law enacted or taking effect by its name. Only a story the banks can say
 * gets words; the rest stay records until the banks grow.
 */

let NAMES: Record<string, string> | undefined;

export function wordArchiveStory(
  core: CoreState,
  story: StoredStory,
): WordedStory | null {
  if (story.kind !== "press.archived") return null;
  const recordKind = story.facts.recordKind;
  const ids = [story.id] as EntityId[];
  const fact = (text: string, more: readonly string[] = []) => ({
    text,
    sourceRecordIds: [...ids, ...more] as EntityId[],
  });
  if (recordKind === "law-enacted" || recordKind === "law-took-effect") {
    // A law is named by its series on the bill catalog; one with no name stays a record.
    NAMES ??= policyNames();
    const measure = NAMES[String(story.facts.series ?? "")];
    if (!measure) return null;
    return worded(core, story.id, "vote-or-law", story.id, {
      measure: fact(measure, [String(story.facts.lawId ?? "")]),
      date: fact(spokenDate(story.date)),
      [recordKind === "law-enacted" ? "enacted" : "effective"]: fact("yes"),
    });
  }
  // An election, a budget, a vote, a closing business and a parent who died
  // are told from their records as the paper tells them in play: a headline,
  // a first sentence and what else the record holds.
  const told = archivedFacts(core, story);
  return told
    ? worded(core, story.id, told.kind, told.speaker || story.id, told.facts)
    : null;
}

/** The paper each kind of outlet prints in: a paper's columns, or a station's page. */
const LAYOUTS: Readonly<Record<string, string>> = {
  newspaper: "broadsheet",
  "national-paper": "broadsheet",
  magazine: "modern",
  online: "modern",
  television: "modern",
  cable: "modern",
  radio: "modern",
};

/**
 * The words for a story the press printed during play, by the outlet that
 * printed it: the English engine words it from the record it was printed from
 * (printed-words), and News files it under that outlet's name.
 */
export function wordPrintedStory(
  core: CoreState,
  story: StoredStory & { readonly outletId?: string },
):
  | (WordedStory & { outlet?: { id: string; name: string; layout: string } })
  | null {
  const read = printedFacts(core, story);
  if (!read) return null;
  const text = worded(
    core,
    story.id,
    read.kind,
    read.speaker || story.id,
    read.facts,
  );
  if (!text) return null;
  const organization = story.outletId
    ? core.organizations.get(story.outletId as EntityId)
    : undefined;
  const kind = story.outletId?.split(":")[2] ?? "";
  return {
    ...text,
    ...(organization
      ? {
          outlet: {
            id: organization.id,
            name: organization.name,
            layout: LAYOUTS[kind] ?? "broadsheet",
          },
        }
      : {}),
  };
}

type StoryFact = { text: string; sourceRecordIds: EntityId[] };

/** One story worded by the English engine from its record's facts. */
function worded(
  core: CoreState,
  storyId: string,
  kind: StoryKind,
  speaker: string,
  facts: Record<string, StoryFact>,
): WordedStory | null {
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `archive-news:${storyId}`,
    worldSeed: core.seed,
    bankVersion: "words-newscast-v1",
    stage: "default",
    sourceRecordIds: [storyId as EntityId],
    facts,
    speaker: { personId: speaker as EntityId, traits: {} },
    knowledge: Object.entries(facts).map(([factKey, row]) => ({
      personId: speaker as EntityId,
      factKey,
      sourceRecordIds: row.sourceRecordIds,
    })),
  };
  const composed = composeNewsStory(packet, kind);
  if (!composed.headline && !composed.lede) return null;
  // A headline or sentence opens with a capital, whatever fact starts it.
  const opened = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  return {
    ...(composed.headline ? { headline: opened(composed.headline) } : {}),
    ...(composed.lede ? { lede: opened(composed.lede) } : {}),
    // The story's body as print sets it: the lede, then each sentence the
    // record gives it, so News prints a story, not only a brief.
    ...(composed.paragraphs && composed.paragraphs.length > 1
      ? { paragraphs: composed.paragraphs.map(opened) }
      : {}),
    ...(composed.brief ? { brief: true as const } : {}),
    sourceRecordIds: composed.sourceRecordIds,
  };
}

/**
 * The person's own newest race as the paper tells it, from the count's public
 * record: who won or lost the race for which office, and against whom.
 */
export function wordOwnResult(
  core: CoreState,
  race: NonNullable<ReturnType<typeof ownRace>>,
  personId: string,
) {
  const record = core.durableLog.get(race.recordId as EntityId);
  const person = core.people.get(personId);
  if (!record || !person) return null;
  const office = (record as { facts?: Record<string, unknown> }).facts?.office;
  const ids = [record.id] as EntityId[];
  const facts: Record<string, StoryFact> = {
    name: {
      text: `${person.givenName} ${person.familyName}`,
      sourceRecordIds: [...ids, person.id as EntityId],
    },
    [race.won ? "won" : "lost"]: { text: "yes", sourceRecordIds: ids },
    ...(typeof office === "string"
      ? { office: { text: office, sourceRecordIds: ids } }
      : {}),
    ...(race.rival
      ? {
          opponent: {
            text: race.rival.name,
            sourceRecordIds: [...ids, race.rival.id as EntityId],
          },
        }
      : {}),
  };
  const story = worded(core, record.id, "election", personId, facts);
  return (
    story && {
      id: record.id,
      date: record.date,
      kind: record.kind,
      facts: (record as { facts?: Record<string, unknown> }).facts ?? {},
      contestId: race.contestId,
      ...story,
    }
  );
}
