import { expect, test } from "./fixtures";

declare global {
  interface Window {
    materialGroupHarness: {
      request(identity: string): void;
      position(value: number): void;
      count(): number;
      decode(index: number): void;
      fail(index: number): void;
    };
  }
}

test("whole-person transitions retain latest committed geometry and ignore stale decodes", async ({
  page,
}) => {
  await page.goto("/tests/e2e/support/material-group-harness.html");
  const group = page.locator("[data-material-group-state]");
  const person = page.getByTestId("person");
  await expect
    .poll(() => page.evaluate(() => window.materialGroupHarness.count()))
    .toBe(2);
  await page.evaluate(() => window.materialGroupHarness.decode(0));
  await expect(group).toHaveAttribute("data-material-group-state", "loading");
  await expect(person).toHaveCount(0);
  await page.evaluate(() => window.materialGroupHarness.decode(1));
  await expect(group).toHaveAttribute("data-material-group-state", "ready");
  await page.evaluate(() => window.materialGroupHarness.position(70));
  await expect(person).toHaveAttribute("data-position", "70");
  expect(await page.evaluate(() => window.materialGroupHarness.count())).toBe(
    2,
  );

  await page.evaluate(() => window.materialGroupHarness.request("B"));
  await expect
    .poll(() => page.evaluate(() => window.materialGroupHarness.count()))
    .toBe(4);
  await expect(group).toHaveAttribute("data-material-group-state", "pending");
  await expect(person).toHaveAttribute("data-identity", "A");
  await expect(person).toHaveAttribute("data-position", "70");
  await page.evaluate(() => {
    window.materialGroupHarness.position(99);
    window.materialGroupHarness.request("C");
  });
  await expect
    .poll(() => page.evaluate(() => window.materialGroupHarness.count()))
    .toBe(6);
  await page.evaluate(() => {
    window.materialGroupHarness.decode(2);
    window.materialGroupHarness.decode(3);
    window.materialGroupHarness.decode(4);
  });
  await expect(group).toHaveAttribute("data-material-group-state", "pending");
  await expect(person).toHaveAttribute("data-identity", "A");
  await expect(person).toHaveAttribute("data-position", "70");
  await expect(person.locator("img")).toHaveCount(2);
  await page.evaluate(() => window.materialGroupHarness.decode(5));
  await expect(group).toHaveAttribute("data-material-group-state", "ready");
  await expect(person).toHaveAttribute("data-identity", "C");
  await expect(person).toHaveAttribute("data-position", "99");

  await page.evaluate(() => window.materialGroupHarness.request("D"));
  await expect
    .poll(() => page.evaluate(() => window.materialGroupHarness.count()))
    .toBe(8);
  await page.evaluate(() => window.materialGroupHarness.fail(6));
  await expect(group).toHaveAttribute(
    "data-material-group-state",
    "unavailable",
  );
  await expect(person).toHaveCount(0);
  await page.evaluate(() => window.materialGroupHarness.request("E"));
  await expect
    .poll(() => page.evaluate(() => window.materialGroupHarness.count()))
    .toBe(10);
  await page.evaluate(() => {
    window.materialGroupHarness.decode(8);
    window.materialGroupHarness.decode(9);
  });
  await expect(group).toHaveAttribute("data-material-group-state", "ready");
  await expect(person).toHaveAttribute("data-identity", "E");
});
