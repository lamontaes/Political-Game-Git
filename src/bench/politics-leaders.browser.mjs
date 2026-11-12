/* global process, console, document */
// Politics > Government, a state's lawmakers (owner, Oct 28 point 18: "printed text out of
// order"): each leader's post is one line inside that leader's own member card, directly
// under the name, never a line that floats between two cards. A big chamber draws its
// leaders first, each a member card whose line is the post as a Guide term (play.mjs,
// the legislative view). Run against a bench with a life in progress:
// node src/bench/politics-leaders.browser.mjs
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page
    .waitForFunction(
      () => !document.getElementById("week").disabled,
      undefined,
      { timeout: 120000 },
    )
    .catch(() => {});
  await page.evaluate(() =>
    document.querySelector('#rings [data-tab="politics"]').click(),
  );
  // The state's lawmakers: a big chamber, its leaders drawn first.
  await page.locator('#sheet-body [data-level="state"]').click();
  await page
    .locator("#sheet-body .members-pager .member-card")
    .first()
    .waitFor();
  await page.waitForTimeout(1200);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("#sheet-body .members-pager .member-card")]
      .map((card) => ({ card, sub: card.querySelector(".member-line") }))
      .filter(({ sub }) => sub)
      .map(({ card, sub }) => {
        const name = card.querySelector(".member-name");
        const s = sub.getBoundingClientRect();
        const n = name?.getBoundingClientRect();
        const r = card.getBoundingClientRect();
        return {
          text: sub.textContent.trim(),
          // A leader's post is a Guide term drawn inside the line.
          leader: Boolean(sub.firstElementChild),
          under: Boolean(n) && s.top >= n.bottom - 2 && s.top - n.bottom < 12,
          inside: s.bottom <= r.bottom + 1 && s.top >= r.top - 1,
          aligned: Boolean(n) && Math.abs(s.left - n.left) < 4,
        };
      }),
  );
  console.log(rows.map((r) => r.text).join(" | "));
  assert.ok(
    rows.some((row) => row.leader),
    "the state's chamber shows no leader with their post",
  );
  for (const row of rows) {
    assert.ok(row.under, `${row.text}: not directly under the name`);
    assert.ok(row.inside, `${row.text}: spills out of its card`);
    assert.ok(row.aligned, `${row.text}: not aligned with the name`);
  }
  assert.deepEqual(errors, [], "page errors");
  console.log(
    `ok: every member's line sits under their own name, a leader's post among them (${rows.filter((row) => row.leader).length} on this page)`,
  );
} finally {
  await browser.close();
}
