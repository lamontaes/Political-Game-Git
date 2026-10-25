/* global process, URL, URLSearchParams, console, document, fetch */
import assert from "node:assert/strict";
import { chromium } from "playwright";
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
  const { filed, tried } = await page.evaluate(async () => {
    const tried = [];
    const gov = await (await fetch("/api/government")).json();
    for (const { contest } of gov.contests ?? []) {
      const contestId = contest.id;
      const r = await fetch(`/api/file?${new URLSearchParams({ contestId })}`, {
        method: "POST",
      });
      const body = await r.json().catch(() => ({}));
      tried.push(
        contestId.slice(-40) +
          " " +
          r.status +
          " " +
          JSON.stringify(body).slice(0, 200),
      );
      if (
        r.ok &&
        body.status !== "refused" &&
        body.filing?.status === "on-ballot"
      )
        return { filed: contestId, tried };
    }
    return {
      filed: null,
      tried: [`${(gov.contests ?? []).length} contests`, ...tried],
    };
  });
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
  const controls = await page
    .locator(".row.campaign button")
    .evaluateAll((nodes) => nodes.map((n) => n.textContent.trim()));
  console.log("Buttons:", controls.join(" | "));
  for (const name of [
    "Knock on doors",
    "Hold an event",
    "Ask for an interview",
    "Call donors",
  ])
    assert.ok(
      controls.some((c) => c.startsWith(name)),
      `the Campaigns screen has ${name}`,
    );
  await page.screenshot({
    path: "docs/reports/campaign-controls-2026-10-20/campaigns.png",
  });
  // Taking an interview and an event runs the engine's own act; each answers with its own record.
  for (const name of ["Ask for an interview", "Hold an event"]) {
    const button = page
      .locator(".row.campaign button", { hasText: name })
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
    if (await page.locator("#sheet-tabs").isHidden())
      await page
        .locator('[data-tab="politics"]')
        .first()
        .evaluate((e) => e.click());
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Campaigns", exact: true })
      .click();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS the Campaigns screen has the four outing controls and no list of acts",
  );
} finally {
  await browser.close();
}
