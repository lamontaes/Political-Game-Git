/* global process, URL, console, fetch */
// Dev mode's director's day (src/bench/dev-views/director-day.ts) in a played life: Sheridan WY (5669845), seed 7. Runs the world until a day has a held scene, opens that day on the Calendar's dev panel and opens the cause in the trace box. Run against a fresh bench: node src/bench/dev-director-day.browser.mjs [screenshot.png]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { devModeOn } from "./dev-setup.mjs";
import { playOpening } from "./start-life.mjs";
const port = process.env.BENCH_PORT ?? 3000;
const browser = await chromium.launch({
  args: ["--disable-dev-shm-usage", "--disable-gpu"],
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.route("**/api/newlife*", (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("seed", "7");
    url.searchParams.set("placeKey", "5669845");
    return route.continue({ url: url.toString() });
  });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${port}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  await playOpening(page, (await (await made).json()).sceneMomentId ?? null);
  await devModeOn(page);
  const api = (p, body) =>
    page.evaluate(
      async ([p, body]) => {
        const r = await fetch(
          `/api/dev/${p}`,
          body ? { method: "POST", body: JSON.stringify(body) } : {},
        );
        return r.json();
      },
      [p, body],
    );
  let held;
  for (let i = 0; i < 12 && !held; i++) {
    const rows = await api("scene-trace/moments");
    held = rows.find((r) => r.heldBack.length);
    if (!held) {
      await api("run-until", { days: 30 });
      console.log("ran 30 days");
    }
  }
  assert.ok(held, "no held scene in 12 runs");
  console.log("held on", held.date, JSON.stringify(held.heldBack));
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  const panel = page.locator(".dev-director-day");
  await panel.waitFor();
  await panel.locator("input[type=date]").fill(held.date);
  await panel.getByRole("button", { name: "Show the day" }).click();
  await panel.locator(".dev-director-held").first().waitFor();
  await panel.locator(".dev-director-moment button").first().click();
  await panel.locator(".dev-trace h4").waitFor();
  console.log(await panel.innerText());
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: process.argv[2] ?? ".probe/director-day.png" });
  assert.deepEqual(errors, []);
  console.log("PASS");
} finally {
  await browser.close();
}
