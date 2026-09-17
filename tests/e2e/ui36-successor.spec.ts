import { expect, test, type Page } from "./fixtures";
import { chooseOption } from "./support/controls";
import {
  chooseCreatorLocation,
  goTo,
  openCreator,
  chooseStartAge,
} from "./support/creator";

async function inViewport(page: Page, testId: string) {
  const button = page.getByTestId(testId);
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

test("UI36 non-Kentucky journey: quiet room, one card, conversation, News and return", async ({
  page,
}, info) => {
  await page.goto("/?art-preview=candidate");
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await page.getByLabel("First name", { exact: true }).fill("Maya");
  await page.getByLabel("Last name", { exact: true }).fill("Rivera");
  await chooseOption(page.getByTestId("start-birth-month"), "4");
  await chooseOption(page.getByTestId("start-birth-day"), "12");
  await chooseStartAge(page, 34);
  await page.getByTestId("creator-continue-character").click();
  await chooseCreatorLocation(
    page,
    { place: "Aurora", state: "Colorado", age: 34 },
    false,
  );
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await expect(page.getByTestId("scene-backdrop-plate")).toBeVisible();
  await page
    .getByTestId("scene-backdrop-plate")
    .evaluate(async (n) => (n as HTMLImageElement).decode());
  await page.screenshot({ path: info.outputPath("01-quiet.png") });
  await expect(page.getByTestId("opening-life-panel")).toHaveCount(0);
  const before = await page
    .getByTestId("shell-nav-cluster")
    .getAttribute("aria-label");
  expect(before).toContain("Aurora, Colorado");
  await page.getByTestId("shell-nav-cluster").click();
  await page.screenshot({ path: info.outputPath("02-navigation.png") });
  await page.keyboard.press("Escape");
  await page.getByTestId("shell-nav-cluster").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("shell-nav-flyout")).toBeVisible();
  await page.keyboard.press("Escape");
  const roomPeople = page.locator('[data-testid^="scene-person-"]');
  expect(
    await roomPeople.count(),
    "This generated normal household has no present NPC for the Talk checkpoint; preserve this life and report the missing precondition without regenerating it.",
  ).toBeGreaterThan(0);
  const person = roomPeople.first();
  await person.click();
  await expect(page.getByTestId("quick-dossier")).toBeVisible();
  await page.screenshot({ path: info.outputPath("03-person.png") });
  await page.keyboard.press("Escape");
  await person.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("quick-dossier")).toBeVisible();
  await page.getByTestId("dossier-talk").click();
  const conversation = page.locator(".pg-talk");
  await expect(conversation).toBeVisible();
  await page.screenshot({ path: info.outputPath("04-conversation.png") });
  const line = await conversation.innerText();
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("nav-news").click();
  await expect(page.getByTestId("conversation-return")).toBeVisible();
  await page.screenshot({ path: info.outputPath("05-news.png") });
  await page.getByTestId("conversation-return").focus();
  await page.keyboard.press("Enter");
  await expect(conversation).toBeVisible();
  expect(await conversation.innerText()).toBe(line);
  await page.setViewportSize({ width: 1280, height: 620 });
  await inViewport(page, "talk-back");
  await page.screenshot({ path: info.outputPath("06-conversation-short.png") });
  await page.getByTestId("talk-back").click();
  await person.focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("dossier-talk").click();
  await page.keyboard.press("Escape");
  await expect(conversation).toHaveCount(0);
  expect(
    await page.getByTestId("shell-nav-cluster").getAttribute("aria-label"),
  ).toBe(before);
  await goTo(page, "nav-calendar");
  await page.getByTestId("calendar-tab-interruptions").click();
  await page.getByTestId("interruption-stopForTentativeHolds").check();
  await page.getByTestId("calendar-tab-today").click();
  await inViewport(page, "calendar-simulate-day");
  await page.screenshot({ path: info.outputPath("07-calendar-short.png") });
});
