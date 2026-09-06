import { expect, test } from "@playwright/test";

const HIDDEN_ANALYSIS =
  "Internal sensitivity case: uptake could reduce modeled delivery to one half.";

test.beforeEach(async ({ page }) => {
  await page.goto("/?view=office-fixture");
});

test("opens a readable scene-native legislative working document from the office", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  const scene = page.getByTestId("political-office-scene");
  const entry = page.getByTestId("working-document-entry");
  const navigation = page.getByTestId("navigation-cluster");
  await expect(scene).toBeVisible();
  await expect(page.getByTestId("scene-person")).toBeVisible();
  await expect(page.getByTestId("scene-person-b")).toBeVisible();
  await expect(entry).toBeVisible();
  await expect(entry).toHaveAccessibleName(
    "Open Working Draft — Transit Access Pilot",
  );
  await expect(
    page.getByTestId("scene-surface-desk-working-document"),
  ).toContainText("Transit Access Pilot");
  const normalNavigationBox = await navigation.boundingBox();
  expect(normalNavigationBox).not.toBeNull();

  await entry.click();
  const workspace = page.getByTestId("working-document-workspace");
  const paper = page.getByTestId("legislative-paper");
  await expect(workspace).toBeVisible();
  await expect(paper).toContainText("OFFICE WORKING DRAFT");
  await expect(paper).toContainText("NOT INTRODUCED · NOT ENACTED");
  await expect(paper).toContainText("Section 1. Purpose and construction");
  await expect(paper).toContainText("Section 3. Pilot support limit");
  const amount = page.getByTestId("working-document-amount");
  await expect(amount).toHaveText("$8,000,000");
  const phraseAffordance = await amount.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      pseudoContent: window.getComputedStyle(element, "::after").content,
      borderBottomStyle: style.borderBottomStyle,
      borderBottomWidth: style.borderBottomWidth,
      backgroundColor: style.backgroundColor,
    };
  });
  expect(["none", '""']).toContain(phraseAffordance.pseudoContent);
  expect(phraseAffordance.borderBottomStyle).toBe("solid");
  expect(phraseAffordance.borderBottomWidth).not.toBe("0px");
  expect(phraseAffordance.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  await expect(page.getByTestId("current-commitment")).toHaveCount(0);
  await expect(page.locator(".pin-rail")).toHaveCount(0);
  await expect(navigation).toBeVisible();
  await expect(navigation.locator(".cluster-time")).toHaveText("9:10 AM");
  await expect(navigation.locator(".cluster-location-compact")).toHaveText(
    "Lexington, KY",
  );
  await expect(navigation.locator("xpath=..")).toHaveAttribute(
    "data-document-compact",
    "true",
  );

  const officeBox = await office.boundingBox();
  const workspaceBox = await workspace.boundingBox();
  const paperBox = await paper.boundingBox();
  const compactNavigationBox = await navigation.boundingBox();
  expect(officeBox).not.toBeNull();
  expect(workspaceBox).not.toBeNull();
  expect(paperBox).not.toBeNull();
  expect(compactNavigationBox).not.toBeNull();
  expect(workspaceBox!.width).toBeLessThan(officeBox!.width * 0.96);
  expect(workspaceBox!.height).toBeLessThan(officeBox!.height * 0.96);
  expect(workspaceBox!.x).toBeGreaterThan(officeBox!.x);
  expect(workspaceBox!.y).toBeGreaterThan(officeBox!.y);
  expect(compactNavigationBox!.width).toBeLessThan(
    normalNavigationBox!.width * 0.35,
  );
  expect(
    compactNavigationBox!.width * compactNavigationBox!.height,
  ).toBeLessThan(
    normalNavigationBox!.width * normalNavigationBox!.height * 0.35,
  );
  expect(rectanglesOverlap(compactNavigationBox!, paperBox!)).toBe(false);

  const legalText = await paper.innerText();
  const initialHistory = await office.getAttribute("data-history-sequence");
  await workspace.getByRole("button", { name: "Clean copy" }).click();
  await expect(page.getByTestId("working-annotation")).toHaveCount(0);
  expect(await paper.innerText()).toBe(legalText);
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );
  await workspace.getByRole("button", { name: "Show annotations" }).click();
  await expect(page.getByTestId("working-annotation")).toBeVisible();
  expect(await paper.innerText()).toBe(legalText);
  await expect(page.locator("body")).not.toContainText(HIDDEN_ANALYSIS);

  await workspace.getByRole("button", { name: "Return to office" }).click();
  await expect(workspace).toHaveCount(0);
  await expect(scene).toBeVisible();
});

