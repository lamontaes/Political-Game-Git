/* global process, console, document, URL */
// Turning eighteen is golden-path step one: a life begun at 17 lists its own
// birthday under Coming up, and pressing Week across that day stops on it
// with the journal saying so.
// Run against a fresh bench: node src/bench/birthday.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
page.on("pageerror", (e) => errors.push(e.message));
const words = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  // The world modes sit under Advanced once New game puts Start a life first.
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  const title = await (await page.request.get(`${base}/api/title`)).json();
  const id = title.life.personId;
  assert.equal(title.life.age, 17, "the new life is not 17");

  // Coming up lists the player's own birthday, the day they turn 18.
  const { items } = await (
    await page.request.get(`${base}/api/calendar?id=${encodeURIComponent(id)}`)
  ).json();
  const own = items.find((item) => item.kind === "your-birthday");
  await page
    .locator('[data-tab="calendar"]')
    .first()
    .evaluate((e) => e.click());
  const upcoming = page.locator(".calendar-side");
  await upcoming.waitFor();
  if (shots)
    await page.screenshot({
      path: `${shots}/${process.env.SHOT_NAME ?? "after"}-coming-up.png`,
    });
  assert.ok(own, "Coming up has no birthday of the player's own");
  console.log("Turns 18:", own.date);
  let listed = false;
  for (let p = 0; p < 20 && !listed; p++) {
    // Coming up names the day as "Feb 6" beside the line.
    listed = await upcoming.locator(".calendar-entry").evaluateAll(
      (rows, day) =>
        rows.some(
          (row) =>
            row.querySelector(".when")?.textContent.trim() === day &&
            /your birthday/i.test(row.textContent),
        ),
      new Date(`${own.date}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    );
    if (listed) break;
    const next = upcoming.locator("button", { hasText: /continue|next|›|→/i });
    if (!(await next.count()) || (await next.last().isDisabled())) break;
    await next.last().click();
  }
  assert.ok(
    listed,
    `Coming up does not list ${words(own.date)}, your birthday`,
  );
  await page.keyboard.press("Escape");
  await page
    .locator("#sheet-close")
    .click()
    .catch(() => {});

  // Week by week until the clock reaches the day: it stops on it.
  const clockDate = async () =>
    (await page.locator("#card-clock").innerText()).split("\n")[0];
  for (let week = 0; week < 60; week++) {
    const shown = await clockDate();
    // "Monday, January 20, 2025": the date without its weekday.
    const day = shown.split(", ").slice(1).join(", ");
    const at = new Date(`${day} 12:00 UTC`).toISOString().slice(0, 10);
    if (at >= own.date) {
      assert.equal(at, own.date, `the week ran past the birthday to ${shown}`);
      break;
    }
    const moved = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/advance",
      { timeout: 600000 },
    );
    await page.locator("#week").click();
    await moved;
    await page.waitForTimeout(1000);
    // Anything else that stops the week is answered as a player would.
    for (let stop = 0; stop < 20; stop++) {
      if (await page.locator("#talk-leave").isVisible())
        await page.locator("#talk-leave").click();
      if (!(await page.locator("#continue").isVisible())) break;
      const resumed = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/resume",
        { timeout: 600000 },
      );
      await page.locator("#continue").click();
      await resumed;
      await page.waitForTimeout(1000);
    }
  }
  console.log("Stopped on:", await clockDate());
  await page.waitForFunction(() =>
    document.getElementById("journal-line").textContent.trim(),
  );
  const line = await page.locator("#journal-line").innerText();
  console.log("Journal:", line);
  assert.match(line, /eighteen/i, "the journal does not name the birthday");
  if (shots) await page.screenshot({ path: `${shots}/turned-eighteen.png` });
  assert.deepEqual(errors, []);
  console.log("PASS the 18th birthday is coming up and the day stops on it");
} finally {
  await browser.close();
}
