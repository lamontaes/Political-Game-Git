import { expect, test } from "./fixtures";
import { chooseOption } from "./support/controls";

const SEED = "session22-mr27-1791396800";
// This locality is the reproducible draw for SEED; keeping it inline avoids
// importing the Node-side place index into Playwright's test loader.
const place = {
  displayName: "Midway, Florida",
  formalName: "Midway",
  withinName: "Florida",
};

test(`BG-18 puts the recent character in the civic title scene from ${place.displayName}`, async ({
  page,
}, testInfo) => {
  test.setTimeout(360_000);
  await page.goto(`/?seed=${SEED}`);
  await page.setViewportSize({ width: 1920, height: 1080 });
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(60_000);
  await page.getByTestId("new-game").click();
  await page.getByTestId("start-normal").click();
  await page.getByTestId("gender-female").click();
  await page.getByTestId("creator-randomize-name").click();
  const month = page.getByTestId("start-birth-month");
  if (!(await month.getAttribute("data-value"))) {
    await chooseOption(month, "1");
    await chooseOption(page.getByTestId("start-birth-day"), "1");
  }
  await chooseOption(page.getByTestId("start-birth-year"), "1992");
  await page.getByTestId("creator-continue-character").click();
  await page.getByTestId("state-search").fill(place.withinName!);
  await page
    .getByTestId("state-choices")
    .getByRole("button", { name: place.withinName!, exact: true })
    .click();
  await page.getByTestId("place-search").fill(place.formalName);
  await page
    .getByTestId("place-choices")
    .getByRole("button")
    .filter({ hasText: place.displayName })
    .first()
    .click();
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("world-orientation")).toBeVisible({
    timeout: 120_000,
  });
  await page.getByTestId("orientation-skip").click();
  const cluster = page.getByTestId("shell-nav-cluster");
  if ((await cluster.getAttribute("aria-expanded")) !== "true")
    await cluster.click();
  await page.getByTestId("keep-world").click();
  await expect(page.getByTestId("save-world")).toBeVisible();
  if ((await cluster.getAttribute("aria-expanded")) !== "true")
    await cluster.click();
  await page.getByTestId("leave-game").click();
  await page.getByTestId("leave-without-saving").click();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 60_000,
  });

  const stage = page.getByTestId("title-tableau-stage");
  await expect(stage).toHaveAttribute("data-title-kind", "hero-in-tableau");
  await expect(stage).toHaveAttribute("data-scene-id", /civic/);
  await expect(page.getByTestId("title-hero")).toBeVisible();
  await expect(page.getByTestId("title-hero-engine")).toBeVisible();

  const screenshot = testInfo.outputPath("recent-character-title-hero.png");
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach("recent-character-title-hero", {
    path: screenshot,
    contentType: "image/png",
  });
});
