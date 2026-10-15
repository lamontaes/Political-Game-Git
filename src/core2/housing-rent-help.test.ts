/** Rent help pays the landlord, as a voucher does: the household's bill falls to its share and the government pays the rest. Place and seed in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { advanceCore, createLifeCore } from "./life";
import { HOUSING_MODULE_ID, setRentHelp } from "./modules/housing";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import { transferCash } from "./world-transfer";
import type * as WorldTransfer from "./world-transfer";

vi.mock("./world-transfer", async (original) => {
  const actual = await original<typeof WorldTransfer>();
  return { ...actual, transferCash: vi.fn(actual.transferCash) };
});

const input = process.env.GOLDEN_PATH_SEED ?? randomUUID();
const drawn = drawPlace(input, "housing-rent-help");

describe(`rent help (${drawn.name}, ${drawn.state}, GOLDEN_PATH_SEED=${input})`, () => {
  it("lowers the household's bill and pays the landlord the rest, and ending it restores the rent", () => {
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    const api = coreAPI(core);
    const year = Number(opening.startedAt.slice(0, 4));
    // The full household whose rent is the largest share of its pay.
    const pay = (householdId: string) =>
      [...(core.households.get(householdId)?.memberIds ?? [])].reduce(
        (sum, id) =>
          sum +
          (core.jobs.get(core.people.get(id)?.jobId ?? "")?.wageDailyMinor ??
            0),
        0,
      );
    const leases = [...core.finance.contracts.values()].filter(
      (row) => row.id.startsWith("lease:") && !row.endedAt && row.householdId,
    );
    // A place with no full renters has nobody to help.
    if (!leases.length) return;
    const lease = leases.sort(
      (a, b) =>
        b.amountMinor / (pay(b.householdId!) + 1) -
          a.amountMinor / (pay(a.householdId!) + 1) || a.id.localeCompare(b.id),
    )[0]!;
    const householdId = lease.householdId!;
    const rent = lease.amountMinor;
    // The payer: the organization holding the most cash other than the landlord.
    const payer = [...core.organizations.values()]
      .filter((org) => org.id !== lease.payeeId)
      .sort((a, b) => (b.liquidMinor ?? 0) - (a.liquidMinor ?? 0))[0]!;
    setRentHelp(api, {
      governmentKey: "test",
      payerId: payer.id,
      households: [householdId],
      monthlyLimitMinor: rent,
    });
    advanceCore(core, `${year}-04-02`);
    const row = api
      .moduleState(HOUSING_MODULE_ID)
      .table("rentHelp")
      .get(`help:${householdId}`) as
      { helpMinor?: number; billedMinor?: number } | undefined;
    const help = row?.helpMinor ?? 0;
    const now = { ...core.finance.contracts.get(lease.id)! };
    console.log(
      `${drawn.name}: rent $${rent / 100}, the household pays $${now.amountMinor / 100}, help $${help / 100} to the landlord`,
    );
    // The rule: the household pays 30% of the pay the month's review weighed
    // (its members may have found work since the opening), the government the
    // rest, up to its limit.
    const share = api.parameter("housingAssistanceRentShareOfIncome");
    const monthlyPay =
      (row as { incomeMinor?: number } | undefined)?.incomeMinor ?? 0;
    const billedRent = now.amountMinor + help;
    expect(help).toBe(
      Math.round(Math.min(rent, Math.max(0, billedRent - share * monthlyPay))),
    );
    // The lease bills the household its share; together with the help it is the whole rent (the lease may have renewed).
    expect(billedRent).toBeGreaterThanOrEqual(rent);
    expect(row!.billedMinor).toBe(now.amountMinor);
    // A household whose pay now covers its rent gets none, and there is nothing more to check.
    if (help === 0) return;
    // The government paid the landlord, not the household.
    const transfers = vi
      .mocked(transferCash)
      .mock.calls.filter(([, id]) =>
        id.startsWith(`rent-help:${householdId}:`),
      );
    expect(transfers.length).toBeGreaterThan(0);
    for (const [, , from, to] of transfers) {
      expect(from).toBe(payer.id);
      expect(to).toBe(lease.payeeId);
    }
    setRentHelp(api, {
      governmentKey: "test",
      payerId: payer.id,
      households: [],
      monthlyLimitMinor: rent,
    });
    expect(core.finance.contracts.get(lease.id)!.amountMinor).toBe(
      now.amountMinor + help,
    );
  }, 600_000);
});
