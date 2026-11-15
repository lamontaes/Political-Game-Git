/**
 * Shelter is paid once. The core's stand-in living cost (SG-CORE-outside-
 * living-costs) sends each household's HUD Fair Market Rent outside the town
 * every month; with the housing engine, renters pay their landlord and owners
 * their mortgage holder, so what each household now pays for its home comes
 * out of that rent, up to the rent. An owner's property tax is billed by the
 * housing engine and counted in what the household pays, so it comes out of
 * the outside cost too and is paid once, to the treasury. The rest (insurance
 * and upkeep) still leaves the town.
 *
 * It is taken out once the housing past has restated the standing rents and
 * mortgages (housing-past.ts), so it reads the payment that stands, not the
 * one the opening first computed.
 */
import { bedroomsForHousehold, hudRentRowFor } from "./hud-rents";
import type { EntityId } from "./kernel/brands";
import { residentsRuntime } from "./modules/residents";
import {
  endResidentFlow,
  setFlowPart,
  setResidentFlowAmount,
} from "./residents-economy";
import type { CoreState } from "./types";

const OUTSIDE_LIVING = "residents:outside-living:";
const COUNTED = `${OUTSIDE_LIVING}counted:`;
const HOUSEHOLD = "household:";
const CENTS = 100;

/** Takes what each household pays for its home out of its outside living cost, up to the Fair Market Rent. */
export function takeShelterOutOfOutsideLiving(
  core: CoreState,
  /** Each household's monthly rent or mortgage payment and property tax, as they stand. */
  paidByHousehold: ReadonlyMap<string, number>,
): void {
  const rt = residentsRuntime(core);
  if (!rt) return;
  const shelter = (homeId: string) => {
    const id = homeId.startsWith(HOUSEHOLD)
      ? homeId.slice(HOUSEHOLD.length)
      : homeId;
    const full = core.households.get(id as never);
    const at = full ? undefined : rt.store.householdOf.get(id);
    const counted = at === undefined ? undefined : rt.store.households[at];
    const placeId = full?.placeId ?? counted?.placeId;
    const members = full
      ? full.memberIds.length
      : counted
        ? rt.store.memberIdsOf(counted).length
        : 0;
    if (!placeId || members < 1) return 0;
    const rent = hudRentRowFor(placeId as EntityId, core.seed);
    const fmr = rent
      ? (rent.rents[bedroomsForHousehold(members)] ?? 0) * CENTS
      : 0;
    return Math.min(fmr, paidByHousehold.get(id) ?? 0);
  };
  const reason = "its shelter is paid through the housing engine";
  for (const flow of [...rt.flows.values()]) {
    if (flow.endedAt || !flow.id.startsWith(OUTSIDE_LIVING)) continue;
    if (flow.id.startsWith(COUNTED)) {
      let left = 0;
      for (const [key, value] of Object.entries(flow.amountByContract ?? {})) {
        const kept = Math.max(0, value - shelter(key));
        setFlowPart(core, flow.id, key, kept);
        left += kept;
      }
      if (left <= 0) endResidentFlow(core, flow.id, reason);
      continue;
    }
    const kept = Math.max(
      0,
      flow.amountMinor - shelter(flow.id.slice(OUTSIDE_LIVING.length)),
    );
    if (kept > 0) setResidentFlowAmount(core, flow.id, kept);
    else endResidentFlow(core, flow.id, reason);
  }
}
