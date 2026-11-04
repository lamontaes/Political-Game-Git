import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { playOpening } from "../../../src/bench/start-life.mjs";
import { chromium } from "playwright";
const root = fileURLToPath(
  new URL("../../../test-results/lane-2-first-minutes/", import.meta.url),
);
mkdirSync(root, { recursive: true });
const towns = [
  ["Haleyville", "US-AL", "0132704", "ab5f58e9be125c95"],
  ["Murray", "US-NE", "3133425", "1d3f0e18ca4ba7e5"],
  ["Meadow Lakes", "US-AK", "0247735", "f835dd278d7312a1"],
  ["Brookside", "US-DE", "1009850", "4d50e1f88df997f9"],
  ["Storrs", "US-CT", "0973980", "storrs-1"],
  ["Washington", "US-DC", "1150000", "dc-closures-a"],
  ["Cabo Rojo", "US-PR", "7209861", "f857db7436bf7449"],
  ["Santa Rita", "US-GU", "territory:GU:santa-rita", "6f539fcfdf6d96f9-5"],
];
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const results = [];
try {
  for (const [name, state, key, replay] of towns) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto("http://localhost:3000/play");
      await page.locator("#new-life").click();
      await page.locator("#new-advanced").click();
      await page.locator("#seed").fill(replay);
      await page.locator("#advanced-back").click();
      await page.locator("#new-start").click();
      await page.locator("[data-gender=female]").click();
      await page.locator("#cr-random-name").click();
      await page.waitForFunction(
        () => document.getElementById("cr-given").value,
      );
      await page.locator("#cr-month").selectOption("1");
      await page.locator("#cr-day").selectOption("27");
      await page.waitForFunction(() =>
        [...document.getElementById("cr-year").options].some(
          (x) => x.value === "2007",
        ),
      );
      await page.locator("#cr-year").selectOption("2007");
      await page.locator("#cr-character-next").click();
      await page.locator(`[data-testid="state-${state}"]`).click();
      const wait = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/api/creator/towns" &&
          new URL(r.url()).searchParams.get("q") === name,
      );
      await page.locator("#cr-town-search").fill(name);
      const found = await (await wait).json();
      const ix = found.findIndex((t) => t.key === key);
      assert(ix >= 0, `${name} ${key} is offered`);
      await page.locator("#cr-towns .town").nth(ix).click();
      await page.locator("#cr-look:not([hidden])").waitFor();
      const actualTown = await page
        .locator("#cr-place-summary-name")
        .innerText();
      console.log(
        JSON.stringify({ phase: "opening", name, key, replay, actualTown }),
      );
      const made = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/newlife",
        { timeout: 600000 },
      );
      await page.locator("#cr-begin").click();
      const response = await made;
      assert.equal(response.status(), 200, await response.text());
      await page.locator("#card:not([hidden])").waitFor({ timeout: 300000 });
      const read = async (path) => {
        const r = await page.request.get("http://localhost:3000" + path);
        assert.equal(r.status(), 200);
        return r.json();
      };
      let title = await read("/api/title");
      const id = title.life.personId;
      const openingDate = title.life.date;
      await playOpening(page, (await response.json()).sceneMomentId ?? null);
      title = await read("/api/title");
      assert.equal(
        title.life.date,
        openingDate,
        "opening remains on its first date",
      );
      const card = await read(`/api/card?id=${id}`);

      await page.screenshot({
        path: `${root}/${key.replaceAll(":", "-")}.png`,
      });
      const scene = await read(`/api/scene?id=${id}`);
      const relations = [...(card.home?.members ?? []), ...card.ties];
      const family = [];
      for (const r of new Map(
        relations
          .filter((r) =>
            /mother|father|parent|sister|brother|sibling/.test(
              r.relation ?? "",
            ),
          )
          .map((r) => [r.personId, r]),
      ).values()) {
        const other = await read(`/api/card?id=${r.personId}`);
        family.push({ relation: r.relation, ...other });
        if (/sister|brother|sibling/.test(r.relation) && other.alive)
          assert.notEqual(
            other.name.split(" ")[0].toLowerCase(),
            card.name.split(" ")[0].toLowerCase(),
          );
        if (/mother|father|parent/.test(r.relation)) {
          const fifteenth =
            String(Number(other.birthDate.slice(0, 4)) + 15) +
            other.birthDate.slice(4);
          assert(
            fifteenth <= card.birthDate,
            `${other.name} must be 15 at player's birth`,
          );
        }
      }
      assert(card.dwelling, "player home has a housing record");
      assert.deepEqual(errors, []);
      const row = {
        name,
        key,
        replay,
        actualTown,
        newlifeURL: response.url(),
        life: title.life,
        card,
        family,
        scene,
        errors,
      };
      results.push(row);
      writeFileSync(`${root}/results.json`, JSON.stringify(results, null, 2));
      console.log(
        JSON.stringify({
          phase: "browser-pass",
          name,
          key,
          replay,
          personId: id,
          parents: family.filter((r) => /mother|father|parent/.test(r.relation))
            .length,
          siblings: family.filter((r) =>
            /sister|brother|sibling/.test(r.relation),
          ).length,
          room: scene.place,
          backdrop: scene.backdrop,
          dwelling: card.dwelling.id,
        }),
      );
    } catch (e) {
      await page
        .screenshot({ path: `${root}/failure-${key.replaceAll(":", "-")}.png` })
        .catch(() => {});
      throw e;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
