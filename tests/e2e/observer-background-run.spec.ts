import { test, expect } from "./fixtures";

test("a watched world runs in the background and saves the paused checkpoint", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  page.on("console", (message) => {
    if (message.type() === "error")
      console.log("Observer browser error:", message.text());
  });
  page.on("pageerror", (error) =>
    console.log("Observer page error:", error.message),
  );
  await page.goto("/");
  await page.getByTestId("watch-world").click();
  const orientation = page.getByTestId("world-orientation");
  if (await orientation.isVisible()) {
    await page.getByTestId("orientation-skip").click();
  }
  const date = page.getByTestId("observer-date");
  await expect(date).toBeVisible();
  const openingDate = await date.textContent();
  const shellDate = await page.getByTestId("story-when").textContent();
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("keep-world").click();
  await expect(page.getByTestId("save-world")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("shell-nav-cluster").click();
  await page.evaluate(() => {
    let ticks = 0;
    let last = performance.now();
    let maxGap = 0;
    window.setInterval(() => {
      const now = performance.now();
      maxGap = Math.max(maxGap, now - last);
      last = now;
      document.body.dataset.observerHeartbeat = String(++ticks);
      document.body.dataset.observerMaxGap = String(Math.round(maxGap));
    }, 50);
  });

  await page.getByTestId("observer-run").click();
  await expect(page.getByTestId("observer-run")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() => date.textContent(), { timeout: 90_000 })
    .not.toBe(openingDate);
  // The UI's shell changes only at a canonical quarterly checkpoint. The
  // visible observer date advances weekly without cloning its whole history.
  await expect
    .poll(() => page.getByTestId("story-when").textContent(), {
      timeout: 90_000,
    })
    .not.toBe(shellDate);
  const heartbeat = Number(
    await page.locator("body").getAttribute("data-observer-heartbeat"),
  );
  expect(heartbeat).toBeGreaterThan(20);
  const maxGap = Number(
    await page.locator("body").getAttribute("data-observer-max-gap"),
  );
  expect(maxGap).toBeLessThan(3000);

  await page.getByTestId("observer-run").click();
  await expect(page.getByTestId("observer-run")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByTestId("observer-run")).toBeEnabled({
    timeout: 30_000,
  });
  const pausedDate = await date.textContent();
  await page.screenshot({ path: testInfo.outputPath("observer-paused.png") });

  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("leave-game").click();
  await page.getByTestId("leave-save-first").click();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("observer-date")).toHaveText(pausedDate ?? "", {
    timeout: 60_000,
  });
});
