/* global process, URL, console, document, fetch, setTimeout */
// The bill stage (legislation mocks, Nov 8): a member drafts a bill, the dev route holds its
// floor vote, and the bill's paper then shows the floor result by name: each chamber's yes and no,
// every name that has a card opening it.
// Builds a world with the Advanced start (a place drawn from the seed) and steps in as a
// member of a body. BENCH_SEED replays a world; SHOTS_DIR saves the screens.
// Run against a fresh bench: node src/bench/meeting.browser.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const visible = (id) =>
  page
    .locator(`#${id}`)
    .isVisible()
    .catch(() => false);
try {
  if (process.env.BENCH_SEED)
    await page.route("**/api/newlife*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.BENCH_SEED);
      return route.continue({ url: url.toString() });
    });
  // A place can have no body to step in as (a seat of one executive); take a new draw and name it.
  let seed = "";
  let names = [];
  let at = -1;
  for (let attempt = 1; attempt <= 5 && at < 0; attempt += 1) {
    const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
    await page.goto(`http://localhost:${process.env.BENCH_PORT ?? 3000}/play`);
    await ready;
    await page.locator("#new-life").click();
    const built = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#new-advanced").click();
    await page.locator("#front-advanced:not([hidden])").waitFor();
    await page.locator("#advanced-build").click();
    seed = new URL((await built).url()).searchParams.get("seed");
    await page.locator("#front-pick:not([hidden])").waitFor();
    names = await page.locator("#pick-list button").allInnerTexts();
    at = names.findIndex((t) =>
      new RegExp(
        process.env.BENCH_ROLE ??
          "council|commissioner|alderm|trustee|supervisor|selectm",
        "i",
      ).test(t),
    );
    if (at < 0)
      console.log(
        `unusable draw ${attempt}: seed ${seed}, no member of a body`,
      );
  }
  assert.ok(at >= 0, "no member of a body to step in as in five draws");
  await page.locator("#pick-list button").nth(at).click();
  await page.locator("#pick-play").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
    "Player:",
    names[at],
  );
  for (let i = 0; i < 20; i += 1) {
    if (await visible("talk-next")) await page.locator("#talk-next").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  // Control binds when the clock next advances: play a day, then clear what the day brings.
  await page.locator("#week").click();
  for (let i = 0; i < 20; i += 1) {
    const replies = page.locator("#talk-choices .reply");
    if ((await replies.count()) > 0 && (await replies.first().isVisible()))
      await replies.first().click();
    else if (await visible("talk-next"))
      await page.locator("#talk-next").click();
    else if (await visible("talk-leave"))
      await page.locator("#talk-leave").click();
    else if (await visible("continue")) await page.locator("#continue").click();
    else if (!(await page.locator("#week").isDisabled())) break;
    await page.waitForTimeout(800);
  }
  // The player has worked beside their colleagues for a while (dev mode records the hours of contact), so the
  // colleagues who back a bill and know them sign on when they introduce it.
  await page.evaluate(() =>
    fetch("/api/dev/work-beside-colleagues", { method: "POST" }),
  );
  // The draft card: the issue, what is in force today and the new amount.
  await page
    .locator('#rings [data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.waitForTimeout(1200);
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Your office" })
    .click();
  // The drafts are on their own tab of Your office.
  // One page needs no tab bar (a member of Congress has the drafts page only).
  await page.locator(".office-board").waitFor();
  const draftTab = page.locator('.office-tabs [data-office="draft"]');
  if (await draftTab.isVisible()) await draftTab.click();
  // Writing a bill opens from the board: a list of subjects beside the chosen one's page.
  await page.locator('.office-board [data-act="write-a-bill"]').first().click();
  await page.locator(".draft-card .pick").first().waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/draft-card.png` });
  const chosen = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll(".draft-card .pick")];
    const allowed = rows.filter(
      (o) =>
        o.dataset.value.startsWith("series:") &&
        !/Not a power|preempts|levy no|restricts|bars/i.test(o.textContent),
    );
    // The sales tax where the body may draft it (the case the merger found), else the first issue with
    // an amount in force today: staff redraft a section against the law in force, so one that is not set has nothing to redraft.
    // A row carries what is in force today as its aside.
    const todayOf = (option) => option.querySelector("span")?.textContent ?? "";
    const ordered = [
      ...allowed.filter((o) => /Sales tax rate/i.test(o.textContent)),
      ...allowed.filter((o) => !/Sales tax rate/i.test(o.textContent)),
    ];
    const option = ordered.find(
      (o) => todayOf(o) && !/not set/i.test(todayOf(o)),
    );
    // No subject with a law in force is named, never drafted around: the
    // redraft below needs one, and a body with none is a finding about the place.
    if (!option)
      return { none: allowed.map((o) => o.querySelector("b").textContent) };
    option.click();
    await new Promise((done) => setTimeout(done, 100));
    return {
      issue: option.querySelector("b").textContent,
      today: document.querySelector(".draft-today").textContent,
      unit: document.querySelector(".draft-unit").textContent,
    };
  });
  assert.ok(
    !chosen.none,
    `seed ${seed}: no subject this body may draft has a law in force today (${(chosen.none ?? []).join(", ")})`,
  );
  console.log("draft card:", chosen);
  assert.ok(chosen.today, "the draft card shows nothing in force today");
  await page.locator(".draft-card input").fill("2");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/draft-card-filled.png` });
  await page
    .locator(".draft-card button", { hasText: /^Draft$/ })
    .first()
    .click();
  await page.waitForTimeout(2500);
  // Open the paper once to learn the bill's id from the request, then hold the vote.
  const asked = page.waitForRequest((r) =>
    r.url().includes("/api/bill?billId="),
  );
  await page
    .locator("#sheet-body button", { hasText: /Read the bill/ })
    .first()
    .click();
  const billId = new URL((await asked).url()).searchParams.get("billId");
  assert.ok(billId, "the paper names its bill");
  await page.locator(".bill-doc").waitFor();
  // The paper's civic terms are marked wherever they appear (the inline glossary): each opens its definition.
  const terms = await page.evaluate(() =>
    [...document.querySelectorAll(".bill-doc [data-term-key]")].map((n) =>
      n.getAttribute("data-term-key"),
    ),
  );
  console.log("paper terms:", JSON.stringify(terms));
  assert.ok(terms.length > 0, "the paper marks its civic terms");
  // Colleagues tell the player where they stand (dev mode records it as a conversation does); the paper
  // then carries what members told the player and the aide's estimate, in words and marked as able to be wrong.
  const told = await page.evaluate(async (id) => {
    await fetch("/api/dev/learn-stakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billId: id }),
    });
    const v = await (
      await fetch(`/api/bill/stage?billId=${encodeURIComponent(id)}`)
    ).json();
    return {
      aide: v.aide,
      told: v.told.length,
      cosponsors: v.cosponsors,
      // Colleagues who are full people and told the player they back the bill: the ones who can sign on.
      backing: v.told.filter((t) => t.side === "for" && t.personId).length,
    };
  }, billId);
  console.log("after colleagues told the player:", JSON.stringify(told));
  // Who signs on is decided when the bill is drafted (the cosponsor rule): members whose position on
  // the bill is already for it and who stand close to the sponsor. That is not the set who tell the
  // player afterwards where they stand, so the check claims what the rule makes: every cosponsor is a
  // member of a body in this world and is not the sponsor, and a colleague who told the player they
  // back the bill is not assumed to have signed on.
  if (told.told === 0)
    console.log(
      "no colleagues in this draw: the player's seat has no body to tell them where they stand",
    );
  const sign = await page.evaluate(async (id) => {
    const v = await (
      await fetch(`/api/bill/stage?billId=${encodeURIComponent(id)}`)
    ).json();
    const bodies = await (await fetch("/api/dev/lawmaking-bodies")).json();
    const members = new Set(bodies.flatMap((b) => b.members.map((m) => m.key)));
    return {
      sponsor: v.sponsor,
      cosponsors: v.cosponsors,
      outside: v.cosponsors.filter(
        (c) => !c.personId || !members.has(c.personId),
      ).length,
    };
  }, billId);
  console.log("cosponsors:", JSON.stringify(sign.cosponsors));
  assert.ok(
    !sign.cosponsors.some((c) => c.name === sign.sponsor),
    "a member does not sign on to their own bill",
  );
  assert.equal(
    sign.outside,
    0,
    "every cosponsor is a member of a body in this world",
  );
  // Back to the seat by its tab (a menu has no Back), and open the paper again: it now says what the aide expects.
  await page.locator('#sheet-tabs .tab[aria-pressed="true"]').click();
  await page.waitForTimeout(800);
  await page
    .locator("#sheet-body button", { hasText: /Read the bill/ })
    .first()
    .click();
  await page.locator(".bill-doc").waitFor();
  const paperAfter = await page.locator("#sheet-body").innerText();
  console.log("aide on the paper:", /aide/i.test(paperAfter));
  // The paper names its cosponsors when someone signed on (above: who does follows who backs the bill
  // in this draw); a bill with none has no such line.
  if (told.cosponsors.length)
    assert.match(paperAfter, /Cosponsors/, "the paper names its cosponsors");
  else
    assert.doesNotMatch(
      paperAfter,
      /Cosponsors/,
      "a bill with no cosponsors names none",
    );
  assert.match(paperAfter, /aide/i, "the paper carries the aide's estimate");
  assert.match(
    paperAfter,
    /can be wrong/i,
    "the estimate says it can be wrong",
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bill-paper-aide.png` });
  // Staff redraft: ask for section 1, see it struck and inserted, keep the staff's version.
  await page
    .getByRole("button", { name: "Ask staff to redraft section 1" })
    .click();
  await page.locator(".stage-redraft ins").waitFor();
  const redrafted = await page.locator(".stage-redraft ins").innerText();
  console.log("staff redraft:", redrafted);
  await page.getByRole("button", { name: "Keep staff's" }).click();
  await page.locator(".stage-vote").first().waitFor();
  // An amendment: lower section 1 (the difference split with the law in force), then the body votes it.
  await page
    .locator(".stage-vote button", { hasText: /^Lower section 1$/ })
    .click();
  await page.locator(".stage-strike del").waitFor();
  const struck = await page.locator(".stage-strike del").first().innerText();
  const inserted = await page.locator(".stage-insert ins").first().innerText();
  console.log("amendment:", { struck, inserted });
  assert.notEqual(
    struck,
    inserted,
    "the amendment strikes one clause for another",
  );
  await page.getByRole("button", { name: "Call the vote on it" }).click();
  await page
    .locator("b", { hasText: /^(Adopted|Rejected)$/ })
    .first()
    .waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bill-amendment.png` });
  // The player sits on the body, so they may choose their own vote before the floor: No.
  await page.locator(".stage-vote button", { hasText: /^No$/ }).click();
  await page
    .locator(".stage-vote button.chosen", { hasText: /^No$/ })
    .waitFor();
  const held = await page.evaluate(async (id) => {
    const r = await fetch("/api/dev/hold-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billId: id }),
    });
    return r.status;
  }, billId);
  assert.equal(held, 200, "dev mode holds the floor vote");
  // Back to the seat by its tab, and open the paper again: the floor now has a result by name.
  await page.locator('#sheet-tabs .tab[aria-pressed="true"]').click();
  await page.waitForTimeout(800);
  await page
    .locator("#sheet-body button", { hasText: /Read the bill/ })
    .first()
    .click();
  await page.locator(".stage-chamber").first().waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bill-stage.png` });
  const floor = await page.evaluate(() =>
    [...document.querySelectorAll(".stage-chamber")].map((n) => n.innerText),
  );
  console.log("floor result:", floor);
  assert.ok(floor.length > 0, "the floor result is on the paper");
  const mine = await page.evaluate(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  assert.ok(
    floor.some((text) =>
      text
        .split("\n")
        .some((row) => row.startsWith("No:") && row.includes(mine)),
    ),
    `${mine} chose No and is on the floor result`,
  );
  assert.ok(
    floor.every((text) => /\d/.test(text) && text.length > 10),
    "each chamber names its counts and members",
  );
  // Following: the Bills tab lists the bill with where it stands and how your members voted.
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Bills", exact: true })
    .click();
  // Each bill before the town, the state or Congress is a row in the list; a world with none says so.
  await page
    .locator(".roster-screen.bills .roster-row, #sheet-body .sec")
    .first()
    .waitFor();
  const followed = await page.evaluate(() =>
    [
      ...document.querySelectorAll("#sheet-body .roster-row, #sheet-body .sec"),
    ].map((n) => n.innerText),
  );
  console.log("followed bills:", followed.slice(0, 3));
  assert.ok(followed.length > 0, "the Bills tab lists a bill");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/bills-following.png` });
  assert.deepEqual(errors, [], "page errors");
  console.log("ok: the paper shows the floor result by name");
} finally {
  await browser.close();
}
