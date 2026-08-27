import { expect, test, type Page } from "@playwright/test";

async function closeConversation(page: Page) {
  const close = page
    .getByTestId("conversation-strip")
    .getByRole("button", { name: "Close conversation" });
  if (await close.count()) await close.click();
}

for (const viewport of [
  { width: 1_440, height: 900 },
  { width: 1_200, height: 720 },
]) {
  test(`composes released office art at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await closeConversation(page);

    const compositor = page.getByTestId("office-art-compositor");
    await expect(compositor).toHaveAttribute(
      "data-environment-asset-id",
      "env_lexington_council_staff_office_prompt30_v1",
    );
    await expect(page.locator(".scene-environment-art")).toBeVisible();
    await expect(
      page.locator(".office-window, .office-desk, .person-head"),
    ).toHaveCount(0);

    for (const variant of ["primary", "guest"] as const) {
      const art = page.getByTestId(`scene-character-art-${variant}`);
      const control = page.getByTestId(
        variant === "primary" ? "scene-person" : "scene-person-b",
      );
      await expect(art).toBeVisible();
      await expect(art).toHaveAttribute("aria-hidden", "true");
      expect(
        await art.evaluate(
          (element) => getComputedStyle(element).pointerEvents,
        ),
      ).toBe("none");
      await expect(control).toBeVisible();

      const [artBox, controlBox] = await Promise.all([
        art.boundingBox(),
        control.boundingBox(),
      ]);
      expect(artBox).not.toBeNull();
      expect(controlBox).not.toBeNull();
      expect(controlBox!.x + controlBox!.width).toBeGreaterThan(0);
      expect(controlBox!.x).toBeLessThan(viewport.width);
      expect(controlBox!.y + controlBox!.height).toBeGreaterThan(0);
      expect(controlBox!.y).toBeLessThan(viewport.height);
      expect(controlBox!.x + controlBox!.width / 2).toBeGreaterThan(artBox!.x);
      expect(controlBox!.x + controlBox!.width / 2).toBeLessThan(
        artBox!.x + artBox!.width,
      );
    }

    await expect(
      page.locator('[data-occluder-id="primary-desk-front"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-occluder-id="left-guest-chair-near-arm"]'),
    ).toBeVisible();

    await page.getByTestId("scene-person").click();
    await expect(page.getByTestId("person-action-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId("scene-person-b").click();
    await expect(page.getByTestId("person-action-menu")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "OFFICE REMAINS IN VIEW",
    );
  });
}

test("keeps workspace safe areas, compact date, and retreat behavior honest", async ({
  page,
}) => {
  await page.goto("/");
  await closeConversation(page);
  const shell = page.getByTestId("navigation-cluster");
  const shellButton = page.locator(".nav-cluster-button");
  await expect(shell.locator(".cluster-date-compact")).toHaveText("Mon, Jan 5");
  await expect(shell.locator(".cluster-date-full")).toBeHidden();

  await shell.click();
  await page.getByRole("menuitem", { name: /Calendar/ }).click();
  await page.mouse.move(700, 100);
  await page.waitForTimeout(220);
  const workspace = page.getByTestId("calendar-workspace");
  const rail = page.locator(".pin-rail");
  const [workspaceBox, railBox] = await Promise.all([
    workspace.boundingBox(),
    rail.boundingBox(),
  ]);
  expect(workspaceBox!.x + workspaceBox!.width).toBeLessThanOrEqual(railBox!.x);
  expect(
    await shellButton.evaluate((element) =>
      Number(getComputedStyle(element).opacity),
    ),
  ).toBeLessThanOrEqual(0.8);
  expect(
    await shellButton.evaluate((element) =>
      Number(
        getComputedStyle(element).transform === "none"
          ? 1
          : new DOMMatrix(getComputedStyle(element).transform).a,
      ),
    ),
  ).toBeLessThanOrEqual(1);

  await shell.focus();
  await expect(shell).toBeFocused();
  await shell.click();
  await expect(page.getByTestId("navigation-flyout")).toBeVisible();
});
