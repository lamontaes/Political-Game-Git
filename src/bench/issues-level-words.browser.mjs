/* global process, console, document, URLSearchParams */
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
  await page.locator("#sheet-body .issue-cards .entry").first().waitFor();
  const wordsOf = (text) =>
    [...text.matchAll(/\b([A-Za-z]+) law\b/gi)].map(
      (m) => m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(),
    );
  const seen = new Set();
  // Every subject on the rail, each card's own line ("Commonwealth law since 2024").
  const subjects = await page
    .locator("#sheet-body [data-subject]")
    .evaluateAll((tabs) => tabs.map((t) => t.dataset.subject));
  for (const subject of subjects) {
    await page.locator(`#sheet-body [data-subject="${subject}"]`).click();
    await page.waitForTimeout(200);
    for (const line of await page.locator(".entry-line").allInnerTexts())
      wordsOf(line).forEach((w) => seen.add(w));
  }
  if (shots)
    await page.screenshot({
      path: `${shots}/${process.env.SHOT_NAME ?? "after"}-issues.png`,
    });
  // The law page of a card names its levels the same way.
  await page.locator("#sheet-body .issue-cards .entry").first().click();
  await page.locator("#sheet-body .law-page").waitFor();
  await page.waitForTimeout(400);
  const onPage = wordsOf(
    await page.locator("#sheet-body .law-page").innerText(),
  );
  onPage.forEach((w) => seen.add(w));
  assert.ok(onPage.length > 0, "the law page names no level");
  if (shots)
    await page.screenshot({
      path: `${shots}/${process.env.SHOT_NAME ?? "after"}-law-page.png`,
    });
  console.log("level words on the cards:", [...seen].join(", "));
  if (word !== "State")
    assert.ok(!seen.has("State"), `"State law" shown in ${gov.homeState.name}`);
  assert.ok(seen.has(word), `no card says "${word} law": ${[...seen]}`);
  assert.deepEqual(errors, []);
  console.log(`PASS Issues says "${word} law" for ${gov.homeState.name}`);
} finally {
  await browser.close();
}
