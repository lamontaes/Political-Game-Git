/**
 * The few record shapes the government rule readers share, copied from the
 * old engine's `types.ts` so nothing here reaches back into it. The date type
 * is the shared date helper's own, so a date made there is a date here.
 */
import type { makeIsoDate } from "../kernel/dates";

/** A calendar date, "YYYY-MM-DD", checked by `makeIsoDate`. */
export type IsoDate = ReturnType<typeof makeIsoDate>;

export type PronounSetKey = "she-her" | "he-him" | "they-them";

/** What somebody's gender is, as far as the record goes. */
export type GenderIdentityKey = "female" | "male" | "nonbinary" | "unstated";

/** A person's own gender and pronouns. */
export interface PersonIdentity {
  readonly gender: GenderIdentityKey;
  readonly pronouns: PronounSetKey;
}
