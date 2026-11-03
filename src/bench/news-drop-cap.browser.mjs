/* global process, console, document, getComputedStyle, URLSearchParams */
// A drop cap takes a letter, never a digit (owner, Nov 1: the closure story's
// "16 people worked there." printed a big 1 beside "6 people worked there."):
// a body that opens on a number reads it whole. The real front page of a drawn
// place is read for every opening paragraph; then the shared newspaper part is
// fed a body that opens on a number and one that opens on a word.
// Run against a fresh bench: node src/bench/news-drop-cap.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
const capOf = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".story-body .story-text:first-child")].map(
      (node) => ({
        text: node.textContent.trim().slice(0, 40),
        float: getComputedStyle(node, "::first-letter").float,
      }),
    ),
  );
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/play`);
  const seed =
    process.env.BENCH_SEED ??
    (await (await page.request.get(`${base}/api/seed`)).json()).seed;
  await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, date: "2025-01-20" })}`,
    { timeout: 300000 },
  );
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    `Seed ${seed}, place: ${await page.locator("#card-place").innerText()}`,
  );
  for (
    let i = 0;
    i < 8 && (await page.locator("#talk:visible").count());
    i += 1
  ) {
    await page
      .locator("#talk-leave:visible, #talk-next:visible, #talk-skip:visible")
      .first()
      .click();
    await page.waitForTimeout(500);
  }
  await page.locator('.ring[data-tab="news"]').click();
  await page.locator("#sheet-body .paper-stories").waitFor();
  await page.waitForTimeout(800);
  const real = await capOf(page);
  console.log(`${real.length} opening paragraphs on the real front page`);
  for (const row of real)
    assert.equal(
      row.float === "left",
      /^\p{L}/u.test(row.text),
      `"${row.text}": drop cap ${row.float}`,
    );
  // The shared part, with a body that opens on a number and on a word.
  for (const [name, opening] of [
    ["number", "16 people worked there."],
    ["word", "Sixteen people worked there."],
  ]) {
    await page.evaluate(
      async ({ opening }) => {
        const { newspaperScreen } = await import("/ui/newspaper.mjs");
        const outlets = new Map([
          [
            "a",
            {
              name: "The Courier",
              layout: "broadsheet",
              stories: [
                {
                  id: "s1",
                  headline: "Solomon's Market closing",
                  paragraphs: [
                    "Solomon's Market closed in 2024.",
                    opening,
                    "The owner was retiring.",
                  ],
                },
              ],
            },
          ],
        ]);
        document.getElementById("sheet-body").replaceChildren(
          ...newspaperScreen({
            outlets,
            labels: { title: "News" },
            date: "2025-01-20",
            headlineOf: (item) => item.headline,
            photoOf: () => null,
          }),
        );
      },
      { opening },
    );
    const [row] = await capOf(page);
    console.log(`${name}: "${row.text}" drop cap ${row.float}`);
    assert.equal(row.float, name === "word" ? "left" : "none", name);
    if (shots) await page.screenshot({ path: `${shots}/${name}-1440x900.png` });
  }
  assert.deepEqual(errors, []);
  console.log("news drop cap: pass");
} finally {
  await browser.close();
}
