/**
 * The world's own head count (family 14, "every reader uses the world's live population").
 *
 * It keeps nothing of its own. The town and the county are the people on record at those
 * places today: full people by name, counted households by the weight each stands for (one
 * model, two tiers). A state is its row in the country tier, which already takes the played
 * places' part out and puts today's count back each month; the nation is the sum of the rows.
 * Births, deaths and moves reach every reader because they change those records.
 *
 * Before the country tier opens there is no state row, so a state is read as the tier opens it
 * (`openingStatePeople`, the one place that figure is named).
 */
import type { CoreAPI, CoreState } from "./types";
import { lawChain } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { placeChain } from "./place-map";

/** Module and table the country tier keeps its state rows in (macro.ts holds the same names). */
const TIER_MODULE = "macro";
const TIER_TABLE = "countryStates";

interface TierRow {
  readonly key: string;
  readonly children: number;
  readonly cells: readonly { readonly people: number }[];
}

const cache = new WeakMap<
  CoreState,
  { date: string; people: number; byPlace: Map<string, number> }
>();

/** Every place's living people today, named and counted, in one pass. */
function byPlace(core: CoreState): Map<string, number> {
  const held = cache.get(core);
  if (held && held.date === core.date && held.people === core.people.size)
    return held.byPlace;
  const out = new Map<string, number>();
  for (const [placeId, ids] of core.peopleByPlace) {
    let n = 0;
    for (const id of ids) if (core.people.get(id)?.alive) n += 1;
    if (n) out.set(placeId, n);
  }
  const rt = residentsRuntime(core);
  if (rt)
    for (const h of rt.store.liveHouseholds())
      out.set(h.placeId, (out.get(h.placeId) ?? 0) + rt.store.weightedCount(h));
  cache.set(core, {
    date: core.date,
    people: core.people.size,
    byPlace: out,
  });
  return out;
}

/** The played town's people today. */
export function townPopulation(api: CoreAPI): number {
  const core = api.state as CoreState;
  return byPlace(core).get(lawChain(api).townPlaceId) ?? 0;
}

/** The people today at every place that sits in one county (`county:<geoid>`), the town's part included. */
export function countyPopulation(api: CoreAPI, countyId: string): number {
  let n = 0;
  for (const [placeId, people] of byPlace(api.state as CoreState))
    if (
      placeId === countyId ||
      placeChain(placeId).some((row) => row.id === countyId)
    )
      n += people;
  return n;
}

function tierRows(api: CoreAPI): readonly TierRow[] {
  const core = api.state as CoreState;
  if (!core.modules.has(TIER_MODULE)) return [];
  return api
    .moduleState(TIER_MODULE)
    .table(TIER_TABLE)
    .rows() as unknown as readonly TierRow[];
}

const peopleOf = (row: TierRow) =>
  row.cells.reduce((n, cell) => n + cell.people, row.children);

/** A state's people today, by its jurisdiction key (`US-UT`), or undefined before the tier holds it. */
export function statePopulation(api: CoreAPI, key: string): number | undefined {
  const row = tierRows(api).find((own) => own.key === key);
  return row ? peopleOf(row) : undefined;
}

/** The nation's people today: the sum of the state rows, or undefined before the tier opens. */
export function nationPopulation(api: CoreAPI): number | undefined {
  const rows = tierRows(api);
  return rows.length
    ? rows.reduce((n, row) => n + peopleOf(row), 0)
    : undefined;
}
