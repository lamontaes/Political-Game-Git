/* global process, console, document, setTimeout, requestAnimationFrame */
// A pop-up never times out unread, and waits behind an open card or menu (CTO, Nov 24, N16-24:
// "pop-ups vanish before you can read them"). Plays a drawn place's title page, which holds the
// same `.toast` panels and `ui/toast.mjs` the game uses, and checks: a pop-up is still there
// after 30 seconds unread; one asked for while a person's card is open waits and shows when the
// card closes; one asked for behind a menu waits and shows when the menu closes; and its close
// control still removes it at once.
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
  await page.clock.install();
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const state = await page.evaluate(async () => {
    const { showToast } = await import("/ui/toast.mjs");
    const toast = document.createElement("section");
    toast.id = "held-toast";
    document.getElementById("game").append(toast);
    const out = {};
    // Unread: still there after 30 seconds.
    showToast(toast, 8);
    out.upAtOnce = !toast.hidden;
    out.holdMs = 30000;
    return out;
  });
  assert.equal(state.upAtOnce, true, "the pop-up was not shown");
  await page.clock.fastForward(30000);
  const afterThirty = await page.evaluate(
    () => !document.getElementById("held-toast").hidden,
  );
  assert.equal(
    afterThirty,
    true,
    "the pop-up vanished unread after 30 seconds",
  );
  const held = await page.evaluate(async () => {
    const { showToast, hideToast } = await import("/ui/toast.mjs");
    const toast = document.getElementById("held-toast");
    const settle = () =>
      new Promise((done) => requestAnimationFrame(() => setTimeout(done, 50)));
    hideToast(toast);
    const out = {};
    for (const panelId of ["person", "sheet"]) {
      const panel = document.getElementById(panelId);
      panel.hidden = false;
      showToast(toast, 8);
      out[`${panelId}During`] = toast.hidden;
      panel.hidden = true;
      await settle();
      out[`${panelId}After`] = !toast.hidden;
      hideToast(toast);
    }
    // Up when a menu opens: it comes down and returns when the menu closes.
    showToast(toast, 8);
    const sheet = document.getElementById("sheet");
    sheet.hidden = false;
    await settle();
    out.downBehindMenu = toast.hidden;
    sheet.hidden = true;
    await settle();
    out.upAfterMenu = !toast.hidden;
    hideToast(toast);
    out.closed = toast.hidden;
    return out;
  });
  assert.equal(held.personDuring, true, "a pop-up showed over an open card");
  assert.equal(
    held.personAfter,
    true,
    "the pop-up did not show when the card closed",
  );
  assert.equal(held.sheetDuring, true, "a pop-up showed over an open menu");
  assert.equal(
    held.sheetAfter,
    true,
    "the pop-up did not show when the menu closed",
  );
  assert.equal(
    held.downBehindMenu,
    true,
    "a pop-up already up stayed over a menu that opened",
  );
  assert.equal(
    held.upAfterMenu,
    true,
    "the pop-up did not return after the menu",
  );
  assert.equal(held.closed, true, "the pop-up did not close at once");
  assert.deepEqual(errors, [], errors.join("; "));
  console.log(
    "PASS a pop-up stays unread past 30 seconds, waits behind a card or menu, and closes at once",
  );
} finally {
  await browser.close();
}
