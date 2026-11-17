/**
 * The opening's warm-up (owner, Nov 14, 2026: "The town must be in motion on day one... not just town, but
 * country and state. Remember, it's all one simulation."; skill day-one-in-motion). A world built to open
 * on the start date can instead be built a few days before it and run forward to it with the engines' own
 * days, so the records an engine makes on its first steps (a budget in force, the cabinet, the economy's
 * lines, a cabin of cases) already exist when the player arrives. It is the one mechanism for the opening's
 * first weeks; what a place has from longer ago (last year's address, past police months, sitting
 * committees) is written by the engine that owns it for the past date, not by a longer warm-up.
 *
 * The played person does nothing in these days: they run through the player clock's own day
 * (`runControlledDay`, player-v1.ts), where no module may choose for the controlled person, so no job
 * change, move, filing or stop lands that the player would have chosen. Nothing is shown to the player: the
 * director starts after the warm-up.
 */
import { advanceDate, duePeople } from "./calendar";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { runControlledDaySteps } from "./player-v1";
import {
  registerControlledPersonV1,
  retireControlledPersonV1,
} from "./player-control-state-v1";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

/** Runs the world forward to `through`, the played person (if any) held still. */
export function warmUpOpening(
  core: CoreState,
  through: string,
  playedPersonId?: string,
): void {
  for (const day of warmUpOpeningDays(core, through, playedPersonId)) void day;
}

/**
 * The warm-up one day at a time: each step runs one day and says how many of the warm-up's days are done,
 * so the loading screen moves with each day (owner, Nov 16: "It should continue to load. This is just
 * poor optimization."). Stopping between steps changes nothing; the world is the same as one block.
 */
export function* warmUpOpeningDays(
  core: CoreState,
  through: string,
  playedPersonId?: string,
): Generator<{ done: number; total: number }, void> {
  const target = makeIsoDate(through);
  const total = Math.max(0, daysBetween(makeIsoDate(core.date), target));
  // With no one played, the world's own clock runs the days in one call.
  if (!playedPersonId) {
    advanceCore(core, through);
    yield { done: total, total };
    return;
  }
  const token = registerControlledPersonV1(core, playedPersonId);
  try {
    for (let done = 1; core.date < target; done += 1) {
      const date = addDays(makeIsoDate(core.date), 1);
      const due = duePeople(core, date).filter(
        (row) => row.personId !== playedPersonId,
      );
      advanceDate(core, date);
      // Inside a day the engines report too, so a long day (a month's first) moves the bar.
      const day = runControlledDaySteps(
        core,
        coreAPI(core),
        playedPersonId,
        due,
      );
      for (let step = day.next(); !step.done; step = day.next())
        yield { done: done - 1 + step.value, total };
      yield { done, total };
    }
  } finally {
    retireControlledPersonV1(core, token);
  }
}
