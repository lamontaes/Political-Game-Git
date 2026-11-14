import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { lawInForceToday } from "./modules/laws";
import { BUDGETS_MODULE_ID, withholdPay } from "./modules/budgets";
import { outsideGovernment } from "./outside-governments";
import type { CoreState } from "./types";

// A worker who lives outside the town owes the town's county and city income
// taxes their nonresident rate on pay earned in the town, on top of the law
// where they live. Pinned to one Indiana place (county rows with a
// nonresident rate) and seed; the same pay earned elsewhere owes none.
it(
  "pay earned in the town by a worker who lives elsewhere owes the local row's nonresident rate (place 1817074, seed nr1)",
  { timeout: 120_000 },
  () => {
    const { core } = buildBenchWorld("nr1", gameStartDate(), {
      twoLevel: true,
      placeKey: "1817074",
    });
    const api = coreAPI(core);
    const c = core as CoreState;
    const town = api.state.placeMetadata?.housingTown as string;
    const local = lawInForceToday(api, "income-tax").levels.filter(
      (l) => l.row && ["county", "city", "township"].includes(l.level),
    );
    const rows = local.filter(
      (l) => typeof l.row?.terms?.nonresidentRate === "number",
    );
    expect(
      rows.length,
      "town has a local row with a nonresident rate",
    ).toBeGreaterThan(0);
    const away = [...c.people.values()].find(
      (p) => p.placeId !== town && !p.deceasedAt,
    );
    expect(away, "someone lives outside the town").toBeDefined();
    const table = () => api.moduleState(BUDGETS_MODULE_ID).table("withholding");
    const pay = (id: string, workplaceId: string | undefined) => {
      withholdPay(api, {
        id,
        personId: away!.id,
        paidMinor: 400_000,
        fromAt: "2025-03-01",
        throughAt: "2025-03-14",
        ...(workplaceId ? { workplaceId } : {}),
      });
      return (
        (
          table().get(`withholding:${id}`) as unknown as
            | {
                lines: {
                  level: string;
                  jurisdiction: string;
                  minor: number;
                  lawId: string;
                }[];
              }
            | undefined
        )?.lines ?? []
      );
    };
    // The paycheck itself, so the worker holds the pay.
    api.accounts().transfer({
      id: "salary:nonresident-local-test",
      from: api.accounts().main(outsideGovernment(api, "US")),
      to: api.accounts().main(away!.id),
      amountMinor: 2_000_000,
      reasonKey: "official.salary",
      partial: false,
      source: away!.source,
    });
    const here = pay("nr-here", town);
    const elsewhere = pay("nr-elsewhere", "another-place");
    for (const l of rows) {
      const line = here.find((x) => x.lawId === l.row!.id);
      expect(line, `${l.row!.id} billed`).toBeDefined();
      const annual = (400_000 / 100) * (365 / 14);
      const expected = Math.round(
        ((annual * Number(l.row!.terms!.nonresidentRate)) / 100 / (365 / 14)) *
          100,
      );
      expect(line!.minor).toBe(expected);
      expect(line!.jurisdiction).toBe(l.jurisdiction);
      expect(elsewhere.find((x) => x.lawId === l.row!.id)).toBeUndefined();
    }
  },
);
