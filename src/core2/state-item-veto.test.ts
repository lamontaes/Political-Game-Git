import { openCampaigns } from "./modules/campaigns";
import { openElections } from "./modules/elections";
import { openRecord } from "./modules/record";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import {
  openLegislature,
  draftBill,
  executiveItemVeto,
  billOf,
  LEGISLATURE_MODULE_ID,
} from "./modules/legislature";
import { openBudgets, budgetsOf } from "./modules/budgets";
import { lineItemVetoOf } from "./state-item-veto";
import { drawPlace } from "../../scripts/core2-year/place";
import type { ModuleRow } from "./module-data";

const seed = process.env.OFFICE_STATE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "office-federal");

describe(`item veto legality (${place.name}, ${seed})`, () => {
  it("preserves the passed text, records individual overrides, and enacts only surviving items", () => {
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: place.key,
        startedAt: "2025-01-20",
        minimumPeople: 100,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openBudgets(core);
    const api = coreAPI(core);
    const seats = townSeats(api);
    const chamber = seats.find((s) => s.office.kind.startsWith("legislature-"));
    const governor = seats.find((s) => s.office.kind === "governor")?.holder
      ?.personId;
    const rule = lineItemVetoOf(place.state);
    expect(rule).not.toBeNull();
    if (!chamber || !governor) return; // Some territorial office data still has no state chamber.
    const bill = draftBill(api, {
      bodyOfficeId: chamber.office.id,
      sponsorId: chamber.holder!.personId!,
      provisions: [
        { kind: "budget-line", line: "parks", value: 10000 },
        { kind: "budget-line", line: "administration", value: 20000 },
      ],
    });
    // Edge fixture only: acceptance is the separate played year, not this staged desk.
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .put({ ...bill, status: "awaiting-signature" } as unknown as ModuleRow);
    expect(() =>
      executiveItemVeto(api, bill.id, "not-the-governor", [0]),
    ).toThrow();
    expect(() => executiveItemVeto(api, bill.id, governor, [9])).toThrow();
    if (!rule?.lineItem) {
      expect(() => executiveItemVeto(api, bill.id, governor, [0])).toThrow();
      return;
    }
    const budget = budgetsOf(api, place.state).at(-1)!;
    const before = { ...budget.spendingMinor };
    executiveItemVeto(api, bill.id, governor, [0]);
    const record = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("itemVetoes")
      .get(bill.id) as unknown as {
      struck: number[];
      decisions: { index: number; tallies: unknown[] }[];
    };
    expect(record.decisions[0]?.index).toBe(0);
    expect(record.decisions[0]?.tallies.length).toBeGreaterThan(0);
    expect(billOf(api, bill.id).provisions).toEqual(bill.provisions);
    const after = budgetsOf(api, place.state).find(
      (b) => b.id === budget.id,
    )!.spendingMinor;
    expect((after.parks ?? 0) - (before.parks ?? 0)).toBe(
      record.struck.includes(0) ? 0 : 10000,
    );
    expect((after.administration ?? 0) - (before.administration ?? 0)).toBe(
      20000,
    );
    expect(() => executiveItemVeto(api, bill.id, governor, [0])).toThrow();
  }, 120000);
});
