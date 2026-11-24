import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import {
  bankDeposit,
  bankDepositLiability,
  depositsHeld,
  moveBankDeposit,
} from "./accounts";
import { savingsTarget } from "./credit-deposits";

function world() {
  const input = piecesInput();
  const core = createLifeCore({
    ...input,
    organizations: [
      {
        id: "bank",
        placeId: "place",
        name: "Bank",
        kind: "bank",
        liquidMinor: 100,
        source: piecesSource,
      },
      {
        id: "depositor",
        placeId: "place",
        name: "Depositor",
        kind: "business",
        liquidMinor: 1000,
        source: piecesSource,
      },
      {
        id: "borrower",
        placeId: "place",
        name: "Borrower",
        kind: "business",
        liquidMinor: 0,
        source: piecesSource,
      },
    ],
  });
  const api = coreAPI(core);
  const cash = () =>
    [...core.people.values(), ...core.organizations.values()].reduce(
      (sum, owner) => sum + owner.liquidMinor,
      0,
    );
  const move = (
    id: string,
    direction: "deposit" | "withdraw",
    amountMinor: number,
  ) =>
    moveBankDeposit(core, api, {
      id,
      direction,
      amountMinor,
      bankId: "bank",
      holderId: "depositor",
      customerAccountId: api.accounts().main("depositor"),
      source: piecesSource,
    });
  return { core, api, cash, move };
}

describe("bank deposits through the conserving accounts writer", () => {
  it("funds a loan without creating equity and retains an unpaid withdrawal claim", () => {
    const { core, api, cash, move } = world();
    const initial = cash();
    const incoming = move("deposit-1", "deposit", 500);
    expect(incoming.journalSequence).toBeDefined();
    expect(
      core.organizations.get("bank")!.liquidMinor -
        bankDepositLiability(core, "bank"),
    ).toBe(100);
    const pay = (id: string, from: string, to: string, amountMinor: number) =>
      api.accounts().transfer({
        id,
        from: api.accounts().main(from),
        to: api.accounts().main(to),
        amountMinor,
        reasonKey: "loan",
        source: piecesSource,
      });
    pay("loan", "bank", "borrower", 500);
    expect(move("withdraw-1", "withdraw", 300).paidMinor).toBe(100);
    expect(bankDeposit(core, "bank", "depositor")!.balanceMinor).toBe(400);
    pay("repayment", "borrower", "bank", 200);
    expect(move("withdraw-2", "withdraw", 400).paidMinor).toBe(200);
    expect(depositsHeld(core, "depositor")).toBe(200);
    expect(bankDepositLiability(core, "bank")).toBe(200);
    expect(
      core.organizations.get("bank")!.liquidMinor +
        300 -
        bankDepositLiability(core, "bank"),
    ).toBe(100);
    expect(cash()).toBe(initial);
  });
  it("does not create a claim for unfunded cash or mutate it on a rejected replay", () => {
    const { core, cash, move } = world();
    const initial = cash();
    expect(move("deposit-1", "deposit", 2000).paidMinor).toBe(1000);
    expect(() => move("deposit-1", "deposit", 100)).toThrow(/reused/);
    expect(() => move("too-much", "withdraw", 1001)).toThrow(/exceed/);
    expect(bankDepositLiability(core, "bank")).toBe(1000);
    expect(bankDeposit(core, "bank", "depositor")!.paidInMinor).toBe(1000);
    expect(cash()).toBe(initial);
  });
  it("keeps a household claim when its cash account changes on fill-in", () => {
    const { core, api } = world();
    const counted = api.accounts().open({
      ownerId: "depositor",
      id: "counted-group",
      name: "Counted group",
      source: piecesSource,
    });
    api.accounts().transfer({
      id: "fund-group",
      from: api.accounts().main("depositor"),
      to: counted,
      amountMinor: 600,
      reasonKey: "fund-group",
      source: piecesSource,
    });
    moveBankDeposit(core, api, {
      id: "counted-deposit",
      bankId: "bank",
      holderId: "household:stable",
      customerAccountId: counted,
      direction: "deposit",
      amountMinor: 500,
      source: piecesSource,
    });
    moveBankDeposit(core, api, {
      id: "full-withdrawal",
      bankId: "bank",
      holderId: "household:stable",
      customerAccountId: api.accounts().main("depositor"),
      direction: "withdraw",
      amountMinor: 200,
      source: piecesSource,
    });
    expect(bankDeposit(core, "bank", "household:stable")!.balanceMinor).toBe(
      300,
    );
    expect(api.accounts().balance(counted)).toBe(100);
    expect(depositsHeld(core, "household:stable")).toBe(300);
  });
  it("uses the same cost-buffer rule for one household and a counted group", () => {
    expect(savingsTarget(1000, 100, 3)).toBe(700);
    expect(savingsTarget(10000, 1000, 3)).toBe(7000);
    expect(savingsTarget(200, 100, 3)).toBe(-100);
  });
});
