import { test, expect } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import {
  activeWorkRelationshipsAt,
  activeEducationEnrollmentsAt,
  kinshipRelationshipsAt,
  workRelationshipHistoryForPerson,
  workStatusAt,
} from "../../src/simulation";
import { startLife, enterLife, goTo, saveLife } from "./support/creator";
import type { Page } from "./fixtures";
import type { World } from "../../src/simulation";
import type * as SaveModule from "../../src/presentation/browser-world-repository";

async function savedLife(page: Page): Promise<World> {
  return page.evaluate(async () => {
    const modulePath = "/src/presentation/browser-world-repository.ts";
    const { BrowserSaveStore } = (await import(
      /* @vite-ignore */ modulePath
    )) as typeof SaveModule;
    const store = new BrowserSaveStore();
    const listing = await store.list();
    if (listing.saves.length !== 1)
      throw new Error("Expected one saved life on the shelf");
    const world = await store.inspectSnapshot(listing.saves[0]!.saveId);
    if (!world) throw new Error("Saved life is absent");
    return world;
  });
}

test("Personal separates current records from history without changing the life", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const seed = "session9-split-record-oct5";
  const place = drawRandomPlace(
    seed,
    (candidate) => candidate.scope === "locality",
  );
  console.log(`Personal proof: ${place.displayName}; seed=${seed}`);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?seed=${seed}`);
  await startLife(page, { place: place.displayName, age: 34 });
  await page.getByTestId("orientation-skip").click({ timeout: 120_000 });
  await enterLife(page);
  await saveLife(page);
  await page.keyboard.press("Escape");
  const before = await savedLife(page);
  if (before.control.kind !== "person")
    throw new Error("Expected a played life");
  const personId = before.control.personId;
  await goTo(page, "nav-personal");
  const profile = page.getByTestId("personal-split-record");
  await expect(profile).toBeVisible();
  await expect(
    profile.locator('[data-testid="personal-history-page"]'),
  ).toHaveCount(0);
  const currentWork = activeWorkRelationshipsAt(before, personId);
  const workIds = await profile
    .getByTestId("personal-current-work")
    .locator("[data-record-id]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-record-id")),
    );
  expect(workIds).toEqual(currentWork.map((entry) => entry.relationship.id));
  const schoolIds = await profile
    .getByTestId("personal-current-education")
    .locator("[data-record-id]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-record-id")),
    );
  expect(schoolIds).toEqual(
    activeEducationEnrollmentsAt(before, personId).map(
      (entry) => entry.enrollment.id,
    ),
  );
  const family = new Set(
    kinshipRelationshipsAt(before, personId)
      .flatMap((row) => row.personIds)
      .filter((id) => id !== personId && before.people[id]),
  );
  await expect(
    profile.getByTestId("personal-family").locator("li"),
  ).toHaveCount(family.size);
  const figure = profile.locator(".pg-split-record-figure");
  await expect(figure.locator("figure")).toHaveAttribute(
    "data-figure-status",
    "ready",
  );
  const boxes = await Promise.all([
    figure.boundingBox(),
    profile.locator(".pg-split-record-facts").boundingBox(),
  ]);
  expect(boxes[0]!.x + boxes[0]!.width).toBeLessThan(boxes[1]!.x);
  await page.screenshot({
    path: test.info().outputPath("personal-profile-1920.png"),
  });
  await profile.getByTestId("personal-full-history").click();
  await expect(page.getByTestId("personal-life-choices")).toHaveCount(0);
  const history = profile.getByTestId("personal-history-page");
  await expect(history).toBeVisible();
  await expect(profile.getByTestId("personal-current-work")).toHaveCount(0);
  for (const relationship of workRelationshipHistoryForPerson(
    before,
    personId,
  )) {
    const line = history
      .getByTestId("personal-work")
      .locator(`[data-record-id="${relationship.id}"]`);
    await expect(line).toHaveCount(1);
    const status = workStatusAt(before, relationship.id);
    if (status?.status === "ended") await expect(line).toContainText(" to ");
  }
  await page.screenshot({
    path: test.info().outputPath("personal-history-1920.png"),
  });
  await history.getByRole("button", { name: "Back to profile" }).press("Enter");
  await expect(profile.getByTestId("personal-current-work")).toBeVisible();
  await profile.getByTestId("personal-full-history").press("Enter");
  await expect(history).toBeVisible();
  await history.getByRole("button", { name: "Back to profile" }).click();
  await page.setViewportSize({ width: 1200, height: 720 });
  const narrowFigure = await figure.locator("figure").boundingBox();
  const workspace = await page.getByTestId("personal-workspace").boundingBox();
  expect(narrowFigure!.y + narrowFigure!.height).toBeLessThan(
    workspace!.y + workspace!.height,
  );
  await page.screenshot({
    path: test.info().outputPath("personal-profile-1200.png"),
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const familyButtons = profile
    .getByTestId("personal-family")
    .getByRole("button");
  let contactOpened = false;
  for (let index = 0; index < (await familyButtons.count()); index += 1) {
    await familyButtons.nth(index).click();
    const card = page.getByTestId("person-workspace");
    await expect(card).toBeVisible();
    const contact = card.getByTestId("person-contact");
    if ((await contact.count()) && (await contact.isEnabled())) {
      await contact.click();
      const dialog = page.getByTestId("contact-dialog");
      await expect(
        dialog.locator(".pg-split-record-figure figure"),
      ).toHaveAttribute("data-figure-status", "ready");
      await expect(dialog.getByTestId("contact-focus-panel")).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath("contact-split-record-1920.png"),
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await contact.press("Enter");
      await expect(dialog).toBeVisible();
      await dialog.getByTestId("contact-dialog-close").press("Enter");
      await expect(dialog).toHaveCount(0);
      contactOpened = true;
    }
    await goTo(page, "nav-personal");
    if (contactOpened) break;
  }
  expect(contactOpened).toBe(true);
  await saveLife(page);
  const after = await savedLife(page);
  expect(after.currentDate).toBe(before.currentDate);
  expect(after.history).toEqual(before.history);
  await goTo(page, "leave-game");
  await expect(page.getByTestId("leave-confirm")).toBeVisible();
  await page.getByTestId("leave-without-saving").click();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible({
    timeout: 30_000,
  });
  await goTo(page, "nav-personal");
  await expect(profile.getByTestId("personal-current-work")).toBeVisible();
  await expect(figure.locator("figure")).toHaveAttribute(
    "data-figure-status",
    "ready",
  );
  const continuedWorkIds = await profile
    .getByTestId("personal-current-work")
    .locator("[data-record-id]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-record-id")),
    );
  expect(continuedWorkIds).toEqual(workIds);
  const continued = await savedLife(page);
  expect(continued.control).toEqual(before.control);
  expect(continued.currentDate).toBe(before.currentDate);
  expect(continued.history).toEqual(before.history);
  await page.screenshot({
    path: test.info().outputPath("personal-continued-1920.png"),
  });
});
