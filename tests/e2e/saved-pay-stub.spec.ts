import { expect, test } from "./fixtures";
import { goTo } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";

test("a random new-life first paycheck is visible in Money and property", async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  const place = drawRandomPlace("session8-paycheck-toast-2026-10-06");
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  const receipt = await page.evaluate(async (placeKey) => {
    const geographyPath = "/src/presentation/new-game-geography.ts";
    const openingPath = "/src/presentation/opening-life.ts";
    const lifePath = "/src/simulation/life-paths2.ts";
    const incomePath = "/src/simulation/resource-income.ts";
    const worldPath = "/src/simulation/world.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { explicitNewGameSetup } = await import(
      /* @vite-ignore */ geographyPath
    );
    const { generateOpeningLife, prepareOpeningLife } = await import(
      /* @vite-ignore */ openingPath
    );
    const {
      enterLifePath,
      scheduleLifePathSession,
      performLifePathSession,
      lifePaths2Handlers,
    } = await import(/* @vite-ignore */ lifePath);
    const { recordedPayStubs } = await import(/* @vite-ignore */ incomePath);
    const { advanceWorld } = await import(/* @vite-ignore */ worldPath);
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    // Run the same opening pipeline as a playable random new life before
    // recording the first completed-shift paycheck.
    const setup = explicitNewGameSetup({
      startAge: 30,
      placeKey,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
      priors: [],
      seed: `saved-pay-stub:${placeKey}`,
    });
    const opened = generateOpeningLife(prepareOpeningLife(setup));
    if (!opened.game) throw new Error("New game opening did not complete.");
    const game = opened.game;
    const entered = enterLifePath(game.world, "shop-assistant");
    if (!entered.ok) throw new Error(entered.message);
    const scheduled = scheduleLifePathSession(
      entered.world,
      entered.world.history.workRelationships.at(-1).id,
    );
    if (!scheduled.ok) throw new Error(scheduled.message);
    const worked = performLifePathSession(
      scheduled.world,
      scheduled.world.history.scheduledActivities.at(-1).id,
    );
    if (!worked.ok) throw new Error(worked.message);
    const paid = advanceWorld(worked.world, 1, lifePaths2Handlers());
    const stubs = recordedPayStubs(paid, game.playerPersonId);
    if (stubs.length !== 1)
      throw new Error("Payday fixture did not record one canonical paycheck.");
    if (stubs[0]!.netPaid.minorUnits <= 0)
      throw new Error("The first paycheck did not transfer positive net pay.");
    const netPaidMinor = stubs[0]!.netPaid.minorUnits;
    const store = new BrowserSaveStore();
    const saveId = store.newSaveId(paid);
    const saved = await store.save(paid, saveId);
    if (saved.status !== "saved")
      throw new Error(`Payday fixture refused: ${saved.status}`);
    return { netPaidMinor };
  }, place.key);
  await page.reload();
  await page.getByTestId("continue").click();
  await goTo(page, "nav-finances");
  const finances = page.getByTestId("personal-finances");
  await expect(finances).toBeVisible();
  await expect(finances).toContainText("Money and property");
  await expect(
    page
      .getByTestId("personal-purses")
      .locator("[data-testid^='purse-balance-']")
      .first(),
  ).toBeVisible();
  await expect(page.getByTestId("personal-purses")).toContainText(
    /\$[\d,]+\.\d{2}/,
  );
  await page.screenshot({ path: info.outputPath("first-paycheck-money.png") });
  expect(receipt.netPaidMinor).toBeGreaterThan(0);
});
