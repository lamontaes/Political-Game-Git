/**
 * The world has a past (owner, Oct 14, 2026). Opened once the government
 * modules have seated the day-one officeholders and loaded the law in force,
 * and before the story director starts: the prior elections and the winners'
 * promises, the prior term's votes, every law's history, the year's business closures, the news
 * archive and what the public knows about its figures, in that order, since
 * each reads the one before.
 */
import type { CoreState } from "./types";
import { coreAPI } from "./state";
import { buildLawHistories, buildPriorTerms } from "./past-laws";
import { buildPriorElections } from "./past-elections";
import { buildPastClosures } from "./past-business";
import { buildNewsArchive } from "./past-news";
import { buildPublicFigures } from "./past-public";
import { pastTown } from "./past-bodies";
import { openPastModule, pastTable, putPast } from "./past-module";

export interface PastSummary {
  readonly elections: number;
  readonly bills: number;
  readonly laws: number;
  readonly votes: number;
  readonly closures: number;
  readonly stories: number;
  readonly figures: number;
}

export function openThePast(core: CoreState, seed: string): PastSummary {
  openPastModule(core);
  const api = coreAPI(core);
  const done = pastTable(api, "loaded").get("opening") as unknown as
    PastSummary | undefined;
  if (done) return done;
  const town = pastTown(api, seed);
  const elections = buildPriorElections(api, town);
  const terms = buildPriorTerms(api, town, elections);
  const laws = buildLawHistories(api, town);
  const closures = buildPastClosures(api, town);
  const stories = buildNewsArchive(api, town, {
    elections,
    closures,
    histories: laws.histories,
    bills: terms.bills,
  });
  const figures = buildPublicFigures(api, town, {
    elections,
    histories: laws.histories,
  });
  const summary: PastSummary = {
    elections: elections.length,
    bills: terms.bills.length,
    laws: laws.histories.length,
    votes: terms.votes + laws.votes,
    closures: closures.length,
    stories: stories.length,
    figures: figures.length,
  };
  putPast(api, "loaded", { id: "opening", ...summary });
  return summary;
}
