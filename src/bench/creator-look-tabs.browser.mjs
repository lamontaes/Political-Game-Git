/* global process, console, document, URL */
// How I look's two tabs, in a real browser on the bench (npm run bench).
// Owner, Nov 12, 2026: "two tabs, everyday and formal, bust flips between
// them". For a woman and a man, each in a place drawn with the creator's
// Random place (from all 56), the check opens the creator, then:
//   - Everyday shows the Top row and the bust wears a whole top, no shirt,
//     tie or jacket;
//   - Formal shows Shirt and Jacket (and Tie where the bank paints ties), no
//     Top row, and the bust wears the shirt;
//   - switching tabs changes the bust's pictures at once, with no request;
//   - a step on the Top row changes the everyday bust and is kept in the look
//     the creator sends with Begin;
//   - after Begin and the opening, the You panel's bust wears that top.
// Run against the bench:
//   BENCH_PORT=3000 node src/bench/creator-look-tabs.browser.mjs
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { chromium } from "playwright";
import { playOpening } from "./start-life.mjs";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const layers = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#cr-bust .bust-stack img")].map(
      (img) => new URL(img.src).pathname,
    ),
  );
const rowIds = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#cr-rows .look-row")].map((row) =>
      row.dataset.testid.replace("engine-appearance-", ""),
    ),
  );
const wears = (urls, piece) => urls.some((url) => url.includes(`/${piece}-`));
try {
  for (const gender of ["female", "male"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/play`);
    await page.locator("#new-life").click();
    await page.locator("#new-start").click();
    await page.locator("#cr-screen:not([hidden])").waitFor();
    await page.locator(`[data-gender=${gender}]`).click();
    // A drawn place: Random place pressed a drawn number of times.
    const presses = 1 + randomInt(4);
    let place;
    for (let i = 0; i < presses; i++) {
      const drawn = page.waitForResponse((r) =>
        r.url().includes("/api/creator/place"),
      );
      await page.locator("#cr-place-random").click();
      place = await (await drawn).json();
    }
    const town = place.town.name.includes(place.state.name)
      ? place.town.name
      : `${place.town.name}, ${place.state.name}`;
    const where = `${gender} in ${town} (Random place pressed ${presses} times)`;
    console.log(where);
    await page.locator("#cr-bust .bust-stack:not(.loading)").waitFor();
    const tab = (key) => page.locator(`#cr-rows [data-look-tab=${key}]`);
    assert.equal(await tab("everyday").count(), 1, `${where}: no Everyday tab`);
    assert.equal(await tab("formal").count(), 1, `${where}: no Formal tab`);
    // The creator opens on Everyday.
    assert.equal(await tab("everyday").getAttribute("aria-pressed"), "true");
    const everydayRows = await rowIds(page);
    const everyday = await layers(page);
    assert.ok(everydayRows.includes("top"), `${where}: Everyday has no Top`);
    for (const id of ["shirt", "tie", "jacket"])
      assert.ok(!everydayRows.includes(id), `${where}: Everyday shows ${id}`);
    assert.ok(wears(everyday, "top"), `${where}: everyday bust has no top`);
    for (const piece of ["shirt", "tie", "jacket"])
      assert.ok(!wears(everyday, piece), `${where}: everyday bust in ${piece}`);

    // Formal flips the bust at once: no request goes to the server.
    let asked = 0;
    const count = (r) => r.url().includes("/api/creator/") && asked++;
    page.on("request", count);
    await tab("formal").click();
    await page.locator("#cr-bust .bust-stack:not(.loading)").waitFor();
    page.off("request", count);
    assert.equal(asked, 0, `${where}: the tab asked the server`);
    const formalRows = await rowIds(page);
    const formal = await layers(page);
    assert.ok(!formalRows.includes("top"), `${where}: Formal shows Top`);
    assert.ok(formalRows.includes("shirt"), `${where}: Formal has no Shirt`);
    assert.ok(formalRows.includes("jacket"), `${where}: Formal has no Jacket`);
    assert.equal(
      formalRows.includes("tie"),
      gender === "male",
      `${where}: the Tie row shows only where the bank paints ties`,
    );
    assert.notDeepEqual(formal, everyday, `${where}: the bust did not change`);
    assert.ok(wears(formal, "shirt"), `${where}: formal bust has no shirt`);
    assert.ok(!wears(formal, "top"), `${where}: formal bust wears a top`);
    // The shared rows stay in both tabs.
    for (const id of ["skin", "hair", "hair-color"]) {
      assert.ok(everydayRows.includes(id) && formalRows.includes(id), id);
    }

    // Back on Everyday, the next top changes the bust and is kept in the look.
    await tab("everyday").click();
    const before = await layers(page);
    assert.deepEqual(before, everyday, `${where}: Everyday did not come back`);
    const moved = page.waitForResponse((r) =>
      r.url().includes("/api/creator/appearance"),
    );
    await page
      .locator("[data-testid=engine-appearance-top] button")
      .last()
      .click();
    const { recipe } = await (await moved).json();
    await page.waitForFunction(
      (old) =>
        [...document.querySelectorAll("#cr-bust .bust-stack img")]
          .map((img) => new URL(img.src).pathname)
          .join() !== old,
      before.join(),
    );
    const after = await layers(page);
    assert.ok(
      after.some((url) => url.includes(`/top-${recipe.top}`)),
      `${where}: the bust does not wear the chosen top ${recipe.top}`,
    );
    assert.equal(
      await tab("everyday").getAttribute("aria-pressed"),
      "true",
      `${where}: a step left the Everyday tab`,
    );
    // Begin the life: the played player's bust wears the chosen top.
    await page.locator("#cr-random-name").click();
    await page.waitForFunction(
      () =>
        document.getElementById("cr-given").value &&
        document.getElementById("cr-family").value,
    );
    const born = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#cr-begin").click();
    const reply = await born;
    assert.equal(reply.status(), 200, `${where}: the life did not begin`);
    const life = await reply.json();
    console.log(
      `${where}: seed ${new URL(reply.url()).searchParams.get("seed")}`,
    );
    await playOpening(page, life.sceneMomentId ?? null);
    await page.locator("#card:not([hidden])").waitFor({ timeout: 300000 });
    await page
      .locator('#rings [data-tab="who"]')
      .first()
      .evaluate((e) => e.click());
    await page.locator("#sheet .bust-stack img").first().waitFor();
    const played = await page.evaluate(() =>
      [...document.querySelectorAll("#sheet .bust-stack img")].map(
        (img) => new URL(img.src).pathname,
      ),
    );
    assert.ok(
      played.some(
        (url) =>
          url.endsWith(`/top-${recipe.top}-${recipe.topColor}.png`) ||
          url.endsWith(`/top-${recipe.top}.png`),
      ),
      `${where}: the played bust wears ${played.join(" ")}, not the chosen top ${recipe.top} ${recipe.topColor}`,
    );
    assert.deepEqual(errors, [], `${where}: page errors`);
    console.log(
      `PASS ${where}: tabs flip the bust; top ${recipe.top} ${recipe.topColor ?? ""} kept`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
