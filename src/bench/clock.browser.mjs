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
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
// Who the player is, from the new game the check makes.
let personId = "";
/**
 * Every story stop the clock holds is lived through, as a player would: a
 * scene that came up when Day landed (a moment of the night waits for the
 * morning, never midnight) is continued past, then the screen is reopened on
 * the clock as it stands.
 */
const settle = async () => {
  for (let i = 0; i < 50; i += 1) {
    const { packet } = await (
      await page.request.post(
        `${base}/api/play?${new URLSearchParams({ id: personId })}`,
        { timeout: 600000 },
      )
    ).json();
    if (process.env.CLOCK_DEBUG)
      console.log("settle:", packet?.kind, JSON.stringify(packet?.at));
    if (packet?.kind !== "stop") break;
    await page.request.post(
      `${base}/api/resume?${new URLSearchParams({ pauseId: packet.pauseId })}`,
      { timeout: 600000 },
    );
  }
  await page.reload();
  await titleEntriesShowOnlyTheirNames();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-clock").textContent.trim(),
  );
};
/**
 * The title menu (owner, Oct 27: "REMOVE. THE. MENU. SUBTITLES. DO NOT
 * REPLACE THEM"): every entry shows its name and nothing under it, Continue
 * included once a life is saved.
 */
const titleEntriesShowOnlyTheirNames = async () => {
  await page.waitForFunction(
    () => !document.getElementById("front-continue").disabled,
  );
  const extra = await page.evaluate(() =>
    [...document.querySelectorAll("#front-main .item")]
      .filter((item) => !item.hidden)
      .map((item) => ({
        name: item.querySelector("b")?.textContent.trim() ?? "",
        shown: item.innerText.replace(/\s+/g, " ").trim(),
      }))
      // The menu sets entries in capitals by style; the words are what count.
      .filter(({ name, shown }) => shown.toLowerCase() !== name.toLowerCase()),
  );
  assert.deepEqual(extra, [], "a title entry shows text beyond its name");
};
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
  const drawn = await (await page.request.get(`${base}/api/seed`)).json();
  // SEED replays a drawn world (a reviewer's failing seed).
  const seed = process.env.SEED || drawn.seed;
  const { date } = drawn;
  console.log("Seed:", seed, "date:", date);
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, date, person })}`,
    { timeout: 600000 },
  );
  assert.equal(made.status(), 200);
  personId = (await made.json()).personId;
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
    // A stop on the way, or a scene met as Day lands, is lived through.
    await settle();
    mornings.push(await clock());
  }
  console.log("Day:", mornings.join(" | "));
  if (shots) await page.screenshot({ path: `${shots}/morning.png` });
  for (const text of mornings)
    assert.ok(
      minutes(text) > 0 && minutes(text) < 12 * 60,
      `Day landed off the morning: ${text}`,
    );
  const dates = mornings.map((text) =>
    Date.parse(text.replace(/\s+\d+:\d+\s*(AM|PM)$/, "") + " UTC"),
  );
  assert.ok(dates.every(Number.isFinite), "both morning dates are readable");
  assert.equal(
    dates[1] - dates[0],
    24 * 60 * 60 * 1000,
    "Day advances one date",
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
      if (
        r.ok &&
        ["petitioning", "on-ballot"].includes(body.filing?.status ?? "")
      )
        return contest.id;
    }
    return null;
  });
  console.log("Filed for:", filed);
  assert.ok(filed, "the player could file for nothing in this town");
  if (!(await page.locator('[data-tab="politics"]:visible').count()))
    await page.locator('#rings [data-tab="calendar"]').click();
  await page.locator('[data-tab="politics"]:visible').first().click();
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
  // Whatever came up while filing is lived through before the outing.
  await settle();
  if (!(await page.locator('[data-tab="politics"]:visible').count()))
    await page.locator('#rings [data-tab="calendar"]').click();
  await page.locator('[data-tab="politics"]:visible').first().click();
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Campaigns", exact: true })
    .click();
  await doors.waitFor();
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
    // Every reply on screen is clear of the player card at both window
    // sizes: a pointer at its middle lands on it, and the keyboard reaches it.
    for (const size of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(600);
      const covered = await page.evaluate(() => {
        const dock = document.getElementById("dock").getBoundingClientRect();
        return [
          ...document.querySelectorAll(
            "#talk-choices button, #talk-gap, #talk-silent, #talk-leave",
          ),
        ]
          .filter((button) => button.offsetParent)
          .map((button) => {
            const box = button.getBoundingClientRect();
            const top = document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            );
            const overlaps =
              box.right > dock.left &&
              box.left < dock.right &&
              box.bottom > dock.top &&
              box.top < dock.bottom;
            return {
              text: button.innerText.trim(),
              overlaps,
              reached: button === top || button.contains(top),
              keyboard: button.tabIndex >= 0 && !button.disabled,
            };
          })
          .filter((row) => row.overlaps || !row.reached || !row.keyboard);
      });
      assert.deepEqual(
        covered,
        [],
        `${size.width}x${size.height}: a story reply is under the card or out of reach`,
      );
      if (shots)
        await page.screenshot({
          path: `${shots}/held-${size.width}x${size.height}.png`,
        });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(600);
    // The keyboard walks every response with Tab, and Enter on the story's
    // own reply answers it: no response is out of the keyboard's reach.
    const controls =
      "#talk-choices button:visible, #talk-gap:visible, #talk-silent:visible, #talk-leave:visible";
    const replies = await page.locator(controls).allInnerTexts();
    await page.locator(controls).first().focus();
    const reached = [];
    for (
      let i = 0;
      i < replies.length * 2 && reached.length < replies.length;
      i++
    ) {
      const text = await page.evaluate(() =>
        document.activeElement?.closest("#talk-choices, #talk .acts")
          ? document.activeElement.innerText.trim()
          : null,
      );
      if (text && !reached.includes(text)) reached.push(text);
      await page.keyboard.press("Tab");
    }
    assert.deepEqual(
      [...reached].sort(),
      replies.map((text) => text.trim()).sort(),
      "Tab reaches every reply",
    );
    const last = page.locator("#talk-choices button:visible").first();
    const answered = (await last.innerText()).trim();
    await last.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
    console.log(
      "Keyboard reached:",
      reached.join(" | "),
      "; Enter answered:",
      answered,
    );
  }
  // The scene lived through, the rest of the outing's hours are spent.
  await settle();
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
  console.log(
    "PASS Day lands on a morning; an outing spends its hours; the title shows only names",
  );
} finally {
  await browser.close();
}
