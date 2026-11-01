/* global process, console, document */
// Patch notes on the title, in a real browser on the bench (npm run bench):
// the item is live, it opens one release at a time, newest first, with
// nothing unreleased on the page (owner, Oct 28 sitting, point 1); the
// release's changes are headline cards and the chosen one reads in full
// beside them, and the sheet never scrolls as a page (owner, Oct 29).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const item = page.locator("#front-patch-notes");
  assert.equal(await item.isDisabled(), false, "Patch notes is grayed out");
  await item.click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator("#sheet-body .pick-cards .entry").first().waitFor();
  const read = () =>
    page.evaluate(() => {
      const body = document.getElementById("sheet-body");
      return {
        title: document.getElementById("sheet-title").textContent,
        release: document.querySelector("#sheet-body select").value,
        heading: (() => {
          const pick = document.querySelector("#sheet-body select");
          return pick.options[pick.selectedIndex]?.textContent;
        })(),
        cards: [
          ...document.querySelectorAll("#sheet-body .pick-cards .entry h3"),
        ].map((h) => h.textContent),
        chosen: document.querySelector("#sheet-body .pick-cards .entry.on h3")
          ?.textContent,
        article: document.querySelector("#sheet-body .pick-article")?.innerText,
        text: body.innerText,
        scrolls: body.scrollHeight > body.clientHeight + 2,
        strays: [...document.querySelectorAll("#sheet button")].filter((b) =>
          /^\s*(continue|back)\s*$/i.test(b.textContent ?? ""),
        ).length,
      };
    });
  const newest = await read();
  const options = await page
    .locator("#sheet-body select option")
    .evaluateAll((o) => o.map((x) => x.value));
  console.log(
    `${newest.title}: ${newest.heading} of ${options.length} releases; ${newest.cards.length} cards: ${newest.cards.slice(0, 3).join(" | ")}`,
  );
  assert.equal(newest.title, "Patch notes");
  assert.ok(options.length >= 2, "the releases are listed");
  assert.equal(newest.release, options[0], "the newest release is chosen");
  assert.match(newest.heading ?? "", /\d+\.\d+\.\d+/, "the release is named");
  assert.ok(newest.cards.length >= 1, "no change cards");
  assert.equal(newest.chosen, newest.cards[0], "the first change is chosen");
  assert.doesNotMatch(newest.text, /UNRELEASED|CANDIDATE|\*\*|^- /m);
  assert.equal(newest.strays, 0, "Back or Continue on the patch notes");
  assert.equal(newest.scrolls, false, "the patch notes scroll as a page");
  // The last card on the page opens its change in full beside the cards.
  const last = page.locator("#sheet-body .pick-cards .entry").last();
  await last.click();
  const opened = await read();
  assert.equal(opened.chosen, newest.cards.at(-1), "the card is not chosen");
  assert.ok(
    opened.article.includes(opened.chosen) || opened.article.length > 40,
    "the change does not read beside the cards",
  );
  console.log(`opened: ${opened.article.split("\n").slice(0, 2).join(" · ")}`);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/after-newest.png`,
    });
  // An older release, chosen from the list, shows its own changes.
  await page.locator("#sheet-body select").selectOption(options[3]);
  const older = await read();
  assert.notEqual(older.heading, newest.heading, "the release did not change");
  assert.ok(older.cards.length >= 1, "the older release has no cards");
  assert.equal(older.scrolls, false, "an older release scrolls as a page");
  console.log(`${older.heading}: ${older.cards.length} cards`);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/after-older.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Patch notes opens from the title");
} finally {
  await browser.close();
}
