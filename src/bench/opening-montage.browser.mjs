/* global process, console, document, URL */
// The President's address plays as a montage (owner, Oct 29 02:35 and Nov 1:
// "supposed to start with the president, like in the Oval Office or something,
// and then doing like a montage. But here it's just like I'm just clicking
// continue"): each Continue is the next part of the address with its own
// picture and people: the President in the chamber, the town along a route,
// the officials named by office, and home at the end, the household listening
// without the President among them (CTO, Nov 19). Run against
// a fresh bench: node src/bench/opening-montage.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

// Every picture a home can be: each dwelling's rooms, the regional houses and
// the official residences (scene-places.json), by name.
const homePictures = new Set(
  [
    scenePlaces.dwellingPlaces,
    scenePlaces.regionalHouses,
    scenePlaces.officialResidences,
  ].flatMap((table) =>
    Object.entries(table).flatMap(([key, value]) =>
      key === "about"
        ? []
        : [key, ...(JSON.stringify(value).match(/[a-z0-9-]+/g) ?? [])],
    ),
  ),
);
const pictureName = (file) => file.replace(/__.*$|\.[a-z]+$/g, "");

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const errors = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    const made = page.waitForResponse((r) => r.url().includes("/api/newlife"));
    await page.locator("#new-life").click();
    await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    console.log(
      `${width}x${height} seed`,
      new URL((await made).url()).searchParams.get("seed"),
    );
    await page.waitForFunction(() =>
      document.getElementById("card-name").textContent.trim(),
    );
    console.log("Place:", await page.locator("#card-place").innerText());
    const beats = [];
    for (let i = 0; i < 24; i += 1) {
      await page.waitForTimeout(500);
      await page.waitForFunction(
        () => document.getElementById("backdrop").complete,
      );
      await page.waitForTimeout(1200);
      if (!(await page.locator("#talk:visible").count())) break;
      const state = await page.evaluate(() => ({
        backdrop: document.getElementById("backdrop").src.split("/").at(-1),
        people: document.querySelectorAll("#talk-strip .busts-person").length,
        strip: document.getElementById("talk-strip").innerText,
        text: document.getElementById("talk-lines").innerText,
        who: document.getElementById("talk-name").textContent,
      }));
      if (state.text.trim() && state.who.trim()) {
        beats.push(state);
        if (shots && beats.length <= 12)
          await page.screenshot({
            path: `${shots}/beat-${beats.length}-${width}x${height}.png`,
          });
      }
      const next = page.locator("#talk-next:visible");
      if (!(await next.count())) break;
      await next.click();
    }
    for (const [at, beat] of beats.entries())
      console.log(
        `  ${at + 1}. ${beat.backdrop} · ${beat.people} people · ${beat.text.replace(/\n+/g, " / ").slice(0, 110)}`,
      );
    const pictures = new Set(beats.map((beat) => beat.backdrop));
    // Since the speech outline (Nov 12) an address is two parts or more.
    assert.ok(beats.length >= 2, `the address has only ${beats.length} parts`);
    assert.match(
      beats[0].backdrop,
      /^oval-/,
      "the inaugural does not start at the Oval Office window",
    );
    assert.ok(
      beats[0].people >= 1,
      "the President is not on the strip at the Oval Office window",
    );
    // Each part its own picture, up to three: the chamber, a cutaway, home.
    assert.ok(
      pictures.size >= Math.min(3, beats.length),
      `only ${pictures.size} pictures: ${[...pictures]}`,
    );
    assert.ok(
      homePictures.has(pictureName(beats.at(-1).backdrop)),
      `the address does not end at home: ${beats.at(-1).backdrop}`,
    );
    // At home only the household listens: the President is on the set,
    // never on the strip among them (the Player's beat 4, #9995 Nov 19
    // 09:40Z). The cutaways between (the country along a route, the state's
    // capitol) are the owner's montage and keep their pictures.
    for (const [at, beat] of beats.entries())
      if (beat.backdrop.startsWith("train-depot"))
        assert.ok(
          !beat.strip.includes(beat.who.trim()),
          `part ${at + 1}: ${beat.who} stands on the strip in the America cutaway as well as on the set`,
        );
    for (const [at, beat] of beats.entries())
      if (beat.backdrop === beats.at(-1).backdrop)
        assert.ok(
          !beat.strip.includes(beat.who.trim()),
          `part ${at + 1}: ${beat.who} stands among the household at home`,
        );
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log("opening montage: pass");
} finally {
  await browser.close();
}
