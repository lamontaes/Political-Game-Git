/* global process, console, document, getComputedStyle */
// People: the approved card fills the panel (owner, Nov 16: "A massive just
// hole."; the approved card, pl-people). Starts a life, opens People, and for
// each of the first people on the list measures the card beside the list: the
// name sits over the sections beside the bust, and neither half of the card,
// under the bust or under the sections, is left mostly empty.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const port = process.env.BENCH_PORT ?? 3000;
/**
 * The most of the panel's height, from the card's top to the panel's foot,
 * either half may leave empty under it, as a share (owner, Nov 16, on 31 to
 * 41% left under the portrait: "still lots of empty space").
 */
const MOST_EMPTY = 0.1;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  const { seed, placeName } = await startLife(page, {
    url: `http://localhost:${port}/play`,
    fresh: true,
  });
  console.log("Seed:", seed, "Place:", placeName);
  await page.locator('#rings [data-tab="people"]').evaluate((e) => e.click());
  await page.locator(".roster-screen.people .roster-page").waitFor();
  const keys = await page
    .locator(".roster-screen.people .roster [data-key]")
    .evaluateAll((rows) => rows.slice(0, 4).map((r) => r.dataset.key));
  assert.ok(keys.length, "People lists nobody");
  const shot = process.argv[2];
  for (const [at, key] of keys.entries()) {
    if (at) {
      await page
        .locator(`.roster-screen.people .roster [data-key="${key}"]`)
        .click();
    }
    await page
      .locator(
        `.roster-screen.people .roster-page[data-key="${key}"] .strip-screen`,
      )
      .waitFor();
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const card = document.querySelector(
        ".roster-screen.people .roster-page .strip-screen",
      );
      const box = (n) => n?.getBoundingClientRect();
      const top = box(card).top;
      // Measured to the panel's foot, not the card's: a short card in a tall
      // panel is the hole the owner saw.
      const page = card.closest(".roster-page");
      const bottom =
        box(page).bottom - parseFloat(getComputedStyle(page).paddingBottom);
      const height = bottom - top;
      const left = box(card.querySelector(".mx3left"));
      const lastIn = (node) => box(node?.lastElementChild);
      const leftLast = lastIn(card.querySelector(".mx3left"));
      const columns = [...card.querySelectorAll(".mx3col")].map(lastIn);
      const name = box(card.querySelector(".strip-name"));
      const lastBottom = (rects) =>
        Math.max(top, ...rects.filter(Boolean).map((r) => r.bottom));
      return {
        name: card.querySelector(".strip-name")?.textContent,
        bust: Boolean(card.querySelector(".mxbust")),
        nameBeside: name.left > left.right - 4,
        underBust: (bottom - lastBottom([leftLast])) / height,
        underSections: (bottom - lastBottom(columns)) / height,
        columns: columns.length,
      };
    });
    console.log(
      `  ${m.name}: bust ${m.bust}, name beside it ${m.nameBeside}, ${m.columns} columns, empty under the bust ${Math.round(m.underBust * 100)}%, under the sections ${Math.round(m.underSections * 100)}%`,
    );
    if (shot && at === 0) await page.screenshot({ path: `${shot}/people.png` });
    // Someone the bust bank does not paint (a child) has no bust column: the
    // name and the sections take the card's whole width.
    if (m.bust)
      assert.ok(m.nameBeside, `${m.name}: the name is not beside the bust`);
    assert.ok(
      !m.bust || m.underBust <= MOST_EMPTY,
      `${m.name}: the bust leaves ${Math.round(m.underBust * 100)}% of the card empty under it`,
    );
    assert.ok(
      m.underSections <= MOST_EMPTY,
      `${m.name}: the sections leave ${Math.round(m.underSections * 100)}% of the card empty`,
    );
  }
  assert.deepEqual(errors, []);
  console.log("people card fills: pass");
} finally {
  await browser.close();
}
