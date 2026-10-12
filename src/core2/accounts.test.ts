import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import type { CoreInput, CoreState } from "./types";

function world(): CoreState {
  const input: CoreInput = {
    ...piecesInput(),
    organizations: [
      {
        id: "city",
        placeId: "place",
        name: "City",
        kind: "government",
        liquidMinor: 100_000,
        source: piecesSource,
      },
      {
        id: "contractor",
        placeId: "place",
        name: "Paving contractor",
        kind: "employer",
        liquidMinor: 0,
        source: piecesSource,
      },
      {
        id: "state-aid",
        placeId: "place",
        name: "State aid",
        kind: "outside",
        liquidMinor: 0,
        outsideFlow: piecesSource,
        source: piecesSource,
      },
    ],
  };
  return createLifeCore(input);
}

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

describe("accounts and postings", () => {
  it("opens named accounts and moves money in one balanced entry", () => {
    const core = world(),
      accounts = coreAPI(core).accounts();
    const general = accounts.main("city");
    const roads = accounts.open({
      ownerId: "city",
      name: "Road fund",
      source: piecesSource,
    });
    const before = cash(core),
      sequence = core.cashJournal.nextSequence;
    accounts.transfer({
      id: "budget:roads",
      from: general,
      to: roads,
      amountMinor: 30_000,
      reasonKey: "budget.appropriation",
      source: piecesSource,
    });
    expect(accounts.balance(roads)).toBe(30_000);
    expect(accounts.balance(general)).toBe(70_000);
    expect(core.organizations.get("city")!.liquidMinor).toBe(100_000);
    const paid = accounts.transfer({
      id: "pay:paving",
      from: roads,
      to: accounts.main("contractor"),
      amountMinor: 12_000,
      reasonKey: "budget.spend",
      source: piecesSource,
    });
    expect(paid.paidMinor).toBe(12_000);
    expect(accounts.balance(roads)).toBe(18_000);
    expect(core.organizations.get("contractor")!.liquidMinor).toBe(12_000);
    expect(cash(core)).toBe(before);
    expect(core.cashJournal.nextSequence).toBe(sequence + 2);
  });

  it("refuses overdrafts unless partial, and never reuses a transfer id", () => {
    const core = world(),
      accounts = coreAPI(core).accounts();
    const input = {
      id: "too-much",
      from: accounts.main("contractor"),
      to: accounts.main("city"),
      amountMinor: 1,
      reasonKey: "test",
      source: piecesSource,
    };
    expect(() => accounts.transfer(input)).toThrow(/Insufficient/);
    const short = accounts.transfer({ ...input, id: "partial", partial: true });
    expect(short.paidMinor).toBe(0);
    expect(short.shortMinor).toBe(1);
    expect(() => accounts.transfer({ ...input, id: "partial" })).toThrow(
      /reused/,
    );
  });

  it("brings outside money in as a reported outside flow", () => {
    const core = world(),
      accounts = coreAPI(core).accounts();
    const before = cash(core);
    accounts.transfer({
      id: "aid:jan",
      from: accounts.main("state-aid"),
      to: accounts.main("city"),
      amountMinor: 5_000,
      reasonKey: "aid.state",
      source: piecesSource,
    });
    expect(cash(core)).toBe(before + 5_000);
    expect(before - outsideNet(core)).toBe(cash(core));
  });

  it("pays a fee into an outside account as a reported outside flow", () => {
    const core = world(),
      accounts = coreAPI(core).accounts();
    const before = cash(core);
    const paid = accounts.transfer({
      id: "fee:filing",
      from: accounts.main("city"),
      to: accounts.main("state-aid"),
      amountMinor: 2_500,
      reasonKey: "filing.fee",
      source: piecesSource,
    });
    expect(paid.paidMinor).toBe(2_500);
    expect(cash(core)).toBe(before - 2_500);
    expect(before - outsideNet(core)).toBe(cash(core));
  });

  it("settles obligations on their dates and carries arrears when owed", () => {
    const core = world(),
      accounts = coreAPI(core).accounts();
    accounts.addObligation({
      id: "loan",
      from: accounts.main("city"),
      to: accounts.main("contractor"),
      amountMinor: 60_000,
      firstDueAt: "2026-01-15",
      cadence: { kind: "months", every: 1 },
      accruesArrears: true,
      reasonKey: "debt.payment",
      source: piecesSource,
    });
    accounts.addObligation({
      id: "budget",
      from: accounts.main("contractor"),
      to: accounts.main("city"),
      amountMinor: 1_000_000,
      firstDueAt: "2026-01-20",
      accruesArrears: false,
      reasonKey: "purchase.budget",
      source: piecesSource,
    });
    const before = cash(core);
    advanceCore(core, "2026-03-31");
    const loan = accounts.obligation("loan")!;
    // Jan 15 pays 60,000; Feb 15 owes 60,000 but the city has 40,000 (plus
    // what the contractor's one-off budget returned on Jan 20).
    expect(loan.lastReceipt?.date).toBe("2026-03-15");
    expect(loan.paidMinor + loan.arrearsMinor).toBe(3 * 60_000);
    const budget = accounts.obligation("budget")!;
    expect(budget.arrearsMinor).toBe(0);
    expect(budget.endedAt).toBe("2026-01-20");
    expect(cash(core)).toBe(before);
  });
});
