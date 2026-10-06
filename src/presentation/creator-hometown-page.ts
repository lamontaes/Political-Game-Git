import { placeStartFacts } from "./place-start-summary";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import {
  lifePlaceSearch,
  type LifePlace,
  type LifePlaceSearchOptions,
} from "../simulation";

/**
 * One honest page of hometown choices (UI FINISH, after UX #254).
 *
 * The creator used to ask for the first 24 matches and draw them with nothing
 * saying there were more, so a Nevada list that stopped at "Dyer" read as all
 * of Nevada. This asks the same accepted search for every match, then shows a
 * page of them and says which page it is. Searching and paging are free and
 * change nothing in the setup.
 */
export const HOMETOWN_PAGE_SIZE = 24;

export interface HometownPage {
  readonly places: readonly LifePlace[];
  readonly total: number;
  readonly offset: number;
  readonly page: number;
  readonly pageCount: number;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
}

export function projectHometownPage(
  query: string,
  offset: number,
  options: LifePlaceSearchOptions,
  pageSize: number = HOMETOWN_PAGE_SIZE,
): HometownPage {
  const all = lifePlaceSearch(query, Number.MAX_SAFE_INTEGER, options);
  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const lastOffset = (pageCount - 1) * pageSize;
  const safeOffset = Math.min(
    Math.max(0, Math.floor(offset / pageSize) * pageSize),
    lastOffset,
  );
  const places = all.slice(safeOffset, safeOffset + pageSize);
  return {
    places,
    total,
    offset: safeOffset,
    page: Math.floor(safeOffset / pageSize) + 1,
    pageCount,
    hasPrevious: safeOffset > 0,
    hasNext: safeOffset + pageSize < total,
  };
}

/** Place-level sourced counts stay labeled by period; county totals never become town populations. */
export function hometownChoiceSubtitle(place: LifePlace): string {
  const county = placeStartFacts(place).find(
    (fact) => fact.kind === "county",
  )?.text;
  const population = place.sourceGeoid
    ? placeReferencePopulation(place.sourceGeoid)
    : null;
  return [
    county,
    population
      ? `${new Intl.NumberFormat("en-US").format(population.value)} people (${population.source === "census-estimate-2025" ? "2025 estimate" : "2020–2024 estimate"})`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
