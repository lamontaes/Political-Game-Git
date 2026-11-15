/**
 * Shelter is paid once (pool item world-owner-property-tax-stays-in-town): what
 * a household pays for its home through the housing engine (rent, a mortgage,
 * an owner's property tax) comes out of its outside living cost, up to the HUD
 * Fair Market Rent, and no more. It is taken out after the housing past has
 * restated the standing rents and mortgages, so it reads the payment that
 * stands. Pinned to Matagorda, Texas on seed pt1:0 so a draw never decides it.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { takeShelterOutOfOutsideLiving } from "./housing-shelter";
import { bedroomsForHousehold, hudRentRowFor } from "./hud-rents";
import { MORTGAGE_PREFIX } from "./housing-mortgages";
import { residentsRuntime } from "./modules/residents";
import { setResidentFlowAmount } from "./residents-economy";
import { coreAPI } from "./state";
import { stateEffectiveRate } from "./housing-property-tax";
import { standingHomePayments } from "./modules/housing";

it("takes the standing payments out of the outside cost, never more than the Fair Market Rent", () => {
  const draw = drawPlace("pt1:0", "session-a-property-tax");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const rt = residentsRuntime(core)!;
  // A full household that has an outside living cost to take shelter out of.
  const flowOf = (id: string) => rt.flows.get(`residents:outside-living:${id}`);
  const home = [...core.households.values()].find((h) => {
    const flow = flowOf(h.id);
    return (
      flow &&
      !flow.endedAt &&
      (hudRentRowFor(h.placeId as never, core.seed)?.rents[
        bedroomsForHousehold(h.memberIds.length)
      ] ?? 0) > 0
    );
  });
  expect(home, where).toBeDefined();
  const rent = hudRentRowFor(home!.placeId as never, core.seed)!;
  const fmr =
    (rent.rents[bedroomsForHousehold(home!.memberIds.length)] ?? 0) * 100;
  const before = 10 * fmr;
  setResidentFlowAmount(core, `residents:outside-living:${home!.id}`, before);
  // A payment under the rent comes out whole.
  const mortgage = Math.round(fmr / 2);
  takeShelterOutOfOutsideLiving(core, new Map([[home!.id, mortgage]]));
  expect(flowOf(home!.id)!.amountMinor, where).toBe(before - mortgage);
  // More than the rent takes the rent and no more.
  takeShelterOutOfOutsideLiving(core, new Map([[home!.id, fmr * 3]]));
  expect(flowOf(home!.id)!.amountMinor, where).toBe(before - mortgage - fmr);
}, 120_000);

it("what shelter is taken out by is the mortgage payment that stands after the housing past", () => {
  const draw = drawPlace("pt1:0", "session-a-property-tax");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const paid = standingHomePayments(api);
  const dwellings = new Map(
    (
      api.moduleState("housing").table("dwellings").rows() as unknown as {
        householdId: string;
        valueMinor?: number;
        usps?: string;
      }[]
    ).map((row) => [row.householdId, row]),
  );
  let restated = 0;
  for (const row of api
    .moduleState("housing")
    .table("mortgages")
    .rows() as unknown as {
    householdId: string;
    boughtYear: number;
    paymentMinor: number;
  }[]) {
    const contract = core.finance.contracts.get(
      `${MORTGAGE_PREFIX}${row.householdId}`,
    );
    if (!contract) continue;
    const home = dwellings.get(row.householdId)!;
    const tax = Math.round(
      (home.valueMinor! *
        stateEffectiveRate(
          home.usps ?? core.placeMetadata?.housingState ?? "",
        )) /
        12,
    );
    // The contract the household pays is the restated payment, and the shelter it replaces is that payment and the tax.
    expect(contract.amountMinor, `${where} ${row.householdId}`).toBe(
      row.paymentMinor,
    );
    expect(paid.get(row.householdId), `${where} ${row.householdId}`).toBe(
      contract.amountMinor + tax,
    );
    restated++;
  }
  expect(restated, where).toBeGreaterThan(5);
}, 120_000);
