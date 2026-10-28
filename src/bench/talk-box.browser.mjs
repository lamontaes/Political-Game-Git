/* global process, console, document, URL */
// The talk box's controls (owner, Oct 27, 6:20 PM: "WHEN IT IS JUST THE
// NARRATOR REMOVE THE LEAVE/SAY NOTHING ... CONTINUE ON THE BOTTOM LEFT"): in a
// drawn place played week by week, the first beat with nothing to answer shows
// one Continue at the bottom left of the talk box and no other control, and
// Continue moves the game on. A conversation shows its replies and no Continue.
// Run against a fresh bench: node src/bench/talk-box.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const WEEKS = Number(process.env.TALK_BOX_WEEKS ?? 30);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shown = async (id) => page.locator(`#${id}`).isVisible();
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  let narration = false;
  let conversation = false;
  // The narrator speaks first and alone; Continue, then the person (owner,
  // Oct 28 sitting, 36).
  let narratorFirst = false;
  for (
    let turn = 0;
    turn < WEEKS * 4 && !(narration && narratorFirst);
    turn++
  ) {
    if (await shown("talk")) {
      const replies = await page.locator("#talk-choices .reply").count();
      const lines = await page.locator("#talk-lines > li").count();
      const narrated = await page.locator("#talk-lines > li.narration").count();
      if (!replies && lines && narrated === lines && !narratorFirst) {
        assert.ok(await shown("talk-next"), "no Continue after the narrator");
        if (shots)
          await page.screenshot({ path: `${shots}/talk-narrator-first.png` });
        await page.locator("#talk-next").click();
        await page.waitForTimeout(1500);
        if (await shown("talk")) {
          const after = await page
            .locator("#talk-lines > li.narration")
            .count();
          const spoken = await page.locator("#talk-lines > li.speech").count();
          if (spoken > after) {
            narratorFirst = true;
            console.log(
              "Then:",
              (await page.locator("#talk-lines").innerText()).slice(0, 200),
            );
            if (shots)
              await page.screenshot({ path: `${shots}/talk-then-person.png` });
          }
        }
        continue;
      }
      if (!replies && !narration) {
        // Nothing to answer: Continue alone, at the bottom left of the box.
        narration = true;
        assert.ok(await shown("talk-next"), "no Continue");
        for (const id of ["talk-silent", "talk-leave", "talk-lie"])
          assert.equal(await shown(id), false, `${id} beside Continue`);
        const box = await page.locator("#talk").boundingBox();
        const next = await page.locator("#talk-next").boundingBox();
        assert.ok(
          next.x - box.x < box.width / 3 && next.y > box.y + box.height / 2,
          "Continue is not at the bottom left",
        );
        assert.equal(await page.locator("#talk-role").count(), 0);
        console.log(
          "Narration:",
          (await page.locator("#talk-lines").innerText()).slice(0, 200),
        );
        if (shots)
          await page.screenshot({ path: `${shots}/talk-narration.png` });
        await page.locator("#talk-next").click();
        await page.waitForTimeout(1500);
        continue;
      }
      if (!replies) {
        await page.locator("#talk-next").click();
        await page.waitForTimeout(1500);
        continue;
      }
      // A beat with replies: no Continue in the box.
      assert.equal(await shown("talk-next"), false, "Continue beside replies");
      conversation = true;
      if (shots && turn < 40)
        await page.screenshot({ path: `${shots}/talk-replies.png` });
      await page.locator("#talk-choices .reply").first().click();
      await page.waitForTimeout(1500);
      continue;
    }
    if (await shown("continue")) {
      await page.locator("#continue").click();
      await page.waitForTimeout(1500);
      continue;
    }
    if (await page.locator("#job-offer-turn").isVisible()) {
      await page.locator("#job-offer-turn").click();
      continue;
    }
    const moved = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/advance",
      { timeout: 600000 },
    );
    await page.locator("#week").click();
    await moved;
    await page.waitForTimeout(1500);
  }
  console.log("Clock:", await page.locator("#card-clock").innerText());
  assert.ok(narration, `no narration beat in ${WEEKS} weeks`);
  assert.ok(narratorFirst, `no narrator-then-person beat in ${WEEKS} weeks`);
  assert.deepEqual(errors, []);
  console.log(
    `PASS narration shows Continue alone, bottom left; the narrator speaks first, then the person${conversation ? "; replies showed no Continue" : ""}`,
  );
} finally {
  await browser.close();
}
