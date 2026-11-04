/**
 * A person's own spoken yes or no to the player's campaign ask (volunteer,
 * endorse), in the one scene word maker (`wordSceneMove`): the line the
 * speaker's traits lean to, a friend's or a rival's where their tie with the
 * player is on record (`tieSide`), never narration of themselves
 * (words-campaign-asks-spoken-by-trait). The answer itself is the ask's own
 * recorded answer; this only words it.
 */
import type { CoreState, PersonId } from "../core2/types";
import { wordSceneMove } from "../english/scene-talk-words";
import { tieSide } from "./purpose-scene";

export type CampaignAsk = "volunteer" | "endorse";

export function campaignAnswer(
  core: Readonly<CoreState>,
  input: {
    speakerId: PersonId;
    playerId: PersonId;
    ask: CampaignAsk;
    yes: boolean;
    momentKey: string;
  },
): { text: string; pieceKey: string; sourceRecordIds: string[] } | null {
  const speaker = core.people.get(input.speakerId);
  if (!speaker) return null;
  const side = tieSide(core, input.speakerId, input.playerId);
  const facts = side
    ? {
        [`tie-${side.side}`]: {
          text: speaker.givenName,
          sourceRecordIds: [side.tieId],
        },
      }
    : {};
  const line = wordSceneMove({
    move: {
      step: "reply",
      move: input.yes ? "agree" : "decline",
      role: "asked",
      purpose: "campaign-answer",
      key: input.ask,
    },
    facts,
    seed: core.seed,
    speakerId: input.speakerId,
    traits: speaker.traits ?? {},
    momentKey: input.momentKey,
    said: new Set(),
  });
  if (!line || "unused" in line) return null;
  return {
    text: line.text,
    pieceKey: line.pieceKey,
    sourceRecordIds: [input.speakerId, ...(side ? [side.tieId] : [])],
  };
}
