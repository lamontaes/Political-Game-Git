import { addDays } from "./dates";
import type { LegislativeRulePack } from "./legislature-rules";
import type { IsoDate, LegislativeEnactmentRecord } from "./types";

/**
 * The game's declared interval when this route does not supply a date.
 * It is a game profile, never a claim about a particular state's law.
 */
export const STATUTE_EFFECTIVE_DEFAULT_DAYS = 90;
export const STATUTE_EFFECTIVE_GAME_DEFAULT_VERSION =
  "ocd-statute-effective-game-default/v1";

/** A date from an executable cited rule or the versioned game fallback. */
export type LegislativeEffectiveDateResolution =
  | { readonly kind: "source-default"; readonly effectiveAt: IsoDate }
  | { readonly kind: "game-default"; readonly effectiveAt: IsoDate };

/**
 * Resolve only the portion of a pack's default that is expressed as data.
 * A rule written in prose is evidence, not a date parser: it may depend on
 * adjournment, filing, a special-law approval, or text in the particular act.
 */
export function resolveLegislativeEffectiveDate(
  pack: LegislativeRulePack,
  enactedAt: IsoDate,
): LegislativeEffectiveDateResolution {
  const schedule = pack.enactment.defaultEffectiveSchedule;
  if (schedule?.kind === "known") {
    switch (schedule.value.kind) {
      case "days-after-enactment":
        return {
          kind: "source-default",
          effectiveAt: addDays(enactedAt, schedule.value.days),
        };
    }
  }
  return {
    kind: "game-default",
    effectiveAt: addDays(enactedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS),
  };
}

/** One answer shared by every consumer of an enacted measure. */
export function operativeDateForEnactment(
  enactment: LegislativeEnactmentRecord,
): {
  readonly date: IsoDate;
  readonly basis: "enacted-date" | "game-default";
} | null {
  if (enactment.effectiveAt) {
    return {
      date: enactment.effectiveAt,
      basis:
        enactment.effectiveDateBasis === "game-default"
          ? "game-default"
          : "enacted-date",
    };
  }
  if (enactment.effectiveDateBasis === "source-default") return null;
  const profile = enactment.effectiveDateGameProfile;
  if (
    profile &&
    (!profile.version ||
      !Number.isSafeInteger(profile.days) ||
      profile.days < 0)
  ) {
    throw new Error(
      "An enactment carries an invalid effective-date game profile.",
    );
  }
  return {
    date: addDays(
      enactment.resolvedAt,
      profile?.days ?? STATUTE_EFFECTIVE_DEFAULT_DAYS,
    ),
    basis: "game-default",
  };
}
