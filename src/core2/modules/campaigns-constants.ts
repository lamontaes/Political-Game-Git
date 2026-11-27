/**
 * The campaign engine's dependency-free constants: kind names, event names and literal tables.
 *
 * Imports nothing, so no load order can find one of these uninitialized (scripts/elections/split-module.ts).
 * campaigns.ts re-exports every export of this file by name.
 */

export const CAMPAIGNS_MODULE_ID = "core2-campaigns-v1";
export const DONATION_KIND = "campaigns:donation";
export const AD_KIND = "campaigns:ad-buy";
export const PURCHASE_KIND = "campaigns:purchase";

/** Every act a campaign takes; a heard speech's occasion kind is one of these when it was given on the trail. */
export const CAMPAIGN_ACTS = [
  "door",
  "volunteer-door",
  "speech",
  "interview",
  "town-hall",
  "debate",
  "retold",
  "ad",
  "attack-ad",
  "endorsement",
  "group-endorsement",
  "donation-ask",
  "constituent-case",
  "mail",
  "event",
] as const;
/**
 * The ids of the campaign payments posted today, kept for the day only: a
 * second post of an id on its day throws, as the journal's posted marker did
 * while every slot was kept. The engine's own ids carry their date, so no
 * later day repeats one (see postMoney).
 */
export const postedToday = new WeakMap<
  object,
  { readonly date: string; readonly ids: Set<string> }
>();
export const clamp = (x: number) => Math.max(-1, Math.min(1, x));
export const townLeans = new WeakMap<object, { date: string; lean: number }>();
export const sellerCache = new WeakMap<object, Map<string, string | null>>();

/** The kind of the record written when someone joins a campaign's volunteers. */
export const VOLUNTEER_JOINED_EVENT = "campaign-volunteer-joined";
/** The kind of the record written when a volunteer's reasons have weakened past giving evenings. */
export const VOLUNTEER_LAPSED_EVENT = "campaign-volunteer-lapsed";

/**
 * The kind of an offer to help a candidate's campaign, from someone who heard
 * they filed: its `role` fact is "manager" for an offer to run it, else
 * "volunteer".
 */
export const VOLUNTEER_OFFERED_EVENT = "volunteer-offered";

/** The kind of word of a rival's message, passed to a candidate by someone it reached. */
export const RIVAL_WORD_EVENT = "rival-word";

/**
 * The kind of a campaign's message that is an evening of the candidate's own
 * doors: what they said to the people who opened, kept so word of it passes
 * on like word of an ad, but never a paid message (`emitMessage`).
 */
export const CANVASS_MESSAGE_KIND = "campaign-canvass";

export const townShares = new WeakMap<
  object,
  Map<string, { readonly asOf: string; readonly share: number }>
>();

/** The kind of a volunteer's evening of doors for a campaign the player's circle is in. */
export const VOLUNTEER_SHIFT_EVENT = "volunteer-shift";

/** The law series holding each office class's limit, where the research gives a state a number. */
export const STATE_CONTRIBUTION_SERIES: Readonly<Record<string, string>> = {
  governor: "state-contribution-limit-governor",
  stateSenate: "state-contribution-limit-state-senate",
  stateHouse: "state-contribution-limit-state-house",
  local: "state-contribution-limit-local",
};

/** The trait decision a donor meeting's host settles: giving a campaign their time. */
export const HOST_DECISION = {
  id: "campaigns.volunteer",
  yes: "volunteer",
  no: "decline",
} as const;

/** The kind of the event that asks the player to endorse a candidate: the scene's cause. */
export const ENDORSEMENT_ASKED_EVENT = "endorsement-asked";

/** A campaign asking the player to give it evenings (the record a `volunteer-ask` scene stages from). */
export const VOLUNTEER_ASKED_EVENT = "volunteer-asked";

/** The kind of a world candidate campaigning harder because they know a rival stands ahead. */
export const CAMPAIGN_STEPPED_UP_EVENT = "campaign-stepped-up";

export const contestsSeen = new WeakMap<object, number>();

/** The kind of the record that a player's petition is behind and someone tells them: the director stages the scene from it. */
export const PETITION_SHORT_EVENT = "petition-short";
