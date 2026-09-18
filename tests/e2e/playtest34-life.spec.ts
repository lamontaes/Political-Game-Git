import { test, expect, type Page } from "./fixtures";
import { startLife, saveLife, goTo } from "./support/creator";
import { readSavedLegislativeWorld } from "./support/legislative-entry";
import { simulationMinutesBetween } from "../../src/simulation";

async function stepInside(page: Page, openScene = false) {
  await goTo(page, "nav-group-personal");
  await page.getByTestId("nav-personal").click();
  await page
    .getByTestId("personal-life-choices")
    .locator(":scope > summary")
    .click();
  await expect(page.getByTestId("opening-life-scene")).toBeVisible();
  if (openScene) {
    // Quiet Begin opens no scene automatically. Use the existing player entry.
    const next = page.getByTestId("life-next-scene");
    if (await next.isVisible()) await next.click();
  }
}
test("Mom proposes a new game → accepts the same saved proposal → 30 minutes once", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/?seed=p34-mom-game-3");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 10,
    route: "custom",
    household: "shares-a-home",
    childhood: true,
  });
  await stepInside(page, true);
  await page.locator('[data-testid^="life-talk-"]').first().click();
  const conversation = page.getByTestId("conversation-life-talk");
  await conversation
    .getByRole("button", {
      name: "Ask what they would like to do",
      exact: true,
    })
    .click();
  await expect(conversation.getByTestId("talk-reply")).toContainText(
    "try a new game",
  );
  const before = await save(page);
  const offer = before.history.events.find((e) =>
    e.tags.some((tag) => tag.startsWith("life.proposal.v1:")),
  )!;
  await conversation
    .getByRole("button", {
      name: "Agree to try a new game together",
      exact: true,
    })
    .press("Enter");
  await expect(conversation.getByTestId("talk-reply")).toContainText(
    "Yes, let's try a new game",
  );
  const agreed = await save(page);
  expect(agreed.currentMoment).toEqual(before.currentMoment);
  await page.reload();
  await page.getByTestId("continue").click();
  await stepInside(page, true);
  await page.locator('[data-testid^="life-talk-"]').first().click();
  await conversation
    .getByRole("button", {
      name: "Spend 30 minutes: try a new game together",
      exact: true,
    })
    .press("Space");
  await expect(conversation.getByTestId("talk-reply")).toContainText(
    "took time to try a new game",
  );
  const done = await save(page);
  expect(
    simulationMinutesBetween(agreed.currentMoment, done.currentMoment),
  ).toBe(30);
  expect(
    done.history.events.filter(
      (e) =>
        e.tags.includes("life.proposal.performed") &&
        e.tags.includes(`life.proposal:${offer.id}`),
    ),
  ).toHaveLength(1);
  await expect(
    conversation.getByRole("button", {
      name: "Spend 30 minutes: try a new game together",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("mom-game-performed.png") });
});
async function save(page: Page) {
  await saveLife(page);
  await page.keyboard.press("Escape");
  return readSavedLegislativeWorld(page);
}
for (const width of [1440, 1200]) {
  test(`ordinary saved favor: pointer agreement, keyboard performance and20minutes once ${width}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 720 });
    await page.goto("/?seed=p34-life-lexington-fayette");
    await startLife(page, {
      place: "Lexington",
      state: "Kentucky",
      age: 35,
      route: "custom",
      household: "shares-a-home",
    });
    await stepInside(page);
    const request = page.getByTestId("life-favor");
    await request.locator(":scope > summary").click();
    await expect(request).toContainText("picnic");
    // The favor comes from the parent the player shares a home with; which
    // parent is the seeded household's business (CRUNCH46 seeds it as the
    // dad), and the case is about the favor, not the parent.
    await expect(request).toContainText(/your (?:mom|dad)/);
    const id = await request.getAttribute("data-request-id");
    const before = await save(page);
    await request.getByTestId("favor-condition").click();
    await expect(request).toHaveAttribute("data-status", "agreed");
    await expect(request).toContainText("has not been done");
    const agreed = await save(page);
    expect(agreed.currentMoment).toEqual(before.currentMoment);
    await page.screenshot({ path: info.outputPath("favor-agreed.png") });
    await page.reload();
    await page.getByTestId("continue").click();
    await stepInside(page);
    // Saved shell introduction state may return directly to the day.
    await expect(request).toBeVisible();
    await expect(request).toHaveAttribute("data-request-id", id!);
    await expect(request).toHaveAttribute("data-status", "agreed");
    await request.locator(":scope > summary").press("Enter");
    await expect(request).toContainText(
      "Wording only; I will not contact the guests",
    );
    await request.getByTestId("favor-perform").press("Space");
    await expect(page.getByTestId("favor-outcome")).toContainText("20 minutes");
    const done = await save(page);
    expect(
      simulationMinutesBetween(agreed.currentMoment, done.currentMoment),
    ).toBe(20);
    const outcomes = done.history.events.filter(
      (e) => e.type === "life.favour-performed",
    );
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.tags).toContain(`life.favour-request:${id}`);
    await expect(page.getByTestId("favor-perform")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("favor-performed.png") });
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("favor-perform")).toHaveCount(0);
    const reloaded = await save(page);
    expect(reloaded.currentMoment).toEqual(done.currentMoment);
    expect(
      reloaded.history.events.filter((e) => e.type === "life.favour-performed"),
    ).toHaveLength(1);
  });
  test(`ordinary child talks to canonically labelled mom: lines/browsing zero ${width}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 720 });
    await page.goto("/?seed=p34-family-meeting");
    await startLife(page, {
      place: "Lexington",
      state: "Kentucky",
      age: 10,
      route: "custom",
      household: "shares-a-home",
      childhood: true,
    });
    await stepInside(page);
    const before = await save(page);
    await page.locator('[data-testid^="life-talk-"]').first().click();
    const conversation = page.getByTestId("conversation-life-talk");
    await expect(conversation.getByTestId("talk-relationship")).toHaveText(
      "your mom",
    );
    const intents = conversation.getByTestId("conversation-intents");
    for (const name of [
      "Say hello",
      "Talk about what is happening here",
      "Ask what they would like to do",
      "Ask why",
    ]) {
      await intents.getByRole("button", { name, exact: true }).press("Enter");
    }
    await expect(conversation.getByTestId("talk-reply")).toContainText(
      "spend time with you",
    );
    await page.screenshot({ path: info.outputPath("mom-dialogue.png") });
    const after = await save(page);
    expect(after.currentMoment).toEqual(before.currentMoment);
    expect(
      after.history.events.filter((e) => e.type === "life.conversation"),
    ).toHaveLength(4);
  });
}
