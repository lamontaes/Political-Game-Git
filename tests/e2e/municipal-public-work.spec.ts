import { test, expect } from "@playwright/test";

test.describe("municipal feature pointer, keyboard and saved state", () => {
  let browserErrors: string[] = [];
  test.beforeEach(async ({ page }) => {
    browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
  });
  test.afterEach(() => {
    expect(browserErrors).toEqual([]);
  });
  for (const place of ["5114968", "3209700"]) {
    test(`citizen ${place}: attend, reload, refuse duplicate without writes`, async ({
      page,
    }) => {
      await page.goto(`/tests/browser/municipal.html?place=${place}`);
      await expect(
        page.getByText("Linked to your saved home place."),
      ).toBeVisible();
      const roles = await page.getByTestId("roles").textContent();
      await page
        .getByRole("button", { name: "Add public session to this world" })
        .click();
      await expect(
        page.getByRole("button", { name: "Prepare meeting notes" }),
      ).toBeDisabled();
      const attend = page.getByRole("button", {
        name: "Attend public meeting",
      });
      await attend.focus();
      await page.keyboard.press("Enter");
      await expect(
        page
          .getByRole("region", { name: "Municipal government" })
          .getByRole("status"),
      ).toHaveText("Recorded in your calendar and history.");
      await expect(page.getByTestId("roles")).toHaveText(roles!);
      const sequence = await page.getByTestId("sequence").textContent();
      await attend.click();
      await expect(page.getByTestId("sequence")).toHaveText(sequence!);
      await page
        .getByRole("button", { name: "Save verification world" })
        .click();
      await page.reload();
      await expect(page.getByTestId("sequence")).toHaveText(sequence!);
      await page
        .getByLabel("Inspect a government")
        .selectOption("us-nh-new-london");
      await expect(
        page.getByText("Library inspection.", { exact: false }),
      ).toBeVisible();
      await expect(page.getByTestId("sequence")).toHaveText(sequence!);
      await page.getByLabel("Inspect a government").selectOption("");
      await page.screenshot({
        path: `docs/evidence/muni-play1-recovery/citizen-${place}.png`,
        fullPage: true,
      });
    });
  }
  test("current member can prepare canonical work with keyboard; duplicate is no-write", async ({
    page,
  }) => {
    await page.goto("/tests/browser/municipal.html?place=5114968&role=member");
    const button = page.getByRole("button", { name: "Prepare meeting notes" });
    await expect(button).toBeEnabled();
    await button.focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("work")).toHaveText("1");
    const sequence = await page.getByTestId("sequence").textContent();
    await button.click();
    await expect(
      page
        .getByRole("region", { name: "Municipal government" })
        .getByRole("status"),
    ).toHaveText("Meeting notes are already in Work.");
    await expect(page.getByTestId("sequence")).toHaveText(sequence!);
  });
});
