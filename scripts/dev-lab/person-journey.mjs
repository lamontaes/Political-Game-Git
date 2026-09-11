#!/usr/bin/env node
/* global console, process, URLSearchParams, document */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { encodeReplayDescriptor } from "../../src/presentation/new-game-identity.ts";

/**
 * One generated adult, all the way through: room, dossier, conversation,
 * clothing selection, save and reload.
 *
 * The question this answers is not "can the compositor draw somebody" — the
 * coverage trace settled that — but "is it the SAME person, still, after every
 * surface and a round trip through storage". So it records the canonical
 * person id and the exact loaded component asset ids at each stage and
 * compares them, rather than comparing screenshots or layer counts, which
 * would agree by coincidence.
 *
 *   node --import tsx scripts/dev-lab/person-journey.mjs [baseUrl] [outDir]
 *
 * Two lanes, because the assignment names both. The child lane starts a
 * ten-year-old and follows an ADULT RELATIVE in their household; the adult
 * lane starts an adult. Nothing here selects a person or a seed to make the
 * run succeed: each lane takes the first household member the shell itself
 * places, and reports what happened to them.
 *
 * It names its Chromium explicitly. @playwright/test here resolves a build
 * this container does not have and cannot download, so the repository config
 * cannot launch at all; the version actually used is printed with the results
 * and must not be passed off as a run on the project's own harness.
 */

const BASE = process.argv[2] ?? "http://127.0.0.1:5173";
const OUT = resolve(process.argv[3] ?? "test-results/person-journey");
const EXECUTABLE = "/opt/pw-browsers/chromium";

const LANES = [
  { name: "child-world-adult-relative", age: 10 },
  { name: "adult-start", age: 34 },
];

function address(age, { preview = true } = {}) {
  const query = new URLSearchParams({
    replay: encodeReplayDescriptor({
      startKind: "custom",
      placeKey: "kentucky",
      startAge: age,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: `person-journey-${age}`,
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    }),
  });
  if (preview) query.set("art-preview", "candidate");
  return `${BASE}/?${query.toString()}`;
}

/** The asset ids actually painted for this person, read off the live DOM. */
async function drawnComponents(page, personId) {
  return page.evaluate((id) => {
    const token = document.querySelector(`[data-testid="scene-person-${id}"]`);
    if (!token) return null;
    return {
      hasArt: token.getAttribute("data-has-art"),
      refusal: token.getAttribute("data-art-refusal") || "",
      diagnostics: token.getAttribute("data-art-diagnostics") || "",
      // The URL is the component's identity on screen. Its basename is the
      // asset file, which is what must not change when nothing about the
      // person changed.
      layers: [...token.querySelectorAll("img")].map((img) =>
        (img.getAttribute("src") ?? "").split("/").pop(),
      ),
    };
  }, personId);
}

async function portraitState(page) {
  return page.evaluate(() => {
    const figure = document.querySelector("[data-likeness]");
    if (!figure) return null;
    return {
      likeness: figure.getAttribute("data-likeness"),
      refusal: figure.getAttribute("data-refusal") || "",
      layers: [...figure.querySelectorAll("img")].map((img) =>
        (img.getAttribute("src") ?? "").split("/").pop(),
      ),
    };
  });
}

async function enterLife(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByTestId("play-screen").waitFor({ timeout: 25000 });
  await page.waitForTimeout(800);
  const skip = page.getByRole("button", { name: /skip introduction/i });
  if (await skip.count()) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
}

/**
 * All the way to the full record, not just the quick look.
 *
 * `action-inspect` opens the QUICK dossier; the full record is a further click
 * from there, and it is the surface that carries the wardrobe controls and the
 * conversation refusal. A run that stopped at the quick dossier reported "no
 * controls on this surface" — true of that surface, and not the question being
 * asked.
 */
