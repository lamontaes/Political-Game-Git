/* global process, console, document, crypto, URLSearchParams */
// What people say about me (the approved You mock), in the running game on the bench (npm run
// bench): a new life of about forty in a drawn place, sixty days run through dev mode, then the
// You screen. Each person's quote stands on records (data-record), and in dev mode a sentence
// opens its record in the Trace box. Prints the place, the seed and every sentence with its record.
// node src/bench/what-people-say.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk } from "./start-life.mjs";
import { devModeOn } from "./dev-setup.mjs";

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/play`);
  const seed = process.env.SAID_SEED ?? crypto.randomUUID();
  // A grown resident (the done-when's 35 or older), in a place the game draws.
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Rowan",
    gender: "nonbinary",
    birthYear: 1984,
    birthMonth: 6,
    birthDay: 15,
  });
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, person })}`,
    { timeout: 600000 },
  );
  assert.equal(made.status(), 200, await made.text());
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await finishTalk(page);
  console.log(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await devModeOn(page);
  // Sixty days of the world, through dev mode's own run.
  const ran = await page.request.post(`${base}/api/dev/run-until`, {
    data: { days: 60 },
    timeout: 900000,
  });
  assert.equal(ran.status(), 200, await ran.text());
  await page.reload();
  await page
    .locator("#front-continue")
    .click()
    .catch(() => {});
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await finishTalk(page);
  console.log(
    "Clock:",
    (await page.locator("#card-clock").innerText()).replace(/\s+/g, " "),
  );
  const opened = Date.now();
  await page
    .locator('[data-tab="who"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator("#sheet .strip-screen").first().waitFor();
  console.log("You opened in", Date.now() - opened, "ms");
  const people = await page
    .locator("#sheet .said figure")
    .evaluateAll((figures) =>
      figures.map((figure) => ({
        tag: figure.querySelector(".saidtag")?.textContent ?? "",
        by: figure.querySelector("figcaption")?.textContent ?? "",
        said: [...figure.querySelectorAll("blockquote [data-record]")].map(
          (span) => `${span.textContent} <${span.dataset.record}>`,
        ),
      })),
    );
  for (const row of people)
    console.log(`  ${row.by} [${row.tag}]: ${row.said.join(" / ")}`);
  if (shots)
    await page.screenshot({ path: `${shots}/you-what-people-say.png` });
  assert.ok(people.length > 0, "no one says anything about the player");
  for (const row of people)
    assert.ok(row.said.length, `${row.by} says nothing`);
  // Dev mode: a sentence opens its record in the one Trace box.
  const sentence = page
    .locator("#sheet .said blockquote [data-record]")
    .first();
  const record = await sentence.getAttribute("data-record");
  await sentence.click();
  const traced = page.locator("#sheet .dev-trace h4", { hasText: record });
  await traced.waitFor({ timeout: 15000 });
  console.log("Trace:", await traced.innerText());
  if (shots)
    await page.screenshot({ path: `${shots}/you-what-people-say-trace.png` });
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${people.length} people say what they went through with the player`,
  );
} finally {
  await browser.close();
}
