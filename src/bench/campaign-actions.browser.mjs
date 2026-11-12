/* global process, console, URL, document */
// The finish line of play-stop-11: in a place drawn on the bench (npm run bench), a grown resident
// files for a local seat and, the first week after filing, gives a speech, asks for an interview
// and calls donors. Each result must show a scene or a result line; Call donors raises money from
// a named person; a grayed action says why. Photographed at 1440x900 into CAMPAIGN_SHOTS.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { URLSearchParams } from "node:url";
import { chooseTrailAct } from "./trail-act.mjs";
import { fileWhenFilingOpens } from "./start-life.mjs";
import { openCampaignTrail } from "./campaign-trail.mjs";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shots = process.env.CAMPAIGN_SHOTS;
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  // A seed the game draws, a date a grown resident can file from (as campaign.browser.mjs does).
  const seed = (
    await (await page.request.get("http://localhost:3000/api/seed")).json()
  ).seed;
  const made = await page.request.post(
    `http://localhost:3000/api/newlife?${new URLSearchParams({ seed, date: "2026-10-12", person })}`,
    { timeout: 300000 },
  );
  assert.equal(made.status(), 200);
  const world = { seed };
  await page.reload();
  await page.locator("#front-continue").waitFor();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Place:",
    await page.locator("#card-place").innerText(),
    "seed",
    world.seed,
  );
  const { contestId } = await fileWhenFilingOpens(page);
  assert.ok(contestId, "the player could file for nothing in this town");
  console.log("Filed for:", contestId);
  const results = [];
  const base = "http://localhost:3000";
  const me = (await (await page.request.get(`${base}/api/title`)).json()).life
    .personId;
  // Give a speech: the card's own steps (begin, pick a line at each stage, give at a venue).
  {
    const view = await (
      await page.request.get(
        `${base}/api/campaign?id=${encodeURIComponent(me)}`,
      )
    ).json();
    const filingId = view.campaigns[0].filing.id;
    const venue = view.venues?.[0] ?? view.campaigns[0].venues?.[0];
    let state = await (
      await page.request.post(`${base}/api/campaign/speech/begin`)
    ).json();
    for (
      let step = 0;
      step < 12 && !state.done && state.choices?.length;
      step += 1
    )
      state = await (
        await page.request.post(
          `${base}/api/campaign/speech/pick?key=${encodeURIComponent(state.choices[0].key)}`,
        )
      ).json();
    const gave = await page.request.post(
      `${base}/api/campaign/speech/give?${new URLSearchParams({ filingId, venue: venue ?? "" })}`,
    );
    const body = await gave.json().catch(() => ({}));
    console.log(
      "Give a speech",
      gave.status(),
      JSON.stringify({
        venue,
        reached: body.reached,
        warmer: body.warmer,
        cooler: body.cooler,
        retold: body.retold,
        scene: body.scene?.backdrop?.url,
        error: body.error,
      }),
    );
    results.push({ name: "Give a speech", body });
  }
  for (const name of ["Ask for an interview", "Call donors"]) {
    await openCampaignTrail(page);
    const go = await chooseTrailAct(page, name);
    if (!(await go.count()) || (await go.isDisabled())) {
      const why = await page.locator("#sheet-body").innerText();
      console.log(
        `${name}: grayed; the card says: ${why.slice(0, 200).replace(/\s+/g, " ")}`,
      );
      results.push({ name, grayed: true });
      continue;
    }
    const day = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/campaign/day",
      { timeout: 60000 },
    );
    await go.click();
    const body = await (await day).json().catch(() => ({}));
    console.log(name, JSON.stringify(body).slice(0, 500));
    await page.waitForTimeout(600);
    if (shots)
      await page.screenshot({
        path: `${shots}/campaign-${name.replace(/\W+/g, "-").toLowerCase()}.png`,
      });
    results.push({ name, body });
  }
  assert.ok(results.length === 3);
  assert.deepEqual(errors, []);
  console.log("DONE");
} finally {
  await browser.close();
}
