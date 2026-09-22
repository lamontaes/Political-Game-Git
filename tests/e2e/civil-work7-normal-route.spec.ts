// UI owner applies as tests/e2e/civil-personnel-normal.spec.ts after registration.
// Tests preparation reachability only, not lawful public hiring or review.
import { test, expect } from "./fixtures";
import { chooseOption } from "./support/controls";
import { enterLife, goTo, startLife } from "./support/creator";

/*
 * This walks the whole creator, enters a life, opens a moment and crosses two
 * surfaces. Measured headlessly and alone it takes about twenty-five seconds,
 * which fits inside Playwright's thirty-second default only while nothing
 * else is running; on a loaded shard it died on the clock and reported a
 * control that never appeared, which reads like a broken screen rather than a
 * budget. Nothing is skipped or loosened: the assertions are unchanged and
 * the walk is the same one.
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
  /*
   * Study, jobs and hiring are the Personal half of the old Work record.
   *
   * `elsewhere-work` became "Politics -> Your office" at the hub split, and
   * both halves render the `personal-work-section` test id while the player
   * holds no office. This case therefore found a panel, and then failed
   * looking for a job offer in the office panel, which reads as a missing
   * offer rather than a wrong door.
   */
  await goTo(page, "nav-jobs");
  const paths = page.getByTestId("personal-work-section");
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
  await goTo(page, "nav-jobs");
  await expect(
    page
      .getByRole("region", { name: "Public employment preparation" })
      .getByRole("listitem")
      .getByText("Ask which employment procedure applies.", { exact: true }),
  ).toBeVisible();
});
