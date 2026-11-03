/* global process, console, document, getComputedStyle, URLSearchParams */
// Nothing on the front page invites a click that does nothing (owner, Nov 1:
// "I click on it, nothing happens"): every headline that is a button opens its
// story in place, and a brief in the side column is plain type with no pointer
// and no hover change. The real front page of a drawn place is read first;
// then the shared newspaper part is fed every kind of story (a place prints
// its side column of briefs only some days), as an edge-case proof of the
// look, not of the world.
// Run against a fresh bench: node src/bench/news-clicks.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
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
  // The real front page: every headline that is a button opens its story.
  const headlines = await page.locator(".story-headline").count();
  console.log(`${headlines} headlines that open`);
  for (let i = 0; i < Math.min(headlines, 4); i += 1) {
    const button = page.locator(".story-headline").nth(i);
    const text = (await button.innerText()).trim();
    await button.click();
    const lead = (
      await page
        .locator(".paper-story.lead .story-headline")
        .first()
        .innerText()
    ).trim();
    assert.equal(lead, text, `"${text}" did not open in place`);
  }
  // The shared newspaper part with every kind of story on the page.
  await page.evaluate(async () => {
    const { newspaperScreen } = await import("/ui/newspaper.mjs");
    const story = (n, extra) => ({
      id: `s${n}`,
      headline: `Headline ${n}`,
      ...extra,
    });
    const outlets = new Map([
      [
        "a",
        {
          name: "The Courier",
          layout: "broadsheet",
          stories: [
            story(1, {
              paragraphs: ["It happened.", "More of it.", "Still more."],
            }),
            story(2, { paragraphs: ["A short second story."] }),
            story(3, { brief: true, paragraphs: ["The vote was 50 to 100."] }),
            story(4, { brief: true, paragraphs: ["It fell short by 42."] }),
            story(5, {}),
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
  });
  const side = page.locator(".paper-side .side-headline");
  const briefs = await side.count();
  assert.equal(briefs, 2, "the page has no side briefs");
  for (let i = 0; i < briefs; i += 1) {
    const item = side.nth(i);
    assert.notEqual(await item.evaluate((node) => node.tagName), "BUTTON");
    const before = await item.evaluate((node) => getComputedStyle(node).color);
    await item.hover();
    const hovered = await item.evaluate((node) => ({
      cursor: getComputedStyle(node).cursor,
      color: getComputedStyle(node).color,
    }));
    assert.notEqual(hovered.cursor, "pointer", "a brief shows a pointer");
    assert.equal(hovered.color, before, "a brief changes on hover");
  }
  if (shots) {
    await side.first().hover();
    await page.screenshot({ path: `${shots}/brief-hovered-1440x900.png` });
  }
  // A headline that opens: the page makes it the lead, in place.
  const second = page.locator(".paper-column .story-headline").first();
  const secondText = (await second.innerText()).trim();
  await second.click();
  assert.equal(
    (
      await page.locator(".paper-story.lead .story-headline").innerText()
    ).trim(),
    secondText,
    "a headline did not open in place",
  );
  if (shots)
    await page.screenshot({ path: `${shots}/story-opened-1440x900.png` });
  assert.deepEqual(errors, []);
  console.log("news clicks: pass");
} finally {
  await browser.close();
}
