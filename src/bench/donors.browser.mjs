/* global process, URL, URLSearchParams, console, document, fetch */
// Call donors from the Campaigns screen: the list of people reached, each with
// what they gave or why not, and the raised total moving by the sum.
// Usage: BENCH_PORT=3121 BENCH_BROWSER=... node src/bench/donors.browser.mjs <before|after>
import assert from "node:assert/strict";
import { chromium } from "playwright";
const mode = process.argv[2] ?? "after";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const out = "docs/reports/donors-2026-10-25";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const dollarsIn = (text) =>
  Number(
    (text.match(/\$([\d,]+(?:\.\d\d)?) raised/) ?? [])[1]?.replace(/,/g, "") ??
      NaN,
  );
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const seed =
    process.env.SEED ??
    (await (await page.request.get(`${base}/api/seed`)).json()).seed;
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, date: "2026-10-12", person })}`,
    { timeout: 300000 },
  );
  assert.equal(made.status(), 200);
  await page.reload();
  await page.locator("#front-continue").waitFor();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const placeName = await page.locator("#card-place").innerText();
  console.log("Seed:", seed, "Place:", placeName);
  const filed = await page.evaluate(async () => {
    const gov = await (await fetch("/api/government")).json();
    for (const { contest } of gov.contests ?? []) {
      const r = await fetch(
        `/api/file?${new URLSearchParams({ contestId: contest.id })}`,
        { method: "POST" },
      );
      const body = await r.json().catch(() => ({}));
      if (
        r.ok &&
        body.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(body.filing?.status)
      )
        return contest.id;
    }
    return null;
  });
  assert.ok(filed, "the player could file for nothing in this town");
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Campaigns", exact: true })
    .click();
  await page.locator(".row.campaign").first().waitFor();
  const raisedBefore = dollarsIn(
    await page.locator(".row.campaign").first().innerText(),
  );
  console.log("Raised before:", raisedBefore);
  await page.screenshot({ path: `${out}/${mode}-1-campaigns.png` });
  const calls = page
    .locator(".row.campaign button", { hasText: "Call donors" })
    .first();
  if (await calls.isDisabled()) {
    console.log(
      "Call donors is grayed; the button says:",
      await calls.innerText(),
    );
    await page.screenshot({ path: `${out}/${mode}-2-grayed.png` });
  } else {
    const day = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/campaign/day",
    );
    await calls.click();
    const result = await (await day).json();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${mode}-2-after-calls.png` });
    const body = await page.locator("#sheet-body").innerText();
    const raisedAfter = dollarsIn(body);
    if (Number.isNaN(raisedAfter))
      console.log(
        "Sheet body:",
        body.slice(0, 600),
        JSON.stringify(result).slice(0, 600),
      );
    console.log("Raised after:", raisedAfter);
    if (mode === "after") {
      const sum = result.calls.reduce((t, c) => t + c.givenMinor, 0);
      assert.ok(result.calls.length > 0, "the call reached people");
      assert.equal(Math.round((raisedAfter - raisedBefore) * 100), sum);
      for (const call of result.calls) {
        assert.ok(call.line.includes(call.name), call.line);
        assert.ok(body.includes(call.line), `the screen lists: ${call.line}`);
      }
      console.log("People:", result.calls.map((c) => c.line).join(" | "));
      console.log("Summary:", result.callsLine);
    } else {
      console.log(
        "Before: the screen after the call reads:",
        (await page.locator(".row.campaign").first().innerText()).slice(0, 300),
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log("PASS donors", mode);
} finally {
  await browser.close();
}
