/* global process, URL, URLSearchParams, console, document */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { fileWhenFilingOpens } from "./start-life.mjs";
import { openCampaignTrail } from "./campaign-trail.mjs";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  // A grown resident (born 1980), so the records let them file for the town's offices.
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const seed = (
    await (await page.request.get("http://localhost:3000/api/seed")).json()
  ).seed;
  const made = await page.request.post(
    `http://localhost:3000/api/newlife?${new URLSearchParams({ seed, date: "2026-10-12", person })}`,
    { timeout: 300000 },
  );
  assert.equal(made.status(), 200);
  console.log("Seed:", seed);
  await page.reload();
  await page.locator("#front-continue").waitFor();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  // File for the first office the player can: the records decide which.
  // Filing opens on a set day: the weeks go by until a race is open.
  const { contestId: filed, tried } = await fileWhenFilingOpens(page);
  console.log("Filed for:", filed, tried.join("\n"));
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
  const body = await page.locator("#sheet-body").innerText();
  assert.ok(!body.includes("undefined"));
  // The Campaigns tab shows standing and results only: no act button on it.
  assert.equal(
    await page.locator(".row.campaign button").count(),
    0,
    "the Campaigns tab has no act buttons",
  );
  await page.screenshot({
    path: "docs/reports/campaign-controls-2026-10-20/campaigns.png",
  });
  // The acts wait on the campaign trail in Travel, one control per outing.
  await openCampaignTrail(page);
  const controls = await page
    .locator("#sheet-body.place-view button")
    .evaluateAll((nodes) => nodes.map((n) => n.textContent.trim()));
  console.log("Buttons:", controls.join(" | "));
  const outings = [
    "Knock on doors",
    "Hold an event",
    "Ask for an interview",
    "Call donors",
  ];
  for (const name of outings) {
    const matching = controls.filter((c) => c.startsWith(name));
    assert.equal(
      matching.length,
      1,
      `the trail has exactly one "${name}" control`,
    );
  }
  const headings = await page
    .locator("#sheet-body b")
    .evaluateAll((nodes) => nodes.map((n) => n.textContent.trim()));
  assert.ok(!headings.includes("Today"), "no list of acts under Today");
  await page.screenshot({
    path: "docs/reports/campaign-controls-2026-10-20/trail.png",
  });
  // Taking an interview and an event runs the engine's own act; each answers with its own record.
  for (const name of ["Ask for an interview", "Hold an event"]) {
    const button = page
      .locator("#sheet-body.place-view button", { hasText: name })
      .first();
    if (await button.isDisabled()) {
      console.log(`${name}: not available today (the records say so)`);
      continue;
    }
    const day = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/campaign/day",
    );
    await button.click();
    const result = await (await day).json();
    console.log(
      name,
      JSON.stringify({
        kind: result.kind,
        interview: result.interview,
        reached: result.reached,
        scene: result.scene?.place,
      }),
    );
    if (result.kind === "interview") assert.ok(result.interview?.id);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `docs/reports/campaign-controls-2026-10-20/${result.kind}.png`,
    });
    await openCampaignTrail(page);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS the campaign trail has the four outing controls; the Campaigns tab has no acts",
  );
} finally {
  await browser.close();
}
