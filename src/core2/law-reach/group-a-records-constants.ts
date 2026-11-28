/** The literal constants of group-a-records.ts, kept in a file that imports nothing so a file that only needs the name never loads the module (map row 1, the load-order failures). */
export const REACH_A_MODULE_ID = "core2-law-reach-a-v1";

/** The policy keys of the two laws that add a share of a budget line (dedicated parks funding, facial-recognition oversight), kept here so the host names them without loading the money file. */
export const PARKS_KEY =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";
export const FACIAL_KEY =
  "us-policy-positions:technology-privacy.restrict-government-facial-recognition";
export const LINE_ADDITION_KEYS = [PARKS_KEY, FACIAL_KEY] as const;
