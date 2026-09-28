import { expect, test, type Page } from "./fixtures";
import {
  KENTUCKY_LEXINGTON_REGRESSION,
  enterLife,
  openElsewhere,
  startLife,
} from "./support/creator";

/**
 * Spec 8, the dialogue panel. The faces of the people in the conversation sit
 * at its top left, the Lie button stands beside the replies rather than above
 * them, and the whole panel ends above the bottom bar. At 1280x800 the bar
 * used to cover the panel's last lines, and a click on a reply landed on the
 * bar's Politics button instead (measured on main c9e9a672f).
 *
 * Which replies Lie swaps in is decided by `repliesForLieMode` and held by
 * src/presentation/lie-marker.test.ts; this file holds where things are.
 */

async function passDaysUntil(page: Page, subject: string, maxDays: number) {
  for (let day = 0; day < maxDays; day += 1) {
    await openElsewhere(page, "people");
    await expect(page.getByTestId("people-overlay")).toBeVisible();
    const starter = page.getByTestId(`conversation-start-${subject}`);
    if (
      (await starter.count()) > 0 &&
      !(await starter.innerText()).includes("settled for now")
    ) {
      return starter;
    }
    await page.keyboard.press("Escape");
    await page.getByTestId("shell-pass-day").click();
    await expect(page.getByTestId("shell-pass-day")).toBeEnabled();
  }
  throw new Error(`No ${subject} conversation after ${maxDays} days.`);
}

async function expectPanelLaidOut(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  // Away from the bar, so it rests rather than rising toward the pointer.
  await page.mouse.move(width / 2, 20);
  const talk = page.locator(".pg-talk");
  await expect(talk).toBeVisible();
  const box = (await talk.boundingBox())!;
  const nav = (await page.locator(".pg-nav-row").boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y);

  const faces = (await page.getByTestId("talk-faces").boundingBox())!;
  expect(faces.x - box.x).toBeLessThanOrEqual(16);
  expect(faces.y - box.y).toBeLessThanOrEqual(16);

  const lie = (await page.getByTestId("talk-lie-toggle").boundingBox())!;
  const choices = page.getByTestId("conversation-intents");
  const first = (await choices.getByRole("button").first().boundingBox())!;
  // Beside the first reply: to its left, on the same line.
  expect(lie.x + lie.width).toBeLessThanOrEqual(first.x);
  expect(Math.abs(lie.y - first.y)).toBeLessThanOrEqual(8);

  // Every reply is the thing under its own center once scrolled to, not the bar.
  for (const reply of await choices.getByRole("button").all()) {
    await reply.scrollIntoViewIfNeeded();
    const r = (await reply.boundingBox())!;
    const hit = await page.evaluate(
      ([x, y]) =>
        document.elementFromPoint(x, y)?.closest("button")?.dataset.testid,
      [r.x + r.width / 2, r.y + r.height / 2],
    );
    expect(hit).toBe(await reply.getAttribute("data-testid"));
  }
}

test("the dialogue panel keeps faces top left, Lie beside the replies, and clears the bar", async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  // A replay seed, so the same organizer calls on the same early day each run.
  await page.goto("/?seed=ui-lane-dialogue-panel");
  await startLife(page, {
    ...KENTUCKY_LEXINGTON_REGRESSION,
    age: 34,
    route: "custom",
    household: "shares-a-home",
  });
  await enterLife(page);

  const invite = await passDaysUntil(page, "scene-party-invite", 60);
  await invite.click();
  await expect(
    page.getByTestId("conversation-scene-party-invite"),
  ).toBeVisible();

  await expectPanelLaidOut(page, 1280, 800);
  await expectPanelLaidOut(page, 1440, 1000);

  // After a reply the panel is re-measured; it still holds.
  await page.getByTestId("intent-ask-what-happens").click();
  await expect(page.getByTestId("conversation-beat")).toContainText(
    "doesn’t sign you up",
  );
  await expectPanelLaidOut(page, 1280, 800);
  await expectPanelLaidOut(page, 1440, 1000);
});
