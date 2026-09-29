/**
 * What the campaign hours panel says (D-11). Kept here, outside the screen,
 * so the screen carries no hand-written sentences and every line it shows
 * is one place to review.
 */
export const CAMPAIGN_HOURS_TEXT = {
  none: "You have no set campaign hours.",
  explain:
    "Set hours repeat every week until you change them. When something else takes that time, that session is lost, not saved for later.",
  unchanged: "Those are already your hours.",
  stopped: "Your campaign hours are stopped.",
  set: "Your campaign hours are set. They repeat every week until you change them.",
} as const;
