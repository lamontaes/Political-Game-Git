import { shotPath } from "./support/shot-path";
import { expect, test } from "./fixtures";
import {
  enterLife,
  openPoliticsHub,
  passShellTime,
  startLife,
} from "./support/creator";

/**
 * A bill Congress passed, read the way a player reaches it: an ordinary life,
 * weeks passing on the corner clock, then Politics → Government → United
 * States → a bill on Congress's record.
 */
test("a player can read a bill Congress passed, printed as Congress prints it", async ({
  page,
}) => {
  test.setTimeout(1_500_000);
  await page.goto("/");
  await startLife(page, {
    age: 34,
    givenName: "Rowan",
    familyName: "Hale",
    state: "Missouri",
    place: "Hermann",
  });
  await enterLife(page);

  // Congress files on the first of each month, and a bill takes about eight
  // weeks from filing to the President; sixteen weeks reaches late April.
  for (let week = 0; week < 16; week++) await passShellTime(page, "week");

  const openFederal = async () => {
    await openPoliticsHub(page, "nav-politics-government");
    await page.getByTestId("politics-sub-overview").click();
    await page.getByTestId("government-scope-federal").click();
  };
  await openFederal();
  const records = page.locator('[data-testid^="government-record-"]');
  const count = await records.count();
  let opened = false;
  for (let index = 0; index < count && !opened; index++) {
    await records.nth(index).click();
    const paper = page.getByTestId("bill-paper");
    await expect(paper).toBeVisible();
    opened = (await paper.getAttribute("data-enacted")) === "true";
    if (!opened) await openFederal();
  }
  expect(opened).toBe(true);
  const paper = page.getByTestId("bill-paper");
  await expect(paper).toContainText("CONGRESS");
  await expect(paper).toContainText("Be it enacted by the Senate and House");
  await expect(page.getByTestId("bill-paper-stamp")).toContainText("LAW");
  await expect(page.getByTestId("bill-paper-record")).toContainText(
    "Approved by the President",
  );
  await paper.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: shotPath("congress-bill-paper.png"),
    fullPage: true,
  });
});
