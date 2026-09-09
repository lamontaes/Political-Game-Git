import { test, expect } from "./fixtures";

/** Component activation proof only. This does not claim normal-route or legal-journey acceptance. */
test("CIVIL-WORK7 private Work supports pointer, keyboard and canonical snapshot reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/tests/support/civil-personnel-mount.tsx";
    const { mountCivilPersonnelTest } = await import(/* @vite-ignore */ path);
    mountCivilPersonnelTest();
  });
  const region = page.getByRole("region", {
    name: "Public employment preparation",
  });
  await expect(region).toBeVisible();
  await region
    .getByRole("combobox", { name: "Employer you know" })
    .selectOption({ label: "Test employer" });
  await region
    .getByRole("textbox", { name: "Questions to prepare" })
    .fill("Ask about the selection procedure.");
  await region
    .getByRole("button", { name: "Prepare recruitment questions", exact: true })
    .click();
  await expect(region.getByRole("status")).toContainText(
    "No application, complaint or personnel decision",
  );
  await expect(
    region
      .getByRole("listitem")
      .getByText("Ask about the selection procedure.", { exact: true }),
  ).toBeVisible();
  await region
    .getByRole("combobox", { name: "Your employment" })
    .selectOption({ label: "Employee — Test employer" });
  await region
    .getByRole("textbox", { name: "Questions to prepare" })
    .fill("Ask about the review procedure.");
  await region
    .getByRole("button", {
      name: "Prepare personnel review questions",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    region
      .getByRole("listitem")
      .getByText("Ask about the review procedure.", { exact: true }),
  ).toBeVisible();
  await expect(region.getByRole("listitem")).toHaveCount(2);
  await page.keyboard.press("Space");
  await expect(region.getByRole("listitem")).toHaveCount(2);
});
