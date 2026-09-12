#!/usr/bin/env node
/* global console, process, URLSearchParams */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { encodeReplayDescriptor } from "../../src/presentation/new-game-identity.ts";

/**
 * Named screenshots of the development art preview, for owner judgement.
 *
 * The owner is being asked to decide whether banked candidate art is good
 * enough to promote. That decision cannot be made from a layer count or a test
 * result, so this drives the ordinary shell in a real browser, with the preview
 * on, and writes named pictures of what it draws — the good and the visibly
 * wrong alike. Nothing here approves anything.
 *
 *   node --import tsx scripts/dev-lab/art-preview-shots.mjs [baseUrl] [outDir]
 *
 * `--import tsx` because the replay descriptor is encoded by the application's
 * own encoder rather than by a second copy of the format written here.
 *
 * It does NOT use the repository's Playwright config, deliberately. That config
 * resolves a Chromium build this container does not have, and a checkout-
 * specific browser path does not belong on a branch other people build. The
 * executable is named here, in a script that is explicitly local, and the
 * version it used is printed with the results so a picture is never mistaken
 * for one taken on the project's own harness.
 */

const BASE = process.argv[2] ?? "http://127.0.0.1:5173";
const OUT = resolve(process.argv[3] ?? "test-results/art-preview-shots");
const EXECUTABLE = "/opt/pw-browsers/chromium";

/**
 * Two ages, one address apart.
 *
 * The adult lane is the one the preview exists for. The child lane is the
 * control: the banked bodies are adult bodies, so a ten-year-old must still be
 * initials, and a picture of that is worth as much as a picture of the figure.
 */
const LANES = [
  { name: "adult-preview-on", age: 34, preview: true },
  { name: "adult-preview-off", age: 34, preview: false },
  { name: "child-preview-on", age: 10, preview: true },
  { name: "child-preview-off", age: 10, preview: false },
];

/*
 * The replay address, not a click-through.
 *
 * `PlayerGame` rebuilds the exact world a replay descriptor names and drops
 * straight into play, so the two lanes below are the SAME life with and without
 * the preview — nothing about the person differs between the pictures except
 * which art library drew them. Driving the creator by hand would give two
 * separately-generated lives and make the comparison worthless.
 */
function address({ age, preview }) {
  const query = new URLSearchParams({
    replay: encodeReplayDescriptor({
      startKind: "custom",
      placeKey: "kentucky",
      startAge: age,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: `art-preview-shot-${age}`,
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    }),
  });
  if (preview) query.set("art-preview", "candidate");
  return `${BASE}/?${query.toString()}`;
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
console.log(`browser: ${browser.version()} (${EXECUTABLE})`);
mkdirSync(OUT, { recursive: true });

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});

for (const lane of LANES) {
  const page = await context.newPage();
  await page.goto(address(lane), { waitUntil: "domcontentloaded" });
  // The title screen is where every session starts; the shot is of whatever the
  // shell actually shows, not of a surface forced open behind its own routing.
  // The play screen, or the title screen if the replay failed — either way the
  // picture is of what the shell actually did, never of a surface forced open.
  await page
    .getByTestId("play-screen")
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(1000);
  // Past the introduction: the room is what is being reviewed, and the opening
  // panel sits over the half of it people stand in.
  const skip = page.getByRole("button", { name: /skip introduction/i });
  if (await skip.count()) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  const file = resolve(OUT, `${lane.name}-entry.png`);
  await page.screenshot({ path: file, fullPage: false });

  const banner = await page
    .getByTestId("art-preview-banner")
    .count()
    .catch(() => 0);
  const tokens = await page
    .locator("[data-testid^='scene-person-']")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        const images = [...node.querySelectorAll("img")].map((img) => {
          const rect = img.getBoundingClientRect();
          return `${img.complete && img.naturalWidth > 0 ? "loaded" : "BROKEN"}:${img.naturalWidth}x${img.naturalHeight}->${Math.round(rect.width)}x${Math.round(rect.height)}`;
        });
        return `${node.getAttribute("data-testid")} art=${node.getAttribute("data-has-art")} box=${Math.round(box.width)}x${Math.round(box.height)}@${Math.round(box.left)},${Math.round(box.top)} refusal=${node.getAttribute("data-art-refusal") || "none"} diagnostics=${node.getAttribute("data-art-diagnostics") || "none"}\n              layers ${images.join(" ") || "(none)"}`;
      }),
    )
    .catch(() => []);
  console.log(`${lane.name}`);
  console.log(`  shot        ${file}`);
  console.log(`  banner      ${banner > 0 ? "shown" : "absent"}`);
  for (const token of tokens) console.log(`  scene       ${token}`);
  if (!tokens.length) console.log("  scene       (no people placed)");

  /*
   * The figure on its own, cropped to the box the room reserved for it.
   * The moment panel sits over the lower half of the room, so a full-page shot
   * of a standing person is mostly interface; this is the picture somebody
   * accepts or rejects the art from.
   */
  const figure = page
    .locator("[data-testid^='scene-person-'][data-has-art='true']")
    .first();
  if (await figure.count()) {
    const file = resolve(OUT, `${lane.name}-figure.png`);
    await figure.screenshot({ path: file }).catch(() => {});
    console.log(`  figure      ${file}`);
  }

  /*
   * The dossier: the same canonical person, on a different surface.
   *
   * The figure in the room is composed from body art rather than a likeness,
   * so the portrait to look at is the one the dossier opens. Getting there is
   * the ordinary route a player takes — click the person standing there, then
   * Look at them.
   */
  const rail = page.locator("[data-testid^='scene-person-']").first();
  if (await rail.count()) {
    await rail.click().catch(() => {});
    await page.waitForTimeout(500);
    await page
      .getByTestId("action-inspect")
      .click({ timeout: 3000 })
      .catch(() => {});
    await page.waitForTimeout(1200);
    const dossierFile = resolve(OUT, `${lane.name}-dossier.png`);
    await page.screenshot({ path: dossierFile });
    console.log(`  dossier     ${dossierFile}`);
  }
  const opened = await page
    .locator("[data-likeness]")
    .evaluateAll((nodes) =>
      nodes.map(
        (node) =>
          `${node.getAttribute("data-likeness")}|${node.getAttribute("data-refusal") ?? ""}`,
      ),
    )
    .catch(() => []);
  console.log(
    `  portraits   ${opened.length ? opened.join(" ; ") : "(none on screen)"}`,
  );
  await page.close();
}

await context.close();
await browser.close();
console.log(
  "\nThese are unreleased candidate pixels photographed for review. Nothing is approved by taking a picture of it.",
);
