import { randomInt } from "node:crypto";
import { expect, test } from "./fixtures";
import { goTo, startLife } from "./support/creator";

// A fresh isolated browser context, using one ordinary locality chosen for this run.
const places = [
  { place: "Lexington", state: "Kentucky" },
  { place: "Tucson", state: "Arizona" },
  { place: "Manchester", state: "New Hampshire" },
];

test("first intro pauses on the same card and only Begin completes it", async ({
  page,
}, info) => {
  const place = places[randomInt(places.length)]!;
  info.annotations.push({
    type: "ordinary-place",
    description: `${place.place}, ${place.state}`,
  });
  await page.goto("/");
  await startLife(page, { ...place, age: 30 });
  const intro = page.getByTestId("world-orientation");
  await expect(intro).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("orientation-skip")).toHaveCount(0);
  await page.getByTestId("orientation-next").click();
  const step = await intro.getAttribute("data-step");
  await page.keyboard.press("Escape");
  await expect(intro).toBeHidden();
  await expect(page.getByTestId("leave-game")).toBeVisible();
  const clock = await page
    .getByTestId("shell-nav-cluster")
    .getAttribute("aria-label");
  await page.getByTestId("nav-options").click();
  await expect(page.getByTestId("options-workspace")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute("data-step", step!);
  await page.keyboard.press("Escape");
  expect(
    await page.getByTestId("shell-nav-cluster").getAttribute("aria-label"),
  ).toBe(clock);
  await page.keyboard.press("Escape");
  await expect(intro).toBeVisible();
  await expect(page.getByTestId("orientation-skip")).toHaveCount(0);
  while (await intro.isVisible()) {
    const next = intro.getByRole("button", { name: /^(Next|Begin)$/ });
    if ((await next.textContent()) === "Begin") {
      await next.click();
      break;
    }
    await next.click();
  }
  await expect(intro).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1_000));
  await page.keyboard.press("Escape");
  await page.getByTestId("keep-world").click();
  const saved = page.locator(".life-hud-note").filter({ hasText: /^Saved\.$/ });
  await expect(saved).toBeVisible();
  await page.clock.runFor(1_000);
  await page.getByTestId("save-world").click();
  await expect(saved).toBeVisible();
  await page.clock.runFor(2_999);
  await expect(saved).toBeVisible();
  await page.clock.runFor(1);
  await expect(saved).toHaveCount(0);
  await page.keyboard.press("Escape");
  await goTo(page, "nav-politics");
  await expect(page.getByTestId("politics-tab-office")).toHaveCount(0);
  await expect(page.getByTestId("politics-tab-campaigns")).toBeVisible();
  await goTo(page, "nav-news");
  await page.getByTestId("news-section-around").click();
  await page.getByTestId("orientation-reopen").click();
  await expect(intro).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(intro).toHaveCount(0);
  // Fault only this disposable browser's next world write; the existing save remains intact.
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === "worlds") {
        IDBObjectStore.prototype.put = original;
        throw new DOMException(
          "Controlled test storage failure",
          "QuotaExceededError",
        );
      }
      return key === undefined
        ? original.call(this, value)
        : original.call(this, value, key);
    };
  });
  await goTo(page, "save-world");
  const error = page
    .locator(".life-hud-note--problem")
    .filter({ hasText: /saved|save/i });
  await expect(error).toBeVisible();
  const message = await error.textContent();
  await page.clock.runFor(6_000);
  await expect(error).toHaveText(message!);
  await expect(error).toBeVisible();
});
