/* global process, URLSearchParams, console, document, fetch */
// The Campaigns screen after a month of campaigning, in a real browser: it
// says in plain words how many voters were reached, how many moved toward or
// away, who the opponents are and what a poll would cost. It must not show
// the old dev line ("Doors 172 · +105 · −67 · Retold 86 · +57 · −16").
// BENCH_PORT names the bench server, BENCH_BROWSER the browser; SHOT_NAME the
// screenshot file in docs/reports/race-line-2026-10-25/.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
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
  const seed =
    process.env.SEED ??
    (await (await page.request.get(`${base}/api/seed`)).json()).seed;
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, date: "2026-10-12", person })}`,
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
  // File for the first office the records let the player file for, then campaign a month.
  const run = await page.evaluate(async () => {
    const gov = await (await fetch("/api/government")).json();
    let filed = null;
    for (const { contest } of gov.contests ?? []) {
      const r = await fetch(
        `/api/file?${new URLSearchParams({ contestId: contest.id })}`,
        { method: "POST" },
      );
      const body = await r.json().catch(() => ({}));
      if (
        r.ok &&
        ["petitioning", "on-ballot"].includes(body.filing?.status ?? "")
      ) {
        filed = contest.id;
        break;
      }
    }
    if (!filed) return { filed };
    return { filed };
  });
  assert.ok(run.filed, "the player could file for nothing in this town");
  console.log("Filed for:", run.filed);
  // A month of campaigning: a day out knocking on doors, then the day goes on
  // (a moment that stops the clock is let go by); then on to the day after the
  // filing deadline, when the other candidates are on the ballot.
  const days = await page.evaluate(async (contestId) => {
    const post = async (path) =>
      (await fetch(path, { method: "POST" })).json().catch(() => ({}));
    const onward = async (path) => {
      let r = await post(path);
      for (let n = 0; n < 60 && r.packet?.kind === "stop"; n += 1)
        r = await post(
          `/api/resume?${new URLSearchParams({ pauseId: r.packet.pauseId })}`,
        );
      return r;
    };
    const personId = (await (await fetch("/api/title")).json()).life.personId;
    const view = await (
      await fetch(`/api/campaign?id=${encodeURIComponent(personId)}`)
    ).json();
    const filingId = view.campaigns[0].filing.id;
    let knocked = 0;
    for (let day = 0; day < 28; day += 1) {
      const r = await fetch(
        `/api/campaign/day?${new URLSearchParams({ filingId, kind: "canvass" })}`,
        { method: "POST" },
      );
      if (r.ok) knocked += 1;
      await onward("/api/advance?mode=day");
    }
    const gov = await (await fetch("/api/government")).json();
    const deadline = gov.contests.find((c) => c.contest.id === contestId)
      ?.contest.filingDeadline;
    if (deadline && deadline > gov.date) {
      const next = new Date(Date.parse(`${deadline}T12:00:00Z`) + 86400000)
        .toISOString()
        .slice(0, 10);
      for (let n = 0; n < 400; n += 1) {
        const r = await onward(`/api/advance?mode=calendar&date=${next}`);
        if (r.error || (r.packet?.at?.date ?? "") >= next) break;
      }
    }
    return knocked;
  }, run.filed);
  console.log("Days out knocking on doors:", days);
  assert.ok(days > 0, "the player knocked on no doors");
  await page.reload();
  await page.locator("#front-continue").waitFor();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Campaigns", exact: true })
    .click();
  await page.locator(".row.campaign").first().waitFor();
  await page.waitForTimeout(500);
  const text = await page.locator("#sheet-body").innerText();
  console.log("Campaigns screen text:\n" + text);
  await page.screenshot({
    path: `docs/reports/race-line-2026-10-25/${process.env.SHOT_NAME ?? "after"}.png`,
  });
  // Dev wording and bare signed numbers are out.
  assert.ok(!/Retold/.test(text), "the screen says 'Retold'");
  assert.ok(
    !/(^|[\s·])[+−-]\d+(\s|$)/m.test(text),
    "the screen shows a bare +N or −N",
  );
  assert.ok(!text.includes("undefined"));
  // Plain words: voters reached, voters moved, opponents by name, a poll's price.
  assert.match(
    text,
    /\b\d+ voters\b[^.]*\b(reached|heard)\b|\b(reached|heard)\b[^.]*\b\d+ voters\b/,
    "no sentence says how many voters were reached",
  );
  assert.match(
    text,
    /warmed|warmer/,
    "nothing says how many voters moved toward you",
  );
  assert.match(
    text,
    /cooled|cooler/,
    "nothing says how many voters moved away",
  );
  const others = await page.evaluate(async () => {
    const personId = (await (await fetch("/api/title")).json()).life.personId;
    const view = await (
      await fetch(`/api/campaign?id=${encodeURIComponent(personId)}`)
    ).json();
    return view.campaigns[0].standing;
  });
  assert.ok(
    Array.isArray(others) && others.length > 0,
    "the view carries no standing",
  );
  // The opponents on the contest's filings are each named; with none on
  // record, the screen says no one else has filed.
  const opponents = await page.evaluate(async () => {
    const personId = (await (await fetch("/api/title")).json()).life.personId;
    const view = await (
      await fetch(`/api/campaign?id=${encodeURIComponent(personId)}`)
    ).json();
    return view.campaigns[0].opponents;
  });
  console.log("Opponents on record:", opponents.join(", ") || "none");
  if (opponents.length) {
    assert.match(
      text,
      /\b(running against|opponents? (is|are)) [A-Z][a-z]+ [A-Z][a-z]+/,
      "nothing names the opponents",
    );
    for (const name of opponents)
      assert.ok(text.includes(name), `the screen does not name ${name}`);
  } else
    assert.match(
      text,
      /\b(No one else|Nobody else)\b[^.]*\b(filed|on the ballot)\b/,
      "nothing says no one else is running",
    );
  assert.match(
    text,
    /poll[^.]*\bcost[^.]*\$\d|\$\d[^.]*poll|cost\w* \$\d/i,
    "nothing says what a poll costs",
  );
  assert.deepEqual(errors, []);
  console.log("PASS the Campaigns screen says the race in plain words");
} finally {
  await browser.close();
}