test("supports pointer and keyboard phrase selection with nonmutating markup compare", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  const entry = page.getByTestId("working-document-entry");
  await entry.focus();
  await page.keyboard.press("Enter");
  const amount = page.getByTestId("working-document-amount");
  await amount.focus();
  await page.keyboard.press("Enter");
  await expect(amount).toHaveAttribute("aria-pressed", "true");
  const menu = page.getByTestId("provision-action-menu");
  await expect(menu).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Read staff note" }),
  ).toBeFocused();

  const initialHistory = await office.getAttribute("data-history-sequence");
  const initialVariant = await office.getAttribute(
    "data-working-draft-variant",
  );
  await menu
    .getByRole("menuitem", { name: /Compare prepared revision/ })
    .click();
  const compare = page.getByTestId("prepared-revision-panel");
  await expect(compare).toBeVisible();
  await expect(compare).toContainText(/preview only/i);
  await expect(compare.locator("del")).toHaveText("$8,000,000");
  await expect(compare.locator("ins")).toHaveText("$4,000,000");
  await expect(compare).toContainText("$8,000,000 proposed outlay increase");
  await expect(compare).toContainText("$4,000,000 proposed outlay increase");
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );
  await expect(office).toHaveAttribute(
    "data-working-draft-variant",
    initialVariant!,
  );

  await compare.getByRole("button", { name: "Close compare" }).click();
  await expect(compare).toHaveCount(0);
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );
  await amount.click();
  await expect(page.getByTestId("provision-action-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("provision-action-menu")).toHaveCount(0);
  await expect(page.getByTestId("working-document-workspace")).toBeVisible();
});

test("gates staff interpretation through explicit player knowledge", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  await page.getByTestId("working-document-entry").click();
  const body = page.locator("body");
  await expect(page.getByTestId("staff-analysis-panel")).toHaveCount(0);
  await expect(body).not.toContainText("in modeled added outlays");
  await expect(body).not.toContainText(HIDDEN_ANALYSIS);
  const initialHistory = Number(
    await office.getAttribute("data-history-sequence"),
  );

  await page.getByRole("button", { name: "Read staff note" }).click();
  const analysis = page.getByTestId("staff-analysis-panel");
  await expect(analysis).toBeVisible();
  await expect(analysis).toContainText("$8,000,000 in modeled added outlays");
  await expect(analysis).toContainText("$4,000,000 in modeled added outlays");
  await expect(analysis).toContainText("Andre Collins · staff analysis");
  await expect(analysis).toContainText(
    "Known through an explicit policy-analysis review",
  );
  await expect(analysis).toContainText(
    "not an appropriation, enactment, or guarantee of implementation",
  );
  expect(Number(await office.getAttribute("data-history-sequence"))).toBe(
    initialHistory + 4,
  );
  await expect(body).not.toContainText(HIDDEN_ANALYSIS);

  const learnedHistory = await office.getAttribute("data-history-sequence");
  await analysis.getByRole("button", { name: "Back to document" }).click();
  await page.getByRole("button", { name: "View analysis" }).click();
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    learnedHistory!,
  );
});

