/**
 * The Nation heading on News: laws other states passed lately, as a view over
 * the laws engine's own rows (owner, Oct 28: every screen is a view of the
 * same records; Nov 5: other places keep only the result). Nothing is stored
 * for it; the English engine words each law from its row, and the window is a
 * parameter (nationNewsDays), not a count. Registered stopgap
 * SG-WORDS-nation-window-not-interest.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { parameter } from "../core2/parameters";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { wordNationLaw } from "./archive-words";

interface LawRow {
  readonly id: string;
  readonly jurisdiction: string;
  readonly series: string;
  readonly effectiveDate: string;
  readonly terms?: Record<string, unknown>;
}

/** The stories for News, newest first, under one outlet named for the heading. */
export function nationStories(core: CoreState, heading: string) {
  if (!core.modules.has(LAWS_MODULE_ID)) return [];
  const api = coreAPI(core);
  const since = addDays(
    makeIsoDate(core.date),
    -parameter("nationNewsDays", core.data.parameters),
  );
  const names = new Map(
    corePlaceStateIdentities().map((row) => [row.jurisdictionKey, row.name]),
  );
  const outlet = { id: "nation", name: heading, layout: "broadsheet" };
  const laws = (
    api.moduleState(LAWS_MODULE_ID).table("laws").rows() as unknown as LawRow[]
  )
    // A law another state's own session passed (an outside session marks its
    // law with the session id), not one in the town's chain.
    .filter(
      (law) =>
        typeof law.terms?.session === "string" &&
        law.effectiveDate > since &&
        law.effectiveDate <= core.date &&
        names.has(law.jurisdiction),
    )
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const stories = [];
  for (const law of laws) {
    const words = wordNationLaw(core, {
      id: law.id,
      series: law.series,
      date: law.effectiveDate,
      stateName: names.get(law.jurisdiction)!,
    });
    if (words)
      stories.push({
        id: law.id,
        date: law.effectiveDate,
        kind: "nation.law",
        fresh: true,
        facts: {},
        ...words,
        outlet,
      });
  }
  return stories;
}
