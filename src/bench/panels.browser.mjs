/* global process, console, document, getComputedStyle, URL */
// The reading screens in a real browser, on the bench (npm run bench): a new
// life in a place drawn from all 56, on its first evening. The menu, News,
// Politics → Government and a person's card must be solid (the scene never
// shows through) and their text must meet WCAG AA contrast (4.5 to 1)
// against the panel.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shots = process.env.PANEL_SHOTS;
// Every color stop of the panel's background must be opaque, nothing may blur
// the scene through it, and its text must read against the lightest stop.
async function solid(screen, selector) {
  await page.locator(selector).waitFor({ state: "visible" });
  const found = await page.evaluate((s) => {
    const panel = document.querySelector(s);
    const style = getComputedStyle(panel);
    const stops = [
      ...`${style.backgroundColor} ${style.backgroundImage}`.matchAll(
        /rgba?\(([^)]+)\)/g,
      ),
    ]
      .map((m) => m[1].split(",").map(Number))
      .filter((c) => !(c.length === 4 && c[3] === 0));
    const text = getComputedStyle(
      panel.querySelector("p, .row, h4, li, span") ?? panel,
    ).color.match(/rgba?\(([^)]+)\)/)[1];
    return {
      stops,
      blur: style.backdropFilter,
      text: text.split(",").map(Number),
    };
  }, selector);
  const luminance = ([r, g, b]) => {
    const f = (v) =>
      v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4;
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const see = found.stops.filter((c) => c.length === 4 && c[3] < 1);
  const lightest = Math.max(...found.stops.map(luminance));
  const contrast = (luminance(found.text) + 0.05) / (lightest + 0.05);
  console.log(
    `${screen}: ${found.stops.length} stops, ${see.length} see-through, blur ${found.blur}, contrast ${contrast.toFixed(1)}`,
  );
  if (shots)
    await page.screenshot({
      path: `${shots}/${screen.replace(/\W+/g, "-").toLowerCase()}.png`,
    });
  assert.ok(found.stops.length, `${screen}: no panel background`);
  assert.deepEqual(see, [], `${screen}: the scene shows through`);
  assert.equal(found.blur, "none", `${screen}: the scene blurs through`);
  assert.ok(contrast >= 4.5, `${screen}: text contrast ${contrast}`);
}
async function sheet(tab) {
  await page.locator(`#rings [data-tab="${tab}"]`).click();
  await page.locator("#sheet-body").waitFor();
  await page.waitForTimeout(800);
}
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  // A person's card: the first person in the room on the first evening.
  const figure = page.locator("#people .talkable").first();
  await figure.waitFor();
  await figure.focus();
  await page.keyboard.press("Enter");
  // The talk opens; the person's name in it opens their card.
  await page.locator("#talk:not([hidden])").waitFor();
  await page.locator("#talk-name").click();
  await page.locator("#person:not([hidden])").waitFor();
  await page.waitForTimeout(800);
  await solid("Person card", "#person");
  await page.keyboard.press("Escape");
  await page.locator("#person").waitFor({ state: "hidden" });
  await page.locator('#rings [data-tab="calendar"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  // One left menu: the rail stays beside an open screen and no Menu panel
  // repeats it (owner, Oct 27).
  assert.equal(await page.locator("#menu").count(), 0, "no Menu panel");
  assert.ok(await page.locator("#rings").isVisible(), "the rail stays");
  await sheet("news");
  await solid("News", "#sheet");
  await sheet("politics");
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Government", exact: true })
    .click();
  await page.waitForTimeout(800);
  await solid("Politics Government", "#sheet");
  assert.deepEqual(errors, []);
  console.log(
    "PASS the menu is names only; the menu, News, Government and a person card are solid and readable",
  );
} finally {
  await browser.close();
}
