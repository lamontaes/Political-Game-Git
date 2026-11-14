/* global process, console, document, URL, getComputedStyle */
// What the play walks share: a browser at the owner's window size, a new life
// on the bench, and the few things a player does (read the talk box, answer,
// press Day, look at who is here). A walk plays and writes down what it saw;
// it asserts nothing. See the skill `play-walks`.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { startLife } from "../../src/bench/start-life.mjs";

const BASE = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;

/** A browser page at 1440x900, the folder its pictures go in, and the log. */
export async function openWalk(out) {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.BENCH_BROWSER ?? "/opt/pw-browsers/chromium",
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // BENCH_SEED replays a life; without it the world draws its own place.
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
      return route.continue({ url: url.toString() });
    });
  const log = [];
  let shots = 0;
  return {
    page,
    log,
    say: (line) => log.push(line),
    /** A picture of the screen now, numbered in the order taken. */
    snap: (name) =>
      page.screenshot({
        path: `${out}/${String(++shots).padStart(2, "0")}-${name}.png`,
      }),
    /** Writes the log beside the pictures, prints it and closes the browser. */
    async close() {
      log.push(`page errors: ${JSON.stringify(errors)}`);
      writeFileSync(`${out}/log.txt`, log.join("\n"));
      console.log(log.join("\n"));
      await browser.close();
    },
  };
}

/** A new life, its opening played to the end the way a player does. */
export async function newLife(walk) {
  const life = await startLife(walk.page, { url: `${BASE}/play`, fresh: true });
  walk.say(`seed ${life.seed} place ${life.placeName}`);
  return life;
}

const shown = (page, id) =>
  page
    .locator(`#${id}`)
    .isVisible()
    .catch(() => false);

/** The card's date and time as one line. */
export const clockOf = async (page) =>
  (await page.locator("#card-clock").innerText()).replace(/\n/g, " ");

/** The names on the strip of people here, and how many of them can be talked to. */
export const hereOf = (page) =>
  page.locator("#here .busts-person").evaluateAll((cells) =>
    cells.map((cell) => ({
      name: cell.getAttribute("aria-label") ?? cell.textContent.trim(),
      talkable: cell.classList.contains("talkable"),
    })),
  );

/** What the talk box says now. */
export const talkOf = (page) =>
  page.evaluate(() => ({
    name: document.getElementById("talk-name")?.textContent ?? "",
    lines: document.getElementById("talk-lines")?.innerText ?? "",
    replies: [...document.querySelectorAll("#talk-choices .reply")].map(
      (reply) => reply.textContent.trim(),
    ),
  }));

/** The toasts on screen now: the Journal's newest line and the news. */
export const toastsOf = (page) =>
  page.evaluate(() => {
    const on = (id) => {
      const node = document.getElementById(id);
      if (!node || node.hidden) return false;
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    return {
      journal: on("journal-note")
        ? (document.getElementById("journal-line")?.textContent ?? "")
        : "",
      news: on("news-surface")
        ? (document.getElementById("news-surface")?.innerText ?? "").replace(
            /\n+/g,
            " / ",
          )
        : "",
    };
  });

/**
 * Plays the open talk to its end and writes down each thing it says and each
 * set of replies offered. Replies are taken in turn (first, second, ...), so a
 * walk hears more than the first answer; `most` caps the replies given before
 * it leaves.
 */
export async function playTalk(walk, label, { most = 5, picture = true } = {}) {
  const { page } = walk;
  let last = "";
  let given = 0;
  for (let step = 0; step < 90; step += 1) {
    await page.waitForTimeout(600);
    if (!(await shown(page, "talk"))) return;
    const talk = await talkOf(page);
    const key = JSON.stringify(talk);
    if (key !== last) {
      last = key;
      walk.say(
        `--- [${await clockOf(page)}] ${label}: ${talk.name || "(narrator)"}`,
      );
      if (talk.lines)
        walk.say(talk.lines.trim().split("\n").slice(-5).join("\n"));
      if (talk.replies.length) walk.say(`REPLIES: ${talk.replies.join(" | ")}`);
      if (picture) await walk.snap(label);
    }
    if (await shown(page, "talk-next"))
      await page.locator("#talk-next").click();
    else if (talk.replies.length && given < most) {
      await page
        .locator("#talk-choices .reply")
        .nth(given % talk.replies.length)
        .click();
      given += 1;
    } else if (await shown(page, "talk-leave"))
      await page.locator("#talk-leave").click();
    else if (talk.replies.length)
      await page.locator("#talk-choices .reply").first().click();
  }
}

/**
 * Press Day and play whatever the day brings until the clock is free again:
 * a stop is continued, a scene's talk is played and written down. A stop
 * holds Day until it is answered, so waiting on Day alone would wait forever.
 */
export async function pressDay(walk) {
  const { page } = walk;
  walk.say(`=== Day pressed at [${await clockOf(page)}]`);
  await page.locator("#day").click();
  const free = () =>
    page.evaluate(() => !document.getElementById("day").disabled);
  for (let step = 0; step < 400; step += 1) {
    await page.waitForTimeout(600);
    if (await shown(page, "talk")) await playTalk(walk, "scene");
    else if (await shown(page, "continue")) {
      walk.say(`    (a stop at [${await clockOf(page)}]: Continue)`);
      // A scene's panel may open over the stop between the look and the click;
      // then the loop's next turn plays the scene.
      await page
        .locator("#continue")
        .click({ timeout: 3000 })
        .catch(() => {});
    } else if (await free()) break;
  }
  if (!(await free()))
    walk.say(
      `    DAY NEVER CAME BACK: the clock is still held at [${await clockOf(page)}]`,
    );
  await page.waitForTimeout(1200);
  const toasts = await toastsOf(page);
  if (toasts.journal) walk.say(`    JOURNAL NOTE: ${toasts.journal}`);
  if (toasts.news) walk.say(`    NEWS: ${toasts.news}`);
}

/** Click each person here who has something to say (at most `most`) and play the talk. */
export async function talkToEveryone(walk, most = 3) {
  const { page } = walk;
  for (let at = 0; at < most; at += 1) {
    const who = page.locator("#here .busts-person.talkable").nth(at);
    if (!(await who.count())) return;
    walk.say(`>>> clicks ${(await who.getAttribute("aria-label")) ?? ""}`);
    await who.click();
    await page.waitForTimeout(800);
    await playTalk(walk, "talk");
  }
}

/** Open a menu from the rail by its key (travel, journal, people ...). */
export async function openMenu(page, key) {
  await page.locator(`[data-tab="${key}"]`).first().click();
  await page.waitForTimeout(1200);
}

/**
 * Close the open menu by its own close button. Escape does not close a menu
 * in play: it opens Options over it, and the clock stays covered.
 */
export async function closeMenu(page) {
  const close = page.locator("#sheet-close");
  if (await close.isVisible()) await close.click();
  await page.waitForTimeout(400);
}
