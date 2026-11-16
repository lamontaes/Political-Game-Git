/**
 * A town's clinic is paid by patients from outside it as well: sized once at
 * the opening as its planned receipts less the town's own care, with the
 * Medicaid part following the town's Medicaid coverage. Danville,
 * Pennsylvania (4218136, seed ilt-danville), where the town's own care met
 * about two fifths of its clinic's plan. Pinned place and seed, never drawn.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { DevMode } from "../bench/dev-mode";
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import type { CoreState } from "./types";
import type { ClinicReceiptsRow, OutsidePatientsRow } from "./medical-bills";

const PLACE = "4218136";
const SEED = "ilt-danville";
const DAYS = 95;

function run(cut: boolean) {
  setBookkeeping(false);
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const core = world.core;
  const c = core as unknown as CoreState;
  if (cut)
    new DevMode(
      core,
      world.director,
      new BenchPlayer(core, world.director),
      world.placeId,
    ).setLaw({
      level: "state",
      series:
        "us-policy-positions:health-human-services.expand-medicaid-eligibility",
      value: 0,
    });
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  const state = coreAPI(core).moduleState(COVERAGE_MODULE_ID);
  const outside = (
    state.table("outsidePatients").rows() as unknown as OutsidePatientsRow[]
  ).find((row) => row.sellers.length > 0);
  const seller = outside?.sellers[0];
  const receipts = seller
    ? (state
        .table("clinicReceipts")
        .get(`clinic-receipts:${seller.sellerId}`) as
        ClinicReceiptsRow | undefined)
    : undefined;
  return {
    outside,
    receipts,
    sales: seller
      ? c.finance.businesses.get(seller.sellerId)!.salesReceivedMinor
      : 0,
  };
}

describe(
  "a town's clinic has patients from outside it",
  { timeout: 240_000 },
  () => {
    it("Danville: sized once at the opening, kept by seller, and a Medicaid cut reaches it", () => {
      const control = run(false);
      expect(control.outside).toBeDefined();
      expect(control.receipts).toBeDefined();
      // The outside patients are a real part of the month's receipts, and every payer shows.
      expect(control.receipts!.outsideMinor).toBeGreaterThan(0);
      expect(control.receipts!.medicaidMinor).toBeGreaterThan(0);
      expect(control.receipts!.patientMinor).toBeGreaterThan(0);
      // With them the clinic sells most of what its books plan.
      expect(control.sales).toBeGreaterThan(
        control.receipts!.plannedMinor * 3 * 0.7,
      );
      const cut = run(true);
      // The state ends its expansion: the town's Medicaid coverage falls, and so do the outside patients' Medicaid part and the clinic's receipts.
      expect(cut.outside!.medicaidShareNow).toBeLessThan(
        cut.outside!.openingMedicaidShare,
      );
      expect(cut.receipts!.outsideMinor).toBeLessThan(
        control.receipts!.outsideMinor,
      );
      expect(cut.sales).toBeLessThan(control.sales);
    });
  },
);
