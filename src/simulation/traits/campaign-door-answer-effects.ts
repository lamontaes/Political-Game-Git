import type { TraitPack } from "../trait-packs";

/**
 * An effect-only pack: the people pack owns sociability, and this reader says
 * how it bears on answering a candidate's knock (`campaign.door-answer`,
 * declared in `votes-and-outreach-decisions.ts`). Somebody who likes seeing
 * people comes to the door; somebody who keeps to themselves stays inside.
 */
export const CAMPAIGN_DOOR_ANSWER_EFFECTS: TraitPack = {
  pack: "campaign-door-answer-effects",
  traits: [],
  effects: [
    {
      decision: "campaign.door-answer",
      leans: [
        {
          option: "talk",
          trait: "people-mind-v1:sociability",
          pole: "high",
        },
        {
          option: "decline",
          trait: "people-mind-v1:sociability",
          pole: "low",
        },
      ],
    },
  ],
};
