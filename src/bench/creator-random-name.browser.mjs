/* global process, console, URL */
// The creator's random name waits for a gender (owner, Nov 1: "Randomized name
// shouldn't work until you choose a gender"): disabled, its label saying what
// it waits for, until one is picked; then it draws a name for that gender.
// Run against a fresh bench: node src/bench/creator-random-name.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await ready;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator("#cr-character:not([hidden])").waitFor();
  const random = page.locator("#cr-random-name");
  assert.ok(await random.isDisabled(), "the random name works before a gender");
  const waiting = (await random.innerText()).trim();
  console.log(`Before a gender: "${waiting}" (disabled)`);
  assert.match(waiting, /gender/i, "the button does not say what it waits for");
  if (shots)
    await page.screenshot({ path: `${shots}/before-gender-1440x900.png` });
  for (const gender of ["female", "male"]) {
    await page.locator(`[data-gender=${gender}]`).click();
    assert.ok(!(await random.isDisabled()), `still disabled after ${gender}`);
    const label = (await random.innerText()).trim();
    assert.doesNotMatch(label, /Choose a gender/i, label);
    const drawn = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/creator/name",
    );
    await random.click();
    const response = await drawn;
    assert.equal(
      new URL(response.url()).searchParams.get("gender"),
      gender,
      "the name was drawn without the chosen gender",
    );
    const name = await response.json();
    console.log(`${gender}: ${name.givenName} ${name.familyName}`);
    assert.equal(await page.locator("#cr-given").inputValue(), name.givenName);
  }
  if (shots)
    await page.screenshot({ path: `${shots}/after-gender-1440x900.png` });
  assert.deepEqual(errors, []);
  console.log("creator random name: pass");
} finally {
  await browser.close();
}
