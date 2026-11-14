/**
 * Test helper: a world opens on the game's start date, and a place whose
 * filing windows open later (the nomination calendar's own dates) has nothing
 * to file for that day. A test that needs a contest to file for moves the
 * clock to the first day one opens, as a player there would wait for it.
 */
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import {
  openContests,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import { makeIsoDate } from "./kernel/dates";
import type { CoreState } from "./types";

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
  if (next && next > today) advanceCore(core, next);
  return core.date;
}

/** Play the world to the day a race's filing opens, if that is later. */
export function advanceToRaceFiling(core: CoreState, race: ContestRow): void {
  if (race.filingOpens && race.filingOpens > core.date)
    advanceCore(core, makeIsoDate(race.filingOpens));
}
