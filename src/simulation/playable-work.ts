import type { WorkRelationshipKind } from "./types";

/**
 * Which work the player can actually play.
 *
 * Most jobs in the world are background: the people at the hardware store,
 * the diner and the construction firm have jobs so the town has an economy,
 * and a player who holds one of those simply has it. A few kinds of work are
 * the story, and each of those has its own route with scenes and decisions.
 *
 * Nothing marked this before, so every screen that wanted to know guessed from
 * the kind's prefix. This is the one list. A kind belongs here only when a
 * route exists today that plays it; law practice is named separately below
 * because the owner wants it and no route plays it yet.
 */
export interface PlayableWork {
  readonly kind: WorkRelationshipKind;
  readonly label: string;
}

export const PLAYABLE_WORK: readonly PlayableWork[] = [
  { kind: "employment:executive-office", label: "Executive office" },
  { kind: "employment:legislative-member", label: "Legislator" },
  { kind: "employment:judicial-office-practice", label: "Judge" },
  { kind: "employment:state-agency-director", label: "Agency director" },
  { kind: "employment:civil-service", label: "Civil servant" },
  { kind: "employment:executive-staff", label: "Executive staff" },
];

/**
 * Story work the owner has asked for that no route plays yet. Listed so the
 * gap is written down rather than forgotten; it is not playable until a route
 * exists, and `isPlayableWork` says no.
 */
export const STORY_WORK_NOT_YET_PLAYABLE: readonly string[] = [
  "Practicing law",
];

export function isPlayableWork(kind: string): boolean {
  return PLAYABLE_WORK.some((work) => work.kind === kind);
}
