/* global process, console, document, URL, URLSearchParams */
// Politics > Issues names the state level by what the place calls its laws (Commonwealth,
// Territory, District or State), from the place's own data, on every card and law page.
// A drawn place by default; PLACE_KEY opens a named one. BENCH_SEED replays a world.
// Run against a fresh bench: node src/bench/issues-level-words.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const params = new URLSearchParams({
    seed: process.env.BENCH_SEED ?? "issues-level-words",
  });
  if (process.env.PLACE_KEY) params.set("placeKey", process.env.PLACE_KEY);
  const made = await page.request.post(`${base}/api/newlife?${params}`, {
    timeout: 600000,
  });
  assert.equal(made.status(), 200, await made.text());
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  console.log("Seed:", params.get("seed"));
  const id = (await (await page.request.get(`${base}/api/title`)).json()).life
    .personId;
  const gov = await (
    await page.request.get(
      `${base}/api/government?id=${encodeURIComponent(id)}`,
    )
  ).json();
  const word = gov.homeState.levelWord;
  console.log(`${gov.homeState.name}: laws are called "${word} law"`);
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-tabs button").first().waitFor();
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Issues", exact: true })
    .click();
  await page.locator("details.entry").first().waitFor();
  const seen = new Set();
  for (const card of await page.locator("details.entry").all()) {
    await card.locator("summary").click();
    const text = await card.innerText();
    for (const m of text.matchAll(/\b(\w+) law\b/g)) seen.add(m[1]);
    if (shots && seen.size === 1 && !process.env.SHOT_DONE) {
      process.env.SHOT_DONE = "1";
      await page.screenshot({
        path: `${shots}/${process.env.SHOT_NAME ?? "after"}-issues.png`,
      });
    }
  }
  console.log("level words on the cards:", [...seen].join(", "));
  if (word !== "State")
    assert.ok(!seen.has("State"), `"State law" shown in ${gov.homeState.name}`);
  assert.ok(
    seen.has(word) || seen.size === 0,
    `no card says "${word} law": ${[...seen]}`,
  );
  assert.deepEqual(errors, []);
  console.log(`PASS Issues says "${word} law" for ${gov.homeState.name}`);
} finally {
  await browser.close();
}
