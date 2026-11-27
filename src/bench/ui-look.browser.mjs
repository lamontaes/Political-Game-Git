/* global process, console, document, URL, Image */
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
//   guard C (text clipped at a box's edge): a line cut by its scroller's or panel's edge.
//   guard D (one fact shown twice): the same exact date or record number in two places of a panel.
//   guard E (headline leading): a title that wraps with a line height under 1.3.
//   guard F (title over a picture): a title whose letters sit on pixels they cannot be read against.
//   (C to F: Impeccable's text-overflow, repeated-container-text, tight-leading and low-contrast
//   rules, adopted without its binary: CTO, Nov 24.)
// tests/guards/ui-look-baseline.json lists what is still allowed, by menu and selector. It
// only shrinks: a new entry fails, and an entry that no longer shows is listed to delete.
// UI_LOOK_WRITE=1 rewrites the baseline from what the run saw (to shrink it after a fix;
// never to grow it). Run with the bench up: npm run bench, then npm run ui-look.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import {
  fileWhenFilingOpens,
  startLife,
} from "../../tests/support/start-life.mjs";
import {
  scanBoxes,
  scanClipped,
  scanLeading,
  scanRepeated,
  scanScrollers,
  scanTitles,
} from "../../tests/support/ui-look-scan.mjs";

const BASELINE = new URL(
  "../../tests/guards/ui-look-baseline.json",
  import.meta.url,
);
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
/** Each rule's baseline kind and what its failure says. */
const KINDS = {
  box: "BOX IN BOX",
  scroll: "SCROLL WITH FREE SPACE",
  clipped: "TEXT CUT AT A BOX EDGE",
  repeated: "ONE FACT SHOWN TWICE",
  leading: "HEADLINE LEADING UNDER 1.3",
  title: "TITLE OVER A PICTURE IT CANNOT BE READ AGAINST",
};
/**
 * The share of the pixels behind a title that may fall under 3:1 against its letters. Measured on
 * main: the Bills banner is 0.19 and no other title is above 0.01.
 */
const TITLE_SHARE = Number(process.env.UI_LOOK_TITLE_SHARE ?? 0.05);
/**
 * What the committed baseline lists that main's does not: the baseline only shrinks (owner, Nov 23).
 * Nothing is listed while main has no baseline yet (the pull request that adds it). A pull request
 * whose body carries a CTO line sets UI_LOOK_GROWTH_APPROVED=true in the workflow; no run grows it otherwise.
 */
function growth() {
  let main;
  try {
    main = JSON.parse(
      execFileSync(
        "git",
        [
          "show",
          `${process.env.UI_LOOK_BASE_REF ?? "origin/main"}:tests/guards/ui-look-baseline.json`,
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ),
    );
  } catch {
    return [];
  }
  const mine = JSON.parse(readFileSync(BASELINE, "utf8"));
  // Main's keys may still carry the scroll axis ("scrolls y"); the key is now "scrolls" alone.
  const mainKeys = JSON.parse(
    JSON.stringify(main).replace(/ scrolls [xy]+"/g, ' scrolls"'),
  );
  const added = [];
  // A kind main's baseline does not have yet is the pull request that adds that rule: its first
  // list is not growth. From main on, no kind grows.
  for (const kind of Object.keys(KINDS))
    if (kind in mainKeys)
      for (const [menu, keys] of Object.entries(mine[kind] ?? {}))
        for (const key of Object.keys(keys))
          if (!(key in (mainKeys[kind]?.[menu] ?? {})))
            added.push(`${kind} · ${menu} · ${key}`);
  return added;
}
const refuseGrowth = () => {
  const added = growth();
  if (added.length && process.env.UI_LOOK_GROWTH_APPROVED !== "true") {
    console.log(
      `The baseline lists what main's does not:\n  ${added.join("\n  ")}`,
    );
    throw new Error(
      "the baseline only shrinks: a new entry needs a CTO line in the pull request body (CTO line: ...)",
    );
  }
};
refuseGrowth();
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
    errors.push(
      `after ${menus.at(-1) ?? "start"}: ${e.message} (${String(e.stack)
        .split("\n")
        .slice(1, 4)
        .map((l) => l.trim())
        .join(" | ")})`,
    ),
  );
  return fresh;
};
let page = await open();

