import { expect, test } from "./fixtures";
import { fillCreator } from "./support/creator";

test("questionnaire Back retains creator identity and the next unanswered question", async ({
  page,
}) => {
  await page.goto("/?seed=ui-transfer-draft");
  await fillCreator(page, {
    age: 35,
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
