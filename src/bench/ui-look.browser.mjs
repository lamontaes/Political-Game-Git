/* global process, console, document, URL */
// The menu look guard (owner, Nov 23: "a box around boxes for announce and sim ... find out
// why it keeps happening, and explicitly forbid it. Make it turn main red" and "none of
// these scrollers, especially when there's ample dead space in these menus"), in a real
// browser on the bench at 1440x900 in a place drawn from all 56. It opens every menu:
// the title and its patch notes and new-game screens, each ring tab and each of its tabs,
// the race screen, the person card, the campaign trail. In each framed panel:
//   guard A (box in box): a container that is not a control and draws a border, a fill or an
//     inset shadow fails (the Nov 5 tab rails are allowed by name).
//   guard B (scroll with free space): a panel, or anything in it, that scrolls while the
//     panel is shorter than the height the screen allows it fails.
// tests/guards/ui-look-baseline.json lists what is still allowed, by menu and selector. It
// only shrinks: a new entry fails, and an entry that no longer shows is listed to delete.
// UI_LOOK_WRITE=1 rewrites the baseline from what the run saw (to shrink it after a fix;
// never to grow it). Run with the bench up: npm run bench, then npm run ui-look.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
import { scanBoxes, scanScrollers } from "./ui-look-scan.mjs";

const BASELINE = new URL(
  "../../tests/guards/ui-look-baseline.json",
  import.meta.url,
);
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const write = ["1", "merge"].includes(process.env.UI_LOOK_WRITE);
const shots = process.env.UI_LOOK_SHOTS;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER || undefined,
});
const errors = [];
const menus = [];
const open = async () => {
  const fresh = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  fresh.setDefaultTimeout(120000);
  fresh.on("pageerror", (e) =>
    errors.push(`${menus.at(-1) ?? "start"}: ${e.message}`),
  );
  return fresh;
};
let page = await open();

/** What the run saw: { box: { menu: { selector: count } }, scroll: { menu: { selector: count } } }. */
const seen = { box: {}, scroll: {} };
const skipped = [];
const tally = (kind, menu, key, count = 1) => {
  seen[kind][menu] ??= {};
  seen[kind][menu][key] = Math.max(seen[kind][menu][key] ?? 0, count);
};

/** Scan every framed panel that is open now, under the menu's name. */
async function scan(menu) {
  await page.waitForTimeout(700);
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll("section.panel[id], #sheet")]
      .filter((p) => p.checkVisibility() && p.id !== "talk")
      .map((p) => p.id),
  );
  menus.push(menu);
  for (const id of new Set(ids)) {
    const selector = `#${id}`;
    const boxes = await page.evaluate(scanBoxes, selector);
    const counts = new Map();
    for (const row of boxes)
      counts.set(
        `${row.selector} (${row.why})`,
        (counts.get(`${row.selector} (${row.why})`) ?? 0) + 1,
      );
    for (const [key, n] of counts) tally("box", `${menu} [${id}]`, key, n);
    for (const row of await page.evaluate(scanScrollers, selector))
      if (!row.full)
        tally(
          "scroll",
          `${menu} [${id}]`,
          `${row.selector} scrolls ${row.axis}`,
        );
  }
  if (shots)
    await page.screenshot({
      path: `${shots}/${menu.replace(/\W+/g, "-").toLowerCase()}.png`,
    });
}

/** Try one drill into a deeper screen; a miss is listed, never silent. */
async function drill(menu, open) {
  try {
    if (await open()) await scan(menu);
    else skipped.push(`${menu}: nothing to open in this world`);
  } catch (error) {
    skipped.push(`${menu}: ${String(error.message).split("\n")[0]}`);
  }
}

const shown = (id) => page.locator(`#${id}`).isVisible();
async function throughTalk() {
  for (let i = 0; i < 40; i += 1) {
    if (await shown("day")) return;
    const replies = page.locator("#talk-choices .reply");
    if ((await replies.count()) > 0 && (await replies.first().isVisible()))
      await replies.first().click();
    else if (await shown("talk-next")) await page.locator("#talk-next").click();
    else if (await shown("talk-leave"))
      await page.locator("#talk-leave").click();
    else if (await shown("continue")) await page.locator("#continue").click();
    await page.waitForTimeout(800);
  }
  throw new Error("Day never showed: a scene stayed open");
}
const closeAll = async () => {
  for (const id of ["person-close", "sheet-close"])
    if (await page.locator(`#${id}`).isVisible())
      await page.locator(`#${id}`).click();
};
const openRing = async (tab) => {
  await closeAll();
  await page
    .locator(`#rings [data-tab="${tab}"]`)
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(900);
};
const openTab = async (name) => {
  await page.locator("#sheet-tabs button", { hasText: name }).first().click();
  await page.waitForTimeout(600);
};

