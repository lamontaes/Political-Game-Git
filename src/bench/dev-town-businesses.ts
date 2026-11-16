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
import { countedHeadcountOf } from "../core2/residents-economy";
import type { TownBusinessCount } from "../core2/town-establishments";
import { TOWN_WORKPLACES } from "../core2/town-workplaces";

export interface TownBusinessRow {
  readonly id: string;
  readonly name: string;
  readonly workers: number;
  readonly closedAt: string | null;
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
  const groups = new Map<string, TownBusinessRow[]>();
  for (const [id, book] of core.finance.businesses) {
    const organization = core.organizations.get(id);
    if (!organization || organization.placeId !== placeId) continue;
    if (organization.outsideFlow) continue;
    const classification = organization.classification ?? organization.kind;
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
