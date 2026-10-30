/* global process, URL, URLSearchParams, console, document */
// Run against a fresh bench: node src/bench/party.browser.mjs
// The player joins a party from the politics sheet; the tie shows with how
// their views fit it, and the join buttons go away.
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
  await page.goto(process.env.BENCH_URL ?? "http://localhost:3000/play");
  await ready;
  // Only someone of voting age who belongs to no party yet can join one: up
  // to three new lives are drawn for one (a drawn 17-year-old cannot join).
  const at = (path) => new URL(path, page.url()).href;
  let eligible = false;
  let lastLife = "";
  for (let attempt = 0; attempt < 3 && !eligible; attempt++) {
    if (attempt > 0) {
      await page.reload();
      await page.locator("#new-life").waitFor();
    }
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    lastLife = r.url();
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    const life = (await (await page.request.get(at("/api/title"))).json()).life;
    const of = await (
      await page.request.get(
        at(`/api/government?id=${encodeURIComponent(life.personId)}`),
      )
    ).json();
    eligible = Boolean(of.ofVotingAge && of.party && !of.party.member);
    if (!eligible)
      console.log(
        of.ofVotingAge
          ? "Already in a party: drawing another life"
          : "Under voting age: drawing another life",
      );
  }
  // No such draw: a grown resident of the same world, who has usually
  // registered with a party already, shows the membership instead.
  let member = false;
  if (!eligible) {
    const world = Object.fromEntries(new URL(lastLife).searchParams);
    const person = JSON.stringify({
      givenName: "Pat",
      familyName: "Member",
      gender: "nonbinary",
      birthYear: 1980,
      birthMonth: 6,
      birthDay: 15,
    });
    const grown = await page.request.post(
      at(`/api/newlife?${new URLSearchParams({ ...world, person })}`),
      { timeout: 600000 },
    );
    assert.equal(grown.status(), 200);
    await page.reload();
    await page.locator("#front-continue").click();
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    const life = (await (await page.request.get(at("/api/title"))).json()).life;
    const of = await (
      await page.request.get(
        at(`/api/government?id=${encodeURIComponent(life.personId)}`),
      )
    ).json();
    assert.ok(of.ofVotingAge, "the grown resident is not of voting age");
    member = Boolean(of.party?.member);
    console.log(
      member
        ? "A grown resident, already in a party: checking the membership"
        : "A grown resident in no party: checking the join",
    );
  }
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  const sheet = page.locator("#sheet");
  await sheet.waitFor();
  // Joining lives on the Parties tab (since Government drew the mock).
  await page.locator('#sheet-tabs [data-tab="parties"]').click();
  // How the views fit is said in words, one of the controls' bands.
  const bands = (
    await (await page.request.get(at("/api/controls"))).json()
  ).party.fit.map((band) => band.label);
  if (member) {
    // A member sees their party, the tie's record and how the views fit,
    // and no party to join.
    const line = sheet.locator("[data-tie-id]");
    await line.waitFor();
    const text = await line.innerText();
    assert.ok(
      bands.some((band) => text.includes(band)),
      `${text}: the fit in words`,
    );
    assert.ok(await line.getAttribute("data-tie-id"), "the tie record id");
    assert.equal(
      await sheet.getByRole("button", { name: /^Join / }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS member: ${text}; tie ${await line.getAttribute("data-tie-id")}`,
    );
  } else {
    // Not a member: each party offers a join control, named from controls.json.
    const join = sheet.getByRole("button", { name: /^Join / });
    await join.first().waitFor();
    const offered = await join.count();
    assert.ok(offered > 0, "a party to join");
    assert.equal(await sheet.locator("[data-tie-id]").count(), 0);
    const label = (await join.first().innerText()).replace(/^Join /, "");
    const joined = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/party/join",
    );
    await join.first().click();
    assert.equal((await joined).status(), 200);
    // The sheet now shows the party, the tie's record and how the views fit.
    const line = sheet.locator("[data-tie-id]");
    await line.waitFor();
    const text = await line.innerText();
    assert.ok(text.includes(label), `${text} names ${label}`);
    assert.ok(
      bands.some((band) => text.includes(band)),
      `${text}: the fit in words`,
    );
    assert.ok(await line.getAttribute("data-tie-id"), "the tie record id");
    assert.equal(
      await sheet.getByRole("button", { name: /^Join / }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS joined ${label}; tie ${await line.getAttribute("data-tie-id")}`,
    );
  }
} finally {
  await browser.close();
}
