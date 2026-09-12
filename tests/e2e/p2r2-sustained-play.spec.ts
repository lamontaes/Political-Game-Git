import { expect, test } from "@playwright/test";
import { enterLife, saveLife, startLife } from "./support/creator";

/**
 * The audit's two browser findings, answered in a browser.
 *
 * The P2A2 reviewer played a normal route and reported that it reached "Let the
 * weeks run on" with no scene and no choices, and that fewer than five distinct
 * situations were ever offered. Both are read here from the player surface —
 * the same buttons a person clicks, at a normal viewport — rather than from a
 * developer gallery or a unit fixture.
 */
test("a normal route keeps offering distinct scenes over a played year", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await startLife(page, {
    age: 34,
    route: "custom",
    household: "shares-a-home",
    calibration: "skipped",
  });
  await enterLife(page);
  await expect(page.getByTestId("play-screen")).toBeVisible();

  const scenes: string[] = [];
  let quiet = 0;
  for (let beat = 0; beat < 30; beat += 1) {
    const prose = page.getByTestId("story-prose");
    if ((await prose.count()) === 0) quiet += 1;
    else scenes.push((await prose.innerText()).trim());
    const choices = page.getByTestId("story-options").getByRole("button");
    await expect(choices.first()).toBeVisible();
    if (beat === 0) {
      await page.screenshot({
        path: testInfo.outputPath("first-beat.png"),
        fullPage: true,
      });
    }
    await choices.first().click();
  }
  await page.screenshot({
    path: testInfo.outputPath("after-thirty-beats.png"),
    fullPage: true,
  });

  // Five distinct situations, read off the surface. The audit found fewer than
  // five in the whole route; this counts only what was actually rendered.
  const distinct = new Set(scenes);
  expect(distinct.size).toBeGreaterThanOrEqual(5);
  // And the route did not become one long quiet stretch.
  expect(scenes.length).toBeGreaterThan(quiet);
  // Something was still being offered at the end of it.
  await expect(
    page.getByTestId("story-options").getByRole("button").first(),
  ).toBeVisible();

  await testInfo.attach("scenes-actually-rendered", {
    body: JSON.stringify({ quiet, scenes: [...distinct] }, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("keeps the same life across a save and a reload mid-route", async ({
  page,
}) => {
  await page.goto("/");
  await startLife(page, {
    age: 34,
    route: "custom",
    household: "shares-a-home",
    calibration: "skipped",
  });
  await enterLife(page);
  for (let beat = 0; beat < 8; beat += 1) {
    await page.getByTestId("story-options").getByRole("button").first().click();
  }
  const before = await page.getByTestId("story-section").innerText();
  await page.getByTestId("open-journal").click();
  const journal = await page.getByTestId("journal").innerText();
  await page.getByTestId("open-journal").click();
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  expect(await page.getByTestId("story-section").innerText()).toBe(before);
  await page.getByTestId("open-journal").click();
  expect(await page.getByTestId("journal").innerText()).toBe(journal);
  await page.getByTestId("open-journal").click();
  // And it still moves on from there, by keyboard.
  const advance = page.getByTestId("story-options").getByRole("button").first();
  await advance.focus();
  await expect(advance).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("story-section")).not.toHaveText(before);
});
