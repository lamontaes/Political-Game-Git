import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import type { CoreState } from "../core2/types";
import type { OpeningStory } from "../director/opening-story";

// The opening (owner, Oct 14 and Oct 26, 2026): the President's address, then
// home that evening, where that night's news can be picked up. Every word is
// the director's opening story, composed by the English engine at loading.

/** The evening of the opening day, when the household has the news on. */
export const OPENING_EVENING_MINUTE = 20 * 60 + 30;

/**
 * The opening: who gives the address and the evening at home (that night's
 * news is the news engine's, read by /api/news). Read-only. The address's pictures and the people pointed out were
 * the opening's own scene system (deleted, row W1 of
 * docs/reports/duplicates-on-main-2026-10-28.md); the address plays as the
 * director's `address` situation type through the talk box once
 * `director-opening-as-a-scene` wires it.
 */
export function openingFrames(
  core: CoreState,
  playerId: string,
  story: OpeningStory,
) {
  if (!core.people.has(playerId)) throw new Error("No such person.");
  const seats = townSeats(coreAPI(core));
  return {
    /** Who is speaking, for the speech box. */
    speaker: {
      id: story.president.id,
      name: story.president.name,
      title:
        seats.find((row) => row.office.kind === "president")?.office.title ??
        null,
      // The office alone (owner, Oct 26: "President · Michigan" read as where
      // the player is); the President's home state is not part of his tag.
      detail: [] as string[],
    },
    home: { ...story.home, minuteOfDay: OPENING_EVENING_MINUTE },
  };
}
