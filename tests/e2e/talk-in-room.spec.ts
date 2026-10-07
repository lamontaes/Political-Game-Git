import { expect, test } from "@playwright/test";
import { enterLife, startLife } from "./support/creator";

/**
 * BG-81: a person the room shows can be spoken to. The coworker card's Talk
 * opens the ordinary-talk box with real choices; it used to answer "This
 * person is no longer here with you."
 */
test("talking to a coworker in the room opens a conversation and gets a reply", async ({
  page,
}) => {
  await page.goto("/");
  await startLife(page, {
    place: "Catonsville",
    state: "Maryland",
    age: 29,
    household: "lives-alone",
  });
  await enterLife(page);
  await page.locator('[data-testid^="scene-person-person_"]').first().click();
  await page.getByTestId("dossier-talk").click();
  const choice = page.getByTestId("life-talk-choice").first();
  await expect(choice).toBeVisible();
  await expect(page.getByTestId("scene-conversation")).not.toContainText(
    "no longer here with you",
  );
  await choice.click();
  await expect(page.getByTestId("talk-reply").first()).not.toBeEmpty();
});