try {
  // The title and what opens from it: before any life, as a new player sees them.
  const title = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await title;
  await scan("Title");
  await page.locator("#front-patch-notes").click();
  await scan("Patch notes");
  await closeAll();
  await page.locator("#new-life").click();
  await scan("New game");
  await page.locator("#new-start").click();
  await page.locator("#cr-screen:not([hidden])").waitFor();
  await scan("Creator");
  // The life starts in a fresh browser context, as a new player's does.
  await page.context().close();
  page = await open();

  const life = await startLife(page, { fresh: true });
  console.log("Seed:", life.seed, "Place:", life.placeName);
  await throughTalk();
  const rings = await page
    .locator("#rings [data-tab]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab));
  assert.ok(rings.length >= 8, `the ring has ${rings.length} tabs`);
  for (const ring of rings) {
    await openRing(ring);
    await scan(`${ring}`);
    const tabs = await page
      .locator("#sheet-tabs button")
      .evaluateAll((nodes) => nodes.map((n) => n.textContent.trim()));
    for (const name of tabs) {
      await openTab(name);
      await scan(`${ring} > ${name}`);
    }
  }

  // Deeper screens: the race, a person's card, the campaign trail.
  await drill("Race screen", async () => {
    await openRing("politics");
    await openTab("Elections");
    const row = page
      .locator("#sheet-body .pick, #sheet-body .race-row")
      .first();
    if (!(await row.count())) return false;
    await row.click();
    await page.waitForTimeout(700);
    return true;
  });
  await drill("Person card from Politics", async () => {
    await openRing("politics");
    await openTab("Government");
    const name = page.locator("#sheet-body .nm").first();
    if (!(await name.count())) return false;
    await name.click();
    await page.locator("#person").waitFor({ state: "visible" });
    return true;
  });
  await drill("Person card from People", async () => {
    await openRing("people");
    const name = page.locator("#sheet-body .nm, #sheet-body .pick").first();
    if (!(await name.count())) return false;
    await name.click();
    await page.waitForTimeout(700);
    return true;
  });
  await drill("Campaign trail", async () => {
    await openRing("travel");
    const tile = page
      .locator("#sheet-body .travel-tile", { hasText: "campaign trail" })
      .first();
    if (!(await tile.count())) return false;
    await tile.click();
    await page.waitForTimeout(700);
    return true;
  });
  console.log(
    `opened ${menus.length} menus; not opened: ${skipped.join(" | ") || "none"}`,
  );
  // A page error is the game's own, not this guard's verdict: it is listed, never swallowed.
  if (errors.length)
    console.log(
      `page errors seen (not this guard's rule):\n  ${errors.join("\n  ")}`,
    );
} finally {
  await browser.close();
}

// The verdict: a menu and selector that is not in the baseline fails.
const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const fresh = [];
const gone = [];
for (const kind of ["box", "scroll"]) {
  for (const [menu, keys] of Object.entries(seen[kind]))
    for (const key of Object.keys(keys))
      if (!(key in (baseline[kind]?.[menu] ?? {})))
        fresh.push(
          `${kind === "box" ? "BOX IN BOX" : "SCROLL WITH FREE SPACE"} · ${menu} · ${key}`,
        );
  for (const [menu, keys] of Object.entries(baseline[kind] ?? {}))
    for (const key of Object.keys(keys))
      if (!(key in (seen[kind][menu] ?? {})))
        gone.push(`${kind} · ${menu} · ${key}`);
}
if (write) {
  // UI_LOOK_WRITE=1 writes what this run saw; =merge adds it to the baseline (seeding from several worlds).
  const out = { box: {}, scroll: {} };
  for (const kind of ["box", "scroll"])
    for (const source of process.env.UI_LOOK_WRITE === "merge"
      ? [baseline[kind] ?? {}, seen[kind]]
      : [seen[kind]])
      for (const [menu, keys] of Object.entries(source))
        out[kind][menu] = { ...out[kind][menu], ...keys };
  writeFileSync(BASELINE, `${JSON.stringify(out, null, 2)}\n`);
  console.log(
    `baseline written: ${Object.values(seen.box).flatMap(Object.keys).length} box entries, ${Object.values(seen.scroll).flatMap(Object.keys).length} scroll entries`,
  );
} else {
  if (gone.length)
    console.log(
      `not seen this run (delete from the baseline if the fix is in):\n  ${gone.join("\n  ")}`,
    );
  if (fresh.length) console.log(fresh.join("\n"));
  assert.deepEqual(
    fresh,
    [],
    "a menu draws a box in a box or scrolls with free space",
  );
  console.log(`PASS ${menus.length} menus, nothing outside the baseline`);
}
