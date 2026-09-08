import {
  adultSituation,
  isAdultSituationKey,
  type AdultLifeContext,
  type LifeStakesTier,
} from "./adult-situations";
import type { InterestTension, PlayerModelDimension } from "./player-model";
import type { LifeSituationKey } from "./types";

/**
 * What each situation asks of a player, for the selector only.
 *
 * The adult bank carries this beside each situation, because a situation and
 * the tension it creates were authored together. The formative bank predates
 * the idea, so its readings live here rather than being scattered through
 * ninety options — and they are readings of the situations as they already
 * are. Nothing in the formative bank was rewritten to make a tension come out.
 *
 * A tension is a claim that the moment cannot give you both things, and it is
 * only ever a claim about the moment. It says nothing about what will follow,
 * and the selector's use of it is never passed on to anything that decides
 * what does.
 */

export interface SituationProfile {
  readonly stakes: LifeStakesTier;
  readonly tensions: readonly InterestTension[];
}

function tension(
  first: PlayerModelDimension,
  firstPole: number,
  second: PlayerModelDimension,
  secondPole: number,
  note: string,
): InterestTension {
  return { between: [first, second], poles: [firstPole, secondPole], note };
}

const FORMATIVE_PROFILES: Readonly<
  Partial<Record<LifeSituationKey, SituationProfile>>
> = {
  "formative.household-transition": {
    stakes: "notable",
    tensions: [
      tension(
        "personal-ties",
        1,
        "privacy-preference",
        1,
        "Being part of the new arrangement, against keeping something that is only yours.",
      ),
    ],
  },
  "formative.school-entry": {
    stakes: "ordinary",
    tensions: [
      tension(
        "risk-appetite",
        1,
        "privacy-preference",
        1,
        "Going in, against watching from the edge first.",
      ),
    ],
  },
  "formative.broken-object": {
    stakes: "notable",
    tensions: [
      tension(
        "institutional-trust",
        1,
        "privacy-preference",
        1,
        "Owning up, against the fact that nobody knows yet.",
      ),
    ],
  },
  "formative.small-money": {
    stakes: "ordinary",
    tensions: [
      tension(
        "risk-appetite",
        1,
        "security-stability",
        1,
        "Having it now, against having it later.",
      ),
    ],
  },
  "formative.lunch-table": {
    stakes: "notable",
    tensions: [
      tension(
        "care-obligation",
        1,
        "privacy-preference",
        1,
        "Doing something about it, against not being the one who did.",
      ),
    ],
  },
  "formative.friend-conflict": {
    stakes: "notable",
    tensions: [
      tension(
        "personal-ties",
        1,
        "privacy-preference",
        1,
        "Going first, against letting it cool on its own.",
      ),
    ],
  },
  "formative.teacher-mentor": {
    stakes: "ordinary",
    tensions: [
      tension(
        "institutional-trust",
        1,
        "privacy-preference",
        1,
        "Taking the help, against doing it yourself.",
      ),
    ],
  },
  "formative.school-rule-input": {
    stakes: "notable",
    tensions: [
      tension(
        "institutional-trust",
        1,
        "privacy-preference",
        1,
        "Saying it where it counts, against not being the one who said it.",
      ),
    ],
  },
  "formative.care-conflict": {
    stakes: "pressing",
    tensions: [
      tension(
        "care-obligation",
        1,
        "achievement-ambition",
        1,
        "The house, against the thing you signed up for.",
      ),
    ],
  },
  "formative.activity-choice": {
    stakes: "ordinary",
    tensions: [
      tension(
        "achievement-ambition",
        1,
        "privacy-preference",
        1,
        "Giving it the afternoons, against keeping them.",
      ),
    ],
  },
  "formative.civic-volunteering": {
    stakes: "ordinary",
    tensions: [
      tension(
        "care-obligation",
        1,
        "privacy-preference",
        1,
        "Turning up, against the Saturday.",
      ),
    ],
  },
  "formative.teen-work-opportunity": {
    stakes: "pressing",
    tensions: [
      tension(
        "achievement-ambition",
        1,
        "personal-ties",
        1,
        "Money and hours of your own, against everything the week already held.",
      ),
    ],
  },
  "formative.student-organizing": {
    stakes: "pressing",
    tensions: [
      tension(
        "institutional-trust",
        -1,
        "privacy-preference",
        1,
        "Being one of the people who did something, against being one of the people whose name is on it.",
      ),
    ],
  },
  "formative.belief-challenge": {
    stakes: "notable",
    tensions: [
      tension(
        "decision-style",
        -1,
        "privacy-preference",
        1,
        "Saying they are wrong, against keeping it where only you can see it.",
      ),
    ],
  },
  "formative.future-preparation": {
    stakes: "pressing",
    tensions: [
      tension(
        "security-stability",
        1,
        "risk-appetite",
        1,
        "Committing to one of them, against staying able to change your mind.",
      ),
    ],
  },
  "formative.illness-in-the-house": {
    stakes: "notable",
    tensions: [
      tension(
        "care-obligation",
        1,
        "security-stability",
        1,
        "Being in the room, against keeping the rest of the day working.",
      ),
    ],
  },
  "formative.money-shortfall": {
    stakes: "notable",
    tensions: [
      tension(
        "privacy-preference",
        1,
        "care-obligation",
        1,
        "Asking, against making it easier for whoever would have to answer.",
      ),
    ],
  },
  "formative.caring-for-someone": {
    stakes: "pressing",
    tensions: [
      tension(
        "care-obligation",
        1,
        "achievement-ambition",
        1,
        "Taking the afternoons on, against everything they would have been.",
      ),
    ],
  },
  "formative.workplace-rule": {
    stakes: "notable",
    tensions: [
      tension(
        "institutional-trust",
        1,
        "personal-ties",
        1,
        "The rule as told to you, against the people who work here.",
      ),
    ],
  },
};

const ORDINARY_PROFILE: SituationProfile = { stakes: "ordinary", tensions: [] };

export function situationProfile(key: LifeSituationKey): SituationProfile {
  if (isAdultSituationKey(key)) {
    const situation = adultSituation(key);
    return situation
      ? { stakes: situation.stakes, tensions: situation.tensions }
      : ORDINARY_PROFILE;
  }
  return FORMATIVE_PROFILES[key] ?? ORDINARY_PROFILE;
}

/**
 * How much this matters to this life right now.
 *
 * Read from world state where the situation says how, and otherwise a flat
 * middling value — which is honest. A formative situation is already gated by
 * band and by context; claiming a fine-grained relevance for it beyond that
 * would be a number with nothing behind it.
 */
export function situationRelevance(
  key: LifeSituationKey,
  context: AdultLifeContext | null,
): number {
  if (!isAdultSituationKey(key) || context === null) return 0.5;
  const situation = adultSituation(key);
  return situation?.relevance?.(context) ?? 0.5;
}
