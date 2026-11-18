/* global console, document, process, URLSearchParams, fetch */
// A debate's invitation is answered from the Campaign tab (the invitation
// scene was cut on Nov 17, #10011): Accept puts the sitting on the record and
// the director stages it; Decline lets the debate go on without the player.
// On the bench (npm run bench) at 1440x900: a grown resident in a drawn world
// files for the first office its records allow once filing opens, gathers the
// petition's signatures at the doors, and the world runs until an outlet
// invites them to the race's debate. The trail's Debate invitation tile then
// offers Accept and Decline; Accept, and the next days play the sitting.
// A draw where no outlet invites the player is passed over by name, six draws
// at most (skill drawn-place-tests). Screenshots go to the first argument.
//   BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/debate-accept.browser.mjs [shots dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { finishTalk } from "./start-life.mjs";
import { openCampaignTrail } from "./campaign-trail.mjs";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const [shots] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  shots ? page.screenshot({ path: `${shots}/${name}.png` }) : undefined;
const json = async (path, options) => {
  const r = options
    ? await page.request.post(`${base}${path}`, {
        timeout: 1800000,
        ...options,
      })
    : await page.request.get(`${base}${path}`, { timeout: 600000 });
  const body = await r.json().catch(() => ({}));
  assert.ok(r.ok(), `${path}: ${r.status()} ${JSON.stringify(body)}`);
  return body;
};
/** The page as a player comes back to it: Continue, and the card is drawn. */
async function backToPlay() {
  await page.reload();
  await page
    .locator("#front-continue")
    .click()
    .catch(() => {});
  await page.waitForFunction(() =>
    document.getElementById("card-name")?.textContent.trim(),
  );
  await finishTalk(page);
}
const log = (line) =>
  console.log(`${new Date().toISOString().slice(11, 19)} ${line}`);
