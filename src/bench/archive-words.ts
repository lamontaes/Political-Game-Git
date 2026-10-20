import type { EntityId } from "../core2/kernel/brands";
import type { CoreState } from "../core2/types";
import { composeNewsStory } from "../english/english-newscast";
import type { GroundedEnglishPacket } from "../english/grounded-english";

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
 * words (an election's outcome); the rest stay records until the banks grow.
 */
export function wordArchiveStory(
  core: CoreState,
  story: StoredStory,
): WordedStory | null {
  if (story.kind !== "press.archived") return null;
  if (story.facts.recordKind !== "election-result") return null;
  const winner = core.people.get(String(story.facts.winnerId ?? ""));
  if (!winner) return null;
  const name = `${winner.givenName} ${winner.familyName}`;
  const ids = [story.id, winner.id] as EntityId[];
  const fact = (text: string) => ({ text, sourceRecordIds: ids });
  const facts = { name: fact(name), won: fact("yes") };
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `archive-news:${story.id}`,
    worldSeed: core.seed,
    bankVersion: "words-newscast-v1",
    stage: "default",
    sourceRecordIds: ids,
    facts,
    speaker: { personId: winner.id as EntityId, traits: {} },
    knowledge: Object.entries(facts).map(([factKey, row]) => ({
      personId: winner.id as EntityId,
      factKey,
      sourceRecordIds: row.sourceRecordIds,
    })),
  };
  const composed = composeNewsStory(packet, "election");
  if (!composed.headline && !composed.lede) return null;
  return {
    ...(composed.headline ? { headline: composed.headline } : {}),
    ...(composed.lede ? { lede: composed.lede } : {}),
    sourceRecordIds: composed.sourceRecordIds,
  };
}
