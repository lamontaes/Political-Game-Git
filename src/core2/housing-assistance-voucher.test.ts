/**
 * A housing line helps a renter at its rent above its own share of income
 * (42 U.S.C. 1437f(o), 30 percent), not at a published average voucher (owner,
 * Nov 16, 2026: "Everything comes from the simulation. Stop pegging things to
 * real numbers."): a household whose income carries its rent is paid nothing,
 * the help falls as income rises and rises with rent, and it is never more than
 * the rent.
 */
import { describe, expect, it } from "vitest";
import lawParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import { voucherMinor } from "./housing-assistance";

const own = lawParameters.parameters.housingVoucherTenantIncomeShare.value;

describe("one household's rent help", () => {
  it("is nothing where 30 percent of income carries the rent", () => {
    // Rent of 90,000 against income of 400,000 a month: 30 percent is 120,000.
    expect(voucherMinor(90_000, 400_000, own)).toBe(0);
    expect(voucherMinor(120_000, 400_000, own)).toBe(0);
  });

  it("is the rent above the household's own share of its income", () => {
    expect(voucherMinor(150_000, 200_000, own)).toBe(
      Math.floor(150_000 - 200_000 * own),
    );
    expect(voucherMinor(150_000, 0, own)).toBe(150_000);
  });

  it("falls as income rises and rises with rent, at any rent and income", () => {
    for (const rent of [60_000, 150_000, 400_000])
      for (const income of [0, 50_000, 200_000, 600_000]) {
        const base = voucherMinor(rent, income, own);
        expect(base, `rent ${rent} income ${income}`).toBeGreaterThanOrEqual(0);
        expect(base, `rent ${rent} income ${income}`).toBeLessThanOrEqual(rent);
        expect(voucherMinor(rent, income + 50_000, own)).toBeLessThanOrEqual(
          base,
        );
        expect(voucherMinor(rent + 50_000, income, own)).toBeGreaterThanOrEqual(
          base,
        );
      }
  });

  it("is not a flat average voucher: two households with the same rent are helped differently by income", () => {
    expect(voucherMinor(150_000, 0, own)).toBeGreaterThan(
      voucherMinor(150_000, 300_000, own),
    );
  });
});
