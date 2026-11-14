// Which races the filing counter's replies offer at one turn of the clerk's
// talk. The talk box holds a few replies, never a long list (owner, Oct 26), so
// an office that takes more races than fit asks "What else is open?" as one of
// them, and the next turn offers the next races, soonest election first, until the last
// page, where it stops. Every race is reachable at the counter itself.

/** The most replies the talk box holds at the counter. */
export const COUNTER_REPLIES = 4;

/**
 * `choices`: the clerk's replies (a race is `action.kind === "pick"`).
 * `electionOf(choice)`: the day of that race's election, for the order.
 * `turn`: how many times the player asked what else is open.
 * Returns the replies to show and whether "what else" is one of them.
 */
export function counterReplies(choices, electionOf, turn = 0) {
  const picks = choices
    .filter((choice) => choice.action.kind === "pick")
    .sort((x, y) => electionOf(x).localeCompare(electionOf(y)));
  const others = choices.filter((choice) => choice.action.kind !== "pick");
  const room = COUNTER_REPLIES - others.length;
  if (picks.length <= room)
    return { shown: [...picks, ...others], more: false };
  // One reply is the ask for more; the rest are races. The ask sits with the
  // races, so a way out is always the last reply, and it is not offered on the
  // last page: the paging ends there and never wraps without saying so.
  const size = Math.max(1, room - 1);
  const pages = Math.ceil(picks.length / size);
  const page = Math.min(turn, pages - 1);
  const more = page < pages - 1;
  return {
    shown: [...picks.slice(page * size, page * size + size), ...others],
    more,
  };
}
