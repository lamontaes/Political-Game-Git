import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "./fixtures";
import {
  chooseCreatorLocation,
  completeCharacterStep,
  goTo,
  openCreator,
  openMoment,
  passShellTime,
} from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  classifyTexts,
  summarize,
  type Coverage,
  type RenderedText,
} from "../../scripts/runtime-text/classify";
import { buildLiteralIndex } from "../../scripts/runtime-text/literal-index";
import { moduleReport } from "../../scripts/runtime-text/modules";
import {
  installSink,
  readScreenText,
} from "../../scripts/runtime-text/page-side";

/**
 * STUDS-1, "What reaches the player": the text a player reads, with where it
 * came from.
 *
 * A fresh life is started in each of four places drawn at random from all 56,
 * and the screens the run can reach are read: the setup steps, the opening,
 * the room, the moment, and every menu destination, then a day passes and the
 * room is read again. Each rendered string is classified as engine output
 * (registered by the composers), an approved Kit 13 label, a literal resolved
 * to file and line, a record value, or unresolved. The dev server's module
 * requests are compared with every module under src.
 *
 * Output: test-results/runtime-text/<run>.json. Run it with
 *   npm run audit:runtime-text
 *
 * Reaching a screen is best effort: a destination the life does not offer is
 * listed under `notReached` with the reason, never skipped silently.
 */

const PLACES = Number(process.env.AUDIT_PLACES ?? 4);
const DESTINATIONS = [
  "nav-news",
  "elsewhere-people",
  "nav-calendar",
  "nav-journal-entry",
  "nav-jobs",
  "nav-places",
  "nav-finances",
  "nav-municipal",
  "elsewhere-work",
  "nav-parties",
  "nav-politics-budget",
  "nav-politics-tax",
  "nav-politics-transit",
  "nav-politics-conditions",
  "nav-guide",
  "nav-options",
] as const;

const rendered: RenderedText[] = [];
const engine = new Map<string, { bank: string; variant?: string }>();
const coverage = new Map<string, Coverage>();
const requested: string[] = [];
const notReached: { place: string; screen: string; reason: string }[] = [];
const reached: { place: string; screen: string }[] = [];
const places: { place: string; state: string; seed: string }[] = [];

test.describe.configure({ mode: "serial" });
test.use({
  viewport: { width: 1280, height: 800 },
  // A host without Chrome points this at another Chromium build.
  launchOptions: {
    ...(process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {}),
    // Software rendering of the scene art can starve the page on a small host.
    args: process.env.PW_CHROMIUM_NO_GPU ? ["--disable-gpu"] : [],
  },
});

/** Enabled and present now; a missing control is not waited for. */
async function isReady(locator: Locator): Promise<boolean> {
  return (await locator.count()) > 0 && (await locator.isEnabled());
}

async function capture(page: Page, place: string, screen: string) {
  const started = Date.now();
  const items = await page.evaluate(readScreenText);
  console.log(
    `[audit] ${screen}: ${items.length} strings in ${Date.now() - started} ms`,
  );
  for (const item of items)
    rendered.push({ text: item.text, kind: item.kind, screen, place });
  reached.push({ place, screen });
}

async function tryScreen(
  page: Page,
  place: string,
  screen: string,
  open: () => Promise<void>,
) {
  try {
    await open();
    await capture(page, place, screen);
  } catch (error) {
    notReached.push({
      place,
      screen,
      reason: String((error as Error).message)
        .split("\n")[0]!
        .slice(0, 160),
    });
    await page.keyboard.press("Escape").catch(() => undefined);
  }
}

