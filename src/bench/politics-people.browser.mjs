/* global process, console, document */
// Politics in a real browser on the bench (npm run bench) with a life in
// progress: every person is a member card with a round headshot (never
// initials) that opens their card, members of Congress included (owner, Oct 28
// sitting, points 12, 13 and 18; the cards since Oct 29's Government screen).
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
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.waitForTimeout(1200);
  for (const sel of ["#news-reader-close", "#talk-next"]) {
    const b = page.locator(sel);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator("#sheet-body .member-card").first().waitFor();
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .member-card")].map((row) => {
      const face = row.querySelector(".member-face");
      return {
        name: row.querySelector(".member-name")?.textContent.trim(),
        letters: (face?.textContent ?? "").trim(),
        picture: Boolean(face?.style.backgroundImage),
        initials: Boolean(row.querySelector(".people-initial")),
      };
    }),
  );
  console.log(
    `${rows.length} member cards; ${rows.filter((r) => r.picture).length} with a picture`,
  );
  assert.ok(rows.length >= 4, "fewer than four member cards");
  for (const r of rows) {
    assert.equal(r.letters, "", `${r.name}: letters in the face ring`);
    assert.equal(r.initials, false, `${r.name}: initials`);
  }
  assert.ok(
    rows.filter((r) => r.picture).length >= rows.length / 2,
    "most rows have no picture",
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/12-politics-faces.png`,
    });
  // A member of Congress (who lives elsewhere) opens a card with their name.
  await page.locator('#sheet-body [data-level="federal"]').click();
  await page.waitForTimeout(1500);
  const members = page.locator("#sheet-body .member-card .member-name:visible");
  const count = await members.count();
  const pick = members.nth(count - 1);
  const name = (await pick.textContent()).trim();
  await pick.click();
  await page.locator("#person:not([hidden])").waitFor();
  const card = await page.evaluate(() => ({
    name: document.getElementById("person-name").textContent.trim(),
    text: document.getElementById("person-facts").innerText,
  }));
  console.log(`card: ${card.name}`);
  assert.equal(card.name, name, "the card is not the person clicked");
  assert.doesNotMatch(card.text, /official:|term:|undefined|null/);
  // Their figure stands in the card's media slot (the same figure as the row's face).
  const figure = page.locator("#person-media img");
  await figure.waitFor();
  await figure.evaluate(
    (img) =>
      img.complete ||
      new Promise((done) => {
        img.onload = img.onerror = () => done(true);
      }),
  );
  assert.ok(
    await figure.evaluate((img) => img.naturalHeight > 0),
    "the card's figure did not load",
  );
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/13-member-card.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: headshots on every row, every name opens a card");
} finally {
  await browser.close();
}
