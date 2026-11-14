/* global getComputedStyle, process, URL, console, document */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
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
    // The opening plays first, as a player sees it (start-life.mjs).
    await playOpening(
      page,
      (await (await response).json()).sceneMomentId ?? null,
    );
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
  await page.locator(".calendar-board").waitFor();
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
  assert.ok((await page.locator(".calendar-side .sechead").innerText()).trim());
  // Every line says who and what in words, once; no law rows naming nothing;
  // the player's own dates come first (owner, Oct 27).
  const lines = await page
    .locator(".calendar-pager .calendar-entry")
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
      line.what.split(/\s+/).length >= 2 || /^[A-Z][a-z]+$/.test(line.what),
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
  // Nothing scrolls as a page: the three parts sit inside the panel.
  const bodyBox = await page.locator("#sheet-body").boundingBox();
  for (const part of [".calendar-month", ".calendar-day", ".calendar-side"]) {
    const box = await page.locator(part).boundingBox();
    assert.ok(box.y + box.height <= bodyBox.y + bodyBox.height + 1, part);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${process.env.SHOTS ?? "."}/calendar-today.png`,
  });
  // More than birthdays (owner, Nov 1): the town's meetings and the holidays
  // stand with the family's birthdays, each kind named in a key (never a color),
  // and a kind can be hidden and shown again.
  const keyKinds = () =>
    page
      .locator(".calendar-key .key-chip")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.kind));
  // A month shows only the kinds that fall in it (a town with no filing or meeting this month has
  // birthdays and holidays alone): step on until a third kind appears, up to a year.
  let kinds = await keyKinds();
  for (let step = 0; step < 12 && kinds.length < 3; step += 1) {
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    kinds = await keyKinds();
  }
  console.log("Kinds:", kinds.join(", "));
  assert.ok(kinds.includes("holiday"), "no holidays on the calendar");
  assert.ok(kinds.includes("birthday"), "no birthdays on the calendar");
  assert.ok(kinds.length >= 3, `only ${kinds.join(", ")}`);
  // The owner's ruling (Nov 8: no colored dots and stripes per kind): no per-kind
  // color class or color anywhere, and each kind is still named in the key's words.
  assert.equal(
    await page.locator('[class*="kind-"]').count(),
    0,
    "a calendar element still carries a per-kind color class",
  );
  const chips = await page
    .locator(".calendar-key .key-chip")
    .evaluateAll((nodes) => nodes.map((n) => n.textContent.trim()));
  assert.ok(
    chips.every(Boolean) && new Set(chips).size === chips.length,
    "a kind in the key has no name of its own",
  );
  const stripes = await page
    .locator(".calendar-pager .calendar-entry")
    .evaluateAll((nodes) =>
      nodes.map((n) => getComputedStyle(n).borderLeftWidth),
    );
  assert.ok(
    stripes.every((width) => width === "0px"),
    "an entry still has a colored stripe",
  );
  const rowsOf = (kind) =>
    page.locator(
      `.calendar-pager .calendar-entry .day-icon[data-kind="${kind}"]`,
    );
  const marks = (kind) => page.locator(`.month .day-icon[data-kind="${kind}"]`);
  const before =
    (await rowsOf("holiday").count()) + (await marks("holiday").count());
  assert.ok(before > 0, "no holiday is shown");
  await page.locator('.calendar-key [data-kind="holiday"]').click();
  assert.equal(
    (await rowsOf("holiday").count()) + (await marks("holiday").count()),
    0,
    "a hidden kind still shows",
  );
  assert.equal(
    await page
      .locator('.calendar-key [data-kind="holiday"]')
      .getAttribute("aria-pressed"),
    "false",
  );
  await page.screenshot({
    path: `${process.env.SHOTS ?? "."}/calendar-holidays-hidden.png`,
  });
  await page.locator('.calendar-key [data-kind="holiday"]').click();
  assert.equal(
    (await rowsOf("holiday").count()) + (await marks("holiday").count()),
    before,
    "a shown kind did not come back",
  );
  // An empty future day: its date heads the side with the skip, and the clock
  // does not move until it is pressed.
  for (let i = 0; i < 9; i++)
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  const far = page.locator(".month .day:not(:has(.marks))").nth(10);
  await far.click();
  const farDate = await page
    .locator(".month .day.selected")
    .getAttribute("data-date");
  assert.ok(
    (await page.locator(".calendar-day .sechead").innerText()).includes(
      String(Number(farDate.slice(-2))),
    ),
    "the day's date heads its plate",
  );
  const skip = page.locator(".calendar-day .go-to-day");
  assert.equal(await skip.count(), 1);
  assert.equal((await skip.innerText()).trim(), "Go to this day");
  assert.equal(await page.locator("#card-clock").textContent(), clock);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  // A day with something on it shows its icon on the tile and its line on the plate.
  for (let i = 0; i < 12; i++) {
    if (
      await page
        .locator(".month .day:not(.today):not(.past):has(.marks)")
        .count()
    )
      break;
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  }
  const marked = page
    .locator(".month .day:not(.today):not(.past):has(.marks)")
    .first();
  assert.ok(
    await marked
      .locator(".day-icon")
      .first()
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  await marked.click();
  assert.ok(
    (await page.locator(".calendar-day .what").count()) > 0,
    "the chosen day's plate lists what its tile marks",
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
  await page.locator(".calendar-day .go-to-day").click();
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
  // A stop that holds the clock offers no jump: Go to this day is not drawn while Continue shows.
  if (
    (await page.locator("#continue").isVisible()) &&
    !(await page.locator("#talk").isVisible())
  ) {
    await page.locator('.ring[data-tab="calendar"]').click();
    await page.locator(".calendar-month").waitFor();
    await page.locator(".month .day:not(.today):not(.past)").first().click();
    assert.equal(
      await page.locator(".calendar-day .go-to-day").count(),
      0,
      "a stop is open, yet the calendar offers Go to this day",
    );
    await page.getByTestId("sheet-close").click();
  }
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
    // A button seen a moment ago can be gone by the click (a scene moves on): a missed click is
    // not a failure, the loop looks again.
    await page
      .locator("#talk-leave:visible, #continue:visible")
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
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
