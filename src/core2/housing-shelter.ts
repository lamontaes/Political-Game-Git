/**
 * Shelter is paid once. The core's outside living cost sends each
 * household's HUD Fair Market Rent outside the town
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
import type { CoreInput } from "./types";

const OUTSIDE_LIVING = "residents:outside-living:";
const COUNTED = `${OUTSIDE_LIVING}counted:`;
const HOUSEHOLD = "household:";
const CENTS = 100;

export function withoutOutsideShelter(
  input: CoreInput,
  /** Each household's monthly rent or mortgage payment through the housing engine. */
  paidByHousehold: ReadonlyMap<string, number>,
): CoreInput {
  const residents = input.residents;
  if (!residents) return input;
  const size = new Map<string, { placeId: string; members: number }>();
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
  const shelter = (homeId: string) => {
    const id = size.has(homeId) ? homeId : homeId.replace(HOUSEHOLD, "");
    const home = size.get(id);
    if (!home || home.members < 1) return 0;
    const rent = hudRentRowFor(home.placeId as EntityId);
    const fmr = rent
      ? (rent.rents[bedroomsForHousehold(home.members)] ?? 0) * CENTS
      : 0;
    return Math.min(fmr, paidByHousehold.get(id) ?? 0);
  };
  const flows = residents.flows.flatMap((flow) => {
    if (!flow.id.startsWith(OUTSIDE_LIVING)) return [flow];
    if (flow.id.startsWith(COUNTED)) {
      const parts: Record<string, number> = {};
      let amount = 0;
      for (const [key, value] of Object.entries(flow.amountByContract ?? {})) {
        const left = Math.max(0, value - shelter(key.replace(HOUSEHOLD, "")));
        if (left > 0) parts[key] = left;
        amount += left;
      }
      return amount > 0
        ? [{ ...flow, amountMinor: amount, amountByContract: parts }]
        : [];
    }
    const left = Math.max(
      0,
      flow.amountMinor - shelter(flow.id.slice(OUTSIDE_LIVING.length)),
    );
    return left > 0 ? [{ ...flow, amountMinor: left }] : [];
  });
  return { ...input, residents: { ...residents, flows } };
}
