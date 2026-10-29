import type { EntityId } from "../core2/kernel/brands";
import { spokenDate } from "../core2/kernel/dates";
import type { CoreState } from "../core2/types";
import { composeNewsStory, type StoryKind } from "../english/english-newscast";
import type { GroundedEnglishPacket } from "../english/grounded-english";
import { lineName } from "./budget";
import { printedFacts } from "./printed-words";
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
  readonly sourceRecordIds: readonly string[];
}

/**
 * The words for a story the press archived from the year before day one.
 * The press engine keeps the record (kind, winner, votes); the English engine
 * words it here from those facts. Only a story the mined banks can say gets
 * words (an election's outcome, a law enacted or taking effect); the rest stay
 * records until the banks grow.
 */

const MINOR_PER_DOLLAR = 100;
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
  let kind: StoryKind;
  let speaker = story.id;
  let facts: Record<string, ReturnType<typeof fact>>;
  if (recordKind === "election-result") {
    const winner = core.people.get(String(story.facts.winnerId ?? ""));
    if (!winner) return null;
    kind = "election";
    speaker = winner.id;
    facts = {
      name: fact(`${winner.givenName} ${winner.familyName}`, [winner.id]),
      won: fact("yes", [winner.id]),
    };
  } else if (recordKind === "law-enacted" || recordKind === "law-took-effect") {
    // A law is named by its series on the bill catalog; one with no name stays a record.
    NAMES ??= policyNames();
    const measure = NAMES[String(story.facts.series ?? "")];
    if (!measure) return null;
    kind = "vote-or-law";
    facts = {
      measure: fact(measure, [String(story.facts.lawId ?? "")]),
      date: fact(spokenDate(story.date)),
      [recordKind === "law-enacted" ? "enacted" : "effective"]: fact("yes"),
    };
  } else if (recordKind === "budget-adopted") {
    // The money is the largest spending line, named by the line's own table.
    const line = String(story.facts.largestLine ?? "");
    const name = lineName(line);
    const minor = Number(story.facts.largestLineMinor);
    if (!name || !Number.isFinite(minor)) return null;
    kind = "vote-or-law";
    facts = {
      money: fact(
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(minor / MINOR_PER_DOLLAR),
        [String(story.facts.governmentId ?? "")],
      ),
      purpose: fact(/^[A-Z][a-z]/.test(name) ? name.toLowerCase() : name),
    };
  } else if (recordKind === "parent-died") {
    // Reported once, to the survivor: the parent is named from the fact's own names.
    const survivor = String(story.facts.survivorId ?? "");
    const name = [story.facts.givenName, story.facts.familyName]
      .filter(Boolean)
      .join(" ");
    if (!name) return null;
    kind = "death";
    speaker = survivor || story.id;
    facts = {
      name: fact(name, survivor ? [survivor] : []),
      date: fact(spokenDate(story.date)),
    };
  } else return null;
  return worded(core, story.id, kind, speaker, facts);
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