/** What the run saw: { kind: { menu: { key: count } } } for each rule's kind. */
const seen = Object.fromEntries(Object.keys(KINDS).map((k) => [k, {}]));
const skipped = [];
/** The deeper screens that threw while they were opened: a failure, never a skip. */
const threw = [];
/** The boxes that cut a line, by menu: said beside a new hit, never part of its key. */
const cutBy = {};
const tally = (kind, menu, key, count = 1) => {
  seen[kind][menu] ??= {};
  seen[kind][menu][key] = Math.max(seen[kind][menu][key] ?? 0, count);
};

/**
 * The share of the pixels behind a title that fall under 3:1 against the title's letters (large
 * text, WCAG AA): the title's own text is hidden, its box photographed as drawn (the picture and
 * its scrim), and each pixel is set against the letters' color.
 */
async function titleShare(row, on = page) {
  const mark = `[data-ui-look-title="${row.mark}"]`;
  await on.evaluate((m) => {
    const node = document.querySelector(m);
    node.dataset.uiLookStyle = node.getAttribute("style") ?? "";
    node.style.setProperty("color", "transparent", "important");
    node.style.setProperty("text-shadow", "none", "important");
  }, mark);
  const png = await on.screenshot({
    clip: { x: row.x, y: row.y, width: row.width, height: row.height },
  });
  await on.evaluate((m) => {
    const node = document.querySelector(m);
    node.setAttribute("style", node.dataset.uiLookStyle);
    delete node.dataset.uiLookStyle;
  }, mark);
  return on.evaluate(
    async ({ b64, color }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const light = (r, g, b) => {
        const f = (v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const [r, g, b] = color.match(/[\d.]+/g).map(Number);
      const text = light(r, g, b);
      let under = 0;
      const total = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const back = light(data[i], data[i + 1], data[i + 2]);
        const ratio =
          (Math.max(text, back) + 0.05) / (Math.min(text, back) + 0.05);
        if (ratio < 3) under += 1;
      }
      return under / total;
    },
    { b64: png.toString("base64"), color: row.color },
  );
}

/**
 * The break-it check: each rule is run on a planted case that must fail it and a plain twin that
 * must pass, before any menu is opened, so a scan that stops seeing its case fails the job.
 */
async function selfTest() {
  const picture = (fill) =>
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='60'%3E%3Crect width='300' height='60' fill='%23${fill}'/%3E%3C/svg%3E`;
  const own = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  await own.setContent(`<body style="margin:0;font:16px/1.4 sans-serif">
<section id="bad">
  <div style="height:40px;overflow:auto"><p style="margin:0;height:30px">one line</p><p style="margin:0;height:30px">second line</p></div>
  <p>Filed June 21, 2026</p><p>Jun 21, 2026 filing opens</p><p>HB 2</p><p>HB 2 in the House</p>
  <h2 style="width:140px;font-size:28px;line-height:1.1">A long headline that wraps</h2>
  <div style="position:relative;width:300px;height:60px"><img src="${picture("f2efe6")}" style="width:300px;height:60px;display:block"><h2 style="position:absolute;left:0;right:0;bottom:0;margin:0;color:#d6bd84">A title</h2></div>
</section>
<section id="ok">
  <div style="height:60px;overflow:auto"><p style="margin:0;height:30px">one line</p><p style="margin:0;height:30px">second line</p></div>
  <p>Filed June 21, 2026</p><p>Filing closes June 22, 2026</p><p>HB 2</p><p>HB 3 in the House</p>
  <h2 style="width:140px;font-size:28px;line-height:1.4">A long headline that wraps</h2>
  <div style="position:relative;width:300px;height:60px"><img src="${picture("1c1a17")}" style="width:300px;height:60px;display:block"><h2 style="position:absolute;left:0;right:0;bottom:0;margin:0;color:#d6bd84">A title</h2></div>
</section></body>`);
  const got = async (sel) => ({
    clipped: (await own.evaluate(scanClipped, sel)).length,
    repeated: (await own.evaluate(scanRepeated, sel)).length,
    leading: (await own.evaluate(scanLeading, sel)).length,
    title: await Promise.all(
      (await own.evaluate(scanTitles, sel)).map((row) => titleShare(row, own)),
    ),
  });
  const bad = await got("#bad");
  const ok = await got("#ok");
  await own.context().close();
  assert.equal(bad.clipped, 1, "the planted cut line is not found");
  assert.equal(
    bad.repeated,
    2,
    "the planted repeated date and number are not found",
  );
  assert.equal(bad.leading, 1, "the planted tight headline is not found");
  assert.ok(
    bad.title.length === 1 && bad.title[0] > TITLE_SHARE,
    `the planted title on a light picture is not found (${bad.title})`,
  );
  assert.deepEqual(
    { clipped: ok.clipped, repeated: ok.repeated, leading: ok.leading },
    { clipped: 0, repeated: 0, leading: 0 },
    "a plain twin fails a rule",
  );
  assert.ok(
    ok.title.length === 1 && ok.title[0] <= TITLE_SHARE,
    `a title on a dark picture fails (${ok.title})`,
  );
  const tries = [
    await tryOpen(
      "opens",
      async () => true,
      async () => {},
    ),
    await tryOpen(
      "nothing",
      async () => false,
      async () => {},
    ),
    await tryOpen(
      "throws",
      async () => {
        throw new Error("page closed");
      },
      async () => {},
    ),
    await tryOpen(
      "scan throws",
      async () => true,
      async () => {
        throw new Error("scan failed");
      },
    ),
  ];
  assert.deepEqual(
    tries.map((t) => t.came),
    ["opened", "nothing", "threw", "threw"],
    "a menu that throws while opening is not told apart from one with nothing to open",
  );
  console.log(
    "break-it check: each rule finds its planted case and passes its twin; a throw while opening is told from nothing to open",
  );
}

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
        tally("scroll", `${menu} [${id}]`, `${row.selector} scrolls`);
    const where = `${menu} [${id}]`;
    // Keyed by the menu alone: which scroller cuts a row depends on how the world's words wrap.
    for (const row of await page.evaluate(scanClipped, selector)) {
      tally("clipped", where, "a line of text is cut at a box's edge");
      (cutBy[where] ??= new Set()).add(row.selector);
    }
    for (const row of await page.evaluate(scanRepeated, selector))
      tally("repeated", where, `${row.kind} shown in two or more places`);
    for (const row of await page.evaluate(scanLeading, selector))
      tally("leading", where, `${row.selector} wraps under 1.3 leading`);
    for (const row of await page.evaluate(scanTitles, selector)) {
      const share = await titleShare(row);
      if (process.env.UI_LOOK_DEBUG)
        console.log(`title ${where} ${row.selector} share ${share.toFixed(2)}`);
      if (share > TITLE_SHARE)
        tally("title", where, `${row.selector} over a picture`);
    }
  }
  if (shots)
    await page.screenshot({
      path: `${shots}/${menu.replace(/\W+/g, "-").toLowerCase()}.png`,
    });
}

/**
 * What one try at a deeper screen came to: it opened and was scanned; there was nothing to open in
 * this world (a listed miss, not a failure: a world may hold no race that takes the player's filing);
 * or it threw (the page closed, a click found nothing, the scan failed), which fails the run.
 */
async function tryOpen(menu, open, scanIt) {
  try {
    if (await open()) {
      await scanIt(menu);
      return { came: "opened", note: "" };
    }
    return { came: "nothing", note: `${menu}: nothing to open in this world` };
  } catch (error) {
    return {
      came: "threw",
      note: `${menu}: ${String(error.message).split("\n")[0]}`,
    };
  }
}

/** Try one drill into a deeper screen; a miss is listed, a throw fails the run. */
async function drill(menu, open) {
  const result = await tryOpen(menu, open, scan);
  if (result.came === "nothing") skipped.push(result.note);
  if (result.came === "threw") threw.push(result.note);
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
  await selfTest();
  if (process.env.UI_LOOK_SELFTEST === "only") {
    await browser.close();
    process.exit(0);
  }
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
    // The roster lists what asks for money, then the offices you can run for (a row that says when
    // filing opens or that you can file); the last row is the fallback.
    const rows = page.locator("#sheet-body nav.pick-list .pick");
    const office = rows.filter({ hasText: /filing opens|file for it/i });
    const row = (await office.count()) ? office.first() : rows.last();
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
  // Last, since it files for office and moves the clock: the campaign board, then its trail.
  await drill("Campaign board", async () => {
    const filed = await fileWhenFilingOpens(page);
    if (!filed.contestId) return false;
    await openRing("politics");
    await openTab("Campaign");
    return true;
  });
  await drill("Campaign trail", async () => {
    const out = page
      .locator("#sheet-body button", { hasText: /trail/i })
      .first();
    if (!(await out.count())) return false;
    await out.click();
    await page.waitForTimeout(900);
    return true;
  });
  console.log(
    `opened ${menus.length} menus; not opened: ${skipped.join(" | ") || "none"}; threw while opening: ${threw.join(" | ") || "none"}`,
  );
  // A page error is the game's own, not this guard's verdict: it is listed, never swallowed.
  if (errors.length)
    console.log(
      `page errors seen (not this guard's rule):\n  ${errors.join("\n  ")}`,
    );
} finally {
  await browser.close();
}

// A deeper screen that threw while it was opened fails the run (a miss for nothing to open does not).
assert.deepEqual(
  threw,
  [],
  "a menu threw while it was being opened: the page closed or the scan failed, not 'nothing to open'",
);

// The verdict: a menu and selector that is not in the baseline fails.
const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const fresh = [];
const gone = [];
for (const kind of Object.keys(KINDS)) {
  for (const [menu, keys] of Object.entries(seen[kind]))
    for (const key of Object.keys(keys))
      if (!(key in (baseline[kind]?.[menu] ?? {})))
        fresh.push(`${KINDS[kind]} · ${menu} · ${key}`);
  for (const [menu, keys] of Object.entries(baseline[kind] ?? {}))
    for (const key of Object.keys(keys))
      if (!(key in (seen[kind][menu] ?? {})))
        gone.push(`${kind} · ${menu} · ${key}`);
}
if (write) {
  // UI_LOOK_WRITE=1 writes what this run saw; =merge adds it to the baseline (seeding from several worlds).
  // UI_LOOK_KINDS=clipped,repeated writes only those kinds and leaves the others as they are.
  const only = process.env.UI_LOOK_KINDS?.split(",");
  const out = Object.fromEntries(
    Object.keys(KINDS).map((k) => [
      k,
      only && !only.includes(k) ? (baseline[k] ?? {}) : {},
    ]),
  );
  for (const kind of Object.keys(KINDS))
    if (!only || only.includes(kind))
      for (const source of process.env.UI_LOOK_WRITE === "merge"
        ? [baseline[kind] ?? {}, seen[kind]]
        : [seen[kind]])
        for (const [menu, keys] of Object.entries(source))
          out[kind][menu] = { ...out[kind][menu], ...keys };
  writeFileSync(BASELINE, `${JSON.stringify(out, null, 2)}\n`);
  refuseGrowth();
  console.log(
    `baseline written: ${Object.entries(seen)
      .map(([k, v]) => `${Object.values(v).flatMap(Object.keys).length} ${k}`)
      .join(", ")} entries`,
  );
} else {
  if (gone.length)
    console.log(
      `not seen this run (delete from the baseline if the fix is in):\n  ${gone.join("\n  ")}`,
    );
  if (fresh.length) console.log(fresh.join("\n"));
  for (const [menu, boxes] of Object.entries(cutBy))
    if (fresh.some((line) => line.includes(menu)))
      console.log(`  ${menu}: a line is cut by ${[...boxes].join(", ")}`);
  assert.deepEqual(
    fresh,
    [],
    "a menu draws a box in a box or scrolls with free space",
  );
  console.log(`PASS ${menus.length} menus, nothing outside the baseline`);
}
