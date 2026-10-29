/* global process, URL, console, document */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  // Always a fresh life: a continued one has moved on from its opening day.
  {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const name = await page.locator("#card-name").innerText();
  const clock = await page.locator("#card-clock").textContent();
  console.log(
    "Player:",
    name,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".calendar-layout").waitFor();
  const month = await page.locator(".calendar-heading h3").innerText();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  assert.notEqual(
    await page.locator(".calendar-heading h3").innerText(),
    month,
  );
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  assert.equal(await page.locator(".calendar-heading h3").innerText(), month);
  // It opens on today, with Coming up beside the month.
  assert.ok(await page.locator(".month .day.today.selected").count());
  assert.ok((await page.locator(".calendar-side-head h3").innerText()).trim());
  // Every line says who and what in words, once; no law rows naming nothing;
  // the player's own dates come first (owner, Oct 27).
  const lines = await page
    .locator(".calendar-list .calendar-entry")
    .evaluateAll((rows) =>
      rows.map((r) => ({
        when: r.querySelector(".when")?.textContent ?? "",
        what: r.querySelector(".what").textContent.trim(),
        own: r.classList.contains("own"),
      })),
    );
  console.log(
    "Coming up:",
    lines.map((l) => `${l.when} ${l.what}`).join(" | "),
  );
  for (const line of lines) {
    assert.ok(
      line.what.split(/\s+/).length >= 2,
      `a worded line: ${line.what}`,
    );
    assert.ok(!/takes? effect|undefined/i.test(line.what), line.what);
  }
  const keys = lines.map((l) => `${l.when}|${l.what}`);
  assert.equal(new Set(keys).size, keys.length, "no line twice");
  const firstOther = lines.findIndex((l) => !l.own);
  assert.ok(
    firstOther === -1 || lines.slice(firstOther).every((l) => !l.own),
    "the player's own dates come first",
  );
  // The month fills the panel: no empty half under it.
  const layoutBox = await page.locator(".calendar-layout").boundingBox();
  const bodyBox = await page.locator("#sheet-body").boundingBox();
  assert.ok(
    layoutBox.height >= bodyBox.height * 0.9,
    "the calendar fills its panel",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${process.env.SHOTS ?? "."}/calendar-today.png`,
  });
  // An empty future day: its date heads the side with the skip, and the clock
  // does not move until it is pressed.
  for (let i = 0; i < 9; i++)
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  const far = page.locator(".month .day:not(:has(.entry))").nth(10);
  await far.click();
  const farDate = await page
    .locator(".month .day.selected")
    .getAttribute("data-date");
  assert.ok(
    (await page.locator(".calendar-side-head h3").innerText()).includes(
      String(Number(farDate.slice(-2))),
    ),
    "the day's date heads the side",
  );
  const skip = page.locator(".calendar-side-head .skip-forward");
  assert.equal(await skip.count(), 1);
  assert.equal((await skip.innerText()).trim(), "");
  assert.ok(await skip.getAttribute("aria-label"));
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  // A day with something on it shows its line on the tile and lists it beside.
  for (let i = 0; i < 12; i++) {
    if (
      await page
        .locator(".month .day:not(.today):not(.past):has(.entry)")
        .count()
    )
      break;
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  }
  const marked = page
    .locator(".month .day:not(.today):not(.past):has(.entry)")
    .first();
  assert.ok(
    await marked
      .locator(".day-icon")
      .first()
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  const tileLine = (
    await marked.locator(".entry .what").first().textContent()
  ).trim();
  await marked.click();
  assert.ok(
    (await page.locator(".calendar-list .what").allTextContents()).includes(
      tileLine,
    ),
    "the chosen day lists what its tile shows",
  );
  await page.screenshot({
    path: `${process.env.SHOTS ?? "."}/calendar-day.png`,
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  const box = await page.locator("#sheet").boundingBox();
  assert.ok(
    box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= 1024 &&
      box.y + box.height <= 768,
  );
  const target = await page
    .locator(".month .day.selected")
    .getAttribute("data-date");
  await page.locator(".calendar-side-head .skip-forward").click();
  // Living weeks ahead runs the world day by day, which takes longer than a click.
  await page.waitForFunction(
    (before) =>
      document.getElementById("card-clock").innerText.trim() !== before,
    clock,
    { timeout: 180000 },
  );
  // The clock moves before the stop that ended the jump is drawn. A jump can end
  // on a stop (Continue), a scene's talk, or the day it asked for; stops can come
  // one after another, so each is answered until Week is ready again.
  const settled = () =>
    page.waitForFunction(
      () =>
        !document.getElementById("continue").hidden ||
        !document.getElementById("talk").hidden ||
        !document.getElementById("week").disabled,
      undefined,
      { timeout: 120000 },
    );
  await settled();
  const jumped = await page.locator("#card-clock").innerText();
  console.log("Calendar jump to", target, "->", jumped.replace("\n", " "));
  // It reached that day, or something the director fired stopped it on an earlier one.
  const stopped =
    (await page.locator("#continue").isVisible()) ||
    (await page.locator("#talk").isVisible());
  assert.ok(jumped.includes(String(Number(target.slice(-2)))) || stopped);
  // Week advances seven days, Day one.
  for (let i = 0; i < 8; i++) {
    const answered = await page.evaluate(
      () =>
        document.getElementById("talk").hidden &&
        document.getElementById("continue").hidden,
    );
    if (answered) break;
    // A stop's scene can open its talk a moment after Continue shows, hiding
    // Continue: click whichever is on screen when the click lands.
    await page
      .locator("#talk-leave:visible, #continue:visible")
      .first()
      .click();
    await settled();
  }
  const week = page.locator("#week");
  assert.ok((await week.innerText()).trim());
  await week.waitFor();
  await page.waitForFunction(() => !document.getElementById("week").disabled);
  const beforeWeek = await page.locator("#card-clock").innerText();
  await week.click();
  await page.waitForFunction(
    (before) =>
      document.getElementById("card-clock").innerText.trim() !== before,
    beforeWeek,
  );
  console.log("Week ->", await page.locator("#card-clock").innerText());
  assert.deepEqual(errors, []);
  console.log(
    "PASS one month, month navigation, day selection, unchanged clock, responsive panel, calendar skip icon, Week",
  );
} finally {
  await browser.close();
}
