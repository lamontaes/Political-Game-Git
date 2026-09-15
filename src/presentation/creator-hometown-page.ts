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
  /** A plain statement of what is shown, never "every town in the country". */
  readonly status: string;
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
  const searched = query.trim().length > 0;
  const noun = total === 1 ? "place" : "places";
  let status: string;
  if (total === 0) {
    status = searched ? "Nothing here matches that yet." : "";
  } else if (total <= pageSize) {
    status = searched
      ? `${total} matching ${noun}.`
      : `All ${total} ${noun} the game lists in this state.`;
  } else {
    status = `Showing ${safeOffset + 1}–${safeOffset + places.length} of ${total} ${searched ? `matching ${noun}` : `${noun} in this state`}.`;
  }
  return {
    places,
    total,
    offset: safeOffset,
    page: Math.floor(safeOffset / pageSize) + 1,
    pageCount,
    hasPrevious: safeOffset > 0,
    hasNext: safeOffset + pageSize < total,
    status,
  };
}