test("discusses the selected legislative provision through the existing Run B strip", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  await page.getByTestId("working-document-entry").click();
  await page.getByTestId("working-document-amount").click();
  await page.getByRole("menuitem", { name: "Ask Collins about this" }).click();

  const strip = page.getByTestId("conversation-strip");
  await expect(strip).toBeVisible();
  await expect(strip).toContainText("Legislative working draft");
  await expect(strip).toContainText(
    "Transit Access Pilot office working draft",
  );
  await expect(strip).toContainText("$8,000,000");
  await expect(strip).toContainText("$4,000,000");
  await expect(strip).toContainText("same eligible-rider scope");
  await expect(strip).not.toContainText(
    /emergency-rent|proof-of-income|referral/i,
  );
  await expect(
    strip.getByRole("button", { name: "Collins", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(strip.getByRole("button", { name: "Private" })).toBeDisabled();
  await expect(page.getByTestId("conversation-hearing-context")).toContainText(
    "Reed is nearby",
  );

  const initialHistory = Number(
    await office.getAttribute("data-history-sequence"),
  );
  await strip
    .getByRole("button", {
      name: "Ask Collins about the $8,000,000 provision",
    })
    .click();
  await expect(strip).toContainText("forecast comparison");
  await expect(strip).toContainText("not an appropriation or implementation");
  await expect(strip).not.toContainText(
    /emergency-rent|proof-of-income|referral/i,
  );
  await expect(office).toHaveAttribute("data-conversation-event-count", "1");
  await expect(office).toHaveAttribute("data-conversation-claim-count", "1");
  expect(
    Number(await office.getAttribute("data-history-sequence")),
  ).toBeGreaterThan(initialHistory);
  await expect(office).toHaveAttribute("data-simulation-date", "2026-01-05");
  await expect(office).toHaveAttribute("data-action-sequence", "0");
  await expect(
    strip.getByRole("button", {
      name: "Ask Collins about the $8,000,000 provision",
    }),
  ).toHaveCount(0);

  await strip.getByRole("button", { name: "Close conversation" }).click();
  await page
    .getByTestId("working-document-workspace")
    .getByRole("button", { name: "Return to office" })
    .click();
  await page.getByTestId("scene-person").click();
  await page.getByRole("menuitem", { name: /Talk/ }).click();
  await expect(page.getByTestId("conversation-strip")).toContainText(
    "Constituent services",
  );
  await expect(page.getByTestId("conversation-strip")).toContainText(
    "proof-of-income form",
  );
});

test("commits only the narrower office working draft and preserves the rest of play", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  await page.getByTestId("working-document-entry").click();
  const activeRole = page.getByTestId("active-working-draft-role");
  const annotation = page.getByTestId("working-annotation");
  await expect(activeRole).toHaveText(
    "$8,000,000 · Current office working draft",
  );
  await expect(annotation).toContainText(
    "$8,000,000 language is the current office working draft",
  );
  await expect(annotation).toContainText(
    "$4,000,000 is the prepared narrower revision",
  );
  await page.getByRole("button", { name: "Read staff note" }).click();
  const analysis = page.getByTestId("staff-analysis-panel");
  await expect(page.getByTestId("analysis-role-pilot-cap-8m")).toHaveText(
    "$8,000,000 · Current office working draft",
  );
  await expect(page.getByTestId("analysis-role-pilot-cap-4m")).toHaveText(
    "$4,000,000 · Prepared narrower revision",
  );
  await analysis.getByRole("button", { name: "Back to document" }).click();
  await page.getByTestId("working-document-amount").click();
  await page
    .getByRole("menuitem", { name: /Compare prepared revision/ })
    .click();

  const initial = await office.evaluate((element) => ({
    history: Number(element.getAttribute("data-history-sequence")),
    date: element.getAttribute("data-simulation-date"),
    action: element.getAttribute("data-action-sequence"),
    revision: element.getAttribute("data-working-draft-revision-count"),
    realization: element.getAttribute("data-policy-realization-count"),
    effects: element.getAttribute("data-effect-activation-count"),
    metrics: element.getAttribute("data-metric-state-count"),
  }));
  await expect(office).toHaveAttribute(
    "data-working-draft-variant",
    "pilot-cap-8m",
  );

  await page
    .getByTestId("prepared-revision-panel")
    .getByRole("button", {
      name: "Use $4,000,000 version as office working draft",
    })
    .click();
  await expect(office).toHaveAttribute(
    "data-working-draft-variant",
    "pilot-cap-4m",
  );
  await expect(office).toHaveAttribute(
    "data-working-draft-revision-count",
    "1",
  );
  await expect(activeRole).toHaveText(
    "$4,000,000 · Current office working draft",
  );
  await expect(annotation).toContainText(
    "$4,000,000 narrower version is now the current office working draft",
  );
  await expect(annotation).toContainText(
    "$8,000,000 language is the earlier office version",
  );
  await expect(page.getByTestId("working-document-amount")).toHaveText(
    "$4,000,000",
  );
  const after = await office.evaluate((element) => ({
    history: Number(element.getAttribute("data-history-sequence")),
    date: element.getAttribute("data-simulation-date"),
    action: element.getAttribute("data-action-sequence"),
    revision: element.getAttribute("data-working-draft-revision-count"),
    realization: element.getAttribute("data-policy-realization-count"),
    effects: element.getAttribute("data-effect-activation-count"),
    metrics: element.getAttribute("data-metric-state-count"),
  }));
  expect(after.history).toBe(initial.history + 1);
  expect(after.date).toBe(initial.date);
  expect(after.action).toBe(initial.action);
  expect(after.realization).toBe(initial.realization);
  expect(after.effects).toBe(initial.effects);
  expect(after.metrics).toBe(initial.metrics);

  await page.getByTestId("working-document-amount").click();
  await page.getByRole("menuitem", { name: "View analysis" }).click();
  await expect(page.getByTestId("analysis-role-pilot-cap-4m")).toHaveText(
    "$4,000,000 · Current office working draft",
  );
  await expect(page.getByTestId("analysis-role-pilot-cap-8m")).toHaveText(
    "$8,000,000 · Earlier office working version",
  );
  await expect(analysis).not.toContainText(
    "$4,000,000 · Prepared narrower revision",
  );
  await expect(analysis).not.toContainText(
    "$8,000,000 · Current office working draft",
  );
  await analysis.getByRole("button", { name: "Back to document" }).click();
  await page.getByTestId("working-document-amount").click();
  await expect(
    page.getByRole("menuitem", { name: /Use the prepared/ }),
  ).toHaveCount(0);
  await expect(page.getByTestId("provision-action-menu")).toContainText(
    "current office working version",
  );

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("provision-action-menu")).toHaveCount(0);
  await page
    .getByTestId("working-document-workspace")
    .getByRole("button", { name: "Return to office" })
    .focus();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("working-document-workspace")).toHaveCount(0);
  await expect(page.getByTestId("political-office-scene")).toBeVisible();
  await page.locator('[data-pin-id="person"]').click();
  await expect(page.getByTestId("pin-controls-person")).toBeVisible();
  await page.getByTestId("navigation-cluster").click();
  await expect(page.getByTestId("navigation-flyout")).toBeVisible();

  const body = page.locator("body");
  for (const forbidden of [
    /relationship points?/i,
    /persuasion percentage/i,
    /success percentage/i,
    /pass chance/i,
    /source snapshot/i,
    /hidden sensitivity/i,
  ]) {
    await expect(body).not.toContainText(forbidden);
  }
});

function rectanglesOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}
