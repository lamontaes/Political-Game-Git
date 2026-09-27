// UI owner applies as tests/e2e/civil-personnel-normal.spec.ts after registration.
// Tests preparation reachability only, not lawful public hiring or review.
import { test, expect } from "./fixtures";
import { chooseOption } from "./support/controls";
import { enterLife, goTo, startLife } from "./support/creator";

/*
 * This walks the full creator, enters a life, prepares a personnel question,
 * then saves and reopens it. Keep the existing whole-journey time budget.
 */
test.setTimeout(120_000);

test("ordinary Day and Work expose private personnel preparation", async ({
  page,
}) => {
  await page.goto("/?seed=civil-work7-normal-preparation");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 35,
    route: "normal",
  });
  await enterLife(page);
  // Jobs and study is under Personal. The authored Shop assistant path is in
  // the optional paths section below the town's current job listings.
  await goTo(page, "nav-jobs");
  const paths = page.getByTestId("personal-work-section");
  await paths.getByText("Other paths and invitations", { exact: true }).click();
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
  await chooseOption(options, {
    label: "Shop assistant — Neighborhood Supply Cooperative",
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
  await goTo(page, "nav-jobs");
  await expect(
    page
      .getByRole("region", { name: "Public employment preparation" })
      .getByRole("listitem")
      .getByText("Ask which employment procedure applies.", { exact: true }),
  ).toBeVisible();
});