async function openDossierFor(page, personId) {
  await page.locator(`[data-testid="rail-person-${personId}"]`).click();
  await page.waitForTimeout(400);
  await page
    .getByTestId("action-inspect")
    .click({ timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(800);
  await page
    .getByRole("button", { name: /full record/i })
    .first()
    .click({ timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(1200);
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
console.log(`browser: ${browser.version()} (${EXECUTABLE})`);
mkdirSync(OUT, { recursive: true });
const report = [];
function say(line) {
  report.push(line);
  console.log(line);
}

for (const lane of LANES) {
  say(`\n=== ${lane.name} (start age ${lane.age}) ===`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await enterLife(page, address(lane.age));

  // Whoever the shell placed. Not chosen to make this pass.
  const railIds = await page
    .locator("[data-testid^='rail-person-']")
    .evaluateAll((nodes) =>
      nodes.map((n) =>
        n.getAttribute("data-testid").replace("rail-person-", ""),
      ),
    );
  if (railIds.length === 0) {
    say("  no household member in the room; nothing to follow");
    await context.close();
    continue;
  }
  const personId = railIds[0];
  say(`  person        ${personId}`);

  /*
   * Everyone the room placed, and what happened to each of them.
   *
   * The person this lane follows is only half the child/adult boundary. The
   * other half is who was REFUSED, and why — a run that only reports the
   * person it succeeded with cannot show that a minor in the same room kept
   * their initials. Both are printed, from the same DOM, in the same moment.
   */
  const everyone = await page
    .locator("[data-testid^='scene-person-']")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: n.getAttribute("data-testid").replace("scene-person-", ""),
        hasArt: n.getAttribute("data-has-art"),
        refusal: n.getAttribute("data-art-refusal") || "",
      })),
    );
  for (const entry of everyone) {
    say(
      `  placed        ${entry.id} drawn=${entry.hasArt}${entry.refusal ? ` refused=${entry.refusal}` : ""}`,
    );
  }

  // 1. ROOM
  const room = await drawnComponents(page, personId);
  say(
    `  room          hasArt=${room?.hasArt} layers=${room?.layers.length ?? 0}`,
  );
  if (room?.refusal) say(`  room refusal  ${room.refusal}`);
  if (room?.diagnostics) say(`  room notes    ${room.diagnostics}`);
  await page.screenshot({ path: resolve(OUT, `${lane.name}-1-room.png`) });

  // 2. DOSSIER
  await openDossierFor(page, personId);
  const dossier = await portraitState(page);
  say(
    `  dossier       likeness=${dossier?.likeness} layers=${dossier?.layers.length ?? 0}${dossier?.refusal ? ` refusal=${dossier.refusal}` : ""}`,
  );
  await page.screenshot({ path: resolve(OUT, `${lane.name}-2-dossier.png`) });

  /*
   * 3. CONVERSATION
   *
   * `action-talk` is DISABLED when `openConversationWith` returns unavailable,
   * and that is a product answer, not a missing feature. A run that clicked
   * blindly and counted zero surfaces reported it as though the conversation
   * had failed; the refusal and its reason are recorded instead, so an
   * unavailable conversation is distinguishable from a broken one.
   */
  await page.locator(`[data-testid="rail-person-${personId}"]`).click();
  await page.waitForTimeout(300);
  const talk = page.getByTestId("action-talk");
  let talkState = "no talk action offered";
  if (await talk.count()) {
    const enabled = await talk.isEnabled();
    if (enabled) {
      await talk.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1200);
      talkState = "opened";
    } else {
      talkState = "refused by the world";
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(300);
      await openDossierFor(page, personId);
      /*
       * The dossier's own refusal element, not a regex over the page. Scraping
       * `main` picked up an unrelated sentence from elsewhere on screen and
       * printed it as the reason, which made the run look like it had caught
       * the game contradicting itself when it had only caught the script
       * reading the wrong line.
       */
      const reason = await page
        .getByTestId("dossier-talk-unavailable")
        .first()
        .innerText()
        .catch(() => "");
      if (reason) talkState += ` — ${reason.trim().slice(0, 140)}`;
    }
  }
  const conversation = await page
    .locator("[data-testid^='conversation-']")
    .count();
  say(`  conversation  ${talkState}; surfaces=${conversation}`);
  await page.screenshot({
    path: resolve(OUT, `${lane.name}-3-conversation.png`),
  });

  // 4. CLOTHING SELECTION
  await openDossierFor(page, personId);
  const controls = page.getByTestId("saved-appearance-controls");
  let chosen = null;
  if (await controls.count()) {
    const catalog = await controls.getAttribute("data-appearance-catalog");
    await controls
      .locator("summary")
      .click()
      .catch(() => {});
    await page.waitForTimeout(400);
    const top = page.locator('select[aria-label="top"]');
    if (await top.count()) {
      const options = await top
        .locator("option")
        .evaluateAll((nodes) =>
          nodes
            .map((n) => n.getAttribute("value"))
            .filter((v) => v && v.length > 0),
        );
      if (options.length) {
        chosen = options[0];
        await top.selectOption(chosen);
        await page.waitForTimeout(900);
      }
    }
    say(
      `  wardrobe      catalog=${catalog} chose=${chosen ?? "(nothing on offer)"}`,
    );
  } else {
    say("  wardrobe      no controls on this surface");
  }
  await page.screenshot({ path: resolve(OUT, `${lane.name}-4-wardrobe.png`) });

  // What the room draws AFTER the choice.
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(800);
  const afterChoice = await drawnComponents(page, personId);
  say(
    `  after choice  hasArt=${afterChoice?.hasArt} layers=${afterChoice?.layers.length ?? 0}`,
  );

  /*
   * 5. SAVE — through the navigation, the way a player reaches it.
   *
   * The save entry lives inside the nav flyout and only on its PRIMARY level,
   * so a run that looked for the button on the page found nothing and reported
   * "not reachable", which reads like a product defect and was a script
   * standing in the wrong menu. Two attempts, and a failure prints what the
   * flyout actually offered rather than a bare negative.
   */
  const cluster = page.getByTestId("shell-nav-cluster");
  const save = page
    .getByTestId("keep-world")
    .or(page.getByTestId("save-world"));
  let saved = false;
  for (let attempt = 0; attempt < 3 && !saved; attempt += 1) {
    await cluster.click({ timeout: 5000 }).catch(() => {});
    await page
      .getByTestId("shell-nav-flyout")
      .waitFor({ timeout: 5000 })
      .catch(() => {});
    if (await save.count()) {
      await save.first().click({ timeout: 5000 });
      await page.waitForTimeout(3000);
      saved = true;
      break;
    }
    const offered = await page
      .locator("[data-testid='shell-nav-flyout'] [data-testid]")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-testid")))
      .catch(() => []);
    say(`  nav offered   ${offered.join(" ") || "(flyout not open)"}`);
    // Close it again so the next attempt starts from a known state.
    await cluster.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  say(
    `  save          ${saved ? "clicked through navigation" : "control not reachable"}`,
  );
  await page.screenshot({ path: resolve(OUT, `${lane.name}-5-saved.png`) });

  /*
   * 6. RELOAD — by OPENING THE SAVE, which is the only thing that tests it.
   *
   * Reloading the replay address rebuilds the same world from its descriptor
   * with no save id attached, so the saved shell state — which is where a
   * wardrobe choice lives — is never read. That run reported a persistence
   * failure that belonged entirely to the route it took. The real path leaves
   * the life, comes back through the title screen and opens the save, in the
   * same browser context so the preview's own database is still there.
   */
  await page.goto(`${BASE}/?art-preview=candidate`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("title-screen").waitFor({ timeout: 20000 });
  await page.getByTestId("open-saves").click({ timeout: 5000 });
  await page.getByTestId("saves-screen").waitFor({ timeout: 10000 });
  const entries = await page.getByTestId("save-entry").count();
  say(`  saved games   ${entries}`);
  if (entries > 0) {
    await page
      .getByTestId("save-entry")
      .first()
      .getByRole("button", { name: /open|continue|play/i })
      .first()
      .click({ timeout: 5000 })
      .catch(async () => {
        await page
          .getByTestId("save-entry")
          .first()
          .locator("button")
          .first()
          .click({ timeout: 5000 });
      });
    await page.getByTestId("play-screen").waitFor({ timeout: 20000 });
  }
  await page.waitForTimeout(2500);
  const reloadedRoom = await drawnComponents(page, personId);
  say(
    `  after reload  hasArt=${reloadedRoom?.hasArt} layers=${reloadedRoom?.layers.length ?? 0}`,
  );
  await page.screenshot({ path: resolve(OUT, `${lane.name}-6-reloaded.png`) });

  // THE ACTUAL CLAIM: same person, same components.
  const same = (a, b) =>
    a && b && JSON.stringify(a.layers) === JSON.stringify(b.layers);
  /*
   * Two different claims, kept apart.
   *
   * room vs after-choice asks whether choosing clothes changed anything it
   * should not have — the body, head, hair and the rest must be identical and
   * only the chosen garment may move. after-choice vs after-reload is the
   * persistence claim, and it is the one a run can accidentally pass by losing
   * the choice and landing back on the original.
   */
  say(
    `  identity      room==after-choice ${same(room, afterChoice)} (expected false once a garment is chosen)`,
  );
  say(
    `  PERSISTENCE   after-choice==after-reload ${same(afterChoice, reloadedRoom)}`,
  );
  if (room?.layers?.length) {
    say(`  components    ${room.layers.join(" ")}`);
  }
  if (afterChoice?.layers?.length) {
    say(`  after choice  ${afterChoice.layers.join(" ")}`);
  }
  if (reloadedRoom?.layers?.length) {
    say(`  after reload  ${reloadedRoom.layers.join(" ")}`);
  }

  await context.close();
}

await browser.close();
writeFileSync(resolve(OUT, "journey.txt"), `${report.join("\n")}\n`);
console.log(`\nreport: ${resolve(OUT, "journey.txt")}`);
console.log(
  "Unreleased candidate pixels, photographed for review. Nothing is approved by taking a picture of it.",
);
