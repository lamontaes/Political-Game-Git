import { expect, test } from "./fixtures";

test("Observer inspector uses the paused current world and returns to the same record", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("watch-world").click();
  await expect(page.getByTestId("observing-label")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("open-world-record").click();
  const record = page.getByTestId("world-record-summary");
  await expect(record).toBeVisible();
  const summary = await record.textContent();
  const date = await page.getByTestId("observer-date").textContent();
  await page.getByTestId("open-observer-inspector").focus();
  await page.getByTestId("open-observer-inspector").press("Enter");
  await expect(page.getByTestId("observer-inspector-workspace")).toBeVisible();
  await expect(page.getByTestId("causal-trace-view")).toBeVisible();
  const seed = await page.getByTestId("trace-seed").textContent();
  expect(seed).toBeTruthy();
  expect(seed).not.toMatch(/^causal-trace-/);
  await expect(page.getByTestId("trace-record-count")).not.toHaveText("0");
  expect(await page.getByTestId("observer-date").textContent()).toBe(date);
  await page.getByTestId("observer-inspector-workspace-back").click();
  await expect(page.getByTestId("observer-inspector-workspace")).toHaveCount(0);
  await expect(record).toBeVisible();
  expect(await record.textContent()).toBe(summary);
  expect(await page.getByTestId("observer-date").textContent()).toBe(date);
  await page.getByTestId("open-observer-inspector").focus();
  await page.getByTestId("open-observer-inspector").press("Enter");
  await expect(page.getByTestId("trace-seed")).toHaveText(seed!);
  await page.getByTestId("observer-inspector-workspace-close").click();
  await expect(record).toBeVisible();
  expect(await record.textContent()).toBe(summary);
});
