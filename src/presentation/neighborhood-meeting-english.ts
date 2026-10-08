import type { EntityId, World } from "../simulation";
import { PUBLIC_MEETING_KEY } from "../simulation/life-opportunities";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import type { GroundedEnglishFact } from "./grounded-english";

type MeetingCopyKey =
  | "topic"
  | "briefing"
  | "mention-label"
  | "mention-description"
  | "going-label"
  | "going-description"
  | "ask-label"
  | "ask-description"
  | "listen-label"
  | "listen-description";

const BANK_VERSION = "1";

const BANKS: Readonly<Record<MeetingCopyKey, ComposedLineBank>> = {
  topic: bank("topic", "The posted public meeting"),
  briefing: bank("briefing", "{{notice}}"),
  "mention-label": bank("mention-label", "Mention the notice"),
  "mention-description": bank(
    "mention-description",
    "Ask about the posted meeting.",
  ),
  "going-label": bank("going-label", "Say you will go"),
  "going-description": bank(
    "going-description",
    "Say you plan to attend the meeting.",
  ),
  "ask-label": bank("ask-label", "Ask whether they will go"),
  "ask-description": bank(
    "ask-description",
    "Invite them to attend the meeting.",
  ),
  "listen-label": bank("listen-label", "Leave it there"),
  "listen-description": bank(
    "listen-description",
    "Say nothing more about the meeting.",
  ),
};

function bank(key: MeetingCopyKey, text: string): ComposedLineBank {
  return {
    key: `neighborhood-meeting.${key}`,
    version: BANK_VERSION,
    surface: key === "briefing" ? "scene" : "menu",
    act: "tell",
    parts: {
      core: {
        variants: [
          {
            key: "recorded-notice",
            kind: "template",
            text,
            requiresFacts: ["notice"],
          },
        ],
      },
    },
  };
}

/** Wording for the meeting subject is available only while its notice is recorded. */
export function neighborhoodMeetingEnglish(
  world: World,
  viewerId: EntityId,
  key: MeetingCopyKey,
): string {
  const notice = world.history.workItems.find(
    (item) => item.stableKey === PUBLIC_MEETING_KEY,
  );
  if (!notice) return "";
  const fact: GroundedEnglishFact = {
    text: notice.summary,
    sourceRecordIds: [notice.id],
  };
  const result = composeGroundedLine(
    {
      surface: BANKS[key].surface,
      momentKey: `neighborhood-meeting:${notice.id}:${world.currentDate}:${key}`,
      worldSeed: world.seed,
      bankVersion: BANK_VERSION,
      stage: "adult",
      sourceRecordIds: [viewerId, notice.id],
      facts: { notice: fact },
      viewer: { personId: viewerId, traits: {} },
      knowledge: [],
    },
    BANKS[key],
  );
  if (result.kind !== "rendered")
    throw new Error(
      "Cannot compose neighborhood meeting copy: " + result.reasons.join("; "),
    );
  return result.text;
}
