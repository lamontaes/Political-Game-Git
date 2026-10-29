/* global process, console, document, getComputedStyle */
// The Parties tab in a real browser on the bench (npm run bench) with a life
// in progress: the state's districts map, the player's own districts and
// town drawn over it in the color of the party that holds each, a legend of
// the parties, and each party's seats as person rows (owner, Oct 28 sitting,
// point 20).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  const title = await (await ready).json();
  assert.ok(title.life, "no life in progress on the bench");
  console.log(`life: ${title.life.name} · ${title.life.placeName}`);
  await page.locator("#front-continue:not([disabled])").click();
  await page.locator("#front").waitFor({ state: "hidden" });
  await page.waitForTimeout(1200);
  for (const sel of ["#news-reader-close", "#talk-next"]) {
    const b = page.locator(sel);
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
  }
  await page.locator('.ring[data-tab="politics"]').click();
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.locator('#sheet-tabs [data-tab="parties"]').click();
  await page.locator("#sheet-body svg.gov-map").waitFor();
  await page.waitForTimeout(600);
  const seen = await page.evaluate(() => {
    const svg = document.querySelector("#sheet-body svg.gov-map");
    const box = svg.getBoundingClientRect();
    const yours = [...svg.querySelectorAll("path.yours")].map((p) => ({
      layer: p.dataset.layer,
      classes: p.getAttribute("class"),
      fill: getComputedStyle(p).fill,
      title: p.querySelector("title")?.textContent ?? "",
    }));
    return {
      width: box.width,
      height: box.height,
      state: Boolean(svg.querySelector("path.state")),
      counties: svg.querySelectorAll("path.county").length,
      yours,
      legend: [...document.querySelectorAll("#sheet-body .map-legend li")].map(
        (li) => ({
          text: li.textContent.trim(),
          swatch: getComputedStyle(li.querySelector(".map-swatch"))
            .backgroundColor,
        }),
      ),
      rows: document.querySelectorAll("#sheet-body .person-row").length,
      faces: [
        ...document.querySelectorAll("#sheet-body .person-row-face"),
      ].filter((f) => f.style.backgroundImage).length,
      text: document.getElementById("sheet-body").innerText,
    };
  });
  console.log(
    `map ${Math.round(seen.width)}×${Math.round(seen.height)}: state ${seen.state}, ${seen.counties} counties, districts ${seen.yours.map((y) => `${y.layer} [${y.classes.split(" ").find((c) => c.startsWith("party-"))}]`).join(", ")}; legend ${seen.legend.map((l) => l.text).join(" | ")}; ${seen.rows} seat rows, ${seen.faces} with a face`,
  );
  assert.ok(seen.state, "no state outline");
  assert.ok(seen.counties > 0, "no counties drawn");
  assert.ok(
    seen.width > 300 && seen.height > 120,
    "the map is not drawn large enough to read",
  );
  assert.ok(seen.yours.length >= 1, "none of the player's districts drawn");
  for (const y of seen.yours) {
    assert.ok(y.title.length > 0, `${y.layer}: no hover title`);
    assert.doesNotMatch(y.title, /undefined|null|:\s*$/);
  }
  assert.ok(seen.legend.length >= 1, "no legend");
  const colored = seen.legend.filter((l) => l.swatch !== "rgba(0, 0, 0, 0)");
  assert.equal(
    colored.length,
    seen.legend.length,
    "a legend swatch with no color",
  );
  assert.ok(seen.rows >= 1, "no seat rows");
  assert.doesNotMatch(seen.text, /official:|term:|seat:|undefined/);
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: `${process.env.SHOT_DIR}/20-parties-map.png`,
    });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: Parties is the districts map with a legend and seat rows");
} finally {
  await browser.close();
}
