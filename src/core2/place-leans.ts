/**
 * Where each counted place's people stand, carried forward (calibration audit, family 6;
 * CTO, Nov 17, 02:49Z). A place's lean is its right share with nothing at stake. It is
 * kept here, one row a place, and moves only by the place's own last result: the part of
 * that result that was the place's own (its state's conditions against the nation's), not
 * the year's national tide and not the candidates. The published 2024 map is read only
 * for a place that has never been counted and was given no opening lean.
 *
 * One writer (`carryLeans`), one reader (`leanOf`), and `setOpeningLean` for a world whose
 * history hands each place its opening lean. The voting module owns the table and passes
 * it in; the readers below name it by its id, so this file loads no module.
 */

import { stateRightShare, statePlaces } from "./electorate-places";
import type { CoreAPI } from "./types";
import { VOTING_MODULE_ID } from "./voting-module-id";

/** One place's lean as the world keeps it. */
export interface LeanRow {
  readonly id: string;
  readonly placeId: string;
  /** The right share its people would give with nothing at stake, now. */
  readonly rightShare: number;
  /** Where it stood before any count of the played world moved it. */
  readonly opening: number;
  /** What set the opening value: the history's last record, or the lean the first count read. */
  readonly source: string;
  /**
   * The election day now being carried: the lean as the day opened and each contest's own
   * move, so several contests counted in one place on one day move it once, by their mean.
   */
  readonly day?: {
    readonly date: string;
    readonly base: number;
    readonly sum: number;
    readonly contests: number;
  };
  /** The last contest that moved it, for dev mode's trace. */
  readonly last?: {
    readonly contestId: string;
    readonly date: string;
    /** The lean the contest was counted on, and the right share it gave. */
    readonly countedOn: number;
    readonly result: number | null;
    /** The part of the result that was the place's own. */
    readonly ownMove: number;
    readonly strength: number;
  };
}

/** The voting module's `leans` table, as this file reads and writes it. */
export interface LeanTable {
  get(id: string): unknown;
  put(row: { id: string }): unknown;
}

export const leanId = (placeId: string) => `lean:${placeId}`;

const clamp = (share: number) => Math.max(0, Math.min(1, share));

export function leanRow(rows: LeanTable, placeId: string): LeanRow | undefined {
  return rows.get(leanId(placeId)) as LeanRow | undefined;
}

/**
 * A place's lean: its own row; else, where its state is kept as one place (a history that
 * counts states), its published distance from its state laid on the state's row; else the
 * value the caller read for it.
 */
export function leanOf(
  rows: LeanTable,
  place: { readonly id: string; readonly rightShare: number },
  /** The place's state as one place, with the published share the place's own is measured from. */
  state?: { readonly id: string; readonly rightShare: number } | null,
): number {
  const own = leanRow(rows, place.id);
  if (own) return own.rightShare;
  const kept = state ? leanRow(rows, state.id) : undefined;
  return kept && state
    ? clamp(kept.rightShare + (place.rightShare - state.rightShare))
    : place.rightShare;
}

/** Each place with its kept lean laid over the value read for it. */
export function withLeans<
  Place extends { readonly id: string; readonly rightShare: number },
>(
  rows: LeanTable,
  places: readonly Place[],
  state?: { readonly id: string; readonly rightShare: number } | null,
): readonly Place[] {
  return places.map((place) => {
    const rightShare = leanOf(rows, place, state);
    return rightShare === place.rightShare ? place : { ...place, rightShare };
  });
}

/** A place's opening lean, set before any count (a history's last record of it). */
export function setOpeningLean(
  rows: LeanTable,
  placeId: string,
  rightShare: number,
  source: string,
): void {
  const row: LeanRow = {
    id: leanId(placeId),
    placeId,
    rightShare: clamp(rightShare),
    opening: clamp(rightShare),
    source,
  };
  rows.put(row);
}

/**
 * Carry one contest's count into its places' leans. Each place moves by `strength` times
 * its own move: the part of its result that came from the place's own conditions, which
 * the caller finds by counting the place twice with no candidate standing, once with those
 * conditions and once without (`ownMoves`, electorate.ts). With nothing of its own at
 * stake a place's own move is exactly nothing, so its lean stays where it is however many
 * elections pass.
 */
export function carryLeans(
  rows: LeanTable,
  input: {
    readonly date: string;
    readonly contestId: string;
    /** How much of a place's own move stays with it to the next election, 0 to 1. */
    readonly strength: number;
    readonly places: readonly {
      readonly placeId: string;
      /** The lean the contest counted the place on. */
      readonly lean: number;
      readonly ownMove: number;
      /** The right share the count gave there; null where no one voted. */
      readonly result: number | null;
    }[];
  },
): void {
  for (const place of input.places) {
    if (!Number.isFinite(place.ownMove)) continue;
    const held = leanRow(rows, place.placeId);
    // A place counted for the first time with nothing of its own at stake keeps no row.
    if (!held && place.ownMove === 0) continue;
    const day =
      held?.day?.date === input.date
        ? {
            date: input.date,
            base: held.day.base,
            sum: held.day.sum + place.ownMove,
            contests: held.day.contests + 1,
          }
        : {
            date: input.date,
            base: held?.rightShare ?? place.lean,
            sum: place.ownMove,
            contests: 1,
          };
    const row: LeanRow = {
      id: leanId(place.placeId),
      placeId: place.placeId,
      rightShare: clamp(day.base + (input.strength * day.sum) / day.contests),
      opening: held?.opening ?? place.lean,
      source:
        held?.source ??
        "The lean its first count read (the published map moved by this world's swing).",
      day,
      last: {
        contestId: input.contestId,
        date: input.date,
        countedOn: place.lean,
        result: place.result,
        ownMove: place.ownMove,
        strength: input.strength,
      },
    };
    rows.put(row);
  }
}

/** The kept leans of a world, or null where its elections keep none (the voting module is not installed). */
function leansOf(api: CoreAPI): LeanTable | null {
  return api.state.modules.has(VOTING_MODULE_ID)
    ? (api.moduleState(VOTING_MODULE_ID).table("leans") as LeanTable)
    : null;
}

/**
 * A state's counted places at the leans the world keeps for them: the one reader every
 * count outside the town takes its places through.
 */
export function keptPlaces<
  Place extends { readonly id: string; readonly rightShare: number },
>(api: CoreAPI, usps: string, places: readonly Place[]): readonly Place[] {
  const rows = leansOf(api);
  if (!rows || !places.length) return places;
  const published = stateRightShare(usps, api.state.seed);
  return withLeans(
    rows,
    places,
    published === null ? null : { id: `state:${usps}`, rightShare: published },
  );
}

/** A state's whole right share as its places' kept leans give it, weighted as the published share is; null where the state has no counted place. */
export function keptStateRightShare(api: CoreAPI, usps: string): number | null {
  const places = keptPlaces(api, usps, statePlaces(usps, api.state.seed));
  const votes = places.reduce((sum, place) => sum + place.votes2024, 0);
  return votes
    ? places.reduce(
        (sum, place) => sum + place.votes2024 * place.rightShare,
        0,
      ) / votes
    : null;
}
