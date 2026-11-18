/* global process, URL, console, document, fetch */
// A fee bill as a player meets it (pull request #9308): the Fees and charges list on the draft card, one drafted
// fee bill and its paper. Writes what the screen says. Run on a fresh bench: node scripts/play-walks/fee-bill.mjs <out-dir>
// The bill screens (owner, Oct 29: "the layout of all those bill screens needs to be adjusted"):
// a member of a body drafts a law amount on the draft card, which shows what is in force today
// beside the new amount, and reads the bill, whose estimate shows today's amount beside the new one.
// Builds a world with the Advanced start (a place drawn from the seed) and steps in as a
// member of a body. BENCH_SEED replays a world; SHOTS_DIR saves the screens.
// Run against a fresh bench: node src/bench/meeting.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { clockOf, closeMenu, playTalk } from "./lib.mjs";
const lines = [];
const say = (...a) => {
  const l = a
    .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
    .join(" ");
  lines.push(l);
  console.log(l);
};
const prefix = process.env.FEE_PREFIX ?? "series:fee-level:";
const SHOTS = process.argv[2] ?? process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const visible = (id) =>
  page
    .locator(`#${id}`)
    .isVisible()
    .catch(() => false);
try {
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
      return route.continue({ url: url.toString() });
    });
  // A place can have no body to step in as (a seat of one executive); take a new draw and name it.
  let seed = "";
  let names = [];
  let at = -1;
  for (let attempt = 1; attempt <= 5 && at < 0; attempt += 1) {
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    await ready;
    await page.locator("#new-life").click();
    const built = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#new-advanced").click();
    await page.locator("#front-advanced:not([hidden])").waitFor();
    await page.locator("#advanced-build").click();
    seed = new URL((await built).url()).searchParams.get("seed");
    await page.locator("#front-pick:not([hidden])").waitFor();
    names = await page.locator("#pick-list button").allInnerTexts();
    // FEE_BODY names another kind of seat to step in as (a state legislator, to reach the state's own fees).
    at = names.findIndex((t) =>
      new RegExp(
        process.env.FEE_BODY ??
          "council|commissioner|alderm|trustee|supervisor|selectm",
        "i",
      ).test(t),
    );
    if (at < 0) say("Seats offered:", names);
    if (at < 0)
      say(`unusable draw ${attempt}: seed ${seed}, no member of a body`);
  }
  assert.ok(at >= 0, "no member of a body to step in as in five draws");
  await page.locator("#pick-list button").nth(at).click();
  await page.locator("#pick-play").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  say(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
    "Player:",
    names[at],
  );
  for (let i = 0; i < 20; i += 1) {
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(1200);
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Your office" })
    .click();
  await page.locator(".office-board").waitFor();
  await page.locator('.office-board [data-act="write-a-bill"]').first().click();
  await page.locator(".draft-card .pick").first().waitFor();
  const fees = await page.evaluate(
    (prefix) =>
      [...document.querySelectorAll(".draft-card .pick")]
        .filter((o) => o.dataset.value.startsWith(prefix))
        .map(
          (o) => o.dataset.value + " | " + o.textContent.replace(/\s+/g, " "),
        ),
    prefix,
  );
  say("Fee lines offered on the draft card:", fees);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/draft-card-list.png` });
  if (process.env.FEE_PROBE) {
    say("Place:", seed);
    await browser.close();
    process.exit(0);
  }
  if (fees.length) {
    const value = (
      fees.find((f) => f.includes(process.env.FEE_SERIES ?? "")) ?? fees[0]
    ).split(" | ")[0];
    await page.locator(`.draft-card .pick[data-value="${value}"]`).click();
    await page.waitForTimeout(200);
    say(
      "Card for the first fee:",
      await page.evaluate(() => ({
        today: document.querySelector(".draft-today")?.textContent,
        unit: document.querySelector(".draft-unit")?.textContent,
      })),
    );
    // Every level the paper can say, typed one by one: the words under the box for each.
    for (const typed of (process.env.FEE_LEVELS ?? "150").split(",")) {
      await page.locator(".draft-card .draft-step input").first().fill(typed);
      say(
        `Under the box as ${typed} is typed:`,
        (await page.locator(".draft-live").count())
          ? await page.locator(".draft-live").innerText()
          : "(no live words on this card)",
      );
    }
    await page
      .locator(".draft-card .draft-step input")
      .first()
      .fill(process.env.FEE_AMOUNT ?? "150");
    // FEE_RISE=percent,years,firstDate drafts the fee as a phase-in by a percent a year.
    if (process.env.FEE_RISE) {
      const [percent, years, first] = process.env.FEE_RISE.split(",");
      await page.locator(".draft-rise-toggle").click();
      const boxes = page.locator(".draft-rise input");
      await boxes.nth(0).fill(percent);
      await boxes.nth(1).fill(years);
      await boxes.nth(2).fill(first);
      say(
        "Rise drafting card:",
        await page
          .locator(".draft-card")
          .innerText()
          .then((t) => t.replace(/\s+/g, " ").slice(0, 600)),
      );
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/draft-card-fee.png` });
    await page
      .locator(".draft-card button", { hasText: /^Draft$/ })
      .first()
      .click();
    await page.waitForTimeout(2500);
    // A bill in a state's chamber has no meeting for the player to sit through; FEE_HOLD runs its floor by dev
    // mode's own hold-vote route (the legislation-screens skill), then the walk reads the result on the paper.
    const asked = page.waitForRequest((r) =>
      r.url().includes("/api/bill?billId="),
    );
    await page
      .locator("#sheet-body button", { hasText: /Read the bill/ })
      .first()
      .click();
    const billId = new URL((await asked).url()).searchParams.get("billId");
    await page.waitForTimeout(1500);
    say(
      "Bill paper:",
      (await page.locator("#sheet-body").innerText())
        .replace(/\s+/g, " ")
        .slice(0, 2400),
    );
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/fee-bill-paper.png` });
    if (process.env.FEE_HOLD) {
      const held = await page.evaluate(async (id) => {
        const r = await fetch("/api/dev/hold-vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ billId: id }),
        });
        return r.status;
      }, billId);
      say("dev mode holds the floor vote:", held);
      say(
        "Stage right after the held vote:",
        await page.evaluate(async (id) => {
          const r = await fetch(`/api/bill/stage?billId=${id}`);
          return (await r.text()).slice(0, 1800);
        }, billId),
      );
      await page.locator('#sheet-tabs .tab[aria-pressed="true"]').click();
      await page.waitForTimeout(800);
      await page
        .locator("#sheet-body button", { hasText: /Read the bill/ })
        .first()
        .click();
      await page.locator(".stage-chamber").first().waitFor();
      say(
        "Floor result on the paper:",
        await page.evaluate(() =>
          [...document.querySelectorAll(".stage-chamber")].map((n) =>
            n.innerText.replace(/\s+/g, " "),
          ),
        ),
      );
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/fee-bill-floor.png` });
    }
    // The vote, by the game's own path: close the menu and press Day; the body meets, the bill is read, the player votes Yes.
    await closeMenu(page);
    const walk = {
      page,
      say,
      snap: (n) =>
        SHOTS ? page.screenshot({ path: `${SHOTS}/${n}.png` }) : null,
    };
    const shown = (id) =>
      page
        .locator(`#${id}`)
        .isVisible()
        .catch(() => false);
    let voted = false;
    const playDays = async (most, stopWhenVoted) => {
      for (let day = 1; day <= most && !(stopWhenVoted && voted); day += 1) {
        if (!(await page.locator("#day").isVisible())) break;
        await page.locator("#day").click();
        const pressed = new Map();
        for (let step = 0; step < 200; step += 1) {
          await page.waitForTimeout(600);
          if (await shown("talk")) {
            await playTalk(walk, "scene", { picture: false });
            continue;
          }
          if (await shown("meeting")) {
            const buttons = page.locator("#meeting button:not([disabled])");
            const labels = (await buttons.allInnerTexts()).map((t) =>
              t.replace(/\n+/g, " ").trim(),
            );
            say(
              `[${await clockOf(page)}] meeting buttons: ${labels.join(" | ")}`,
            );
            const wanted = [
              "Back to the meeting",
              ...(pressed.has("Read the bill") ? [] : ["Read the bill"]),
              "Yes",
              "Adjourn",
            ]
              .map((l) => labels.indexOf(l))
              .find((f) => f >= 0);
            const at = wanted === undefined ? 0 : wanted;
            const label = labels[at];
            if ((pressed.get(label) ?? 0) >= 4) break;
            pressed.set(label, (pressed.get(label) ?? 0) + 1);
            if (label === "Yes") voted = true;
            say(`    presses: ${label}`);
            if (label === "Yes" && SHOTS)
              await page.screenshot({ path: `${SHOTS}/meeting-vote.png` });
            await buttons
              .nth(at)
              .click()
              .catch(() => {});
            continue;
          }
          if (await shown("continue")) {
            await page
              .locator("#continue")
              .click({ timeout: 3000 })
              .catch(() => {});
            continue;
          }
          // A State chamber stops the clock for the player's vote on a member's bill (a card with Yes, No, Abstain).
          const asked = page.getByRole("button", { name: "Yes", exact: true });
          if (
            await asked
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            say(`[${await clockOf(page)}] floor vote card: pressing Yes`);
            await asked
              .first()
              .click({ timeout: 3000 })
              .catch(() => {});
            continue;
          }
          if (!(await page.locator("#day").isDisabled())) break;
        }
      }
    };
    // The sheet's close button can be mid-animation for a State chamber's bill; click it as the page does.
    const shutMenu = async () => {
      await page
        .locator("#sheet-close")
        .evaluate((e) => e.click())
        .catch(() => {});
      await page.waitForTimeout(600);
    };
    // A scene the game stages on the last day (a member recognized on another bill) covers the rings until it is
    // answered; a player closes it, so the walk does the same, then opens the tab the way the start of the walk does.
    const openPolitics = async () => {
      for (let i = 0; i < 40; i += 1) {
        if (await shown("talk")) {
          await playTalk(walk, "scene", { picture: false });
          continue;
        }
        if (await shown("continue")) {
          await page
            .locator("#continue")
            .click({ timeout: 3000 })
            .catch(() => {});
          continue;
        }
        break;
      }
      await page
        .locator('#rings [data-tab="politics"]')
        .first()
        .evaluate((e) => e.click());
      await page.waitForTimeout(1200);
    };
    await playDays(60, true);
    say("voted at the meeting:", voted);
    // Where the days stopped: every button a player could press, and the clock.
    say(
      "Buttons on screen when the days stopped:",
      await page.evaluate(() =>
        [...document.querySelectorAll("button")]
          .filter((b) => b.offsetParent !== null && !b.disabled)
          .map(
            (b) =>
              `${b.id || b.className}: ${b.textContent.trim().slice(0, 40)}`,
          )
          .slice(0, 40),
      ),
    );
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/days-stopped.png` });
    // The law takes effect the day after; press Day for five weeks, then read the fee list again.
    await playDays(Number(process.env.FEE_LATER_DAYS ?? 35), false);
    say(
      "Buttons on screen after the later days:",
      await page.evaluate(() =>
        [...document.querySelectorAll("button")]
          .filter((b) => b.offsetParent !== null)
          .map(
            (b) =>
              `${b.id || b.className}${b.disabled ? " (disabled)" : ""}: ${b.textContent.trim().slice(0, 40)}`,
          )
          .slice(0, 40),
      ),
    );
    say("Clock:", await clockOf(page));
    if (SHOTS)
      await page.screenshot({ path: `${SHOTS}/later-days-stopped.png` });
    // What the bill's floor did by the game's own days (no dev route): its stage, read from the one stage view.
    say(
      "Stage of the bill after the days:",
      await page.evaluate(async (id) => {
        const r = await fetch(`/api/bill/stage?billId=${id}`);
        return (await r.text()).slice(0, 1500);
      }, billId),
    );
    await openPolitics();
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: "Your office" })
      .click();
    await page.locator(".office-board").waitFor();
    await page
      .locator('.office-board [data-act="write-a-bill"]')
      .first()
      .click();
    await page.locator(".draft-card .pick").first().waitFor();
    say(
      "Fee lines after the law took effect:",
      await page.evaluate(
        (prefix) =>
          [...document.querySelectorAll(".draft-card .pick")]
            .filter((o) => o.dataset.value.startsWith(prefix))
            .map((o) => o.textContent.replace(/\s+/g, " ")),
        prefix,
      ),
    );
    await shutMenu();
    await page.waitForTimeout(1000);
    // The law in force, as the Government tab says it, and the Bills tab.
    for (const tab of ["Government", "Bills"]) {
      await openPolitics();
      await page
        .locator("#sheet-tabs")
        .getByRole("button", { name: tab })
        .click();
      await page.waitForTimeout(1500);
      say(
        `${tab} tab:`,
        (await page.locator("#sheet-body").innerText())
          .replace(/\s+/g, " ")
          .slice(0, 1800),
      );
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-${tab}.png` });
      await shutMenu();
    }
  }
} finally {
  say("page errors:", errors);
  if (SHOTS) writeFileSync(`${SHOTS}/log.txt`, lines.join("\n"));
  await browser.close();
}
