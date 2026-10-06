import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { observerSetup } from "../../src/presentation/observer-world";
import { worldSeedFor } from "../../src/presentation/new-game-identity";
import { proseDate } from "../../src/presentation/prose-dates";

if (process.env.PG_CHROMIUM_PATH) {
  test.use({ launchOptions: { executablePath: process.env.PG_CHROMIUM_PATH } });
}

test.use({ viewport: { width: 1920, height: 1080 } });

test("a random live Observer checkpoint opens recorded roots and advances through the worker", async ({
  page,
}, testInfo) => {
  const seed = "session12-observer-route";
  const place = drawRandomPlace(
    seed,
    (candidate) => candidate.scope === "locality",
  );
  await testInfo.attach("random-place", {
    body: JSON.stringify({ seed, place: place.key, name: place.displayName }),
    contentType: "application/json",
  });
  await page.goto(
    `/?view=observer-dev&seed=${encodeURIComponent(seed)}&place=${encodeURIComponent(place.key)}`,
  );
  await page.getByRole("button", { name: "Open watched world" }).click();
  await expect(page.getByTestId("observer-dev")).toBeVisible();
  await expect(page.getByTestId("observer-date")).not.toBeEmpty();
  const person = page
    .getByTestId("world-record-people")
    .getByRole("button")
    .first();
  await person.click();
  await expect(page.getByTestId("causal-trace-view")).toBeVisible();
  await expect(page.getByTestId("trace-seed")).toHaveText(
    worldSeedFor(observerSetup(seed, place.key)),
  );
  await expect(page.getByLabel("Depth", { exact: true })).toHaveValue("8");
  const content = await page.getByTestId("trace-content-id").textContent();
  const root = page
    .getByRole("region", { name: "Trace roots" })
    .getByRole("button")
    .last();
  await root.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("trace-content-id")).toHaveText(content!);
  const at = await page
    .getByTestId("trace-identity")
    .locator("div")
    .filter({ has: page.getByText("Current date", { exact: true }) })
    .locator("dd")
    .textContent();
  const nextDate = addDays(makeIsoDate(at!), 1);
  await page.getByLabel("Jump to date").fill(nextDate);
  await page.getByRole("button", { name: "Run to date" }).click();
  await expect(page.getByTestId("observer-date")).toHaveText(
    proseDate(nextDate),
    { timeout: 120_000 },
  );
  await page.getByTestId("open-world-record").click();
  await expect(page.getByTestId("trace-identity")).toContainText(nextDate);
  await page.getByLabel("Jump to date").fill(at!);
  await page.getByRole("button", { name: "Run to date" }).click();
  await expect(page.getByRole("alert")).toContainText("cannot rewind");
  await expect(page.getByTestId("observer-date")).toHaveText(
    proseDate(nextDate),
  );
  await testInfo.attach("live-paused-trace", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});
