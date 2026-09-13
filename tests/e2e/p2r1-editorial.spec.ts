import { expect, test } from "@playwright/test";
import { enterLife, saveLife, startLife } from "./support/creator";

test("P2R1 retained adult choices activate by pointer and keyboard on the player surface", async ({
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
  const records: { activation: string; prose: string; choice: string }[] = [];
  for (const activation of ["pointer", "keyboard"]) {
    const prose = await page.getByTestId("story-prose").innerText();
    const choices = page.getByTestId("story-options").getByRole("button");
    await expect(choices.first()).toBeVisible();
    const choice = await choices.first().innerText();
    records.push({ activation, prose, choice });
    expect(prose).not.toMatch(
      /three weeks running|nobody is going to mention|weather that makes|this Saturday/,
    );
    await page.screenshot({
      path: testInfo.outputPath(`${activation}-before.png`),
      fullPage: true,
    });
    if (activation === "pointer") await choices.first().click();
    else {
      await choices.first().focus();
      await expect(choices.first()).toBeFocused();
      await page.keyboard.press("Enter");
    }
    await expect(page.getByTestId("story-prose")).not.toHaveText(prose);
    await page.screenshot({
      path: testInfo.outputPath(`${activation}-after.png`),
      fullPage: true,
    });
  }
  await testInfo.attach("actual-prose-and-actions", {
    body: JSON.stringify(records, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("P2R1 preserves and reloads the old age-32 calibrated fixture when its next beat is quiet", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // Same setup, same seed and same first-option chooser as the legacy
  // persistence proof. Every assertion below is the one P2R1 wrote: at a quiet
  // beat there is no story prose, a save and a reload return the identical
  // section and journal, and the keyboard still moves the life on.
  //
  // What changed is how the quiet beat is found. P2R1 could assume it arrived
  // on the fifth, because after four choices the bank was empty and stayed
  // empty. P2R2 gives the life more to answer, so quiet is reached by playing
  // until it is reached rather than by counting to four — which also holds the
  // other half of the contract shut, that quiet time is still there to reach.
  await page.goto("/?seed=p2r1-editorial-quiet");
  await startLife(page, { age: 32, calibration: "short" });
  for (let asked = 0; asked < 60; asked += 1) {
    if ((await page.getByTestId("questionnaire-screen").count()) === 0) break;
    await page
      .getByTestId("questionnaire-options")
      .getByRole("button")
      .first()
      .click();
  }
  await expect(page.getByTestId("questionnaire-screen")).toHaveCount(0);
  await enterLife(page);
  let reachedQuiet = false;
  for (let beat = 0; beat < 40; beat += 1) {
    if ((await page.getByTestId("story-prose").count()) === 0) {
      reachedQuiet = true;
      break;
    }
    await page.getByTestId("story-options").getByRole("button").first().click();
  }
  expect(reachedQuiet).toBe(true);
  await expect(page.getByTestId("story-prose")).toHaveCount(0);
  const before = await page.getByTestId("story-section").innerText();
  await page.getByTestId("open-journal").click();
  const journal = await page.getByTestId("journal").innerText();
  await page.getByTestId("open-journal").click();
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await expect(page.getByTestId("story-prose")).toHaveCount(0);
  expect(await page.getByTestId("story-section").innerText()).toBe(before);
  await page.getByTestId("open-journal").click();
  expect(await page.getByTestId("journal").innerText()).toBe(journal);
  await page.getByTestId("open-journal").click();
  const advance = page.getByTestId("story-options").getByRole("button").first();
  await advance.focus();
  await expect(advance).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("story-section")).not.toHaveText(before);
});
