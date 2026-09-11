import { expect, test, type Locator, type Page } from "./fixtures";
import { openElsewhere, startLife } from "./support/creator";

/**
 * PT3: one conversation box, in the room, that never needs a scrollbar.
 *
 * Walked on the owner's own route — a normal age-22 start in Lexington — at
 * the normal desktop acceptance size, through the controls a player has. The
 * Run B rules checked here are geometric, not textual: the active box's
 * content fits the box, every current choice is on screen at once, earlier
 * turns page inside the same box, and the room stays mostly visible.
 */

async function stepIntoTheScene(page: Page) {
  await expect(page.getByTestId("play-screen")).toBeVisible();
  const opening = page.getByTestId("opening-life-panel");
  const scene = page.getByTestId("opening-life-scene");
  await expect
    .poll(async () =>
      (await opening.count()) > 0 || (await scene.count()) > 0 ? "ready" : "",
    )
    .toBe("ready");
  if ((await opening.count()) > 0) {
    await opening.getByRole("button", { name: "Meet your household" }).click();
    await opening.getByRole("button", { name: "Step inside" }).click();
  }
  await expect(scene).toBeVisible();
}

/*
 * The normal desktop acceptance size. The project's default browser size is
 * the smaller 1280 x 720, which the second file-level check below also covers.
 */
test.use({ viewport: { width: 1440, height: 900 } });

/** The Run B box rules, measured on the live element. */
async function expectBounded(page: Page, box: Locator, share = 0.5) {
  const metrics = await box.evaluate((element) => ({
    scroll: element.scrollHeight,
    client: element.clientHeight,
    overflowY: getComputedStyle(element).overflowY,
    top: element.getBoundingClientRect().top,
    bottom: element.getBoundingClientRect().bottom,
    height: element.getBoundingClientRect().height,
  }));
  const viewport = page.viewportSize()!;
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client);
  expect(metrics.overflowY).not.toBe("scroll");
  expect(metrics.top).toBeGreaterThanOrEqual(0);
  expect(metrics.bottom).toBeLessThanOrEqual(viewport.height);
  // The room stays the surface: the box takes well under half the height.
  expect(metrics.height).toBeLessThan(viewport.height * share);
}

async function expectAllOnScreen(page: Page, controls: Locator) {
  const viewport = page.viewportSize()!;
  const boxes = await controls.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().toJSON()),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const rect of boxes) {
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(viewport.height);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(viewport.width);
  }
}

