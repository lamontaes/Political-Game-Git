/* global process, console, document, getComputedStyle, window */
// No menu scrolls (owner, Oct 29; Lane 4, path 11), in a real browser on the
// bench (npm run bench): New Game in a place chosen in the creator
// (MENUS_PLACE "State|Town", default Meadow Lakes, Alaska), then every rail
// menu and each of its tabs at 1440x900 and 1024x768. The sheet's body and
// every part inside it hold what they show: nothing runs past its foot into a
// scroller. Budgets is reported, not asserted: its layout waits on the
// owner's answer to the Nov 1 mocks (play-budgets-every-government-political-
// process-style). MENUS_SHOTS saves the sheets that run over, and those
// MENUS_SHOT_TABS names.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [state, town] = (process.env.MENUS_PLACE ?? "Alaska|Meadow Lakes").split(
  "|",
);
const shots = process.env.MENUS_SHOTS;
// Tabs to photograph whether or not they run over ("parties,news").
const pictured = new Set(
  (process.env.MENUS_SHOT_TABS ?? "").split(",").filter(Boolean),
);
const WAITING = new Set(["budgets"]);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const bad = [];
const checked = [];
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("[data-gender=female]").click();
  await page.locator("#cr-random-name").click();
  await page.waitForFunction(() => document.getElementById("cr-given").value);
  await page.locator("#cr-character-next").click();
  await page.locator('[data-testid="state-search"]').fill(state);
  await page.locator("#cr-states button", { hasText: state }).first().click();
  await page.locator('[data-testid="place-search"]').fill(town);
  await page.locator("#cr-towns button", { hasText: town }).first().click();
  await page.locator("#cr-look:not([hidden])").waitFor();
  await page.locator("#cr-begin").click();
  await page.locator("#card:not([hidden])").waitFor({ timeout: 300000 });
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const place = await page.locator("#card-place").innerText();
  const rails = await page
    .locator("#rings [data-tab]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab));
  // What runs past its foot: the sheet's body, or a part of it that scrolls.
  const measure = () =>
    page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      if (!body) return [];
      const parts = [body, ...body.querySelectorAll("*")].filter(
        (node) =>
          node === body ||
          ["auto", "scroll"].includes(getComputedStyle(node).overflowY),
      );
      return parts
        .filter((node) => node.scrollHeight > node.clientHeight + 1)
        .map(
          (node) =>
            `${node.id || node.className} ${node.scrollHeight}/${node.clientHeight}`,
        );
    });
  // A sheet settles over a few frames (pagers give back rows, a map or a
  // photo gives back height): read it once the body's size stops changing.
  const settled = () =>
    page
      .waitForFunction(
        () =>
          new Promise((done) => {
            const body = document.getElementById("sheet-body");
            // Every picture loaded, and the sheet and its parts holding still.
            if (
              [...(body?.querySelectorAll("img") ?? [])].some(
                (i) => i.offsetParent && i.loading !== "lazy" && !i.complete,
              )
            )
              return done(false);
            const size = () =>
              [
                body,
                ...(body?.querySelectorAll(
                  ".paper, .split-side, .split-main",
                ) ?? []),
              ]
                .map((node) => (node ? node.scrollHeight : 0))
                .join(",");
            const first = size();
            window.requestAnimationFrame(() =>
              window.requestAnimationFrame(() =>
                window.requestAnimationFrame(() => done(size() === first)),
              ),
            );
          }),
        undefined,
        { timeout: 30000 },
      )
      // A sheet that never holds still is measured as it stands.
      .catch(() => {});
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    for (const tab of rails) {
      // Mark the sheet's old content, so the new sheet is known once drawn.
      await page.evaluate(() => {
        const body = document.getElementById("sheet-body");
        const mark = document.createElement("i");
        mark.className = "check-stale";
        body?.append(mark);
      });
      await page
        .locator(`#rings [data-tab="${tab}"]`)
        .first()
        .evaluate((e) => e.click());
      await page.locator("#sheet:not([hidden])").waitFor();
      // The sheet's tabs come with its records: read them once it is drawn.
      await page.waitForFunction(() => {
        const body = document.getElementById("sheet-body");
        return body.children.length > 0 && !body.querySelector(".check-stale");
      });
      await settled();
      const subs = await page
        .locator("#sheet-tabs [data-tab]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab));
      for (const sub of subs.length ? subs : [tab]) {
        // Another tab of the sheet: mark what is drawn, click, and wait for
        // the tab's own content (the shown tab is read as it is).
        const shownTab = await page.evaluate(
          () =>
            document.querySelector("#sheet-tabs [data-tab].on")?.dataset.tab ??
            null,
        );
        if (subs.length && sub !== shownTab) {
          await page.evaluate(() => {
            const mark = document.createElement("i");
            mark.className = "check-stale";
            document.getElementById("sheet-body").append(mark);
          });
          await page.locator(`#sheet-tabs [data-tab="${sub}"]`).first().click();
          await page.waitForFunction(
            () => !document.querySelector("#sheet-body .check-stale"),
          );
        }
        if (process.env.MENUS_TRACE) console.log(`at ${width} ${tab}/${sub}`);
        await settled();
        const over = await measure();
        checked.push(`${width}:${sub}`);
        if (shots && !over.length && pictured.has(sub))
          await page.screenshot({ path: `${shots}/${sub}-${width}.png` });
        if (!over.length) continue;
        const line = `${width}x${height} ${tab}/${sub}: ${over.join("; ")}`;
        if (WAITING.has(sub)) console.log(`waits on the owner: ${line}`);
        else bad.push(line);
        if (shots)
          await page.screenshot({
            path: `${shots}/${tab}-${sub}-${width}.png`,
          });
      }
    }
  }
  console.log(
    `Place: ${place}; ${checked.length} sheets: ${checked.join(" ")}`,
  );
  for (const line of bad) console.log(`runs over: ${line}`);
  assert.deepEqual(bad, [], "a menu runs past its foot");
  assert.deepEqual(errors, []);
  console.log("PASS no menu scrolls at 1440x900 or 1024x768");
} finally {
  await browser.close();
}
