/**
 * Business closures in the year before day one (owner, Oct 14, 2026): the
 * town's businesses start on day one, so the past carries the ones that
 * closed first, as records with a kind, a name, a former owner, the workers
 * and a date, for the news archive and for the people they touched.
 *
 * How many: the state's yearly exit share (BDS, the business engine's own
 * figure) of the town's businesses is the expected total, which only sizes the
 * year and is capped by the owners who could have retired. Which kinds: the
 * town's kinds in proportion to how many it has now (largest remainder, kinds
 * in id order). Who: the owner's age pull toward closing is the business
 * engine's (`businessCloseAgeWeight` past `jobsEarliestRetirementAge`), so
 * the former owner is the living resident furthest past that age who owns no
 * business now, and the recorded reason is the engine's own "retiring". No
 * roll decides any of it. Dates follow the same order: the closures are spaced
 * through the year, the owner furthest past retirement first.
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import {
  businessesIn,
  BUSINESS_MODULE_ID,
  ownerOf,
  stateExitShare,
} from "./modules/business";
import businessData from "./data/business/business.json" with { type: "json" };
import { businessName, businessNameContext } from "./business-names";
import type { PastTown } from "./past-bodies";
import { pastParameter, putPast, shiftDays } from "./past-module";
import type { CoreAPI, PersonState } from "./types";

export interface PastClosureRow {
  readonly id: string;
  readonly date: string;
  readonly placeId: string;
  readonly kindId: string;
  readonly name: string;
  readonly ownerId: string;
  /** The reason key the business engine records for an owner retiring. */
  readonly cause: string;
  /** Staff of a business of this kind in town today. */
  readonly workers: number;
}

/** The expected closures split across the town's kinds, largest remainder, kinds in id order. */
function closuresByKind(
  firms: readonly { kindId: string; staff: number }[],
  total: number,
): { kindId: string; workers: number }[] {
  const kinds = [...new Set(firms.map((f) => f.kindId))].sort();
  const raw = kinds.map((kindId) => {
    const of = firms.filter((f) => f.kindId === kindId);
    return {
      kindId,
      workers: Math.max(
        1,
        Math.round(of.reduce((sum, f) => sum + f.staff, 0) / of.length),
      ),
      exact: (total * of.length) / firms.length,
    };
  });
  const counts = new Map(raw.map((r) => [r.kindId, Math.floor(r.exact)]));
  let left = total - [...counts.values()].reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort(
    (a, b) =>
      b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) ||
      a.kindId.localeCompare(b.kindId),
  )) {
    if (left <= 0) break;
    counts.set(r.kindId, counts.get(r.kindId)! + 1);
    left -= 1;
  }
  return raw.flatMap((r) =>
    Array.from({ length: counts.get(r.kindId)! }, () => ({
      kindId: r.kindId,
      workers: r.workers,
    })),
  );
}

export function buildPastClosures(
  api: CoreAPI,
  town: PastTown,
): readonly PastClosureRow[] {
  if (!api.state.modules.has(BUSINESS_MODULE_ID)) return [];
  const firms = businessesIn(api, town.townPlaceId);
  if (!firms.length) return [];
  const expected = Math.round(firms.length * stateExitShare(api));
  const retirement = api.parameter("jobsEarliestRetirementAge");
  const opening = makeIsoDate(town.opening);
  // Former owners: living residents past retirement age owning nothing now,
  // furthest past it first (the engine's age pull is the same ordering).
  const former = [...(api.state.peopleByPlace.get(town.townPlaceId) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter(
      (p): p is PersonState =>
        !!p &&
        p.alive &&
        !firms.some((f) => ownerOf(api, f.id) === p.id) &&
        ageOnDate(makeIsoDate(p.birthDate), opening) >= retirement,
    )
    .sort(
      (a, b) =>
        a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
    );
  const plan = closuresByKind(firms, expected).slice(0, former.length);
  const days = pastParameter(api, "pastArchiveDays");
  const taken = new Set<string>(
    [...api.state.organizations.values()]
      .filter((row) => row.placeId === town.townPlaceId)
      .map((row) => row.name),
  );
  const rows = plan.map((closure, i): PastClosureRow => {
    const owner = former[i]!;
    const name =
      businessName(
        closure.kindId,
        businessNameContext(town.townPlaceId, owner.familyName),
        taken,
      ) ?? owner.familyName;
    taken.add(name);
    return {
      id: `past-closure:${town.townPlaceId}:${i + 1}`,
      date: shiftDays(
        opening,
        -days + Math.floor(((i + 0.5) * days) / plan.length),
      ),
      placeId: town.townPlaceId,
      kindId: closure.kindId,
      name,
      ownerId: owner.id,
      cause: businessData.reasons.retiring,
      workers: closure.workers,
    };
  });
  for (const row of rows) putPast(api, "closures", row);
  return rows;
}
