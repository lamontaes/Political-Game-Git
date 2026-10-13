/**
 * Shelter is paid once. The core's stand-in living cost (SG-CORE-outside-
 * living-costs) sends each household's HUD Fair Market Rent outside the town
 * every month; with the housing engine, renters pay their landlord and owners
 * their mortgage holder, so what each household now pays for its home comes
 * out of that rent, up to the rent. The rest (an owner's taxes, insurance and
 * upkeep) still leaves the town.
 */
import {
  bedroomsForHousehold,
  hudRentRowFor,
} from "../simulation/living-world/town-rent";
import type { EntityId } from "../simulation/types";
import { residentsRuntime } from "./modules/residents";
import type { ResidentFlowInput } from "./residents";
import type { CoreInput, CoreState } from "./types";

const OUTSIDE_LIVING = "residents:outside-living:";
const COUNTED = `${OUTSIDE_LIVING}counted:`;
const HOUSEHOLD = "household:";
const CENTS = 100;

type Homes = Map<string, { placeId: string; members: number }>;

/** What of a household's HUD rent its housing bills already pay. */
function shelterOf(
  sizes: Homes,
  paidByHousehold: ReadonlyMap<string, number>,
): (homeId: string) => number {
  return (homeId) => {
    const id = sizes.has(homeId) ? homeId : homeId.replace(HOUSEHOLD, "");
    const home = sizes.get(id);
    if (!home || home.members < 1) return 0;
    const rent = hudRentRowFor(home.placeId as EntityId);
    const fmr = rent
      ? (rent.rents[bedroomsForHousehold(home.members)] ?? 0) * CENTS
      : 0;
    return Math.min(fmr, paidByHousehold.get(id) ?? 0);
  };
}

/** An outside-living flow with each household's shelter taken out: its new amount and parts, or nothing for another flow. */
function leftAfterShelter(
  flow: Pick<ResidentFlowInput, "id" | "amountMinor" | "amountByContract">,
  shelter: (homeId: string) => number,
): { amountMinor: number; amountByContract?: Record<string, number> } | null {
  if (!flow.id.startsWith(OUTSIDE_LIVING)) return null;
  if (flow.id.startsWith(COUNTED)) {
    const parts: Record<string, number> = {};
    let amount = 0;
    for (const [key, value] of Object.entries(flow.amountByContract ?? {})) {
      const left = Math.max(0, value - shelter(key.replace(HOUSEHOLD, "")));
      if (left > 0) parts[key] = left;
      amount += left;
    }
    return { amountMinor: amount, amountByContract: parts };
  }
  return {
    amountMinor: Math.max(
      0,
      flow.amountMinor - shelter(flow.id.slice(OUTSIDE_LIVING.length)),
    ),
  };
}

export function withoutOutsideShelter(
  input: CoreInput,
  /** Each household's monthly rent or mortgage payment through the housing engine. */
  paidByHousehold: ReadonlyMap<string, number>,
): CoreInput {
  const residents = input.residents;
  if (!residents) return input;
  const size: Homes = new Map();
  for (const home of input.households)
    size.set(home.id, {
      placeId: home.placeId,
      members: home.memberIds.length,
    });
  for (const row of residents.households)
    size.set(row.household.id, {
      placeId: row.household.placeId,
      members: row.household.memberIds.length,
    });
  const shelter = shelterOf(size, paidByHousehold);
  const flows = residents.flows.flatMap((flow) => {
    const left = leftAfterShelter(flow, shelter);
    if (!left) return [flow];
    return left.amountMinor > 0 ? [{ ...flow, ...left }] : [];
  });
  return { ...input, residents: { ...residents, flows } };
}

/**
 * The same, in a running world: when housing's bills begin on its first
 * day, the outside living-cost flows stop carrying the shelter those bills
 * now pay. A flow left with nothing pays nothing.
 */
export function removeOutsideShelter(
  core: CoreState,
  paidByHousehold: ReadonlyMap<string, number>,
): void {
  const rt = residentsRuntime(core);
  if (!rt) return;
  const size: Homes = new Map();
  for (const home of core.households.values())
    size.set(home.id, {
      placeId: home.placeId,
      members: home.memberIds.length,
    });
  for (const row of rt.households.values())
    size.set(row.household.id, {
      placeId: row.household.placeId,
      members: row.household.memberIds.length,
    });
  const shelter = shelterOf(size, paidByHousehold);
  for (const flow of rt.flows.values()) {
    if (flow.endedAt) continue;
    const left = leftAfterShelter(flow, shelter);
    if (!left) continue;
    flow.amountMinor = left.amountMinor;
    if (left.amountByContract) flow.amountByContract = left.amountByContract;
  }
}
