import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import {
  bankExtendsNewCreditFromFacts,
  bankHonorsCreditLineFromFacts,
  largestDepositBankFromFacts,
} from "./bank-credit";

const places = lifePlaceStateIdentities();

describe("bank credit rules", () => {
  it.each(places)(
    "uses selected deposit and capital facts in $jurisdictionKey",
    (place) => {
      const index = places.indexOf(place);
      const banks = [
        { id: `${place.usps}:a`, deposits: 500 + index },
        { id: `${place.usps}:b`, deposits: 600 + index },
      ];
      expect(largestDepositBankFromFacts(banks)).toBe(banks[1]!.id);

      const bank = {
        liquid: 60_000 + index * 100,
        loans: 40_000 + index * 100,
        capital: 12_000 + index * 20,
        failed: false,
      };
      const capitalRatio = bank.capital / (bank.liquid + bank.loans);
      expect(bankHonorsCreditLineFromFacts(bank, capitalRatio)).toBe(true);
      expect(bankExtendsNewCreditFromFacts(bank, capitalRatio, 0)).toBe(true);
    },
  );

  it("keeps existing lines distinct from new credit and resolves deposit ties", () => {
    const bank = { liquid: 1, loans: 1, capital: 1, failed: false };
    expect(bankHonorsCreditLineFromFacts(bank, 0.5)).toBe(true);
    expect(bankExtendsNewCreditFromFacts(bank, 0.5, 0.75)).toBe(false);
    expect(bankHonorsCreditLineFromFacts({ ...bank, failed: true }, 0)).toBe(
      false,
    );
    expect(largestDepositBankFromFacts([])).toBeNull();
    expect(
      largestDepositBankFromFacts([
        { id: "bank-b", deposits: 200 },
        { id: "bank-a", deposits: 200 },
      ]),
    ).toBe("bank-a");
  });
});
