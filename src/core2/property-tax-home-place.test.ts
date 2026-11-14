import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { ownedHomes } from "./modules/housing";
import { billPropertyTax, stateEffectiveRate } from "./housing-property-tax";
import { townOutsideOf } from "./opening-outside-market";
import { placeStateKey } from "./place-map";
import type { ModuleTable } from "./module-state";
import type { CoreState } from "./types";

// A home outside the played town is billed by its own place's terms: its
// state's average rate, paid to its own place's outside account, never the
// played town's rate or its county collector (owner, Nov 5: "It should be
// everywhere"). A generated world in a place drawn from all 56.
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

function table(): ModuleTable {
  const rows = new Map<string, unknown>();
  return {
    get: (id: string) => rows.get(id),
    put: (row: { id: string }) => void rows.set(row.id, row),
    remove: (id: string) => void rows.delete(id),
    rows: () => [...rows.values()],
  } as unknown as ModuleTable;
}

for (const n of [1, 2]) {
  it(`a home in another place is billed its own place's state average and paid to its own place's outside account (${replay}, draw ${n})`, () => {
    const draw = drawPlace(replay, `property-tax-home-place:${n}`);
    const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const c = core as CoreState;
    const town = (api.state.placeMetadata as { housingTown?: string })
      .housingTown;
    const orgs = [...c.organizations.values()];
    const away = ownedHomes(api).filter(
      (h) =>
        h.placeId !== town &&
        c.households.has(h.householdId) &&
        townOutsideOf(orgs, h.placeId) &&
        placeStateKey(h.placeId) &&
        [...c.households.get(h.householdId)!.memberIds].some(
          (id) => api.accounts().balance(`cash:${id}:residual`) > 0,
        ),
    );
    expect(away.length, `${where}: no full home elsewhere`).toBeGreaterThan(0);
    const home = away[0]!;
    const outside = townOutsideOf(orgs, home.placeId)!;
    const balance = (id: string) =>
      api.accounts().balance(`cash:${id}:residual`);
    const members = [...c.households.get(home.householdId)!.memberIds];
    const cashBefore = members.reduce((n, id) => n + balance(id), 0);
    const collectors = orgs.filter((o) =>
      o.id.startsWith("organization:tax-collector:"),
    );
    const collectorBefore = collectors.map((o) => balance(o.id));
    const usps = placeStateKey(home.placeId)!.slice(3);
    const owed = Math.round(
      (home.valueMinor * stateEffectiveRate(usps)) /
        api.parameter("macroMonthsPerYear"),
    );
    const richest = Math.max(...members.map(balance));
    const paid = billPropertyTax(api, table(), [home], () => true);
    expect(
      paid,
      `${where}: ${home.householdId} paid nothing of ${owed}`,
    ).toBeGreaterThan(0);
    expect(paid, where).toBeLessThanOrEqual(owed);
    // It came out of the owners' own accounts, to their place's outside account.
    expect(
      cashBefore - members.reduce((n, id) => n + balance(id), 0),
      `${where}: ${home.householdId}'s members did not pay ${paid} to ${outside.id}`,
    ).toBe(paid);
    // Someone who could cover the bill paid exactly their state's average.
    if (richest >= owed) expect(paid, where).toBe(owed);
    expect(
      collectors.map((o) => balance(o.id)),
      `${where}: the played town's collector was paid for a home in ${home.placeId}`,
    ).toEqual(collectorBefore);
  }, 300_000);
}
