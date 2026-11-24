/* global process, console, document */
// Politics > Government > Executive lists each government's officers under that government's own
// name, and writes each office title as written (a county's "Attorney for the Commonwealth" is
// not lowercased), in drawn places until one has officers of a government besides the chief's.
// Run against a fresh bench: node src/bench/government-officers.browser.mjs [shot-path]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const PLACES = Number(process.env.BENCH_PLACES ?? 6);
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
let proven = 0;
try {
  for (let run = 0; run < PLACES && !proven; run++) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(60000);
    try {
      const { placeName, seed } = await startLife(page, { fresh: true });
      const bodies = page.waitForResponse(
        (r) => r.url().includes("/api/government/bodies"),
        { timeout: 60000 },
      );
      await page
        .locator('#rings [data-tab="politics"]')
        .first()
        .evaluate((b) => b.click());
      await page
        .locator("#sheet button", { hasText: "Government" })
        .first()
        .click();
      const first = await (await bodies).json();
      if (!first.executive.length) {
        console.log(
          `${placeName} (${seed}): no executive branch, drawing again`,
        );
        continue;
      }
      await page.locator('[data-branch="executive"]').first().click();
      await page.locator(".hispeople").first().waitFor();
      const chief = first.executive.find((e) => e.chief) ?? first.executive[0];
      const others = first.executive.filter(
        (e) => e !== chief && e.members.length,
      );
      const governments = new Set(
        others.map((e) => e.government ?? e.title ?? ""),
      );
      const shown = await page.evaluate(() =>
        [...document.querySelectorAll("section.sec")].map((s) => ({
          heading: s.querySelector(".sechead")?.textContent ?? "",
          text: s.querySelector(".hispeople")?.textContent ?? "",
        })),
      );
      // Every office title shows as written in its government's own list.
      for (const office of others) {
        const group = shown.find((s) =>
          s.heading.endsWith(office.government ?? office.title ?? ""),
        );
        assert.ok(group, `${office.title}: no list under ${office.government}`);
        assert.ok(
          group.text.includes(`(${office.title})`),
          `${office.title}: title not shown as written in "${group.text}"`,
        );
      }
      if (
        ![...governments].some((g) => g !== (chief.government ?? chief.title))
      ) {
        console.log(
          `${placeName} (${seed}): the chief's government only, drawing again`,
        );
        continue;
      }
      proven++;
      console.log(
        `government-officers: ${placeName} (${seed}): ${others.length} offices, listed under ${[...governments].join(" and ")}`,
      );
      if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
    } finally {
      await page.close();
    }
  }
  if (!proven)
    console.log(
      "government-officers: NoCase, no drawn place had a second government's officers",
    );
} finally {
  await browser.close();
}
