import { expect, test } from "./fixtures";
import {
  enterLife,
  goTo,
  startLife,
  KENTUCKY_REGRESSION_HOMETOWN,
} from "./support/creator";
import { reachMemberOffice } from "./support/legislative-entry";

test("ordinary Work office route mounts office onboarding after a won seat", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/?seed=l-onboard-ordinary-mount");
  await startLife(page, {
    age: 38,
    route: "normal",
    ...KENTUCKY_REGRESSION_HOMETOWN,
  });
  await enterLife(page);
  await reachMemberOffice(page);
  await goTo(page, "elsewhere-work");
  const workspace = page.getByTestId("office-onboarding");
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute("data-briefing-role", "briefing");
  await expect(workspace).toHaveAttribute("data-recommendation-status", "none");
  await expect(workspace).toHaveAttribute("data-executed-delegation", "false");
  await expect(page.getByTestId("office-record-workflow")).toBeVisible();
  await expect(page.getByTestId("office-preference-absent")).toBeVisible();
  await expect(
    page.getByTestId("office-briefing-not-recommendation"),
  ).toBeVisible();
  await expect(page.getByTestId("docket")).toBeVisible();
});
