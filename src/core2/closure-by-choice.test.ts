import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { residentsRuntime, supplierBillsOwedTo } from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";
import { daysAfterStart } from "./tooling/test-days";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-closure-by-choice");

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

describe(`an owner closes a solvent business in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("pays the owner what's left and ends its jobs and flows; every dollar balances", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    advanceCore(core, daysAfterStart(19));
    const api = coreAPI(core);
    const firm = [...core.finance.businesses.values()]
      .filter(
        (book) =>
          !book.closedAt &&
          (core.organizations.get(book.organizationId)?.liquidMinor ?? 0) > 0,
      )
      .sort((a, b) => a.organizationId.localeCompare(b.organizationId))[0]!;
    const id = firm.organizationId;
    const owner = residentsRuntime(core)!.input.accounts[0]!.accountId;
    const accounts = api.accounts();
    const ownerBefore = accounts.balance(accounts.main(owner)),
      left = accounts.balance(accounts.main(id));
    const start = cash(core) + outsideNet(core);
    const bills = supplierBillsOwedTo(core, id);
    // The suppliers are outside the town: paying them is money leaving it.
    const outsideBefore = outsideNet(core);
    const closure = api.closeBusinessByChoice({
      organizationId: id,
      ownerAccountId: accounts.main(owner),
      reasonKey: "owner.retired",
      source: core.organizations.get(id)!.source,
    });
    // Workers are paid what they've earned first; the owner gets the rest.
    const paidOut = (closure.cause as { paidOutMinor: number }).paidOutMinor;
    expect(closure.cause).toMatchObject({ kind: "owner.choice" });
    expect(paidOut).toBeLessThanOrEqual(left);
    expect(core.finance.businesses.get(id)!.closedAt).toBe(core.date);
    // Supplier bills already owed were paid before the owner's share.
    if (bills && bills.owedMinor > 0)
      expect(outsideNet(core) - outsideBefore).toBe(bills.owedMinor);
    expect(accounts.balance(accounts.main(owner))).toBeGreaterThanOrEqual(
      ownerBefore + paidOut,
    );
    for (const jobId of closure.endedJobIds)
      expect(core.jobs.get(jobId)!.endsAt).toBe(core.date);
    expect(() =>
      api.closeBusinessByChoice({
        organizationId: id,
        ownerAccountId: accounts.main(owner),
        reasonKey: "owner.retired",
        source: core.organizations.get(id)!.source,
      }),
    ).toThrow();
    advanceCore(core, daysAfterStart(58));
    const live = [...residentsRuntime(core)!.flows.values()].filter(
      (flow) => !flow.endedAt && (flow.payeeId === id || flow.payerId === id),
    );
    expect(live).toEqual([]);
    expect(cash(core) + outsideNet(core)).toBe(start);
    // Full workers' last paycheck came from the cash held back.
    for (const ledger of core.work.payrollLedgerByCommitment.values())
      if (ledger.organizationId === id) expect(ledger.arrearsMinor).toBe(0);
  }, 300_000);
});
