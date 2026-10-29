/* global process, console, document, getComputedStyle */
// The creator's town list in a real browser, on the bench (npm run bench): in
// Texas and in one state drawn from the whole place list, the list must reach
// every town, each row must show a population and no two rows may read the
// same. Set BENCH_PORT for a server not on 3000; screenshots go to
// docs/reports/towns-2026-10-25/.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const out = process.env.BENCH_SCREENSHOT_DIR ?? "docs/reports/towns-2026-10-25";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
mkdirSync(out, { recursive: true });
const rows = (file) => JSON.parse(readFileSync(file, "utf8")).rows;
const localities = rows("src/core2/data/places/localities.json");
const territories = rows("src/core2/data/places/territory-places.json");
// The towns the records hold for a state, counted without the app's code.
const recorded = (usps) =>
  localities.filter((row) => row[2] === usps).length +
  territories.filter((row) => row[2] === usps).length;

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const failures = [];
try {
  const states = await (
    await page.request.get(`${base}/api/creator/states`)
  ).json();
  const draw = createHash("sha256")
    .update(`${seed}:towns-browser`)
    .digest("hex");
  const drawn = states[parseInt(draw.slice(0, 8), 16) % states.length];
  console.log("Drawn state:", drawn.name, "seed:", seed);
  for (const state of [states.find((row) => row.key === "US-TX"), drawn]) {
    try {
      await page.goto(`${base}/play`);
      await page.locator("#new-life").click();
      await page.locator("#new-advanced").click();
      await page.locator("#seed").fill(seed);
      await page.locator("#advanced-back").click();
      await page.locator("#new-start").click();
      await page.locator("#cr-character:not([hidden])").waitFor();
      await page.locator("[data-gender=male]").click();
      await page.locator("#cr-random-name").click();
      await page.waitForFunction(
        () => document.getElementById("cr-given").value,
      );
      await page.locator("#cr-character-next").click();
      // The state buttons' font, which the town list must read in.
      const fontOf = (node) => {
        const s = getComputedStyle(node);
        return `${s.fontFamily} ${s.fontSize} ${s.fontWeight} ${s.textTransform}`;
      };
      const stateFont = await page
        .locator(`[data-testid="state-${state.key}"]`)
        .evaluate(fontOf);
      // The states page; the search brings this one onto the first page.
      await page.locator("#cr-state-search").fill(state.name);
      await page.locator(`[data-testid="state-${state.key}"]`).click();
      await page.locator("#cr-towns button").first().waitFor();
      await page.waitForTimeout(1500);
      // Every row's words, the ones below the fold included.
      const texts = await page
        .locator("#cr-towns button")
        .evaluateAll((all) =>
          all.map((b) =>
            [...b.querySelectorAll("span, small")]
              .map((part) => part.textContent.trim())
              .join(" "),
          ),
        );
      // To the end of the list, by scrolling its box.
      await page
        .locator("#cr-towns")
        .evaluate((box) => box.scrollTo(0, box.scrollHeight));
      await page.screenshot({
        path: `${out}/${state.key}-end-of-list.png`,
      });
      const townFonts = await page
        .locator("#cr-towns button")
        .first()
        .evaluate(
          (b, f) =>
            [...b.children].map((child) =>
              new Function(`return ${f}`)()(child),
            ),
          fontOf.toString(),
        );
      console.log(
        `${state.name}: states ${stateFont}; town rows ${townFonts.join(" | ")}`,
      );
      assert.ok(
        townFonts.length && townFonts.every((font) => font === stateFont),
        `${state.name}: the town list is not in the state buttons' font`,
      );
      const usps = state.key.slice(3);
      console.log(
        `${state.name}: ${texts.length} rows, last "${texts.at(-1)}"`,
      );
      assert.equal(
        texts.length,
        recorded(usps),
        `${state.name}: the list holds ${texts.length} of ${recorded(usps)} towns`,
      );
      // The count, then for a same-named town its own "in <county>" line.
      const noCount = texts.filter((t) => !/\d[\d,]* \S+( in .+)?$/.test(t));
      assert.equal(
        noCount.length,
        0,
        `${state.name}: no count on ${noCount.slice(0, 3).join(" | ")}`,
      );
      const same = texts.filter((t, i) => texts.indexOf(t) !== i);
      assert.equal(
        same.length,
        0,
        `${state.name}: rows read the same: ${same.slice(0, 3).join(" | ")}`,
      );
      console.log(`PASS ${state.name}`);
    } catch (error) {
      failures.push(error.message);
      console.log("FAIL", error.message);
    }
  }
  assert.deepEqual(errors, [], `page errors: ${errors.join(" | ")}`);
  assert.deepEqual(failures, [], failures.join("\n"));
} finally {
  await browser.close();
}