const days = (from, to) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

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
  const passedOver = [];
  let found = null;
  for (let draw = 0; draw < 6 && !found; draw += 1) {
    const { seed } = await json("/api/seed");
    await json(`/api/newlife?${new URLSearchParams({ seed, person })}`, {});
    await backToPlay();
    const place = await page.locator("#card-place").innerText();
    const where = `${place} (seed ${seed})`;
    log(`draw ${draw}: ${where}`);
    const life = (await json("/api/title")).life;
    // The player's own local races (Elections): the one whose filing opens
    // soonest, among those the clerk would take from them once it opens.
    const localRaces = async () =>
      (await json("/api/government/local-races")).races ?? [];
    const race = (await localRaces())
      .filter(
        (r) =>
          !r.filingClosed && (r.bar === null || r.bar === "window-not-open"),
      )
      .sort((a, b) =>
        (a.filingOpens ?? "").localeCompare(b.filingOpens ?? ""),
      )[0];
    const wait = race?.filingOpens
      ? Math.max(0, days(life.date, race.filingOpens))
      : Infinity;
    if (wait > 730) {
      passedOver.push(
        `${where}: no local race of the player's to file for in two years`,
      );
      log(passedOver.at(-1));
      continue;
    }
    // Filing opens on its day: the world runs to it, as a player waits.
    log(`${race.title}: filing opens ${race.filingOpens} (${wait} days)`);
    if (wait > 0)
      await json("/api/dev/run-until", { data: { days: wait, cap: wait } });
    await backToPlay();
    const filed = await page.evaluate(async (race) => {
      for (const contestId of race.contestIds ?? [race.contestId]) {
        const r = await fetch(
          `/api/file?${new URLSearchParams({ contestId })}`,
          { method: "POST" },
        );
        const body = await r.json().catch(() => ({}));
        if (
          r.ok &&
          ["petitioning", "on-ballot"].includes(body.filing?.status ?? "")
        )
          return {
            contestId,
            filingId: body.filing.id,
            electionDate: race.electionDate,
          };
      }
      return null;
    }, race);
    if (!filed) {
      passedOver.push(
        `${where}: ${race.title} would not take the filing on ${race.filingOpens}`,
      );
      log(passedOver.at(-1));
      continue;
    }
    log(`filed ${filed.contestId}, election ${filed.electionDate}`);
    // The petition: a day at the doors at a time, as a candidate gathers it,
    // until it holds what the law asks or stops circulating.
    const campaign = async () =>
      (
        await json(`/api/campaign?id=${encodeURIComponent(life.personId)}`)
      ).campaigns?.find((c) => c.filing.id === filed.filingId);
    for (let day = 0; day < 90; day += 1) {
      const petition = (await campaign())?.petition;
      if (!petition || petition.signed >= petition.needed) break;
      await page.request.post(
        `${base}/api/campaign/day?${new URLSearchParams({ filingId: filed.filingId, kind: "canvass" })}`,
      );
      await json("/api/dev/run-until", { data: { days: 1, cap: 1 } });
    }
    const gathered = (await campaign())?.petition;
    log(`petition ${JSON.stringify(gathered ?? null)}`);
    if (gathered && gathered.signed < gathered.needed) {
      passedOver.push(
        `${where}: the petition held ${gathered.signed} of ${gathered.needed}`,
      );
      log(passedOver.at(-1));
      continue;
    }
    // The world runs until the outlet invites the player to the debate.
    const today = (await json("/api/title")).life.date;
    const toElection = days(today, filed.electionDate);
    if (toElection > 0)
      await json("/api/dev/run-until", {
        data: {
          kind: "debate-invited",
          person: life.personId,
          cap: toElection,
        },
      });
    const invited = (await campaign())?.debates?.[0];
    if (!invited) {
      const c = await campaign();
      passedOver.push(
        `${where}: ${filed.contestId} filed, ${c ? `filing ${c.filing.status}` : "no campaign"}, no debate invitation by ${(await json("/api/title")).life.date}`,
      );
      continue;
    }
    found = { where, filed, invited };
  }
  if (!found) {
    console.log(
      `No draw reached a debate invitation: ${passedOver.join("; ")}`,
    );
    process.exit(2);
  }
  const { where, invited } = found;
  console.log(
    `${where}: invited to ${invited.id} on ${invited.date}; passed over: ${passedOver.join("; ") || "none"}`,
  );
  await backToPlay();
  const words = (await (await fetch(`${base}/api/controls`)).json()).debate;
  const tile = async () => {
    await openCampaignTrail(page);
    await page
      .locator("#sheet-body .travel-tile", { hasText: words.title })
      .first()
      .click();
  };
  await tile();
  const accept = page.locator('[data-testid="debate-accept"]');
  await accept.waitFor();
  assert.ok(
    await page.locator('[data-testid="debate-decline"]').isVisible(),
    `${where}: no Decline beside Accept`,
  );
  await shot("1-invitation");
  await accept.click();
  await page.waitForTimeout(800);
  await tile();
  await page
    .locator("#sheet-body .campaign", { hasText: words.accepted })
    .first()
    .waitFor();
  assert.equal(await accept.count(), 0, `${where}: Accept still offered`);
  await shot("2-accepted");
  // The days go on: the director stages the sitting from the accepted record.
  let sat = false;
  for (let tries = 0; tries < 40 && !sat; tries += 1) {
    const talk = page.locator("#talk:not([hidden])");
    if (await talk.isVisible().catch(() => false)) {
      const text = await page.locator("#talk").innerText();
      if (tries < 6) await shot(`3-scene-${tries + 1}`);
      log(`SCENE ${tries + 1}:\n${text.slice(0, 600)}\n`);
      await finishTalk(page);
    } else {
      const resume = page.locator("#continue:not([hidden])");
      const close = page.locator("#sheet-close");
      if (await close.isVisible().catch(() => false)) await close.click();
      // A day at a time, as a player waits for the debate's day.
      if (await resume.isVisible().catch(() => false)) await resume.click();
      else await page.locator("#day").click();
      await page.waitForTimeout(1500);
    }
    const life = (await json("/api/title")).life;
    const left = (
      await json(`/api/campaign?id=${encodeURIComponent(life.personId)}`)
    ).campaigns
      .flatMap((c) => c.debates ?? [])
      .some((d) => d.id === invited.id);
    sat = !left;
    if (sat) log(`the debate was held by ${life.date}`);
  }
  assert.ok(
    sat,
    `${where}: the debate was still waiting after the days went on`,
  );
  assert.deepEqual(errors, [], `${where}: page errors`);
  console.log(
    `PASS ${where}: accepted from the Campaign tab and the debate was held`,
  );
} catch (error) {
  console.log("PAGE ERRORS", errors);
  await shot("stopped")?.catch(() => {});
  throw error;
} finally {
  await browser.close();
}
