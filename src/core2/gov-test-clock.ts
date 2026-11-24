/**
 * Test helper: a world opens on the game's start date, and a place whose
 * filing windows open later (the nomination calendar's own dates) has nothing
 * to file for that day. A test that needs a contest to file for moves the
 * clock to the first day one opens, as a player there would wait for it.
 */
import { setBookkeeping } from "./bookkeeping";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import {
  openContests,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import { makeIsoDate } from "./kernel/dates";
import type { CoreState } from "./types";

/**
 * The wait runs with the debug bookkeeping off (bookkeeping only throws on a
 * broken invariant and writes nothing the records read). Under a test's
 * default bookkeeping a place whose first window is months away took 157 s of
 * a 160 s test (Palma Sola, Puerto Rico, golden-path M2-06) and 89 s at
 * Leadore, Idaho (the M2-03 filing test). Bookkeeping is back on when the
 * wait ends, for everything a test then asserts.
 */
function waitUntil(core: CoreState, day: string): void {
  const previous = setBookkeeping(false);
  try {
    advanceCore(core, day);
  } finally {
    setBookkeeping(previous);
  }
}

export function advanceToFilingOpen(core: CoreState): string {
  const api = coreAPI(core);
  if (openContests(api).length) return core.date;
  const today = core.date;
  const rows = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as {
    filingOpens: string | null;
    filingDeadline: string;
  }[];
  const next = rows
    .filter((c) => c.filingOpens !== null && c.filingDeadline >= today)
    .map((c) => c.filingOpens!)
    .sort()[0];
  if (next && next > today) waitUntil(core, next);
  return core.date;
}

/** Play the world to the day a race's filing opens, if that is later. */
export function advanceToRaceFiling(core: CoreState, race: ContestRow): void {
  if (race.filingOpens && race.filingOpens > core.date)
    waitUntil(core, makeIsoDate(race.filingOpens));
}
