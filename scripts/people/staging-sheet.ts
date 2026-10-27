/* global process, console, document */
// A check sheet for one or more places' staging: every spot marked on the
// painting (green stand, blue sit, orange lean, red podium; an arrow for its
// facing; a star on the hero spot) and a 1.72 m adult drawn on every
// standing spot at the size the game draws people there, so spots and scale
// can be checked against doors, desks and chairs.
// Usage: node --import tsx scripts/people/staging-sheet.ts <out-dir> <place ...>
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { backdropStaging, BACKDROP_ASPECT } from "../../src/bench/staging";
import { backdropFile } from "../../src/bench/scene";

const [out = "staging-sheets", ...places] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const root = resolve(".");
// The reference adult: v2 figure 43, medium build, front view, 213 x 500 canvas with the feet on row 494.
const REF = {
  file: "figures/v2-43-f-medium.png",
  aspect: 213 / 500,
  foot: 494 / 500,
};
const browser = await chromium.launch({
  executablePath:
    process.env.BENCH_BROWSER ??
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
const COLORS = { stand: "#2e2", sit: "#39f", lean: "#f90", podium: "#f33" };
const ARROWS = { viewer: "↓", away: "↑", left: "←", right: "→" };
for (const place of places) {
  const stage = backdropStaging(place);
  if (!stage) {
    console.log(`${place}: no staging`);
    continue;
  }
  const marks = stage.spots.map((spot, index) => {
    const pose = spot.pose ?? "stand";
    const meters =
      spot.floorMetersPercent ??
      (spot.floor ? stage.floors?.[spot.floor] : undefined) ??
      stage.metersPercent;
    const horizon = spot.floorHorizonY ?? stage.horizonY;
    const h = (1.72 * meters * (spot.y - horizon)) / REF.foot;
    const w = (h * REF.aspect) / BACKDROP_ASPECT;
    const fig =
      pose === "stand"
        ? `<img src="file://${root}/art/people-engine/v2/${REF.file}" style="position:absolute;opacity:.8;left:${spot.x - w / 2}%;top:${spot.y - h * REF.foot}%;height:${h}%;${spot.x < 50 ? "" : "transform:scaleX(-1)"}">`
        : "";
    return `${fig}<div style="position:absolute;left:${spot.x}%;top:${spot.y}%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:${COLORS[pose]};border:2px solid #000"></div>
      <div style="position:absolute;left:${spot.x}%;top:${spot.y}%;transform:translate(8px,-4px);font:bold 12px sans-serif;color:#fff;text-shadow:0 0 3px #000">${index}${spot.hero ? "★" : ""}${ARROWS[spot.facing ?? "viewer"]}${spot.clipBelowY !== undefined ? "▬" : ""}</div>`;
  });
  const html = `<!doctype html><body style="margin:0;overflow:hidden"><div style="position:relative;width:1672px;height:941px">
    <img src="file://${root}${backdropFile(place, 12 * 60).url}" style="position:absolute;inset:0;width:100%;height:100%">
    <div style="position:absolute;left:0;right:0;top:${stage.horizonY}%;border-top:1px dashed #f0f"></div>
    ${marks.join("")}
    <div style="position:absolute;left:6px;top:6px;background:#000b;color:#fff;font:13px sans-serif;padding:3px 6px">${place} · horizon ${stage.horizonY} · m% ${stage.metersPercent}</div>
    </div></body>`;
  const file = resolve(out, "sheet.html");
  writeFileSync(file, html);
  await page.goto(`file://${file}`);
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete),
  );
  await page.screenshot({ path: `${out}/${place}.png` });
}
await browser.close();
