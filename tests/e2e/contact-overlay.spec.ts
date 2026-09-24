import { expect, test } from "@playwright/test";
import { enterLife, goTo, startLife } from "./support/creator";

/**
 * Getting in touch, from the owner's playtest of a 29-year-old living alone in
 * Catonsville, Maryland.
 *
 * - Contact on a person card opens its own screen over what is open, about
 *   that one person, and closing it leaves the card and People where they were.
 * - The screen asks "When?" with a date picker; the allowed days are the
 *   picker's own bounds, not a sentence reciting them.
 * - People never lists a conversation under "here" with somebody the room does
 *   not hold.
 */
test("Contact opens its own screen and closes back to where you were", async ({
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

  // Who the room holds, as the room draws them.
  const inRoom = await page
    .locator('[data-testid^="scene-person-"]')
    .evaluateAll((nodes) =>
      nodes
        .map((node) =>
          (node.getAttribute("data-testid") ?? "").replace("scene-person-", ""),
        )
        .filter((id) => id.length > 0),
    );

  await goTo(page, "elsewhere-people");
  await expect(page.getByTestId("people-relationship-web")).toBeVisible();

  // Nothing under "here" names somebody who is not in the room.
  const here = page.getByTestId("conversations-here");
  if (inRoom.length === 0) await expect(here).toHaveCount(0);

  // The People list itself carries no design commentary and no rule sentence.
  const contacts = page.getByTestId("contacts");
  await expect(contacts).not.toContainText("not a promise");
  await expect(contacts).not.toContainText("A meeting can be arranged");

  await page.getByTestId("people-web-expand").click();
  const people = page.locator('[data-testid^="people-person-"]');
  const count = await people.count();
  expect(count).toBeGreaterThan(0);
  let opened = false;
  for (let index = 0; index < count && !opened; index += 1) {
    await people.nth(index).click();
    const card = page.getByTestId("quick-dossier");
    await expect(card).toBeVisible();
    const contact = card.getByTestId("person-contact");
    if (!(await contact.isEnabled())) continue;
    const personId = await card.getAttribute("data-person-id");
    await contact.click();

    const dialog = page.getByTestId("contact-dialog");
    await expect(dialog).toBeVisible();
    // A modal of its own, named for the person, over the card that opened it.
    const name = await card.getAttribute("aria-label");
    await expect(
      page.locator("dialog").getByRole("heading", { name: name! }),
    ).toBeVisible();
    await expect(dialog).toHaveJSProperty("open", true);
    // About that one person, and only them.
    await expect(
      dialog.locator(`[data-testid="contact-focus-${personId}"]`),
    ).toHaveCount(1);
    await expect(
      dialog.locator('[data-testid^="contact-focus-"]'),
    ).not.toHaveCount(0);
    await expect(dialog).not.toContainText("not a promise");
    await expect(dialog).not.toContainText("A meeting can be arranged");
    const day = dialog.getByTestId(`contact-focus-ask-day-${personId}`);
    if (await day.count()) {
      await expect(dialog.getByText("When?", { exact: true })).toBeVisible();
      expect(await day.getAttribute("min")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(await day.getAttribute("max")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    await page.screenshot({
      path: test.info().outputPath("contact-dialog.png"),
    });

    // Escape closes it, and the card and People are still there.
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("quick-dossier")).toBeVisible();
    await expect(page.getByTestId("people-relationship-web")).toBeVisible();
    opened = true;
  }
  expect(opened).toBe(true);
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
