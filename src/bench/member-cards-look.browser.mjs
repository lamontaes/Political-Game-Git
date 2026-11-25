/* global process, console, document, getComputedStyle */
// Government's member cards, in a real browser on the bench (npm run bench): a member is a bust
// (head to upper chest, a soft fade at the foot, big enough to read) and the card carries no
// hover tip over their own name (owner, Nov 23, P21: "look at the tiny headshots. Their bodies
// are cut off."; C8: the hover name tip covers the member's name).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
try {
  await startLife(page, { fresh: true });
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((tab) => tab.click());
  await page.locator("#sheet-body .member-card .member-face").first().waitFor();
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .member-card")].map((card) => {
      const face = card.querySelector(".member-face");
      const box = face.getBoundingClientRect();
      return {
        title: card.getAttribute("title"),
        crop: face.className,
        side: Math.round(box.width),
        fade: getComputedStyle(face).maskImage,
      };
    }),
  );
  assert.ok(cards.length >= 1, "no member cards on the first screen");
  for (const card of cards) {
    assert.equal(card.title, null, "a member card carries a hover tip");
    assert.match(card.crop, /crop-bust-small/, "a member is not a bust");
    assert.ok(card.side >= 56, `the bust is tiny: ${card.side}px`);
    assert.match(card.fade, /linear-gradient/, "the bust has no soft fade");
  }
  console.log(`ok: ${cards.length} member cards, busts with a fade, no tip`);
} finally {
  await browser.close();
}
