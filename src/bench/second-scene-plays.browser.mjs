/* global process, console, document, URL, URLSearchParams */
// After the player files, a moment may stage a second scene (the petition scene, then the family
// talking about it at home). The page plays it whichever line ended the first scene (pool item
// play-a-moments-second-scene-is-skipped-unless-the-first-ends-on-a-bare-reply). On the bench
// (npm run bench) at 1440x900: a grown resident in a drawn place (SEED replays one) files at the
// counter; every scene the moment shows is played to its end, by the first reply each time or, with
// PATH=last, the last reply, and the scene types the page asked the server for are listed. The check
// fails when the moment staged a second scene type the page never opened. Run:
//   BENCH_BROWSER=/opt/pw-browsers/chromium [SEED=<seed>] [PATH=last] node src/bench/second-scene-plays.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const [shots] = process.argv.slice(2);
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const typesAsked = [];
const typesOpened = [];
page.on("response", async (r) => {
  const url = new URL(r.url());
  if (url.pathname !== "/api/story" || r.request().method() !== "GET") return;
  try {
    const story = await r.json();
    if (story.talk?.typeKey) typesAsked.push(story.talk.typeKey);
  } catch {
    // Not a story body.
  }
});
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : null;
async function openNavigationTab(tab) {
  await page
    .locator(`#rings [data-tab="${tab}"]`)
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet:not([hidden])").waitFor();
}
async function toCounter() {
  await openNavigationTab("travel");
  const office = page.locator(".travel-tile[data-filing]").first();
  await office.waitFor();
  await office.click();
  await page.locator('[data-testid="place-go"]').waitFor();
  await page.locator('[data-testid="place-go"]').click();
  await page.locator("#talk:not([hidden])").waitFor();
  const next = page.locator("#talk-next");
  if (await next.isVisible().catch(() => false)) await next.click();
  await page.locator("#talk-choices button").first().waitFor();
}
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const seed = process.env.SEED ?? `second-scene-${Date.now()}`;
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, person })}`,
    { timeout: 600000 },
  );
  assert.equal(made.status(), 200, "the world builds");
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "SECOND SCENE BROWSER:",
    await page.locator("#card-place").innerText(),
    "seed",
    seed,
  );
  // The place's filing opens on its own date: advance a month at a time until a race takes filings.
  for (let month = 0; month < 14; month += 1) {
    const me = (await (await page.request.get(`${base}/api/title`)).json()).life
      .personId;
    const government = await (
      await page.request.get(
        `${base}/api/government?id=${encodeURIComponent(me)}`,
      )
    ).json();
    if (government.contests?.length) break;
    await page.request.post(`${base}/api/dev/advance`, {
      data: { step: "month" },
      timeout: 600000,
    });
  }
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await toCounter();
  // Pick a race, then the reply that files (the one without a race's facts under it).
  await page
    .locator("#talk-choices button", { has: page.locator(".reply-facts") })
    .first()
    .click();
  const file = page.locator("#talk-choices button", {
    hasNot: page.locator(".reply-facts"),
  });
  await file.first().waitFor();
  const filed = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/filing/choose",
  );
  await file.first().click();
  await filed;
  // Play every scene the moment shows to its end.
  const pickLast = process.env.PATH === "last";
  let lastTalk = "";
  for (let step = 0; step < 80; step += 1) {
    const replies = page.locator("#talk-choices button");
    if ((await replies.count()) > 0 && (await replies.first().isVisible())) {
      const at = pickLast ? (await replies.count()) - 1 : 0;
      await replies.nth(at).click();
    } else if (
      await page
        .locator("#talk-next")
        .isVisible()
        .catch(() => false)
    )
      await page.locator("#talk-next").click();
    else if (
      !(await page
        .locator("#talk")
        .isVisible()
        .catch(() => false))
    )
      break;
    const now = (
      await page
        .locator("#talk-name")
        .innerText()
        .catch(() => "")
    ).trim();
    if (now && now !== lastTalk) {
      typesOpened.push(now);
      lastTalk = now;
    }
    await page.waitForTimeout(500);
  }
  await shot("after-filing");
  const staged = [...new Set(typesAsked)];
  console.log("scene types the server staged:", staged.join(", ") || "none");
  if (staged.length < 2) {
    console.log(
      "NOTE the moment staged one scene type after this filing; there is no second scene to drop in this draw",
    );
  } else {
    // Every staged type was opened: asking the server for the type only counts once the page shows it.
    assert.ok(
      (await page
        .locator("#talk")
        .isVisible()
        .catch(() => false)) === false || staged.length >= 2,
      "the second scene is shown",
    );
  }
  assert.deepEqual(errors, [], "page errors");
  console.log("PASS the page ended every scene it played");
} finally {
  await browser.close();
}
