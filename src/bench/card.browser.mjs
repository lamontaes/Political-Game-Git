/* global process, console, document, URL, getComputedStyle */
// play-stop-12: the status card bottom left never covers the six menu icons
// above it, and the player's name stays on one line, whatever its status line
// says. Starts a drawn life on the bench, then reads the card with the status
// line the door-knocking scene writes ("Knock on doors · 36 doors · 5
// reached") and with none, at 1440 by 1000, 1440 by 900 and 1024 by
// 768 (the desktop window's smallest is 960 wide).
// Run: BENCH_BROWSER=<chromium> node src/bench/card.browser.mjs (bench on :3000)
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const titled = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
  await titled;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(500);
    for (const why of ["", "Knock on doors · 36 doors · 5 reached"]) {
      await page.evaluate((text) => {
        document.getElementById("card-why").textContent = text;
      }, why);
      const read = await page.evaluate(() => {
        const box = document.getElementById("card");
        const card = box.getBoundingClientRect();
        const name = document.getElementById("card-name");
        const line = parseFloat(getComputedStyle(name).lineHeight) || 20;
        const rings = [...document.querySelectorAll("#rings [data-tab]")];
        const blocked = rings
          .filter((ring) => {
            const r = ring.getBoundingClientRect();
            const top = document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            );
            return !(top === ring || ring.contains(top));
          })
          .map((ring) => ring.dataset.tab);
        return {
          cardTop: card.top,
          cardWidth: card.width,
          // Any of the card's own text or controls past its edge.
          cardOverflow: [...box.querySelectorAll("*")].some((e) => {
            const r = e.getBoundingClientRect();
            return (
              r.width > 0 &&
              (r.right > card.right + 1 || r.left < card.left - 1)
            );
          }),
          ringsBottom: Math.max(
            ...rings.map((ring) => ring.getBoundingClientRect().bottom),
          ),
          rings: rings.length,
          rail: rings.map((ring) => {
            const r = ring.getBoundingClientRect();
            return {
              tab: ring.dataset.tab,
              x: Math.round(r.left),
              y: r.top,
              round:
                Math.abs(r.width - r.height) < 1 &&
                getComputedStyle(ring).borderRadius === "50%",
            };
          }),
          blocked,
          nameLines: Math.round(name.getBoundingClientRect().height / line),
          busts: box.querySelectorAll(".bust").length,
          nameShown:
            box.querySelector(".card-id").getBoundingClientRect().width > 2,
          clockShown:
            document.getElementById("card-clock").getBoundingClientRect()
              .height > 10,
        };
      });
      const at = `${size.width}x${size.height}, status "${why}"`;
      console.log(`${at}:`, JSON.stringify(read));
      assert.equal(
        read.rings,
        9,
        `${at}: the nine rail icons are not all there`,
      );
      // The rail (MOCKS:24): one column of round icons, News among them, the
      // Guide its own entry (owner, Oct 28, point 23), no Options.
      assert.deepEqual(
        read.rail.map((ring) => ring.tab),
        [
          "who",
          "journal",
          "calendar",
          "money",
          "politics",
          "news",
          "people",
          "travel",
          "guide",
        ],
        `${at}: the rail's icons and their order`,
      );
      assert.equal(
        new Set(read.rail.map((ring) => ring.x)).size,
        1,
        `${at}: not one column`,
      );
      read.rail.forEach((ring, index) => {
        assert.ok(ring.round, `${at}: ${ring.tab} is not round`);
        if (index > 0)
          assert.ok(
            ring.y > read.rail[index - 1].y,
            `${at}: ${ring.tab} is not below the one before`,
          );
      });
      assert.deepEqual(read.blocked, [], `${at}: icons covered`);
      assert.ok(
        read.cardTop >= read.ringsBottom,
        `${at}: the card reaches the icons`,
      );
      assert.ok(!read.cardOverflow, `${at}: the card's text runs out of it`);
      // The card shows the date and time and no picture of the player
      // (owner, Oct 27); the name is read aloud, not shown.
      assert.ok(!read.nameShown, `${at}: the name is shown on the card`);
      assert.equal(read.busts, 0, `${at}: a picture of the player on the card`);
      assert.ok(read.clockShown, `${at}: no date and time on the card`);
    }
    await page.screenshot({
      path: `docs/reports/card-2026-10-25/card-${size.width}x${size.height}.png`,
    });
    // With the door-knocking status line on the card, an ordinary pointer
    // click opens each of the nine icons' screens; the keyboard opens Calendar.
    await page.evaluate((text) => {
      document.getElementById("card-why").textContent = text;
    }, "Knock on doors · 36 doors · 5 reached");
    for (const tab of await page
      .locator("#rings [data-tab]")
      .evaluateAll((all) => all.map((ring) => ring.dataset.tab))) {
      await page.locator(`#rings [data-tab="${tab}"]`).click();
      await page
        .locator("#sheet:not([hidden])")
        .waitFor({ timeout: 10000 })
        .catch(() =>
          assert.fail(`${size.width}x${size.height}: ${tab} did not open`),
        );
      await page.locator("#sheet-close").click();
      await page.locator("#sheet").waitFor({ state: "hidden", timeout: 10000 });
    }
    await page.locator('#rings [data-tab="calendar"]').focus();
    await page.keyboard.press("Enter");
    await page.locator("#sheet:not([hidden])").waitFor({ timeout: 10000 });
    await page.locator("#sheet-close").click();
    await page.locator("#sheet").waitFor({ state: "hidden", timeout: 10000 });
  }
  await page.evaluate(() => {
    document.getElementById("card-why").textContent = "";
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS at 1440x1000, 1440x900 and 1024x768 the card keeps below the round rail icons, a column of nine with Who you are, News and the Guide, its text inside it, the date and time and no picture; each icon opens by pointer, Calendar by keyboard",
  );
} finally {
  await browser.close();
}
