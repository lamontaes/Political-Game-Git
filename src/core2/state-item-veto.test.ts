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
import { itemOverrideNeeded, lineItemVetoOf } from "./state-item-veto";
import { drawPlace } from "../../scripts/core2-year/place";
import type { ModuleRow } from "./module-data";

const seed = process.env.OFFICE_STATE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "office-federal");

describe(`item veto legality (${place.name}, ${seed})`, () => {
  it.each([0, 4000])(
    "preserves passed text and pays surviving appropriation with %i retained",
    (remainingMinor) => {
      // A state with no chamber or governor in the office data cannot be
      // tested: draw the next place.
      const tried: string[] = [];
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const drawn = attempt
          ? drawPlace(`${seed}:${attempt}`, "office-federal")
          : place;
        const core = createLifeCore(
          buildPopulation({
            seed,
            placeKey: drawn.key,
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
        const chamber = seats.find((s) =>
          s.office.kind.startsWith("legislature-"),
        );
        const governor = seats.find((s) => s.office.kind === "governor")?.holder
          ?.personId;
        const rule = lineItemVetoOf(drawn.state);
        expect(rule).not.toBeNull();
        if (!chamber || !governor) {
          // Some territorial office data still has no state chamber.
          tried.push(`${drawn.name} (${drawn.key})`);
          continue;
        }
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
          .put({
            ...bill,
            status: "awaiting-signature",
          } as unknown as ModuleRow);
        expect(() =>
          executiveItemVeto(api, bill.id, "not-the-governor", [0]),
        ).toThrow();
        expect(() => executiveItemVeto(api, bill.id, governor, [9])).toThrow();
        if (!rule?.lineItem) {
          expect(() =>
            executiveItemVeto(api, bill.id, governor, [0]),
          ).toThrow();
          return;
        }
        const budget = budgetsOf(api, drawn.state).at(-1)!;
        const before = { ...budget.spendingMinor };
        const selection = [{ index: 0, remainingMinor }];
        if (remainingMinor > 0 && !rule.reduce) {
          expect(() =>
            executiveItemVeto(api, bill.id, governor, selection),
          ).toThrow();
          return;
        }
        executiveItemVeto(api, bill.id, governor, selection);
        const record = api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("itemVetoes")
          .get(bill.id) as unknown as {
          struck: number[];
          decisions: {
            index: number;
            remainingMinor: number;
            overridden: boolean;
            tallies: unknown[];
          }[];
        };
        expect(record.decisions[0]?.index).toBe(0);
        expect(record.decisions[0]?.tallies.length).toBeGreaterThan(0);
        expect(billOf(api, bill.id).provisions).toEqual(bill.provisions);
        const after = budgetsOf(api, drawn.state).find(
          (b) => b.id === budget.id,
        )!.spendingMinor;
        expect((after.parks ?? 0) - (before.parks ?? 0)).toBe(
          record.decisions[0]!.overridden ? 10000 : remainingMinor,
        );
        expect((after.administration ?? 0) - (before.administration ?? 0)).toBe(
          20000,
        );
        expect(() => executiveItemVeto(api, bill.id, governor, [0])).toThrow();
        return;
      }
      throw new Error(
        `no drawn place had a state chamber and governor (seed ${seed}): ${tried.join("; ")}`,
      );
    },
    120000,
  );
});

// Fractions are arithmetic boundaries, independent of the drawn jurisdiction.
describe("override vote denominators", () => {
  it("distinguishes absent members from abstentions and vacant seats", () => {
    const rule = {
      numerator: 2,
      denominator: 3,
      strict: false,
      basis: "present" as const,
    };
    expect(itemOverrideNeeded(rule, 58, 48, 51, 60)).toBe(34);
    expect(
      itemOverrideNeeded({ ...rule, basis: "entitled" }, 58, 48, 51, 60),
    ).toBe(40);
    expect(
      itemOverrideNeeded({ ...rule, basis: "voting" }, 58, 48, 51, 60),
    ).toBe(32);
  });
  it("requires exactly forty votes for two thirds of sixty members", () => {
    expect(
      itemOverrideNeeded(
        { numerator: 2, denominator: 3, strict: false, basis: "members" },
        60,
        54,
      ),
    ).toBe(40);
  });
  it("excludes abstentions only when the law uses votes cast", () => {
    expect(
      itemOverrideNeeded(
        { numerator: 2, denominator: 3, strict: false, basis: "voting" },
        60,
        54,
      ),
    ).toBe(36);
  });
  it("keeps the elected membership floor when present votes suffice", () => {
    expect(
      itemOverrideNeeded(
        {
          numerator: 1,
          denominator: 2,
          strict: true,
          basis: "voting",
          majorityMembers: true,
        },
        60,
        40,
      ),
    ).toBe(31);
  });
});
