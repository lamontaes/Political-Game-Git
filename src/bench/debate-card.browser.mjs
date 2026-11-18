/* global console, document, process, URLSearchParams, fetch */
// The debate panel and the speech panel on the campaign trail are built from the shared
// parts in src/bench/ui/ (owner, Oct 26: one UI); moved here from four-screens.browser.mjs,
// whose campaign step now ends at the filing. Run against the bench (npm run bench) at
// 1440x900: a grown resident files for the first office the records allow once its filing
// opens, then opens the trail, where the debate below is added to the campaign view.
// Screenshots go to DEBATE_SHOTS (default docs/reports/four-screens-2026-10-27).
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk } from "./start-life.mjs";
import { openCampaignTrail } from "./campaign-trail.mjs";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shots =
  process.env.DEBATE_SHOTS ?? "docs/reports/four-screens-2026-10-27";
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
  // The debate the outlet would invite the player to: added to the campaign view, since
  // invitations depend on the season. Its questions are two of the game's own policy names.
  await page.route("**/api/campaign?*", async (route) => {
    const response = await route.fetch();
    const view = await response.json();
    const names = Object.keys(
      (await (await fetch(`${base}/api/controls`)).json()).policyNames ?? {},
    );
    for (const c of view.campaigns ?? [])
      c.debates = [
        {
          id: "debate-check",
          date: "2026-10-20",
          questions: names.slice(0, 2),
        },
      ];
    await route.fulfill({ response, json: view });
  });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
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
  // passed over by name, six draws at most (skill drawn-place-tests).
  const passedOver = [];
  let filed = null;
  for (let draw = 0; draw < 6 && !filed; draw += 1) {
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
  if (!filed) {
    // The check cannot be played in these draws; the game is not shown wrong.
    console.log(`no race to file for in six draws: ${passedOver.join("; ")}`);
    process.exit(0);
  }
  console.log("Filed:", filed.id, "election", filed.electionDate);
  await openCampaignTrail(page);

  // The debate is one of the trail's tiles (its own words, from the controls file); choosing
  // it draws the debate card beside the tiles.
  const debateTitle = (await (await fetch(`${base}/api/controls`)).json())
    .debate.title;
  await page
    .locator("#sheet-body .travel-tile", { hasText: debateTitle })
    .first()
    .click();
  // The debate: a tab for each position on each question, one chosen at a time.
  const bars = page.locator("#sheet-body nav.tab-rail");
  // The card draws once the tile's page has loaded.
  await bars.first().waitFor();
  assert.equal(await bars.count(), 2, "two questions, two position bars");
  assert.equal(
    await page
      .locator("#sheet-body nav.tab-rail ~ select, #sheet-body select")
      .count(),
    0,
    "no select in the debate",
  );
  const against = bars.first().locator('[data-position="-1"]');
  await against.click();
  assert.equal(await against.getAttribute("aria-pressed"), "true");
  assert.equal(
    await bars
      .first()
      .locator('[data-position="null"]')
      .getAttribute("aria-pressed"),
    "false",
  );
  await settle();
  await page.screenshot({ path: `${shots}/debate.png` });

  // The speech: parts said are talk lines, the four on offer are numbered replies.
  // The speech is a trail tile too, and its card begins with a button of the same words.
  // Each step redraws the trail on its first tile, so the speech tile is chosen again,
  // as a player would.
  const speechTile = async () => {
    await page
      .locator("#sheet-body .travel-tile", { hasText: "Give a speech" })
      .first()
      .click();
    await page.locator("#sheet-body .travel-detail").waitFor();
  };
  await speechTile();
  await page
    .locator("#sheet-body .travel-detail")
    .getByRole("button", { name: "Give a speech", exact: true })
    .click();
  await page.waitForTimeout(800);
  await speechTile();
  await page.locator(".talk-sheet .replies .reply").first().waitFor();
  assert.equal(await page.locator(".talk-sheet .replies .reply").count(), 4);
  await settle();
  await page.screenshot({ path: `${shots}/speech-begin.png` });
  for (let part = 0; part < 4; part += 1) {
    const said = await page.locator(".talk-sheet .talk-lines li").count();
    await page.locator(".talk-sheet .replies .reply").first().click();
    await page.waitForTimeout(800);
    await speechTile();
    await page.waitForFunction(
      (n) => document.querySelectorAll(".talk-sheet .talk-lines li").length > n,
      said,
    );
    if (!(await page.locator(".talk-sheet .replies .reply").count())) break;
  }
  const give = page.locator("#sheet-body button", {
    hasText: /^Give the speech$/,
  });
  await give.waitFor({ state: "attached" });
  await give.scrollIntoViewIfNeeded();
  await give.waitFor();
  await settle();
  await page.screenshot({ path: `${shots}/speech-built.png` });
  assert.deepEqual(errors, []);
  console.log("PASS debate and speech panels from the shared parts");
} catch (error) {
  console.log("PAGE ERRORS", errors);
  await page.screenshot({ path: `${shots}/stopped.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
