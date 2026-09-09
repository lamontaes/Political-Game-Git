import { test, expect } from "@playwright/test";

test("canonical office response, keyboard controls, history and IndexedDB reload", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/judicial-office/index.html");
  await expect(
    page.getByRole("heading", { name: "JUD-WORK2 feature proof" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Begin authored office practice" })
    .click();
  const initial = await page.getByTestId("sequence").textContent();
  await page.getByRole("button", { name: "Work", exact: true }).click();
  expect(await page.getByTestId("sequence").textContent()).toBe(initial);
  const check = page.getByRole("button", {
    name: "Check office correspondence",
  });
  await check.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Confidential draft transfer" }),
  ).toBeVisible();
  const openSnapshot = await page.getByTestId("world-snapshot").textContent();
  const personLink = page.locator(".judicial-office-people button").first();
  await personLink.click();
  const selectedPerson = await page
    .getByTestId("selected-person")
    .textContent();
  const savedWorld = JSON.parse(openSnapshot!);
  expect(savedWorld.world.people[selectedPerson!]).toBeDefined();
  await personLink.focus();
  await page.keyboard.press("Enter");
  expect(await page.getByTestId("selected-person").textContent()).toBe(
    selectedPerson,
  );
  expect(await page.getByTestId("world-snapshot").textContent()).toBe(
    openSnapshot,
  );
  await page.getByRole("button", { name: "Close work" }).click();
  await page.getByRole("button", { name: "Work", exact: true }).focus();
  await page.keyboard.press("Space");
  expect(await page.getByTestId("world-snapshot").textContent()).toBe(
    openSnapshot,
  );
  await page
    .getByRole("button", {
      name: "Ask the clerk for an account of the transfer",
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Prepare questions about the draft-transfer log",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Prepare the follow-up note" })
    .focus();
  await page.keyboard.press("Enter");
  await page.getByText("Office history", { exact: true }).click();
  await expect(
    page
      .locator("details p")
      .filter({ hasText: "Ask the clerk for an account of the transfer" }),
  ).toBeVisible();
  const responseSnapshot = await page
    .getByTestId("world-snapshot")
    .textContent();
  await page.getByRole("button", { name: "Save proof" }).click();
  await expect(page.getByRole("status")).toHaveText("saved");
  await page.reload();
  await page.getByRole("button", { name: "Load saved proof" }).click();
  await expect(page.getByRole("status")).toHaveText("Loaded");
  expect(await page.getByTestId("world-snapshot").textContent()).toBe(
    responseSnapshot,
  );
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await page.getByText("Office history", { exact: true }).click();
  await expect(
    page
      .locator("details p")
      .filter({ hasText: "Ask the clerk for an account of the transfer" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("jud-work2-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: testInfo.outputPath("jud-work2-desktop.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
