/* global process, console, document */
// The creator's age line says, in words, the age the character will be on the
// day the life begins and that day's date. Run against the bench:
//   BENCH_PORT=3000 node src/bench/creator-age.browser.mjs [out-prefix]
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [prefix] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  const read = () =>
    page.locator('[data-testid="creator-derived-age"]').innerText();
  const check = async (name) => {
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="creator-derived-age"]')
          .textContent.length > 0,
    );
    const line = await read();
    console.log(`${name}: "${line}"`);
    assert.match(line, /\bage\b|\bbe \d+/i, "the line says it is an age");
    assert.match(
      line,
      /\w+ \d{1,2}, \d{4}/,
      "the line holds the start date in words",
    );
    assert.match(
      line,
      /begins|starts/i,
      "the line says that is when the life begins",
    );
    assert.doesNotMatch(line, /^\d+ ·/, "no bare number-and-date line");
    if (prefix) await page.screenshot({ path: `${prefix}-${name}.png` });
  };
  await check("default");
  // A birthday that makes the character 35 on the start date.
  const start = await page.evaluate(
    () => document.querySelector("#cr-year").selectedOptions[0].textContent,
  );
  console.log("default year option:", start);
  const year = page.locator("#cr-year");
  const options = await year.locator("option").allTextContents();
  const at35 = options.find((o) => /\(age 35\)/.test(o));
  assert.ok(at35, "a year gives age 35");
  await year.selectOption({ label: at35 });
  await check("age-35");
  assert.match(await read(), /\b35\b/);
  console.log("PASS the age line says what it is");
} finally {
  await browser.close();
}
