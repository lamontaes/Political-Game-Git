import {
  lifePlaceSearchPage,
  type LifePlace,
  type LifePlaceSearchOptions,
} from "../simulation";

export const HOMETOWN_PAGE_SIZE = 24;

export interface HometownPage {
  readonly places: readonly LifePlace[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly page: number;
  readonly pageCount: number;
  readonly showingFrom: number;
  readonly showingTo: number;
  /** Honest status: a short Nevada list is not "every town in the country". */
  readonly status: string;
}

export function projectHometownPage(
  query: string,
  offset: number,
  options: LifePlaceSearchOptions,
): HometownPage {
  const limit = HOMETOWN_PAGE_SIZE;
  const safeOffset = Math.max(0, offset);
  const result = lifePlaceSearchPage(query, {
    ...options,
    limit,
    offset: safeOffset,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / limit) || 1);
  const page = result.total === 0 ? 1 : Math.floor(result.offset / limit) + 1;
  const showingFrom = result.total === 0 ? 0 : result.offset + 1;
  const showingTo = result.offset + result.places.length;
  const searched = query.trim().length > 0;
  let status: string;
  if (result.total === 0) {
    status = searched
      ? "Nothing here matches that yet."
      : "Choose a town in this state.";
  } else if (result.total <= limit && !searched) {
    status = `These are all ${result.total} towns the game lists in this state.`;
  } else if (result.total <= limit) {
    status = `Showing all ${result.total} matching towns.`;
  } else {
    status = `Showing ${showingFrom}–${showingTo} of ${result.total} towns${searched ? " matching this search" : " in this state"}. This is not every place in the country.`;
  }
  return {
    places: result.places,
    total: result.total,
    offset: result.offset,
    limit,
    page,
    pageCount,
    showingFrom,
    showingTo,
    status,
  };
}
