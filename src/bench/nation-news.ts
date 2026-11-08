/**
 * The Nation heading on News: laws other states passed lately, as a view over
 * the laws engine's own rows (owner, Oct 28: every screen is a view of the
 * same records; Nov 5: other places keep only the result; the CTO, Nov 6:
 * tell the ones that matter to this reader by reach and ties, no hand cap).
 * Nothing is stored for it; the English engine words each law from its row
 * when the paper opens.
 *
 * A law is told when its reach (its state's share of the nation's people,
 * `state-reach.json`) times one plus the reader's ties to that state (family
 * there, work there, a state next door) clears `nationNewsReachBar`. Moving
 * away from a state is not yet a tie: the person keeps no record of where
 * they came from (SG-WORDS-nation-no-moved-from-tie).
 */
import reach from "../core2/data/places/state-reach.json" with { type: "json" };
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { parameter } from "../core2/parameters";
import { corePlaceStateIdentities } from "../core2/places";
import { placeStateKey } from "../core2/place-map";
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

const STATES = reach.states as Record<
  string,
  { readonly population: number; readonly borders: readonly string[] }
>;

/** The state keys ("US-VT") a reader has family or work in, and the state they live in. */
function readerStates(core: CoreState, readerId: string | undefined) {
  const family = new Set<string>();
  const work = new Set<string>();
  let home: string | null = null;
  const reader = readerId ? core.people.get(readerId) : undefined;
  if (!reader) return { family, work, home };
  home = placeStateKey(reader.placeId);
  for (const id of reader.familyIds) {
    const state = placeStateKey(core.people.get(id)?.placeId);
    if (state) family.add(state);
  }
  for (const job of core.jobs.values()) {
    if (job.personId !== reader.id || job.endsAt !== undefined) continue;
    const state = placeStateKey(
      core.organizations.get(job.organizationId as never)?.placeId,
    );
    if (state) work.add(state);
  }
  return { family, work, home };
}

/**
 * How newsworthy a law in `stateKey` is to this reader: its state's share of
 * the nation, times one plus what the reader's family, work and a shared
 * border add.
 */
export function nationScore(
  core: CoreState,
  readerId: string | undefined,
  stateKey: string,
): number {
  const usps = stateKey.replace(/^US-/, "");
  const state = STATES[usps];
  if (!state) return 0;
  const { family, work, home } = readerStates(core, readerId);
  const params = core.data.parameters;
  const ties =
    (family.has(stateKey) ? parameter("nationNewsFamilyTie", params) : 0) +
    (work.has(stateKey) ? parameter("nationNewsWorkTie", params) : 0) +
    (home && state.borders.includes(home.replace(/^US-/, ""))
      ? parameter("nationNewsNeighborTie", params)
      : 0);
  return (state.population / reach.nationalPopulation) * (1 + ties);
}

/** Every law another state's own session passed in the window, newest first, before any reader's choice. */
export function nationLaws(core: CoreState): readonly LawRow[] {
  if (!core.modules.has(LAWS_MODULE_ID)) return [];
  const since = addDays(
    makeIsoDate(core.date),
    -parameter("nationNewsDays", core.data.parameters),
  );
  const names = new Set(
    corePlaceStateIdentities().map((row) => row.jurisdictionKey),
  );
  return (
    (
      coreAPI(core)
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRow[]
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
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
  );
}

/** The stories for News, newest first, under one outlet named for the heading. */
export function nationStories(
  core: CoreState,
  heading: string,
  readerId?: string,
) {
  const names = new Map(
    corePlaceStateIdentities().map((row) => [row.jurisdictionKey, row.name]),
  );
  const bar = parameter("nationNewsReachBar", core.data.parameters);
  const outlet = { id: "nation", name: heading, layout: "broadsheet" };
  const stories = [];
  for (const law of nationLaws(core)) {
    if (nationScore(core, readerId, law.jurisdiction) < bar) continue;
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
