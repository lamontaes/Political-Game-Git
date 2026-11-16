/**
 * A seller is paid each payer's part of a bill from the coverage record: the
 * patient's share, Medicaid's part (the treasuries), Medicare's whole part
 * (the federal treasury) and an employer plan's insurer's part (the outside
 * account where premiums went). West Union, Ohio (3984294, seed
 * ilt-west-union): Chen Family Clinic, 38 staff. Before, the clinic was paid
 * only the patient's share and Medicaid's part, about 28 percent of its
 * planned month; a state Medicaid cut now lowers its receipts, and a Medicare
 * line raise moves them only through patients who could not pay. Pinned place
 * and seed, never drawn.
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
import type { MedicalBillRow } from "./medical-bills";

const PLACE = "3984294";
const SEED = "ilt-west-union";
const DAYS = 95;

function clinicReceipts(cut: boolean) {
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
  const clinic = [...c.organizations.values()].find(
    (o) => o.name === "Chen Family Clinic",
  )!;
  const rows = coreAPI(core)
    .moduleState(COVERAGE_MODULE_ID)
    .table("medicalBills")
    .rows() as unknown as MedicalBillRow[];
  const parts = { patient: 0, medicaid: 0, medicare: 0, insurer: 0 };
  for (const row of rows)
    if (row.sellerId === clinic.id)
      for (const m of row.members) {
        parts.patient += m.billMinor * row.weight;
        parts.medicaid += (m.medicaidMinor ?? 0) * row.weight;
        parts.medicare += (m.medicarePartMinor ?? 0) * row.weight;
        parts.insurer += (m.insurerMinor ?? 0) * row.weight;
      }
  return {
    sales: c.finance.businesses.get(clinic.id)!.salesReceivedMinor,
    parts,
  };
}

describe("a seller is paid each payer's part", { timeout: 180_000 }, () => {
  it("West Union: the clinic's receipts carry Medicare's and the insurer's parts, and a Medicaid cut lowers them", () => {
    const control = clinicReceipts(false);
    // All four payers appear on the clinic's bills.
    expect(control.parts.patient).toBeGreaterThan(0);
    expect(control.parts.medicaid).toBeGreaterThan(0);
    expect(control.parts.medicare).toBeGreaterThan(0);
    expect(control.parts.insurer).toBeGreaterThan(0);
    // Its receipts in 95 days are well above the patient's share and Medicaid's part alone.
    expect(control.sales).toBeGreaterThan(
      (control.parts.patient + control.parts.medicaid) * 3,
    );
    const cut = clinicReceipts(true);
    // The state ends its Medicaid expansion: fewer members covered, less paid the seller.
    expect(cut.sales).toBeLessThan(control.sales * 0.97);
  });
});