for (let draw = 0; draw < PLACES; draw += 1) {
  const seed = `runtime-text-audit:${draw}`;
  const place = drawRandomPlace(seed, (row) => row.scope === "locality");
  const state = lifePlaceStateIdentities().find(
    (row) => row.jurisdictionKey === place.stateJurisdictionKey,
  )!;
  const label = `${place.displayName} (seed ${seed})`;

  test(`reads what reaches the player in ${label}`, async ({ page }) => {
    test.setTimeout(600_000);
    places.push({ place: place.displayName, state: state.name, seed });
    await page.addInitScript(installSink);
    page.on("request", (request) => requested.push(request.url()));
    await page.goto(`/?seed=${encodeURIComponent(seed)}`);

    await capture(page, label, "title");
    await openCreator(page);
    await capture(page, label, "setup:route");
    await page.getByTestId("start-normal").click();
    await expect(page.getByTestId("creator-stage-character")).toBeVisible();
    await capture(page, label, "setup:character");
    await completeCharacterStep(page, 34, {
      givenName: "Avery",
      familyName: "Morgan",
    });
    await capture(page, label, "setup:character-filled");
    await page.getByTestId("creator-continue-character").click();
    await chooseCreatorLocation(
      page,
      { age: 34, state: state.name, place: place.displayName, route: "normal" },
      false,
    );
    await capture(page, label, "setup:place-chosen");

    // The steps after the place change as the creator is trimmed, so read
    // whichever stage is showing until Begin is enabled.
    const begin = page.getByTestId("begin");
    for (let step = 0; step < 6 && !(await isReady(begin)); step += 1) {
      const stage = await page
        .locator('[data-testid^="creator-stage-"]')
        .first()
        .getAttribute("data-testid")
        .catch(() => null);
      await capture(page, label, `setup:${stage ?? "step"}`);
      const advance = page
        .getByTestId("creator-skip-difficulty")
        .or(page.getByTestId("whoareyou-play"))
        .or(page.getByTestId("creator-continue-background"))
        .first();
      if (!(await advance.isVisible().catch(() => false))) break;
      await advance.click();
    }
    await expect(begin).toBeEnabled();
    await capture(page, label, "setup:begin");
    await begin.click();
    await expect(page.getByTestId("play-screen")).toBeVisible({
      timeout: 120_000,
    });

    // The opening: every screen, read, then skipped.
    const intro = page.getByTestId("world-orientation");
    const shown = await intro
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (shown) {
      for (
        let screen = 0;
        screen < 14 && (await intro.isVisible());
        screen += 1
      ) {
        const key = (await intro.getAttribute("data-step")) ?? `${screen}`;
        await capture(page, label, `opening:${key}`);
        const next = page.getByTestId("orientation-next");
        if (!(await isReady(next))) break;
        await next.click();
        await expect
          .poll(async () =>
            (await intro.isVisible())
              ? await intro.getAttribute("data-step")
              : "",
          )
          .not.toBe(key);
      }
      if (await intro.isVisible())
        await page.getByTestId("orientation-skip").click();
      await expect(intro).toBeHidden();
    }

    await capture(page, label, "play:room");
    await tryScreen(page, label, "play:moment", () => openMoment(page));
    for (const destination of DESTINATIONS)
      await tryScreen(page, label, `menu:${destination}`, () =>
        goTo(page, destination),
      );
    await page.keyboard.press("Escape").catch(() => undefined);
    await tryScreen(page, label, "play:after-one-day", async () => {
      await passShellTime(page, "day");
    });

    // Read the engine registry and the record coverage while the page is up.
    const registry = await page.evaluate(() =>
      (
        globalThis as unknown as {
          __ocdTextAudit: {
            engine: () => [string, { bank: string; variant?: string }][];
          };
        }
      ).__ocdTextAudit.engine(),
    );
    for (const [text, origin] of registry) engine.set(text, origin);
    const texts = [
      ...new Set(
        rendered
          .filter((row) => row.place === label)
          .map((row) => row.text.replace(/\s+/g, " ").trim()),
      ),
    ];
    const covered = await page.evaluate(
      (list) =>
        (
          globalThis as unknown as {
            __ocdTextAudit: {
              coverage: (
                texts: string[],
              ) => [
                string,
                { covered: number; total: number; values: string[] },
              ][];
            };
          }
        ).__ocdTextAudit.coverage(list),
      texts,
    );
    for (const [text, value] of covered) coverage.set(text, value);
  });
}

test.afterAll(() => {
  const index = buildLiteralIndex("src");
  const rows = classifyTexts({ rendered, engine, coverage, index });
  const modules = moduleReport(requested);
  const run = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(process.cwd(), "test-results", "runtime-text");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${run}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      {
        run,
        places,
        screensReached: reached.length,
        reached,
        notReached,
        sourceFilesIndexed: index.filesRead,
        summary: summarize(rows),
        modules: {
          existing: modules.existing,
          loaded: modules.loaded,
          neverLoaded: modules.neverLoaded,
        },
        // text, origin, file, line, screen, count: the CTO's record shape,
        // with the place, the kind (text or attribute) and the engine bank.
        entries: rows.map((row) => ({
          text: row.text,
          origin: row.origin,
          file: row.file,
          line: row.line,
          screen: row.screen,
          count: row.count,
          place: row.place,
          kind: row.kind,
          bank: row.bank,
          alsoRecordValue: row.alsoRecordValue,
          recordShare: row.recordShare,
          literalCandidates: row.candidates,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`runtime-text audit written to ${file}`);
});
