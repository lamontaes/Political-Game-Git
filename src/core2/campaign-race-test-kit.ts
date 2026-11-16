/**
 * For tests of what the paper prints after a town race: a played world plays
 * to its first local race with a filing still open, three residents file as
 * concession-reported's drawn race does, their petitions are carried by the
 * campaign engine, and the world lives to some days after the count. Returns
 * the race, its winner and every story printed after the count.
 */
import { gatherSignatures } from "./campaign-petition-kit";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { filingClerkFor } from "./modules/filing-clerk";
import { NEWS_MODULE_ID } from "./modules/news";
import { resultOf } from "./modules/voting";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

export interface PrintedRow {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly outletId?: string;
  readonly facts: Record<string, string>;
}

export interface PlayedRace {
  readonly core: CoreState;
  readonly where: string;
  readonly race: ContestRow | undefined;
  readonly winnerId: string | null;
  /** Every story printed from the day of the count on. */
  readonly printed: readonly PrintedRow[];
}

/**
 * Plays `core` (a bench world the test built, so this kit reaches no further
 * into the bench than its callers do) to its first local race with a filing
 * still open, and `paperDays` past the count.
 */
export function playTownRace(
  core: CoreState,
  where: string,
  paperDays: number,
): PlayedRace {
  const api = coreAPI(core);
  const townId = core.people.get(core.playerId!)?.placeId;
  const today = core.date;
  const end = addDays(makeIsoDate(today), 365);
  const race = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter(
      (c) =>
        ["city", "township", "county", "school"].includes(c.level) &&
        c.filingDeadline >= today &&
        addDays(makeIsoDate(c.electionDate), 2) <= end,
    )
    .sort(
      (a, b) =>
        (a.filingOpens ?? today).localeCompare(b.filingOpens ?? today) ||
        a.id.localeCompare(b.id),
    )[0];
  if (!race) return { core, where, race, winnerId: null, printed: [] };
  if (race.filingOpens && race.filingOpens > core.date)
    advanceCore(core, makeIsoDate(race.filingOpens));
  const clerkId = filingClerkFor(api, race.id)?.personId;
  const filings: FilingRow[] = [];
  for (const person of [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === townId &&
        p.id !== core.playerId &&
        p.id !== clerkId &&
        p.birthDate < "2000-01-01",
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 40)) {
    if (filings.length >= 3) break;
    const filed = fileCandidacy(api, {
      personId: person.id,
      contestId: race.id,
      platform: [],
    });
    if (filed.status === "petitioning" || filed.status === "on-ballot")
      filings.push(filed.filing);
  }
  gatherSignatures(core, ...filings.map((f) => f.id));
  advanceCore(core, makeIsoDate(race.electionDate));
  for (let day = 0; day < 3 && !resultOf(api, race.id); day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const winnerId = resultOf(api, race.id)?.winnerId ?? null;
  advanceCore(core, addDays(makeIsoDate(race.electionDate), paperDays));
  const printed = (
    api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows() as unknown as PrintedRow[]
  ).filter((s) => s.kind === "press.printed" && s.date >= race.electionDate);
  return { core, where, race, winnerId, printed };
}
