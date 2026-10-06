import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const artifactDir = dirname(fileURLToPath(import.meta.url));
const req = createRequire("/workspace/Political-Game-Git/package.json");
const { chromium } = req("@playwright/test");

(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const rows = [];
  for (const c of JSON.parse(
    fs.readFileSync(artifactDir + "/concepts.json", "utf8"),
  )) {
    const p = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });
    await p.goto("http://127.0.0.1:8145/" + c.html);
    await p.waitForFunction(() => globalThis.window.ready);
    await p.evaluate(() =>
      Promise.all([...globalThis.document.images].map((i) => i.decode())),
    );
    const fit = await p.evaluate(() => {
      const els = [
        ...globalThis.document.querySelectorAll(
          ".entry,.player-card,.player-card h2,.clock,.time-actions,.nav,.stamp",
        ),
      ];
      const rect = (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      const entries = [...globalThis.document.querySelectorAll(".entry")];
      const overlap = [];
      for (let i = 0; i < entries.length; i++)
        for (let j = i + 1; j < entries.length; j++) {
          const a = entries[i].getBoundingClientRect(),
            b = entries[j].getBoundingClientRect();
          if (
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
          )
            overlap.push([entries[i].innerText, entries[j].innerText]);
        }
      return {
        viewport: [globalThis.innerWidth, globalThis.innerHeight],
        destinations: entries.map((e) => e.dataset.destination),
        clipped: els
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return (
              r.left < 0 ||
              r.top < 0 ||
              r.right > globalThis.innerWidth ||
              r.bottom > globalThis.innerHeight
            );
          })
          .map((e) => e.className),
        overflow: els
          .filter(
            (e) =>
              e.scrollWidth > e.clientWidth + 1 ||
              e.scrollHeight > e.clientHeight + 1,
          )
          .map((e) => e.className),
        overlap,
        playerCard: rect(globalThis.document.querySelector(".player-card")),
        clockContained: !!globalThis.document.querySelector(
          ".player-card .clock",
        ),
        controlsContained: !!globalThis.document.querySelector(
          ".player-card .time-actions",
        ),
        playerCardOverlaps: entries
          .filter((e) => {
            const a = e.getBoundingClientRect(),
              b = globalThis.document
                .querySelector(".player-card")
                .getBoundingClientRect();
            return (
              a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top
            );
          })
          .map((e) => e.innerText),
        menuMarks: entries.some(
          (e) =>
            globalThis.getComputedStyle(e, "::before").content !== "none" ||
            globalThis.getComputedStyle(e, "::after").content !== "none",
        ),
      };
    });
    assert.equal(fit.destinations.length, 11);
    assert.equal(new Set(fit.destinations).size, 11);
    assert.deepEqual(fit.clipped, []);
    assert.deepEqual(fit.overflow, []);
    assert.deepEqual(fit.overlap, []);
    assert.deepEqual(fit.playerCardOverlaps, []);
    assert.equal(fit.clockContained, true);
    assert.equal(fit.controlsContained, true);
    assert.equal(fit.menuMarks, false);
    rows.push({ game: c.game, ...fit });
    await p.screenshot({ path: artifactDir + "/" + c.file });
    await p.close();
  }
  fs.writeFileSync(
    artifactDir + "/fit.json",
    JSON.stringify(rows, null, 2) + "\n",
  );
  await browser.close();
  globalThis.console.log(JSON.stringify(rows));
})();
