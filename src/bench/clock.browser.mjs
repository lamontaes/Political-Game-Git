/* global process, console, document, URL, URLSearchParams, fetch */
// The player's clock in a real browser, on the bench (npm run bench): a grown
// resident of a place drawn from all 56. Day lands on the next morning, never
// on midnight, and a campaign outing moves the card's clock by its hours.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shots = process.env.CLOCK_SHOTS;
const clock = async () =>
  (await page.locator("#card-clock").innerText()).replace(/\s+/g, " ").trim();
const minutes = (text) => {
  const [, h, m, ap] = text.match(/(\d+):(\d+)\s*(AM|PM)$/);
  return ((Number(h) % 12) + (ap === "PM" ? 12 : 0)) * 60 + Number(m);
};
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
  const { seed, date } = await (
    await page.request.get("http://localhost:3000/api/seed")
  ).json();
  console.log("Seed:", seed, "date:", date);
  const made = await page.request.post(
    `http://localhost:3000/api/newlife?${new URLSearchParams({ seed, date, person })}`,
    { timeout: 600000 },
  );
  assert.equal(made.status(), 200);
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  // Day, twice: each lands on a morning, the second a day after the first.
  const mornings = [];
  for (let i = 0; i < 2; i++) {
    await page.locator("#day").click();
    await page.waitForFunction(() => !document.getElementById("day").disabled);
    // A stop on the way is answered by Continue, as a player would.
    while (await page.locator("#continue").isVisible()) {
      await page.locator("#continue").click();
      await page.waitForTimeout(500);
    }
    mornings.push(await clock());
  }
  console.log("Day:", mornings.join(" | "));
  if (shots) await page.screenshot({ path: `${shots}/morning.png` });
  for (const text of mornings)
    assert.ok(
      minutes(text) > 0 && minutes(text) < 12 * 60,
      `Day landed off the morning: ${text}`,
    );
  // File, then go out knocking on doors: the card's clock moves by the hours.
  const filed = await page.evaluate(async () => {
    const gov = await (await fetch("/api/government")).json();
    for (const { contest } of gov.contests ?? []) {
      const r = await fetch(
        `/api/file?${new URLSearchParams({ contestId: contest.id })}`,
        { method: "POST" },
      );
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.filing?.status === "on-ballot") return contest.id;
    }
    return null;
  });
  console.log("Filed for:", filed);
  assert.ok(filed, "the player could file for nothing in this town");
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Campaigns", exact: true })
    .click();
  const doors = page
    .locator(".row.campaign button", { hasText: "Knock on doors" })
    .first();
  await doors.waitFor();
  const label = await doors.innerText();
  const hours = Number(label.match(/(\d+)\s*hours?/)[1]);
  const before = await clock();
  const day = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/campaign/day",
  );
  await doors.click();
  const result = await (await day).json();
  await page.waitForTimeout(800);
  // Something that happened on the way (the filing's own moment) is answered
  // by Continue; the outing's hours are then spent.
  if (await page.locator("#continue").isVisible()) {
    // What holds the clock is shown in words, never an empty box.
    const said = await page.locator("#talk-lines").innerText();
    console.log("Held by:", said.replace(/\s+/g, " ").trim());
    assert.ok(said.trim(), "a stop after the outing shows nothing");
    if (shots) await page.screenshot({ path: `${shots}/held.png` });
  }
  while (await page.locator("#continue").isVisible()) {
    await page.locator("#continue").click();
    await page.waitForTimeout(800);
  }
  const after = await clock();
  console.log(
    "Outing:",
    label,
    "|",
    before,
    "->",
    after,
    JSON.stringify({
      kind: result.packet?.kind,
      at: result.packet?.at,
      hours: result.hours,
      stop: result.packet?.stop?.modules?.map((m) => [
        m.moduleId,
        m.reasonKey,
        m.recordId,
      ]),
      work: result.packet?.stop?.work?.reasons?.[0],
    }),
  );
  assert.ok(result.packet, "the outing moved no clock");
  assert.equal(
    minutes(after) - minutes(before),
    hours * 60,
    "the card's clock did not move by the outing's hours",
  );
  if (shots) await page.screenshot({ path: `${shots}/after-doors.png` });
  assert.deepEqual(errors, []);
  console.log("PASS Day lands on a morning; an outing spends its hours");
} finally {
  await browser.close();
}
