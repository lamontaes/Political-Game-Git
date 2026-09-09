// UI owner applies as tests/e2e/civil-personnel-normal.spec.ts after registration.
// Tests preparation reachability only, not lawful public hiring or review.
import { test, expect } from "./fixtures";
import { enterLife, goTo, startLife } from "./support/creator";

test("ordinary Day and Work expose private personnel preparation", async ({
  page,
}) => {
  await page.goto("/?seed=civil-work7-normal-preparation");
  await startLife(page, { age: 35, route: "normal" });
  await enterLife(page);
  await goTo(page, "elsewhere-day");
  const paths = page.getByRole("region", { name: "Education and work" });
  // Actual supported LIFE engagement, through its ordinary button.
  const accept = paths.getByRole("button", {
    name: "Accept Shop assistant",
    exact: true,
  });
  await expect(accept).toBeEnabled();
  await accept.click();
  const panel = page.getByRole("region", {
    name: "Public employment preparation",
  });
  await expect(panel).toBeVisible();
  const options = panel.getByRole("combobox", { name: "Your employment" });
  await options.selectOption({
    label: "Shop assistant — Neighborhood Supply Cooperative (fictional)",
  });
  await panel
    .getByRole("textbox", { name: "Questions to prepare" })
    .fill("Ask which employment procedure applies.");
  await panel
    .getByRole("button", {
      name: "Prepare personnel review questions",
      exact: true,
    })
    .press("Enter");
  await expect(panel.getByRole("status")).toContainText(
    "No application, complaint or personnel decision",
  );
  await expect(
    panel
      .getByRole("listitem")
      .getByText("Ask which employment procedure applies.", { exact: true }),
  ).toBeVisible();
  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await expect(
    page
      .getByRole("region", { name: "Public employment preparation" })
      .getByRole("listitem")
      .getByText("Ask which employment procedure applies.", { exact: true }),
  ).toBeVisible();
});
