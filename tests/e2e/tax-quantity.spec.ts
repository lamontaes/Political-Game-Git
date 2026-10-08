import { expect, test } from "@playwright/test";

test("explicit whole miles are assessed once and stay that way after save/reload", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/tax-quantity.html");
  const proposal = page.getByTestId("tax-proposal");
  await expect(proposal).toBeVisible();
  const quantity = proposal.getByRole("textbox", {
    name: "Vehicle miles",
    exact: true,
  });
  const declare = proposal.getByRole("button", {
    name: "Declare personal occurrence",
    exact: true,
  });
  await expect
    .poll(() => page.evaluate(() => window.p2TaxFixture?.counts().bases))
    .toBe(0);
  await quantity.fill("");
  await declare.click();
  await expect(page.getByRole("alert")).toHaveText("Whole vehicle miles");
  await expect
    .poll(() => page.evaluate(() => window.p2TaxFixture?.counts().bases))
    .toBe(0);
  await quantity.fill("1000");
  await declare.click();
  await expect
    .poll(() => page.evaluate(() => window.p2TaxFixture?.counts()))
    .toEqual({
      bases: 1,
      assessments: 1,
      collections: 0,
      amount: { unit: "vehicle-mile", units: 1000 },
      assessedMinor: 2000,
    });
  await page.evaluate(() => window.p2TaxFixture!.reload());
  await expect
    .poll(() => page.evaluate(() => window.p2TaxFixture?.counts().bases))
    .toBe(1);
  await declare.click();
  await expect
    .poll(() => page.evaluate(() => window.p2TaxFixture?.counts().assessments))
    .toBe(1);
  await quantity.fill("1001");
  await declare.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.p2TaxFixture?.counts()))
    .toEqual({
      bases: 1,
      assessments: 1,
      collections: 0,
      amount: { unit: "vehicle-mile", units: 1000 },
      assessedMinor: 2000,
    });
});
