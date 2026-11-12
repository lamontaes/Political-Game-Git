/* global console, document, process, URL, URLSearchParams, fetch */
// The player dossier is built from the shared parts in src/bench/ui/ (owner, Oct 26: one
// UI), and a grown resident files for the first office the records allow once its filing
// opens. Run against the bench (npm run bench) at 1440x900 in a drawn place. The speech and
// debate panels on the campaign trail are checked by debate-card.browser.mjs. Screenshots go to FOUR_SHOTS (default docs/reports/four-screens-2026-10-27).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk, playOpening } from "./start-life.mjs";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shots = process.env.FOUR_SHOTS ?? "docs/reports/four-screens-2026-10-27";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const settle = async () => {
  await page.waitForFunction(() =>
    [...document.querySelectorAll("img")].every((i) => i.complete),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
};
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  // A drawn world through New world: the opening plays, and the town's people are there.
  const life = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  // The opening plays first, as a player sees it (start-life.mjs).
  await playOpening(page, (await (await life).json()).sceneMomentId ?? null);
  const response = await life;
  assert.equal(response.status(), 200);
  console.log("Seed:", new URL(response.url()).searchParams.get("seed"));

  // The opening is a scene in the talk box now (the opening box was deleted Oct 28); the world
  // is ready when the player card has its name.
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());

  // The dossier: panel head, side figure and sections from the shared parts.
  const figure = page.locator("#here .busts-person.talkable").first();
  await figure.waitFor();
  await figure.focus();
  await page.keyboard.press("Enter");
  // The talk opens; the person's name in it opens their card.
  await page.locator("#talk:not([hidden])").waitFor();
  await page.locator("#talk-name").click();
  await page.locator("#person:not([hidden])").waitFor();
  await settle();
  assert.equal(
    await page.locator("#person .sheet-head #person-name").count(),
    1,
  );
  assert.equal(
    await page.locator("#person .sheet-head #person-close").count(),
    1,
  );
  assert.equal(await page.locator("#person .strip-screen").count(), 1);
  assert.equal(
    await page.locator(".dossier-detail, .dossier-media").count(),
    0,
  );
  assert.ok((await page.locator("#person-name").innerText()).trim());
  await page.screenshot({ path: `${shots}/dossier.png` });
  await page.locator("#person-close").click();

  // Campaigns: a grown resident (born 1980) in a drawn world files for the first office the
  // records allow, once that office's filing opens.
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  // Every game opens on the one start date (src/bench/handler.ts), so a town
  // whose filing window is not open that day has nothing to file for yet: the
  // world runs to the day its next filing opens (dev mode's run-until route,
  // which serves the world whether or not dev mode's panels are on), as a
  // player would wait for it. A draw with no filing in its first two years is
  // passed over by name, three draws at most (skill drawn-place-tests).
  const passedOver = [];
  let filed = null;
  for (let draw = 0; draw < 3 && !filed; draw += 1) {
    const campaignSeed = (
      await (await page.request.get(`${base}/api/seed`)).json()
    ).seed;
    const made = await page.request.post(
      `${base}/api/newlife?${new URLSearchParams({ seed: campaignSeed, person })}`,
      { timeout: 300000 },
    );
    assert.equal(made.status(), 200);
    await page.reload();
    await page.locator("#front-continue").waitFor();
    await page.locator("#front-continue").click();
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    const place = await page.locator("#card-place").innerText();
    console.log("Campaign seed:", campaignSeed, "place:", place);
    const life = (await (await page.request.get(`${base}/api/title`)).json())
      .life;
    const government = async () =>
      (
        await page.request.get(
          `${base}/api/government?${new URLSearchParams({ id: life.personId })}`,
        )
      ).json();
    const next = (await government()).nextFiling;
    const days = next
      ? Math.round(
          (Date.parse(next.filingOpens) - Date.parse(life.date)) / 86400000,
        )
      : Infinity;
    if (days > 730) {
      passedOver.push(
        `${place} (seed ${campaignSeed}): no filing in two years`,
      );
      console.log("Passed over:", passedOver.at(-1));
      continue;
    }
    if (days > 0) {
      const ran = await page.request.post(`${base}/api/dev/run-until`, {
        data: { days, cap: days },
        timeout: 1800000,
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
    }
    await finishTalk(page);
    const view = await government();
    console.log(
      "Filing opens:",
      next.filingOpens,
      next.title,
      "| clock:",
      (await page.locator("#card-clock").innerText()).replace(/\s+/g, " "),
      "| of voting age:",
      view.ofVotingAge,
    );
    filed = await page.evaluate(async (contests) => {
      for (const { contest } of contests) {
        const r = await fetch(
          `/api/file?${new URLSearchParams({ contestId: contest.id })}`,
          { method: "POST" },
        );
        const body = await r.json().catch(() => ({}));
        if (
          r.ok &&
          ["petitioning", "on-ballot"].includes(body.filing?.status ?? "")
        )
          return { id: contest.id, electionDate: contest.electionDate };
      }
      return null;
    }, view.contests ?? []);
    if (!filed) {
      passedOver.push(
        `${place} (seed ${campaignSeed}): ${view.contests?.length ?? 0} races open on ${next.filingOpens}, none would take the filing`,
      );
      console.log("Passed over:", passedOver.at(-1));
    }
  }
  assert.ok(
    filed,
    `the player could file for nothing in three draws: ${passedOver.join("; ")}`,
  );
  console.log("Filed:", filed.id, "election", filed.electionDate);
  // The debate and speech panels on the trail are checked by debate-card.browser.mjs.
  assert.deepEqual(errors, []);
  console.log("PASS dossier, and the player files in season");
} catch (error) {
  console.log("PAGE ERRORS", errors);
  throw error;
} finally {
  await browser.close();
}
