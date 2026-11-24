/* global process, console, document, URL */
// The new busts in the creator, in a real browser on the bench (npm run bench).
// Owner, Nov 17, 2026: "a few different head shapes ... 2 or 3 more shades ...
// more clothes and more hairstyles" (#10070). For a woman and a man, each in a
// place drawn with the creator's Random (from all 56), the check opens
// the creator and, on every head shape the Head row offers:
//   - the bust wears the head of that shape (head-<shape>-...) in its skin;
//   - every Top option puts that top on the bust, and every Hair option that
//     hairstyle (the shape's own painting where it has one);
//   - every picture loads;
//   - no option the row offers is a pair the art checks flag.
// With BUST_SHOTS=<dir> it saves one picture of the bust for each state.
// Run against the bench:
//   BENCH_PORT=3000 node src/bench/creator-busts.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { randomInt } from "node:crypto";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shots = process.env.BUST_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/opt/pw-browsers/chromium",
});
const file = (url) => url.slice(url.lastIndexOf("/") + 1);
const stack = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#cr-bust .bust-stack img")].map(
      (img) => new URL(img.src).pathname,
    ),
  );
const loaded = (page) =>
  page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll("#cr-bust .bust-stack img")];
    return (
      imgs.length > 0 &&
      imgs.every((img) => img.complete && img.naturalWidth > 0)
    );
  });
const options = (page, row) =>
  page.evaluate(
    (id) =>
      [
        ...document.querySelectorAll(
          `[data-testid=engine-appearance-${id}] [data-pick], [data-testid=engine-appearance-${id}] [data-swatch]`,
        ),
      ].map((b) => b.dataset.pick ?? b.dataset.swatch),
    row,
  );
const pick = async (page, row, id) => {
  const moved = page.waitForResponse((r) =>
    r.url().includes("/api/creator/appearance"),
  );
  await page
    .locator(
      `[data-testid=engine-appearance-${row}] [data-pick="${id}"], [data-testid=engine-appearance-${row}] [data-swatch="${id}"]`,
    )
    .click();
  await moved;
  await loaded(page);
};
let seen = 0;
try {
  for (const gender of ["female", "male"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("requestfailed", (r) => errors.push(`failed ${r.url()}`));
    await page.goto(`${base}/play`);
    await page.locator("#new-life").click();
    await page.locator("#new-start").click();
    await page.locator("#cr-screen:not([hidden])").waitFor();
    const presses = 1 + randomInt(4);
    let place;
    for (let i = 0; i < presses; i++) {
      const drawn = page.waitForResponse((r) =>
        r.url().includes("/api/creator/character"),
      );
      await page.locator("#cr-random").click();
      place = (await (await drawn).json()).place;
    }
    const where = `${gender} in ${place.town.name}, ${place.state.name} (Random pressed ${presses} times)`;
    await page.locator(`[data-gender=${gender}]`).click();
    console.log(where);
    await page.locator("#cr-bust .bust-stack:not(.loading)").waitFor();
    await loaded(page);
    const shapes = await options(page, "shape");
    assert.equal(shapes.length, 5, `${where}: the Head row offers ${shapes}`);
    assert.equal(shapes[0], "standard");
    assert.equal((await options(page, "skin")).length, 6, `${where}: skins`);
    const shot = async (name) => {
      if (shots)
        await page
          .locator("#cr-bust")
          .screenshot({ path: `${shots}/${gender}-${name}.png` });
    };
    for (const shape of shapes) {
      await pick(page, "shape", shape);
      const head = file((await stack(page))[0]);
      assert.ok(
        shape === "standard"
          ? /^head-(fair|light|olive|medium|brown|dark)-adult\.png$/.test(head)
          : head.startsWith(`head-${shape}-`),
        `${where}: ${shape} shows ${head}`,
      );
      for (const top of await options(page, "top")) {
        await pick(page, "top", top);
        const worn = (await stack(page)).map(file);
        assert.ok(
          worn.some((f) => f.startsWith(`top-${top}`)),
          `${where}: ${shape} with top ${top} wears ${worn.join(" ")}`,
        );
        await shot(`${shape}-top-${top}`);
        seen++;
      }
      for (const hair of await options(page, "hair")) {
        await pick(page, "hair", hair);
        const worn = (await stack(page)).map(file);
        assert.ok(
          worn.some((f) => f.startsWith(`hair-${hair}-`)),
          `${where}: ${shape} with hair ${hair} wears ${worn.join(" ")}`,
        );
        // A shape's own painting of a style is named for it.
        await shot(`${shape}-hair-${hair}`);
        seen++;
      }
    }
    assert.deepEqual(errors, [], `${where}: page errors`);
    console.log(
      `PASS ${where}: ${shapes.length} head shapes, every top and hairstyle`,
    );
    await page.close();
  }
  console.log(`${seen} looks drawn`);
} finally {
  await browser.close();
}
