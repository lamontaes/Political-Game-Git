import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import type { CoreState, PersonId } from "../core2/types";
import type { OpeningStory } from "../director/opening-story";
import { wordSceneLine } from "../english/scene-words";
import { dayOpening } from "../english/day-words";
import { workSpansOf } from "./places";

const MINUTES_PER_DAY = 24 * 60;

// The opening (owner, Oct 14 and Oct 26, 2026): the President's address, then
// home that evening, where that night's news can be picked up. Every word is
// the director's opening story, composed by the English engine at loading.

/**
 * The evening news hour, for a household with no one at work on the opening
 * day: home all day, the address on that night's news.
 */
// stopgapId: SG-DIRECTOR-opening-evening-news-minute
export const OPENING_EVENING_MINUTE = 20 * 60 + 30;

const arrivals = new WeakMap<CoreState, Map<string, number>>();

/**
 * When the player lands at home on the opening day (owner, Oct 14: home after
 * the address): once the household's last shift that day has ended, from each
 * member's own work spans; the evening news hour where no one works that day.
 */
export function openingArrivalMinute(
  core: CoreState,
  playerId: string,
): number {
  const key = `${core.date}:${playerId}`;
  const held = arrivals.get(core)?.get(key);
  if (held !== undefined) return held;
  const household = core.households.get(
    core.people.get(playerId)?.householdId ?? "",
  );
  const ends = (household?.memberIds ?? [playerId])
    .filter((id) => core.people.get(id)?.alive)
    .flatMap((id) => workSpansOf(core, id, core.date) ?? [])
    .map((span) => span.endMinute);
  const minute = ends.length
    ? Math.min(Math.max(...ends), MINUTES_PER_DAY - 1)
    : OPENING_EVENING_MINUTE;
  if (!arrivals.has(core)) arrivals.set(core, new Map());
  arrivals.get(core)!.set(key, minute);
  return minute;
}

/** The one line that lands the player at home after the address: the day as people say it, at home. */
function landingLine(
  core: CoreState,
  playerId: string,
  story: OpeningStory,
  minute: number,
) {
  return wordSceneLine({
    seed: core.seed,
    move: { part: "arrival", kind: "home" },
    viewerId: playerId as PersonId,
    facts: {
      begins: {
        text: dayOpening(core.date, minute),
        sourceRecordIds: [story.id],
      },
    },
    stage: () => "alone",
    momentKey: `${story.id}:landing`,
    fallbackSourceId: story.id,
  });
}

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
    home: {
      ...story.home,
      minuteOfDay: openingArrivalMinute(core, playerId),
      landing: landingLine(
        core,
        playerId,
        story,
        openingArrivalMinute(core, playerId),
      ),
    },
  };
}
