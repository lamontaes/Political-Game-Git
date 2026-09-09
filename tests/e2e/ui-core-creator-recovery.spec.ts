import { expect, test } from "./fixtures";
import { fillCreator } from "./support/creator";

test("questionnaire Back retains creator identity and the next unanswered question", async ({
  page,
}) => {
  await page.goto("/?seed=ui-transfer-draft");
  await fillCreator(page, {
    age: 35,
    givenName: "Avery",
    familyName: "Cedar",
    route: "custom",
    gender: "female",
    calibration: "deep",
  });
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
  await page
    .getByTestId("questionnaire-options")
    .getByRole("button")
    .first()
    .click();
  const nextQuestion = await page
    .getByTestId("questionnaire-prompt")
    .textContent();
  const nextOptions = await page
    .getByTestId("questionnaire-options")
    .getByRole("button")
    .allTextContents();
  await page
    .getByTestId("questionnaire-screen")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await expect(page.getByTestId("setup-screen")).toContainText("35");
  await expect(page.getByTestId("setup-screen")).toContainText("Avery Cedar");
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("questionnaire-prompt")).toHaveText(
    nextQuestion!,
  );
  expect(
    await page
      .getByTestId("questionnaire-options")
      .getByRole("button")
      .allTextContents(),
  ).toEqual(nextOptions);
});

test("normal Begin crosses the presentation fade before the generated life", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?seed=ui-transfer-transition");
  for (const width of [1440, 960]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`title-${width}.png`) });
  }
  await fillCreator(page, { age: 35, route: "normal" });
  await page.getByTestId("begin").press("Enter");
  await expect(page.getByTestId("life-start-transition")).toBeVisible();
  await expect(page.getByTestId("play-screen")).toHaveCount(0);
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await expect(page.getByTestId("life-start-transition")).toHaveCount(0);
});
