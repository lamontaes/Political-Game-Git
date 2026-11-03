/* global process, URL, URLSearchParams, console, document, fetch */
// Asking for endorsements is a scene (owner: every campaign act is a scene): the
// campaign office with the player at it, each person asked the next Continue
// with what they said, then the total; the campaign record's volunteer count
// moves by the yeses. Usage: SEED=<seed> node src/bench/endorsement-meeting.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { openCampaignTrail } from "./campaign-trail.mjs";

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
  await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, date: "2026-10-12", person })}`,
    { timeout: 300000 },
  );
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
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
  await openCampaignTrail(page);
  const ask = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/campaign/act",
  );
  await page
    .locator("#sheet-body.place-view button", { hasText: /^Endorsements$/ })
    .click();
  const result = await (await ask).json();
  const asked = result.answers;
  console.log(
    `Asked ${asked.length}, ${asked.filter((a) => a.yes).length} said yes`,
  );
  assert.ok(asked.length > 0, "nobody was asked");
  // The scene: one person per Continue, in the order asked, then the total.
  const said = [];
  for (let i = 0; i <= asked.length; i += 1) {
    await page.locator("#talk:visible").waitFor();
    await page.waitForTimeout(900);
    said.push({
      who: (await page.locator("#talk-name").innerText()).trim(),
      text: (await page.locator("#talk-lines").innerText()).trim(),
    });
    if (shots && i < 3)
      await page.screenshot({
        path: `${shots}/endorsements-${i + 1}-1440x900.png`,
      });
    if (i < asked.length) await page.locator("#talk-next").click();
  }
  for (const [at, answer] of asked.entries()) {
    assert.equal(said[at].text, answer.line, `ask ${at + 1}`);
    assert.equal(said[at].who, answer.name, `who ${at + 1}`);
    assert.ok(
      !/undefined|\{/.test(answer.line) && answer.line.includes(answer.name),
      answer.line,
    );
  }
  assert.match(
    said.at(-1).text,
    /^Endorsements/,
    "no total after the last ask",
  );
  assert.deepEqual(errors, []);
  console.log("endorsement meeting: pass");
} finally {
  await browser.close();
}
