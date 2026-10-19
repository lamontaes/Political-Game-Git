import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { residentsRuntime, shiftToOpenSellers } from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";
import { daysAfterStart } from "./tooling/test-days";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-market-entry");

const cash = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  );
const outsideNet = (core: CoreState) =>
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

describe(`a business founded mid-run in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("takes its share of residents' purchases, and every dollar balances", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    advanceCore(core, daysAfterStart(19));
    const rt = residentsRuntime(core)!;
    const purchases = () =>
      [...rt.flows.values()].filter(
        (flow) => flow.kind === "purchase" && !flow.endedAt,
      );
    const rivalFlow = purchases()
      .filter(
        (flow) =>
          flow.financeKind !== "household.outside-living-costs" &&
          core.organizations.get(flow.payeeId)?.kind === "employer",
      )
      .sort(
        (a, b) => b.amountMinor - a.amountMinor || a.id.localeCompare(b.id),
      )[0]!;
    const rival = core.organizations.get(rivalFlow.payeeId)!;
    const byKind = (kind: string) =>
      purchases()
        .filter((flow) => flow.financeKind === kind)
        .reduce((n, flow) => n + flow.amountMinor, 0);
    const before = byKind(rivalFlow.financeKind),
      rivalBefore = rivalFlow.amountMinor;
    const api = coreAPI(core);
    api.addOrganization({
      id: "founded:test-shop",
      placeId: rival.placeId,
      name: "New shop",
      kind: "employer",
      liquidMinor: 0,
      source: rival.source,
    });
    const startCash = cash(core) + outsideNet(core);
    const entered = api.enterMarket({
      organizationId: "founded:test-shop",
      placeId: rivalFlow.placeId,
      like: rival.id,
      capacityMinor: rivalBefore * 12,
    });
    expect(entered.length).toBeGreaterThan(0);
    // The market is split, not grown: the same purchases, more sellers.
    expect(byKind(rivalFlow.financeKind)).toBe(before);
    expect(rivalFlow.amountMinor).toBeLessThan(rivalBefore);
    advanceCore(core, daysAfterStart(59));
    expect(
      core.organizations.get("founded:test-shop")!.liquidMinor,
    ).toBeGreaterThan(0);
    expect(cash(core) + outsideNet(core)).toBe(startCash);
  }, 300_000);

  it("moves a closed seller's customers to the open sellers of its kind", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const drawn = attempt
        ? drawPlace(`${seed}:${attempt}`, "core2-market-entry")
        : place;
      const core = createLifeCore(
        generatedOpening(drawn, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      );
      advanceCore(core, daysAfterStart(9));
      const rt = residentsRuntime(core)!;
      const live = () =>
        [...rt.flows.values()].filter(
          (flow) =>
            flow.kind === "purchase" &&
            !flow.endedAt &&
            flow.financeKind !== "household.outside-living-costs",
        );
      const kinds = new Map<string, Set<string>>();
      for (const flow of live()) {
        const key = `${flow.residentsId}|${flow.financeKind}`;
        kinds.set(key, (kinds.get(key) ?? new Set()).add(flow.payeeId));
      }
      const closing = live()
        .filter(
          (flow) =>
            kinds.get(`${flow.residentsId}|${flow.financeKind}`)!.size > 1 &&
            core.finance.businesses.has(flow.payeeId),
        )
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!closing) {
        // A place with one seller per kind has nothing to move.
        tried.push(`${drawn.name} (${drawn.key})`);
        continue;
      }
      const others = () =>
        live()
          .filter(
            (flow) =>
              flow.residentsId === closing.residentsId &&
              flow.financeKind === closing.financeKind &&
              flow.payeeId !== closing.payeeId,
          )
          .reduce((n, flow) => n + flow.amountMinor, 0);
      const before = others();
      const moved = closing.amountMinor;
      shiftToOpenSellers(core, rt, closing);
      expect(closing.amountMinor).toBe(0);
      // Same purchases, fewer sellers: exact when the sellers share a cadence.
      const sameCadence = live()
        .filter(
          (flow) =>
            flow.residentsId === closing.residentsId &&
            flow.financeKind === closing.financeKind,
        )
        .every(
          (flow) =>
            JSON.stringify(flow.cadence) === JSON.stringify(closing.cadence),
        );
      if (sameCadence) expect(others()).toBe(before + moved);
      expect(others()).toBeGreaterThan(before);
      const startCash = cash(core) + outsideNet(core);
      advanceCore(core, daysAfterStart(59));
      expect(cash(core) + outsideNet(core)).toBe(startCash);
      return;
    }
    throw new Error(
      `no drawn town had two sellers of a kind (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
