/* global process, console, document */
// A talk's people (owner, Nov 16: "There's one person, shorten the strip", "She
// should be smaller since she isn't talking", and his Desk answer on the
// speaker). Plays a new life's opening, the President's address, and reads
// every beat: whoever speaks is one bust on the talk card and never among the
// quiet people; the quiet people sit in a band only as wide as they are, each
// smaller than the speaker; and while the narrator speaks nobody is on the card.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const port = process.env.BENCH_PORT ?? 3000;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const u = new URL(route.request().url());
      u.searchParams.set("seed", process.env.BENCH_SEED);
      route.continue({ url: u.toString() });
    });
  await page.goto(`http://localhost:${port}/play`);
  const life = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const made = await life;
  console.log(
    "Seed:",
    new URL(made.url()).searchParams.get("seed"),
    "Place:",
    (await made.json()).placeName,
  );
  await page.locator("#talk").waitFor({ state: "visible", timeout: 120000 });
  const beats = [];
  for (let i = 0; i < 60; i += 1) {
    await page.waitForTimeout(1300);
    if (!(await page.locator("#talk").isVisible())) break;
    beats.push(
      await page.evaluate(() => {
        const wide = (node) => node?.getBoundingClientRect().width ?? 0;
        const strip = document.querySelector("#talk-strip .bust-strip");
        const quiet = [
          ...document.querySelectorAll("#talk-strip .busts-person"),
        ];
        const speaker = [
          ...document.querySelectorAll("#talk-speaker .busts-person"),
        ];
        const face = (cell) => wide(cell.querySelector(".busts-face"));
        return {
          who: document.getElementById("talk-name").textContent.trim(),
          narration: document
            .getElementById("talk")
            .classList.contains("narration"),
          speakers: speaker.length,
          speakerLit: speaker.filter((c) => c.classList.contains("speaking"))
            .length,
          speakerFace: speaker.length ? face(speaker[0]) : 0,
          quiet: quiet.length,
          quietSpeaking: quiet.filter((c) => c.classList.contains("speaking"))
            .length,
          quietFace: Math.max(0, ...quiet.map(face)),
          quietCells: quiet.reduce((sum, c) => sum + wide(c), 0),
          strip: wide(strip),
          talk: wide(document.getElementById("talk")),
        };
      }),
    );
    const next = page.locator("#talk-next");
    const reply = page.locator("#talk-choices .reply").first();
    const leave = page.locator("#talk-leave");
    if (await next.isVisible()) await next.click();
    else if (await reply.isVisible()) await reply.click();
    else if (await leave.isVisible()) await leave.click();
    else break;
  }
  for (const [at, b] of beats.entries())
    console.log(
      `  ${at + 1}. ${b.who || "(narrator)"} · on the card ${b.speakers} · quiet ${b.quiet} · band ${Math.round(b.strip)} of ${Math.round(b.talk)}`,
    );
  assert.ok(beats.length >= 3, `the opening has only ${beats.length} beats`);
  assert.ok(
    beats.some((b) => b.speakers === 1),
    "no beat of the opening put a speaker on the talk card",
  );
  for (const [at, b] of beats.entries()) {
    const where = `beat ${at + 1} (${b.who || "narrator"})`;
    assert.ok(b.speakers <= 1, `${where}: ${b.speakers} busts on the card`);
    assert.equal(
      b.speakerLit,
      b.speakers,
      `${where}: the bust on the card is not the speaker`,
    );
    assert.equal(
      b.quietSpeaking,
      0,
      `${where}: the speaker stands among the quiet people`,
    );
    if (!b.who)
      assert.equal(
        b.speakers,
        0,
        `${where}: a bust on the card with nobody speaking`,
      );
    if (b.quiet) {
      // The band is as wide as its people and the row's padding, no wider.
      assert.ok(
        b.strip <= b.quietCells + 8 * (b.quiet - 1) + 60,
        `${where}: a band ${Math.round(b.strip)} wide for ${b.quiet} people ${Math.round(b.quietCells)} wide`,
      );
      if (b.quiet <= 2)
        assert.ok(
          b.strip < b.talk * 0.6,
          `${where}: ${b.quiet} quiet people get a band ${Math.round(b.strip)} wide on a card ${Math.round(b.talk)} wide`,
        );
      if (b.speakers)
        assert.ok(
          b.quietFace < b.speakerFace * 0.6,
          `${where}: a quiet bust ${Math.round(b.quietFace)} wide beside a speaker ${Math.round(b.speakerFace)} wide`,
        );
    }
  }
  assert.deepEqual(errors, []);
  console.log("talk people: pass");
} finally {
  await browser.close();
}