test("the owner's age-22 conversation is one bounded box with paged history and Back", async ({
  page,
}) => {
  await page.goto("/?seed=pt3-owner-22");
  await startLife(page, { age: 22, place: "Lexington" });
  await stepIntoTheScene(page);

  // Choosing somebody in the scene opens the box with exactly them.
  const talkTo = page.locator('[data-testid^="life-talk-"]').first();
  const personName = (await talkTo.innerText()).split(" · ")[0]!.trim();
  await talkTo.click();
  const box = page.getByRole("region", {
    name: `Conversation with ${personName}`,
  });
  await expect(box).toBeVisible();
  await expect(page.getByTestId("opening-life-scene")).toHaveCount(0);
  await expect(box.getByTestId("talk-name")).toHaveText(personName);
  await expect(box.getByTestId("talk-relationship")).not.toBeEmpty();
  await expect(box.getByTestId("conversation-topic")).not.toBeEmpty();
  await expect(box.getByTestId("person-portrait")).toBeVisible();
  await expectBounded(page, box);
  await expectAllOnScreen(
    page,
    box.getByTestId("conversation-intents").getByRole("button"),
  );

  // Several exchanges, and the box never grows a transcript.
  for (const name of [
    "Say hello",
    "Ask what they would like to do",
    "Ask why",
    "Ask if they want to talk",
  ]) {
    const choice = box
      .getByTestId("conversation-intents")
      .getByRole("button", { name, exact: true });
    if ((await choice.count()) === 0) continue;
    const before = await box.getByTestId("conversation-beat").innerText();
    await choice.click();
    await expect(box.getByTestId("conversation-beat")).not.toHaveText(before);
    await expect(box.getByTestId("talk-clock")).toContainText("→");
    await expectBounded(page, box);
    await expectAllOnScreen(
      page,
      box.getByTestId("conversation-intents").getByRole("button"),
    );
  }
  const lastYou = await box.getByTestId("talk-you").innerText();
  const lastReply = await box.getByTestId("talk-reply").innerText();
  expect(lastYou).toMatch(/^You /);
  expect(lastReply).toMatch(/[“"]/);

  // Earlier turns page inside the same box, by keyboard, and come back.
  await box.getByTestId("talk-history-open").focus();
  await page.keyboard.press("Enter");
  await expect(box).toHaveAttribute("data-state", "history");
  await expect(box.getByTestId("talk-history")).toBeVisible();
  await expect(box.getByTestId("conversation-intents")).toHaveCount(0);
  await expectBounded(page, box);
  await page.keyboard.press("Escape");
  await expect(box).toHaveAttribute("data-state", "active");

  // Back, by keyboard, returns to the scene the conversation was opened from.
  await box.getByTestId("talk-back").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("opening-life-scene")).toBeVisible();
  await expect(box).toHaveCount(0);

  // Talking to them again from the room carries the conversation on rather
  // than greeting them as though nothing had been said.
  await page.locator('[data-testid^="scene-person-"]').first().click();
  await page.getByTestId("action-talk").click();
  await expect(box).toBeVisible();
  await expect(box.getByTestId("talk-you")).toHaveText(lastYou);
  await expect(box.getByTestId("talk-reply")).toHaveText(lastReply);
  await expect(page.getByTestId("person-workspace")).toHaveCount(0);
});

test("turning to a second classmate keeps the last exchange and says who heard it", async ({
  page,
}) => {
  await page.goto("/?seed=pt3-school-switch");
  await startLife(page, {
    age: 15,
    childhood: true,
    household: "shares-a-home",
  });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await openElsewhere(page, "people");
  await page.getByTestId("conversation-start-school-project-share").click();
  const box = page.getByTestId("conversation-school-project-share");
  await expect(box).toBeVisible();
  await expect(page.getByTestId("people-overlay")).toHaveCount(0);

  const addressees = box
    .getByTestId("conversation-addressees")
    .getByRole("button");
  await expect(addressees).toHaveCount(2);
  const first = await box.getAttribute("data-addressee");

  await box
    .getByTestId("conversation-intents")
    .getByRole("button")
    .first()
    .click();
  const said = await box.getByTestId("talk-you").innerText();
  expect(said).toMatch(/^You /);

  // The second classmate is faced; nothing restarts.
  await addressees.nth(1).click();
  await expect(box).not.toHaveAttribute("data-addressee", first ?? "");
  await expect(box.getByTestId("talk-you")).toHaveText(said);
  await expect(box.getByTestId("talk-heard")).toContainText("heard that");
  await expectBounded(page, box);
});

test("at the smaller 1280 x 720 window the box still needs no scrollbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?seed=pt3-owner-22");
  await startLife(page, { age: 22, place: "Lexington" });
  await stepIntoTheScene(page);
  await page.locator('[data-testid^="life-talk-"]').first().click();
  const box = page.getByRole("region", { name: /^Conversation with / });
  for (let turn = 0; turn < 3; turn += 1) {
    await box
      .getByTestId("conversation-intents")
      .getByRole("button")
      .first()
      .click();
    // Smaller window, so the room keeps a little less — but the box still
    // holds every choice without a scrollbar.
    await expectBounded(page, box, 0.62);
    await expectAllOnScreen(
      page,
      box.getByTestId("conversation-intents").getByRole("button"),
    );
  }
});
