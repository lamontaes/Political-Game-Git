/**
 * Test helper: a world opens on the game's start date, and a place whose
 * filing windows open later (the nomination calendar's own dates) has nothing
 * to file for that day. A test that needs a contest to file for moves the
 * clock to the first day one opens, as a player there would wait for it.
 */
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { openContests, ELECTIONS_MODULE_ID } from "./modules/elections";
import type { CoreState } from "./types";

export function advanceToFilingOpen(
  core: CoreState,
  options: {
    /** Only a race this accepts counts as open (a test's level, say). */
    wanted?: (contest: { level: string; family: string }) => boolean;
    /** The last day worth waiting to: a later opening leaves the clock as it is. */
    by?: string;
  } = {},
): string {
  const wanted = options.wanted ?? (() => true);
  const api = coreAPI(core);
  if (openContests(api).some(wanted)) return core.date;
  const today = core.date;
  const rows = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as {
    level: string;
    family: string;
    filingOpens: string | null;
    filingDeadline: string;
  }[];
  const next = rows
    .filter(
      (c) => wanted(c) && c.filingOpens !== null && c.filingDeadline >= today,
    )
    .map((c) => c.filingOpens!)
    .sort()[0];
  if (next && next > today && (!options.by || next <= options.by))
    advanceCore(core, next);
  return core.date;
}
