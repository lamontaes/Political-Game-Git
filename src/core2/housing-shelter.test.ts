/**
 * Shelter is paid once (pool item world-owner-property-tax-stays-in-town): in
 * a random place from all 56, what a household pays for its home through the
 * housing engine (rent, a mortgage, an owner's property tax) comes out of the
 * outside living cost, up to the HUD Fair Market Rent, and no more.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { withoutOutsideShelter } from "./housing-shelter";
import { bedroomsForHousehold, hudRentRowFor } from "./hud-rents";
import { corePlaceByKey } from "./place-lookup";
import type { CoreInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("takes the housing engine's payments, tax included, out of the outside cost", () => {
  const draw = drawPlace(seed, "housing-shelter");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const placeId = corePlaceByKey(draw.key)!.context.jurisdiction.id;
  const row = hudRentRowFor(placeId as never);
  if (!row) {
    console.log(`housing-shelter: no HUD rent row in ${where}`);
    return;
  }
  const members = 3;
  const fmr = (row.rents[bedroomsForHousehold(members)] ?? 0) * 100;
  expect(fmr, where).toBeGreaterThan(0);
  const home = "household:owner";
  const outside = fmr + 40_000;
  const input = {
    households: [{ id: home, placeId, memberIds: ["a", "b", "c"] }],
    residents: {
      households: [],
      flows: [
        {
          id: `residents:outside-living:${home}`,
          amountMinor: outside,
        },
      ],
    },
  } as unknown as CoreInput;
  const mortgage = Math.round(fmr / 2);
  const tax = Math.round(fmr / 5);
  const flowOf = (result: CoreInput) =>
    result.residents!.flows.find((f) =>
      f.id.startsWith("residents:outside-living:"),
    );
  // A mortgage alone leaves the rest of the cost outside.
  const alone = flowOf(
    withoutOutsideShelter(input, new Map([[home, mortgage]])),
  );
  expect(alone?.amountMinor, where).toBe(outside - mortgage);
  // The tax the housing engine bills adds to what is taken out, once.
  const withTax = flowOf(
    withoutOutsideShelter(input, new Map([[home, mortgage + tax]])),
  );
  expect(withTax?.amountMinor, where).toBe(outside - mortgage - tax);
  // Never more than the Fair Market Rent comes out.
  const capped = flowOf(
    withoutOutsideShelter(input, new Map([[home, fmr * 3]])),
  );
  expect(capped?.amountMinor, where).toBe(outside - fmr);
});
