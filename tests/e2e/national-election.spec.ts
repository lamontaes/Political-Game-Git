import { test, expect } from "@playwright/test";

/** Feature-leaf proof on the identified repository server; A owns ordinary Politics mounting. */
test("national supplied-results view separates stages and activates controls by pointer and keyboard", async ({
  page,
}) => {
  await page.route("**/__s30_n_fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><p>Supplied fictional results fixture — S30-N browser proof</p><div id="root"></div><script type="module">
import '/tests/e2e/national-election-browser-entry.ts';
</script></body></html>`,
    }),
  );
  await page.goto("/__s30_n_fixture");
  const view = page.getByTestId("national-election-results");
  await expect(view).toBeVisible();
  await expect(view).toContainText("Incomplete statewide popular totals");
  await expect(view).toContainText("Congressional count pending");
  await expect(view.getByRole("table")).toContainText("Pending");
  const units = view.getByRole("button", {
    name: "State and district records",
  });
  await units.click();
  await expect(units).toHaveAttribute("aria-expanded", "true");
  await expect(view).toContainText("NE: uncertified");
  await units.focus();
  await page.keyboard.press("Enter");
  await expect(units).toHaveAttribute("aria-expanded", "false");
  const summary = view.getByText("Rules and sources", { exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(
    view.getByRole("link", { name: "National Archives allocation" }),
  ).toBeVisible();
  const pure = await page.evaluate(() => {
    const state = window as unknown as {
      __s30Before: string;
      __s30World: unknown;
    };
    return JSON.stringify(state.__s30World) === state.__s30Before;
  });
  expect(pure).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("national-results-1440.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 960, height: 720 });
  await expect(view).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("national-results-960.png"),
    fullPage: true,
  });
});
