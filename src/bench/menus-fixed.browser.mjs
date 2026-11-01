/* global process, console, document, URL, window */
// No menu scrolls as a whole (owner, Oct 29: "The main menu shouldn't really be scrolling. It
// should be things inside."). Opens every menu, and each Politics tab, at 1440 by 900 and 1280 by
// 720 as a member of a body, and fails for any whose #sheet-body scrolls or whose sheet leaves the
// window. BENCH_SEED replays a world; SHOTS_DIR saves a picture of each menu.
// Run against a fresh bench: node src/bench/menus-fixed.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const visible = (id) =>
  page
    .locator(`#${id}`)
    .isVisible()
    .catch(() => false);
try {
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
      return route.continue({ url: url.toString() });
    });
  let seed = "";
  let names = [];
  let at = -1;
  for (let attempt = 1; attempt <= 5 && at < 0; attempt += 1) {
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    await ready;
    await page.locator("#new-life").click();
    const built = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#new-advanced").click();
    await page.locator("#front-advanced:not([hidden])").waitFor();
    await page.locator("#advanced-build").click();
    seed = new URL((await built).url()).searchParams.get("seed");
    await page.locator("#front-pick:not([hidden])").waitFor();
    names = await page.locator("#pick-list button").allInnerTexts();
    at = names.findIndex((t) =>
      /council|commissioner|alderm|trustee|supervisor|selectm|mayor/i.test(t),
    );
    if (at < 0)
      console.log(
        `unusable draw ${attempt}: seed ${seed}, no seat to step in as`,
      );
  }
  assert.ok(at >= 0, "no seat to step in as in five draws");
  await page.locator("#pick-list button").nth(at).click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const place = await page.locator("#card-place").innerText();
  console.log("Seed:", seed, "Place:", place, "Player:", names[at]);
  for (let i = 0; i < 20; i += 1) {
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  const failures = [];
  const read = () =>
    page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      const sheet = document.getElementById("sheet").getBoundingClientRect();
      const bottom = body.getBoundingClientRect().bottom;
      // What runs past the bottom, the outermost first (the one to page or shrink).
      const culprits = [...body.querySelectorAll("*")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.height > 0 && r.bottom > bottom + 1;
        })
        .slice(0, 3)
        .map(
          (e) =>
            `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}`,
        );
      return {
        culprits,
        scrolls: body.scrollHeight > body.clientHeight + 1,
        over: body.scrollHeight - body.clientHeight,
        sheetInside:
          sheet.top >= -1 &&
          sheet.left >= -1 &&
          sheet.bottom <= window.innerHeight + 1 &&
          sheet.right <= window.innerWidth + 1,
      };
    });
  const judge = async (size, name) => {
    await page.waitForTimeout(900);
    const state = await read();
    if (SHOTS)
      await page.screenshot({
        path: `${SHOTS}/${size.width}x${size.height}-${name}.png`,
      });
    if (state.scrolls)
      failures.push(
        `${size.width}x${size.height} ${name}: scrolls by ${state.over}px`,
      );
    if (!state.sheetInside)
      failures.push(
        `${size.width}x${size.height} ${name}: the sheet leaves the window`,
      );
    console.log(
      `${size.width}x${size.height} ${name}: ${state.scrolls ? `SCROLLS ${state.over}px past ${state.culprits.join(", ")}` : "fits"}`,
    );
  };
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(600);
    const tabs = await page
      .locator("#rings [data-tab]")
      .evaluateAll((all) => all.map((ring) => ring.dataset.tab));
    for (const tab of tabs) {
      console.log(`opening ${tab} at ${size.width}x${size.height}`);
      await page.locator(`#rings [data-tab="${tab}"]`).click();
      await page.locator("#sheet:not([hidden])").waitFor();
      await judge(size, tab);
      if (tab === "politics") {
        const subs = await page
          .locator("#sheet-tabs button")
          .evaluateAll((all) => all.map((b) => b.textContent.trim()));
        for (const sub of subs) {
          await page
            .locator("#sheet-tabs button", { hasText: new RegExp(`^${sub}$`) })
            .click();
          await judge(
            size,
            `politics-${sub.toLowerCase().replace(/\s+/g, "-")}`,
          );
        }
      }
      await page.locator("#sheet-close").click();
      await page.locator("#sheet").waitFor({ state: "hidden" });
    }
  }
  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual(failures, [], `menus that scroll: ${failures.join("; ")}`);
  console.log("PASS no menu scrolls as a whole at 1440x900 or 1280x720");
} finally {
  await browser.close();
}
