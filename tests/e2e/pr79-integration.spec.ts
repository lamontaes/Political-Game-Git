import { expect, test } from "@playwright/test";

test("the reconciled floor entries and conversation commit activate by keyboard", async ({
  page,
}) => {
  await page.goto("/?view=floor");
  const view = page.getByTestId("measure-floor-view");
  await expect(view).toBeVisible();
  const entry = page.getByTestId("working-document-entry");
  await entry.focus();
  await entry.press("Enter");
  await expect(page.getByTestId("measure-paper")).toBeVisible();
  await page.getByRole("button", { name: "Back to the room" }).press("Enter");
  await page.getByTestId("briefing-memo-entry").press("Space");
  await expect(page.getByTestId("measure-paper")).toBeVisible();
  await page.getByTestId("open-fiscal-note").press("Enter");
  await expect(page.getByTestId("fiscal-note-unread")).toBeVisible();
  await page.getByTestId("read-fiscal-note").press("Space");
  await expect(page.getByTestId("fiscal-note-body")).toContainText(
    "$8,000,000",
  );
  await page.getByTestId("close-panel").press("Enter");
  await page.getByRole("button", { name: "Back to the room" }).press("Enter");
  await page.getByTestId("scene-person").press("Enter");
  await page.getByRole("menuitem", { name: /Talk/ }).press("Enter");
  const strip = page.getByTestId("conversation-strip");
  await expect(strip).toBeVisible();
  await strip
    .getByRole("button", { name: /what they actually want/ })
    .press("Enter");
  await strip
    .getByRole("button", { name: /Counter at \$600,000/ })
    .press("Space");
  await expect(view).toHaveAttribute("data-commitment-count", "1");
  await expect(view).toHaveAttribute("data-provision-count", "3");
  await strip
    .getByRole("button", { name: "Close conversation" })
    .press("Enter");
  await expect(strip).not.toBeVisible();
});
