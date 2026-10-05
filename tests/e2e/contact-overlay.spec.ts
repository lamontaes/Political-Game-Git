import { expect, test } from "@playwright/test";
import { enterLife, goTo, startLife } from "./support/creator";

/** Retired Contact presentation no longer opens from a recorded person card. */
test("person cards retain Inspect without the retired Contact screen", async ({
  page,
}) => {
  await page.goto("/");
  await startLife(page, {
    place: "Catonsville",
    state: "Maryland",
    age: 29,
    household: "shares-a-home",
  });
  await enterLife(page);
  await goTo(page, "elsewhere-people");
  await page.getByTestId("people-view-list").click();
  const person = page.locator('[data-testid^="people-person-"]').first();
  await expect(person).toBeVisible();
  await person.click();
  await expect(page.getByTestId("quick-dossier")).toBeVisible();
  await expect(page.getByTestId("person-contact")).toHaveCount(0);
  await expect(page.getByTestId("contact-dialog")).toHaveCount(0);
  await expect(
    page.getByText("What you remember", { exact: true }),
  ).toHaveCount(0);
  await page.getByTestId("quick-dossier-full").click();
  await expect(page.getByTestId("person-contact")).toHaveCount(0);
  await expect(page.getByTestId("contact-dialog")).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("retired-contact-absent.png"),
  });
});

/**
 * The conversation box, from the same playtest: "too big", and carrying a
 * rules note ("done separately; answering takes no time") on the briefing.
 */
test("a conversation opens as a compact box with no rules notes", async ({
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
  await goTo(page, "elsewhere-people");
  const starter = page.locator('[data-testid^="conversation-start-"]').first();
  if (!(await starter.count())) test.skip(true, "No conversation is open.");
  await starter.click();
  const box = page.locator('section.pg-talk[data-state="active"]');
  await expect(box).toBeVisible();
  await expect(box).not.toContainText("done separately");
  await expect(box).not.toContainText(/answering takes no time/i);
  await expect(box).not.toContainText("Dialogue and reading dialogue");
  const rect = await box.boundingBox();
  // 36rem at the page's 16px root.
  expect(rect!.width).toBeLessThanOrEqual(577);
  await page.screenshot({ path: test.info().outputPath("conversation.png") });
});
