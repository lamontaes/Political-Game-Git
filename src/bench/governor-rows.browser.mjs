/* global process, console, document, fetch, URL, URLSearchParams */
// Election night's governor races, in a real browser on the bench (npm run
// bench): a life in a drawn world (GOV_SEED, else a fresh one) plays to the
// November 2026 general election, votes the ballot through the polling
// place, and opens election night. After the call, the governor races
// elsewhere have their own page; at 1440x900, 1280x800 and 1024x768 every
// row sits inside the panel and nothing scrolls (Lane 4, path 13: "every
// governor row reachable"). GOV_SHOTS saves a picture per size.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";

const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const seed = process.env.GOV_SEED ?? `governor-rows-${Date.now()}`;
const shots = process.env.GOV_SHOTS;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/play`);
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#seed").fill(seed);
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-world").click();
  await playOpening(page, (await (await made).json()).sceneMomentId ?? null);
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  const place = await page.locator("#card-place").innerText();
  console.log(`Seed: ${seed} Place: ${place}`);
  // Play on, a week at a time and a day at a time from late October, voting
  // the whole ballot for its first names at the polls, until election night
  // of November 2026 is the player's.
  const reached = await page.evaluate(
    async (id) => {
      const get = async (path) => (await fetch(path)).json();
      const post = async (path) =>
        (await fetch(path, { method: "POST" })).json();
      const advance = async (mode) => {
        let res = await fetch(`/api/advance?mode=${mode}`, { method: "POST" });
        let body = await res.json();
        for (
          let stops = 0;
          res.ok &&
          body.packet &&
          !["complete", "choice"].includes(body.packet.kind) &&
          stops < 50;
          stops += 1
        ) {
          res = await fetch(
            `/api/resume?${new URLSearchParams({ pauseId: body.packet.pauseId ?? "" })}`,
            { method: "POST" },
          );
          body = await res.json();
        }
      };
      for (let turn = 0; turn < 400; turn += 1) {
        const date = (await get("/api/title")).life?.date ?? "";
        if (date > "2026-11-20") return { date, night: false };
        let polls = await get("/api/polling-place");
        while (polls) {
          const open = polls.contests.find((c) => !c.marked);
          if (!open) {
            await post("/api/polling-place/leave");
            break;
          }
          const marked = await post(
            `/api/polling-place/mark?${new URLSearchParams({
              contestId: open.id,
              candidateId: open.candidates[0]?.personId ?? "",
            })}`,
          );
          polls = marked.pollingPlace;
        }
        if (await get(`/api/election-night?id=${encodeURIComponent(id)}`))
          return { date, night: true };
        await advance(date >= "2026-10-28" ? "day" : "week");
      }
      return { date: null, night: false };
    },
    await page.evaluate(
      async () =>
        (await (await fetch("/api/title")).json()).life?.personId ?? "",
    ),
  );
  console.log("Reached:", JSON.stringify(reached));
  assert.ok(reached.night, `${place}: no election night of the player's`);
  // The page shows the night on its next load.
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.reload();
  await title;
  await page.locator("#front-continue").click();
  await page.locator("#returns:not([hidden])").waitFor();
  // Step through the returns and the call to the nation's page.
  for (let step = 0; step < 200; step += 1) {
    if (await page.locator("#returns.nation").count()) break;
    const label = (await page.locator("#returns-next").innerText()).trim();
    assert.ok(step === 0 || label, "the returns have no next step");
    await page.locator("#returns-next").click();
  }
  assert.equal(
    await page.locator("#returns.nation").count(),
    1,
    `${place}: no governor races that night`,
  );
  const shown = await page.locator("#returns-count .row").count();
  console.log("Governor rows:", shown);
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    const fit = await page.evaluate(() => {
      const panel = document.getElementById("returns").getBoundingClientRect();
      const rows = [...document.querySelectorAll("#returns-count .row")].map(
        (row) => row.getBoundingClientRect(),
      );
      const count = document.getElementById("returns-count");
      return {
        outside: rows.filter(
          (r) =>
            r.bottom > panel.bottom + 0.5 ||
            r.right > panel.right + 0.5 ||
            r.top < panel.top - 0.5,
        ).length,
        scrolls: count.scrollHeight > count.clientHeight + 1,
        wrapped: rows.filter((r) => r.height > 24).length,
        clipped: [...document.querySelectorAll("#returns-count .row")].filter(
          (row) => row.scrollWidth > row.clientWidth + 1,
        ).length,
        next:
          document.getElementById("returns-next").getBoundingClientRect()
            .bottom <=
          panel.bottom + 0.5,
      };
    });
    console.log(`${width}x${height}`, JSON.stringify(fit));
    assert.equal(fit.outside, 0, `${width}x${height}: rows past the panel`);
    assert.ok(!fit.scrolls, `${width}x${height}: the rows scroll`);
    assert.equal(fit.wrapped, 0, `${width}x${height}: a row wraps`);
    assert.equal(fit.clipped, 0, `${width}x${height}: a row runs over`);
    assert.ok(fit.next, `${width}x${height}: Close is past the panel`);
    if (shots)
      await page.screenshot({ path: `${shots}/governors-${width}.png` });
  }
  assert.deepEqual(errors, []);
  console.log("PASS every governor row sits in the panel at three sizes");
} finally {
  await browser.close();
}
