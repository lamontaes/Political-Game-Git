/* global process, console, document, getComputedStyle */
// The Politics menu's level picker in a real browser on the bench (npm run
// bench) with a life in progress: the chosen level is the one raised glass
// box and the others are plain text; the state filter is the kit's dropdown
// in its own box, reading the player's state by name (owner, Oct 28 sitting,
// points 14 and 15).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const picker = () =>
  page.evaluate(() =>
    [...document.querySelectorAll(".government-picker .tab")].map((tab) => {
      const s = getComputedStyle(tab);
      return {
        label: tab.textContent.trim(),
        on: tab.classList.contains("on"),
        raised:
          s.backgroundImage !== "none" ||
          s.backgroundColor !== "rgba(0, 0, 0, 0)",
        shadow: s.boxShadow !== "none",
      };
    }),
  );
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  const stateName = title.life.placeName.split(", ").at(-1);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.waitForTimeout(1200);
  for (const sel of ["#news-reader-close", "#talk-next"]) {
    const b = page.locator(sel);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator(".government-picker .tab").first().waitFor();
  let tabs = await picker();
  console.log(
    tabs
      .map(
        (t) =>
          `${t.label}${t.on ? " (on)" : ""}: ${t.raised ? "raised" : "plain"}`,
      )
      .join("; "),
  );
  assert.equal(tabs.filter((t) => t.on).length, 1, "one level is chosen");
  for (const t of tabs) {
    assert.equal(
      t.raised,
      t.on,
      `${t.label}: raised but not chosen, or chosen but plain`,
    );
    assert.equal(t.shadow, t.on, `${t.label}: a key's shadow on a plain tab`);
  }
  assert.equal(
    await page.locator("select.government-state").count(),
    0,
    "a state filter on the Local level",
  );
  // State: the filter appears, boxed, reading the state's name first.
  await page.locator('.government-picker .tab[data-level="state"]').click();
  await page.locator("select.government-state").waitFor();
  await page.waitForTimeout(600);
  tabs = await picker();
  assert.ok(
    tabs.find((t) => t.label && t.on && t.raised),
    "the chosen level is raised",
  );
  const filter = await page.evaluate(() => {
    const s = document.querySelector("select.government-state");
    const c = getComputedStyle(s);
    const nav = document
      .querySelector(".government-picker")
      .getBoundingClientRect();
    const r = s.getBoundingClientRect();
    return {
      first: s.options[0].textContent,
      chosen: s.options[s.selectedIndex].textContent,
      boxed:
        c.borderTopColor !== "rgba(0, 0, 0, 0)" && c.borderTopWidth !== "0px",
      // Its own box beside the level tabs, never inside them (owner, Oct 28,
      // point 15: "a separate box, like the main menu's").
      ownLine: r.left >= nav.right - 1 || r.top >= nav.bottom - 1,
      yourState: [...s.options].some((o) => /your state/i.test(o.textContent)),
    };
  });
  console.log(
    `filter: first "${filter.first}", chosen "${filter.chosen}", boxed ${filter.boxed}, own line ${filter.ownLine}`,
  );
  assert.equal(
    filter.first,
    stateName,
    "the filter does not lead with the player's state",
  );
  assert.equal(filter.chosen, stateName);
  assert.ok(filter.boxed, "the filter has no box at rest");
  assert.ok(filter.ownLine, "the filter sits inside the level tabs");
  assert.ok(!filter.yourState, '"Your state" is still an option');
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/14-politics-state-level.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log(
    "ok: one raised tab, the state filter in its own box with the state's name",
  );
} finally {
  await browser.close();
}
