import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { EntityId } from "../core2/kernel/brands";
import type { CoreState } from "../core2/types";
import { composeNewsStory, type StoryKind } from "../english/english-newscast";
import type { GroundedEnglishPacket } from "../english/grounded-english";
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
    // Which office the race was for, from the office record the result names.
    const officeId = String(story.facts.officeId ?? "");
    const office = (
      coreAPI(core)
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(officeId) as { title?: string } | undefined
    )?.title;
    facts = {
      name: fact(`${winner.givenName} ${winner.familyName}`, [winner.id]),
      won: fact("yes", [winner.id]),
      ...(office ? { office: fact(office, [officeId]) } : {}),
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
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `archive-news:${story.id}`,
    worldSeed: core.seed,
    bankVersion: "words-newscast-v1",
    stage: "default",
    sourceRecordIds: ids,
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
  return {
    ...(composed.headline ? { headline: composed.headline } : {}),
    ...(composed.lede ? { lede: composed.lede } : {}),
    sourceRecordIds: composed.sourceRecordIds,
  };
}
