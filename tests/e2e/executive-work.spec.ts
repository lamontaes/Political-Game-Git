import { expect, test } from "@playwright/test";

test("executive work accepts pointer and keyboard actions and retains snapshot state", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/executive-work.html");
  const open = page.getByRole("button", {
    name: "Open office work",
    exact: true,
  });
  await open.click();
  await expect(
    page.getByRole("button", { name: "Return", exact: true }),
  ).toBeFocused();
  const workspace = page.getByRole("region", { name: "Executive work" });
  await expect(workspace).toBeVisible();
  const summary = workspace.locator("summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  const continued = workspace
    .getByRole("button", { name: "Continue office work" })
    .first();
  await continued.click();
  await expect(page.getByLabel("Recorded work")).toHaveText("2");
  const work = workspace.getByRole("button", { name: "Work for 30 minutes" });
  await work.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(workspace).toHaveCount(0);
  await expect(open).toBeFocused();
  await page.getByRole("button", { name: "Reload snapshot" }).click();
  await expect(page.getByLabel("Recorded work")).toHaveText("2");
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(workspace).toBeVisible();
  await page.getByRole("button", { name: "Return", exact: true }).click();
  await expect(open).toBeFocused();
});
