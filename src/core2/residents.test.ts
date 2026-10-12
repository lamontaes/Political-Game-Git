import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace, generatedOpening } from "./tooling/generated-world";
import { collapseToTwoLevels } from "./residents";
import { advanceCore, createLifeCore } from "./life";
import { residentCounts } from "./modules/residents";
import type { CoreInput } from "./types";

// One random place from all 56, named with its seed in the test title.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-residents");

const cash = (input: CoreInput) =>
  input.people.reduce((n, row) => n + row.liquidMinor, 0) +
  input.organizations.reduce((n, row) => n + row.liquidMinor, 0);
const monthlyHouseholdPurchases = (input: CoreInput) =>
  (input.finance?.contracts ?? [])
    .filter((row) => row.kind.startsWith("household."))
    .reduce((n, row) => n + row.amountMinor / row.periodMonths, 0);

describe(`two-level population in ${place.name} (seed ${seed})`, () => {
  let full: CoreInput, two: CoreInput;
  beforeAll(() => {
    full = generatedOpening(place);
    two = collapseToTwoLevels(full);
  }, 300_000);

  it("keeps every person, dollar and purchase", () => {
    const counted = two.residents!.households.reduce(
      (n, row) => n + row.people.length,
      0,
    );
    expect(two.people.length + counted).toBe(full.people.length);
    expect(two.people.length).toBeLessThan(full.people.length);
    expect(cash(two)).toBe(cash(full));
    const purchases = two.residents!.flows.filter(
      (row) => row.kind === "purchase",
    );
    const merged = purchases.reduce(
      (n, row) =>
        n +
        row.amountMinor /
          (row.cadence.kind === "months" ? row.cadence.every : 1),
      0,
    );
    expect(merged + monthlyHouseholdPurchases(two)).toBeCloseTo(
      monthlyHouseholdPurchases(full),
      0,
    );
  });

  it("keeps the player's whole household and circle", () => {
    const ids = new Set(two.people.map((row) => row.id));
    for (const id of full.focusPersonIds) expect(ids.has(id)).toBe(true);
    const home = full.households.find((row) =>
      row.memberIds.includes(full.playerId!),
    )!;
    for (const id of home.memberIds) expect(ids.has(id)).toBe(true);
  });

  it("runs a month with every dollar balanced and the counts read back", () => {
    const core = createLifeCore(two);
    const opening = cash(two);
    advanceCore(core, "2021-02-01");
    let closing = 0,
      outside = 0;
    for (const row of core.people.values()) closing += row.liquidMinor;
    for (const row of core.organizations.values()) closing += row.liquidMinor;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(closing).toBe(opening - outside);
    const counts = residentCounts(core);
    expect(counts.reduce((n, row) => n + row.people, 0)).toBe(
      full.people.length - two.people.length,
    );
    const sales = [...core.finance.businesses.values()].reduce(
      (n, row) => n + row.salesReceivedMinor,
      0,
    );
    expect(sales).toBeGreaterThan(0);
  }, 300_000);
});
