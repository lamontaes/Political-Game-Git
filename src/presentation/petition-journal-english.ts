import type { EntityId, HistoricalEvent, World } from "../simulation";
import { RECALL_PETITION_CLOSED } from "../simulation/recall";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";
import { speakerTraits } from "./speaker-traits";

/**
 * The petitioner's Journal line when a petition closes (b01 part 3).
 *
 * The closing event records the day the circulation window ended, the valid
 * signed records it counted and how many the place's terms required. The
 * line reads those from the event's own tags and goes through
 * `composeGroundedLine`; nothing here counts or decides anything. A closing
 * with no count on record (a recall that lapsed because the official left the
 * seat) is not worded here, and the Journal keeps the event's own summary.
 */

const BANK: ComposedLineBank = {
  key: "petition-closed-journal",
  version: "1",
  surface: "journal",
  act: "tell",
  parts: {
    core: {
      variants: [
        {
          key: "fell-short",
          kind: "template",
          stages: ["failed"],
          text: "My petition did not qualify: it had {{signatures}} and needed {{required}}.",
        },
        {
          key: "qualified",
          kind: "template",
          stages: ["qualified"],
          text: "My petition qualified, with {{signatures}} counted.",
        },
      ],
    },
  },
};

function tagNumber(tags: readonly string[], prefix: string): number | null {
  const tag = tags.find((entry) => entry.startsWith(prefix));
  if (!tag) return null;
  const value = Number(tag.slice(prefix.length));
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function signaturesPhrase(count: number): string {
  return count === 0
    ? "no valid signatures"
    : count === 1
      ? "1 valid signature"
      : `${count} valid signatures`;
}

/** The Journal sentence for this closing, or null when it cannot be worded from the record. */
export function petitionClosedJournalSentence(
  world: World,
  event: HistoricalEvent,
  personId: EntityId,
): string | null {
  if (event.type !== RECALL_PETITION_CLOSED) return null;
  const petitioner = event.participants.find(
    (row) => row.role === "agency:petitioner",
  );
  if (petitioner?.personId !== personId) return null;
  const outcome = event.tags
    .find((tag) => tag.startsWith("outcome:"))
    ?.slice("outcome:".length);
  const signatures = tagNumber(event.tags, "signatures:");
  const required = tagNumber(event.tags, "required-signatures:");
  if (
    (outcome !== "failed" && outcome !== "qualified") ||
    signatures === null ||
    required === null
  )
    return null;
  const sourceRecordIds = [event.id];
  const facts = {
    signatures: { text: signaturesPhrase(signatures), sourceRecordIds },
    required: { text: String(required), sourceRecordIds },
  };
  const packet: GroundedEnglishPacket = {
    surface: "journal",
    momentKey: event.id,
    worldSeed: world.seed,
    bankVersion: BANK.version,
    stage: outcome,
    sourceRecordIds,
    facts,
    viewer: { personId, traits: speakerTraits(world, personId) },
    knowledge: Object.keys(facts).map((factKey) => ({
      personId,
      factKey,
      sourceRecordIds,
    })),
  };
  const line = composeGroundedLine(packet, BANK);
  return line.kind === "rendered" ? line.text : null;
}
