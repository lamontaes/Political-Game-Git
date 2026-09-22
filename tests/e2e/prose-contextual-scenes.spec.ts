import { expect, test, type Page } from "./fixtures";
import {
  KENTUCKY_LEXINGTON_REGRESSION,
  enterLife,
  openElsewhere,
  saveLife,
  startLife,
} from "./support/creator";

/**
 * PROSE B through the ordinary game: an organizer's invitation arrives while
 * days pass, a housemate asks about the evening it books, the Lie is marked
 * before it is chosen, the answer survives save and reload, and talking never
 * moves the clock.
 *
 * The Lie marker itself is rendered by the UI lane (`lie-marker` test id);
 * this spec is meant to run on the composition that carries both.
 */

async function openStarters(page: Page) {
  await openElsewhere(page, "people");
  await expect(page.getByTestId("people-overlay")).toBeVisible();
}

async function starterFor(page: Page, subject: string) {
  const starter = page.getByTestId(`conversation-start-${subject}`);
  return (await starter.count()) > 0 &&
    !(await starter.innerText()).includes("settled for now")
    ? starter
    : null;
}

async function passDaysUntil(page: Page, subject: string, maxDays: number) {
  for (let day = 0; day < maxDays; day += 1) {
    await openStarters(page);
    const starter = await starterFor(page, subject);
    if (starter) return starter;
    await page.keyboard.press("Escape");
    await page.getByTestId("shell-pass-day").click();
    await expect(page.getByTestId("shell-pass-day")).toBeEnabled();
  }
  throw new Error(`No ${subject} conversation after ${maxDays} days.`);
}

test("an invitation, the evening it books, and a marked lie survive reload", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/");
  await startLife(page, {
    ...KENTUCKY_LEXINGTON_REGRESSION,
    age: 34,
    route: "custom",
    household: "shares-a-home",
  });
  await enterLife(page);

  const invite = await passDaysUntil(page, "scene-party-invite", 40);
  await invite.click();
  await expect(
    page.getByTestId("conversation-scene-party-invite"),
  ).toBeVisible();
  await expect(page.getByTestId("conversation-topic")).toContainText(
    "An invitation from the",
  );
  await expect(page.getByTestId("conversation-beat")).toContainText(
    "community room",
  );
  const clock = await page.getByTestId("story-when").innerText();
  await page.getByTestId("intent-ask-what-happens").click();
  await expect(page.getByTestId("conversation-beat")).toContainText(
    "doesn’t sign you up",
  );
  await expect(page.getByTestId("intent-ask-what-happens")).toHaveCount(0);
  await page.getByTestId("intent-say-yes").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("conversation-beat")).toContainText(
    /I’ll look for you|See you/,
  );
  expect(await page.getByTestId("story-when").innerText()).toBe(clock);
  await page.getByTestId("talk-back").click();

  const evening = await passDaysUntil(page, "scene-home-evening", 10);
  await evening.click();
  await expect(
    page.getByTestId("conversation-scene-home-evening"),
  ).toBeVisible();
  await expect(page.getByTestId("conversation-beat")).toContainText(
    /evening|tonight/,
  );
  const lie = page.getByTestId("intent-say-home");
  await expect(lie.getByTestId("lie-marker")).toBeVisible();
  await expect(
    page.getByTestId("intent-tell-plans").getByTestId("lie-marker"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("intent-ask-why").getByTestId("lie-marker"),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("evening-question.png"),
  });
  const beforeLie = await page.getByTestId("story-when").innerText();
  await lie.click();
  await expect(page.getByTestId("conversation-beat")).toContainText(
    /See you then|count on it/,
  );
  expect(await page.getByTestId("story-when").innerText()).toBe(beforeLie);

  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await openStarters(page);
  await expect(
    page.getByTestId("conversation-start-scene-home-evening"),
  ).toContainText("settled for now");
});
