/**
 * Dev mode's view of the town's businesses (owner, Nov 16: "the dev mode
 * stuff should be built immediately, so that way it can be traced, easily
 * within the game"): for each kind, how many are open, how many closed and
 * opened since the opening, how many people they employ now, and why the
 * town opened with as many as it did (the town's workers in the kind over
 * the county's usual business size, from the opening's own record). Every
 * business is listed with its id, so the trace opens its books. It reads
 * only; it writes nothing and spends no time.
 */
import type { CoreState } from "../core2/types";
import { countedHeadcountOf } from "../core2/modules/people";
import {
  DEFAULT_BUSINESS_BOOKS_DATA,
  TOWN_WORKPLACES,
  type TownBusinessCount,
} from "../core2/modules/business";
import { BUSINESS_MODULE_ID } from "../core2/business-module-id";
import { coreAPI } from "../core2/state";

export interface TownBusinessRow {
  readonly id: string;
  readonly name: string;
  readonly workers: number;
  readonly closedAt: string | null;
  /** Full households that buy from it now (their everyday-living sellers). */
  readonly households: number;
  /** Households that came to it when another store closed or as a new store, and that left it when it closed. */
  readonly movedIn: number;
  readonly movedOut: number;
}

export interface TownBusinessKind {
  /** The workplace kind (`TOWN_WORKPLACES` key), or the classification when no kind lists it. */
  readonly kind: string;
  readonly classification: string;
  readonly open: number;
  readonly closed: number;
  /** Businesses of the kind past the ones the town opened with. */
  readonly openedSince: number;
  /** People employed now, counted workers at their weight. */
  readonly workers: number;
  /** Why the town opened with as many as it did; null for a kind it did not open with. */
  readonly opening: TownBusinessCount | null;
  readonly businesses: readonly TownBusinessRow[];
}

export interface TownBusinessesView {
  readonly placeId: string;
  /** Real residents each generated one stands for at the opening. */
  readonly countScale: number;
  readonly kinds: readonly TownBusinessKind[];
}

/** The town's businesses by kind, most workers first. */
export function townBusinesses(
  core: CoreState,
  placeId: string,
): TownBusinessesView {
  const kindOf = new Map(
    TOWN_WORKPLACES.map((row) => [row.classification as string, row.key]),
  );
  let opening: readonly TownBusinessCount[] = [];
  try {
    opening = JSON.parse(
      core.placeMetadata.openingBusinessCounts ?? "[]",
    ) as TownBusinessCount[];
  } catch {
    opening = [];
  }
  const openingOf = new Map(opening.map((row) => [row.kind, row]));
  // Who buys where, and who changed stores (the business engine's record).
  const households = new Map<string, number>();
  for (const plan of core.finance.livingPlans.values())
    for (const [id, amount] of plan.sellers)
      if (amount > 0) households.set(id, (households.get(id) ?? 0) + 1);
  const movedIn = new Map<string, number>(),
    movedOut = new Map<string, number>();
  if (core.modules.has(BUSINESS_MODULE_ID))
    for (const row of coreAPI(core)
      .moduleState(BUSINESS_MODULE_ID)
      .table("customerMoves")
      .rows() as unknown as { fromId: string; toId: string }[]) {
      movedIn.set(row.toId, (movedIn.get(row.toId) ?? 0) + 1);
      movedOut.set(row.fromId, (movedOut.get(row.fromId) ?? 0) + 1);
    }
  const groups = new Map<string, TownBusinessRow[]>();
  for (const [id, book] of core.finance.businesses) {
    const organization = core.organizations.get(id);
    if (!organization || organization.placeId !== placeId) continue;
    if (organization.outsideFlow) continue;
    // A business founded in play carries its kind on its books.
    const classification =
      organization.classification ??
      DEFAULT_BUSINESS_BOOKS_DATA.classifications.find(
        (row) => row.kindId === book.kindId,
      )?.classification ??
      organization.kind;
    let full = 0;
    if (!book.closedAt)
      for (const jobId of core.finance.jobsByOrganization.get(id) ?? [])
        if (core.jobs.get(jobId)?.endsAt === undefined) full += 1;
    const list = groups.get(classification) ?? [];
    list.push({
      id,
      name: organization.name,
      workers: book.closedAt ? 0 : full + countedHeadcountOf(core, id),
      closedAt: book.closedAt ?? null,
      households: households.get(id) ?? 0,
      movedIn: movedIn.get(id) ?? 0,
      movedOut: movedOut.get(id) ?? 0,
    });
    groups.set(classification, list);
  }
  const kinds: TownBusinessKind[] = [...groups].map(
    ([classification, rows]) => {
      const kind = kindOf.get(classification) ?? classification;
      const plan = openingOf.get(kind) ?? null;
      rows.sort((a, b) => b.workers - a.workers || a.id.localeCompare(b.id));
      return {
        kind,
        classification,
        open: rows.filter((row) => !row.closedAt).length,
        closed: rows.filter((row) => row.closedAt).length,
        openedSince: Math.max(0, rows.length - (plan?.count ?? 0)),
        workers: Math.round(rows.reduce((sum, row) => sum + row.workers, 0)),
        opening: plan,
        businesses: rows.map((row) => ({
          ...row,
          workers: Math.round(row.workers),
        })),
      };
    },
  );
  kinds.sort((a, b) => b.workers - a.workers || a.kind.localeCompare(b.kind));
  return {
    placeId,
    countScale: Number(core.placeMetadata.openingCountScale) || 1,
    kinds,
  };
}
