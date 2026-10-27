import type { EntityId } from "../core2/kernel/brands";
import type { CoreState } from "../core2/types";
import { composeNewsStory, type StoryKind } from "../english/english-newscast";
import type { GroundedEnglishPacket } from "../english/grounded-english";
import { lineName } from "./budget";
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
  readonly sourceRecordIds: readonly string[];
}

/**
 * The words for a story the press archived from the year before day one.
 * The press engine keeps the record (kind, winner, votes); the English engine
 * words it here from those facts. Only a story the mined banks can say gets
 * words (an election's outcome, a law enacted or taking effect); the rest stay
 * records until the banks grow.
 */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/** An ISO date as people say it: "January 20, 2025". */
function sayDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month! - 1]} ${day}, ${year}`;
}

const MINOR_PER_DOLLAR = 100;
let NAMES: Record<string, string> | undefined;

export function wordArchiveStory(
  core: CoreState,
  story: StoredStory,
  options: { heldFirst?: boolean } = {},
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
      date: fact(sayDate(story.date)),
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
      date: fact(sayDate(story.date)),
    };
  } else return null;
  return worded(core, story.id, kind, speaker, facts, options);
}

type StoryFact = { text: string; sourceRecordIds: EntityId[] };

/** One story worded by the English engine from its record's facts. */
function worded(
  core: CoreState,
  storyId: string,
  kind: StoryKind,
  speaker: string,
  facts: Record<string, StoryFact>,
  options: { heldFirst?: boolean } = {},
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
  const composed = composeNewsStory(packet, kind, options);
  if (!composed.headline && !composed.lede) return null;
  return {
    ...(composed.headline ? { headline: composed.headline } : {}),
    ...(composed.lede ? { lede: composed.lede } : {}),
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
