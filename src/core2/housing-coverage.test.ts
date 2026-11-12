import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "room-condition");

it(
  `houses every opening household and settles the added leases in ${place.name}, replay ${replay}, world ${place.seed}`,
  { timeout: 300_000 },
  () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const openingHomes = new Set(
      (JSON.parse(core.placeMetadata!.housingDwellings!) as [string][]).map(
        ([id]) => id,
      ),
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const homes = coreAPI(core).moduleState("housing").table("dwellings");
    const missing = [...core.households.values()].filter(
      (row) => !homes.get(`dwelling:${row.id}`),
    );
    expect(missing.map((row) => row.id)).toEqual([]);
    // Existing full and counted homes keep the opening's record too.
    for (const id of openingHomes)
      expect(homes.get(`dwelling:${id}`)).toBeDefined();
    const addedLeases = [...core.finance.contracts.values()].filter(
      (row) =>
        row.id.startsWith("lease:") &&
        row.householdId &&
        !openingHomes.has(row.householdId),
    );
    expect(addedLeases.length).toBeGreaterThan(0);
    for (const lease of addedLeases) {
      expect(lease.amountMinor).toBeGreaterThan(0);
      expect(core.organizations.has(lease.payeeId)).toBe(true);
      expect(lease.payerIds.length).toBeGreaterThan(0);
    }
    const householdCount = core.households.size;
    const dwellingCount = homes.rows().length;
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const paid = addedLeases.flatMap((lease) => {
      const receipt = core.finance.latestReceiptsByContract.get(lease.id);
      return receipt && receipt.paidMinor > 0 ? [receipt] : [];
    });
    expect(paid.length).toBeGreaterThan(0);
    const receipt = paid[0]!;
    expect(receipt.payeeAfterMinor - receipt.payeeBeforeMinor).toBe(
      receipt.paidMinor,
    );
    const payment = receipt.payments.find((row) => row.paidMinor > 0)!;
    const payer = core.people.get(payment.payerId)!;
    expect(payer).toBeDefined();
    expect(payment.payerBeforeMinor - payment.payerAfterMinor).toBe(
      payment.paidMinor,
    );
    console.log(
      JSON.stringify({
        town: place.name,
        key: place.key,
        replay,
        worldSeed: place.seed,
        householdCount,
        dwellingCount,
        missing: missing.length,
        addedLeases: addedLeases.length,
        paidLeases: paid.length,
        payer: { id: payer.id, name: `${payer.givenName} ${payer.familyName}` },
        receipt,
      }),
    );
  },
);
