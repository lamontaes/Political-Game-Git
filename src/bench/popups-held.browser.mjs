/* global process, console, document, requestAnimationFrame, setTimeout */
// Pop-ups wait for a scene (owner, Nov 7: "News pop-ups wait until the scene ends"): a toast
// asked for while a talk is on screen is not shown, it shows when the talk ends, and its close
// control still removes it at once (the Nov 8 pop-up mock).
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
  const state = await page.evaluate(async () => {
    const { showToast, hideToast } = await import("/ui/toast.mjs");
    const talk = document.getElementById("talk");
    const toast = document.createElement("section");
    toast.id = "held-toast";
    document.getElementById("game").append(toast);
    talk.hidden = false;
    showToast(toast, 30);
    const during = toast.hidden;
    talk.hidden = true;
    await new Promise((done) =>
      requestAnimationFrame(() => setTimeout(done, 50)),
    );
    const after = toast.hidden;
    // A pop-up already up when a scene opens comes down, and shows again when the scene ends.
    showToast(toast, 30);
    const upBefore = !toast.hidden;
    talk.hidden = false;
    await new Promise((done) =>
      requestAnimationFrame(() => setTimeout(done, 50)),
    );
    const downDuring = toast.hidden;
    talk.hidden = true;
    await new Promise((done) =>
      requestAnimationFrame(() => setTimeout(done, 50)),
    );
    const upAfter = !toast.hidden;
    hideToast(toast);
    return {
      during,
      after,
      closed: toast.hidden,
      upBefore,
      downDuring,
      upAfter,
    };
  });
  assert.equal(state.during, true, "a pop-up showed over a scene");
  assert.equal(
    state.after,
    false,
    "the pop-up did not show when the scene ended",
  );
  assert.equal(state.closed, true, "the pop-up did not close at once");
  assert.equal(state.upBefore, true, "the pop-up was not up before the scene");
  assert.equal(
    state.downDuring,
    true,
    "a pop-up already up stayed over a scene that opened",
  );
  assert.equal(
    state.upAfter,
    true,
    "the pop-up did not return after the scene",
  );
  assert.deepEqual(errors, [], errors.join("; "));
  console.log(
    "PASS pop-ups wait until the scene ends, come down when one opens, and close at once",
  );
} finally {
  await browser.close();
}
