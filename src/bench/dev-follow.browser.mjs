/* global console, document, process, URL */
// Follow two residents in Dev mode, play a month with the calendar and read
// each one's kept decisions. Run against the bench; a fresh run draws a world
// from all 56 places and names its place and seed, a later run reuses it.
//   node src/bench/dev-follow.browser.mjs [screenshot folder]
// BENCH_FRESH=1 draws a new world even when there is a life to continue.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.BENCH_URL ?? "http://localhost:3000";
const shots = process.argv[2] ?? "test-results";
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  // A failed load names no address here; the response handler below does.
  if (m.type() === "error" && !m.text().startsWith("Failed to load resource"))
    errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().endsWith("/favicon.ico"))
    errors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
});
const get = async (path) => {
  const response = await page.request.get(`${base}${path}`);
  assert.equal(response.status(), 200, path);
  return response.json();
};
try {
  // 1. A new game with the Place field empty, then past the opening.
  const title = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/title",
  );
  await page.goto(`${base}/play`);
  await title;
  let seed = "(continued)";
  if (
    !process.env.BENCH_FRESH &&
    (await page.locator("#front-continue").isEnabled())
  )
    await page.locator("#front-continue").click();
  else {
    // "New world" draws the place from all 56; no place is typed or chosen.
    const life = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    const response = await life;
    assert.equal(response.status(), 200);
    seed = new URL(response.url()).searchParams.get("seed");
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const start = await get("/api/dev/state");
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "| Place:",
    start.placeName ?? start.placeId,
    "| Seed:",
    seed,
    "| World seed:",
    start.seed,
    "| Date:",
    start.date,
  );

  // 2. Dev mode: pick two residents who work and are not followed yet, the
  // most opposite in temperament, and follow them with real clicks.
  await page.goto(`${base}/dev`);
  await page.locator("#place:not(:empty)").waitFor();
  assert.equal(await page.locator("#seed").innerText(), start.seed);
  await page.locator('[data-tab="decisions"]').click();
  await page.locator("#people-table tr.item").first().waitFor();
  const people = (await get("/api/dev/people")).filter((p) => p.jobId);
  const traitsOf = async (id) =>
    (await get(`/api/dev/person?id=${encodeURIComponent(id)}`)).person.traits;
  // A continued world may already follow two residents; read those.
  const kept = (await get("/api/dev/following")).followed;
  const reused = kept.length >= 2;
  let pair;
  if (reused) {
    pair = [];
    for (const { view } of kept.slice(0, 2)) {
      const known = (await get("/api/dev/people")).find(
        (p) => p.id === view.personId,
      );
      pair.push({ ...known, traits: await traitsOf(view.personId) });
    }
  } else {
    const candidates = [];
    for (const p of people.slice(0, 40)) {
      const status = await get(
        `/api/dev/following?personId=${encodeURIComponent(p.id)}`,
      );
      if (status.status !== "none") continue;
      candidates.push({ ...p, traits: await traitsOf(p.id) });
      if (candidates.length >= 24) break;
    }
    assert.ok(candidates.length >= 2, "two residents who work, not yet kept");
    let widest = -1;
    const apart = (a, b) =>
      Object.keys(a.traits).reduce(
        (sum, k) => sum + Math.abs(a.traits[k] - (b.traits[k] ?? 0)),
        0,
      );
    for (let i = 0; i < candidates.length; i++)
      for (let j = i + 1; j < candidates.length; j++) {
        const gap = apart(candidates[i], candidates[j]);
        if (gap > widest) {
          widest = gap;
          pair = [candidates[i], candidates[j]];
        }
      }
  }
  const named = (p) => `${p.givenName} ${p.familyName}`;
  const widestTrait = Object.keys(pair[0].traits).sort(
    (k, l) =>
      Math.abs(pair[0].traits[l] - pair[1].traits[l]) -
      Math.abs(pair[0].traits[k] - pair[1].traits[k]),
  )[0];
  console.log(
    "Followed:",
    pair.map(named).join(" and "),
    `| widest trait ${widestTrait}:`,
    pair.map((p) => Math.round(p.traits[widestTrait] * 100) / 100).join(" vs "),
  );
  const beforeFollow = await get("/api/dev/state");
  for (const resident of reused ? [] : pair) {
    await page.locator("#person-filter").fill(resident.id);
    await page.locator("#people-table tr.item").first().click();
    await page
      .locator("#offers-name")
      .filter({ hasText: named(resident) })
      .waitFor();
    const bar = page.locator("#offers-follow");
    await bar.getByText("none", { exact: true }).waitFor();
    await bar.getByRole("button", { name: "Follow", exact: true }).click();
    await bar.getByText("dev-mode", { exact: true }).waitFor();
  }
  // Following spends no game time and writes no dev-mode record.
  const afterFollow = await get("/api/dev/state");
  assert.equal(afterFollow.date, beforeFollow.date);
  assert.deepEqual(afterFollow.marks, beforeFollow.marks);
  assert.ok((await page.locator("#followed .followed-one").count()) >= 2);
  if (!reused) {
    // Nothing is kept yet, and the panel says so.
    assert.ok(
      (await page.locator("#followed").innerText()).includes(
        "No act of this person has been kept",
      ),
    );
    console.log("PASS follow by pointer: two columns, no time spent, no mark");
  }

  // 3. Play a month with the calendar.
  await page.goto(`${base}/play`);
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-clock").textContent.trim(),
  );
  const target = new Date(`${beforeFollow.date}T00:00:00Z`);
  target.setUTCMonth(target.getUTCMonth() + 1);
  const targetDate = target.toISOString().slice(0, 10);
  // The world's date reads a day behind the player's clock at midnight.
  const reachedDate = new Date(target.getTime() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  // Stops the Continue button clears are continued past, as a player would.
  const clearStops = async () => {
    for (let tries = 0; await page.locator("#continue").isVisible(); tries++) {
      assert.ok(tries < 40, "stops cleared");
      const resumed = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/resume",
      );
      await page.locator("#continue").click();
      await resumed;
      await page.waitForTimeout(1000);
    }
  };
  for (let stops = 0; ; stops++) {
    const now = (await get("/api/dev/state")).date;
    if (now >= reachedDate) break;
    assert.ok(stops < 40, `a month played; stopped at ${now}`);
    await clearStops();
    await page
      .locator('[data-tab="calendar"]')
      .first()
      .evaluate((e) => e.click());
    await page.locator(".calendar-layout").waitFor();
    // Page to the month of the target, pick its day, and skip forward.
    for (let i = 0; i < 2; i++) {
      if (await page.locator(`.month .day[data-date="${targetDate}"]`).count())
        break;
      await page
        .getByRole("button", { name: "Next month", exact: true })
        .click();
    }
    await page.locator(`.month .day[data-date="${targetDate}"]`).click();
    const clockBefore = await page.locator("#card-clock").innerText();
    const skip = page.locator(".calendar-day .go-to-day");
    // No skip control means the player's day is not before that day yet.
    if (!(await skip.count())) {
      await page.keyboard.press("Escape");
      continue;
    }
    await skip.click();
    await page.waitForFunction(
      (before) =>
        document.getElementById("card-clock").innerText.trim() !== before ||
        !document.getElementById("continue")?.hidden,
      clockBefore,
    );
  }
  const end = await get("/api/dev/state");
  console.log("Played:", beforeFollow.date, "to", end.date);

  // 4. Read each resident's decisions, side by side.
  await page.goto(`${base}/dev`);
  await page.locator('[data-tab="decisions"]').click();
  await page.locator("#followed .followed-one").nth(1).waitFor();
  for (const resident of pair) {
    const column = page
      .locator("#followed .followed-one")
      .filter({ hasText: resident.id });
    await column.waitFor();
    const rows = column.locator(".kv .id.block");
    const count = await rows.count();
    assert.ok(count > 0, `${named(resident)} has decision rows`);
    const first = await rows.first().innerText();
    assert.match(first, /picked /);
    assert.match(first, /trait [+-]?\d/);
    // Each row's label names its act record; the row links it.
    const label = await column.locator(".kv").first().innerText();
    assert.match(label, /\d{4}-\d{2}-\d{2} picked \S+ \(act:/);
    console.log(
      `${named(resident)}: ${count} decision rows; newest: ${label.split("\n")[0]}`,
    );
  }
  assert.ok(
    !(await page.locator("#followed").innerText()).includes("undefined"),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#followed-box").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/decisions-side-by-side.png` });
  await page
    .locator("#followed-box")
    .screenshot({ path: `${shots}/decisions-side-by-side-panels.png` });

  // The same panel sits beside the ledger on the resident's trace node.
  await page.locator('[data-tab="trace"]').click();
  await page.locator("#trace-id").fill(pair[0].id);
  await page.locator("#trace-go").click();
  const traced = page.locator("#trace-result");
  await traced
    .getByText(`${named(pair[0])}: decisions`, { exact: true })
    .waitFor();
  assert.ok(
    await traced.getByText(`${named(pair[0])}: the year to`).count(),
    "the ledger is still there",
  );
  await page.screenshot({ path: `${shots}/trace-person-decisions.png` });
  // An act id opens the act record in the trace; keyboard Stop following.
  await traced.locator(".kv .id.block").first().click();
  await page.locator("#trace-chain").filter({ hasText: "act:" }).waitFor();
  await page.locator('[data-tab="decisions"]').click();
  const lead = page
    .locator("#followed .followed-one")
    .filter({ hasText: pair[1].id });
  const stop = lead.getByRole("button", {
    name: "Stop following",
    exact: true,
  });
  const followedBefore = await page.locator("#followed .followed-one").count();
  await stop.focus();
  await page.keyboard.press("Enter");
  await lead.waitFor({ state: "detached" });
  assert.equal(
    await page.locator("#followed .followed-one").count(),
    followedBefore - 1,
  );
  assert.equal(
    (await get(`/api/dev/following?personId=${encodeURIComponent(pair[1].id)}`))
      .status,
    "none",
  );
  // A resident who stopped being followed keeps their old rows and says new
  // acts keep no reasons; one never followed has no rows, only that line.
  await page.locator('[data-tab="trace"]').click();
  await page.locator("#trace-id").fill(pair[1].id);
  await page.locator("#trace-go").click();
  await traced
    .getByText("keep no reasons until followed", { exact: false })
    .first()
    .waitFor();
  let stranger;
  for (const p of people) {
    if (pair.some((q) => q.id === p.id)) continue;
    const status = await get(
      `/api/dev/following?personId=${encodeURIComponent(p.id)}`,
    );
    if (status.status === "none") {
      stranger = p;
      break;
    }
  }
  assert.ok(stranger, "a resident nobody follows");
  await page.locator("#trace-id").fill(stranger.id);
  await page.locator("#trace-go").click();
  await traced
    .getByText(`${named(stranger)}: decisions`, { exact: true })
    .waitFor();
  await traced
    .getByText("keep no reasons until followed", { exact: false })
    .first()
    .waitFor();
  assert.equal(await traced.locator(".kv .id.block").count(), 0);
  await page.screenshot({ path: `${shots}/trace-person-unfollowed.png` });
  assert.deepEqual(errors, []);
  console.log(
    "PASS two residents followed, a month played, decision rows by act record id with trait reasons, panel beside the ledger, keyboard stop, gap line for an unfollowed resident",
  );
} catch (error) {
  // A failed run keeps what the page showed when it stopped.
  await page.screenshot({ path: `${shots}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
