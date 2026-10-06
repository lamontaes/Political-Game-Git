import { expect, test } from "./fixtures";
import { enterLife, goTo } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";

test("a recorded paycheck does not produce a routine toast", async ({
  page,
}, info) => {
  const place = drawRandomPlace("session8-paycheck-toast-2026-10-06");
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  await page.evaluate(async (placeKey) => {
    const gamePath = "/src/presentation/new-game.ts";
    const lifePath = "/src/simulation/life-paths2.ts";
    const incomePath = "/src/simulation/resource-income.ts";
    const worldPath = "/src/simulation/world.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } = await import(
      /* @vite-ignore */ gamePath
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
    // Create an actual recorded paycheck in a reproducibly random locality.
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 30,
      placeKey,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
      priors: [],
      seed: `saved-pay-stub:${placeKey}`,
    });
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
    if (recordedPayStubs(paid, game.playerPersonId).length !== 1)
      throw new Error("Payday fixture did not record one canonical paycheck.");
    const store = new BrowserSaveStore();
    const saveId = store.newSaveId(paid);
    const saved = await store.save(paid, saveId);
    if (saved.status !== "saved")
      throw new Error(`Payday fixture refused: ${saved.status}`);
  }, place.key);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-jobs");
  const jobs = page.getByTestId("work-layout");
  await expect(jobs.getByTestId("work-role")).toHaveCount(0);
  await expect(
    jobs.getByRole("heading", { name: "Waiting on you" }),
  ).toHaveCount(0);
  await expect(
    jobs.getByRole("navigation", { name: "On this page" }),
  ).toHaveCount(0);
  await expect(jobs.getByTestId("job-pay-floor")).toHaveCount(0);
  await expect(jobs.getByText("Other work", { exact: true })).toHaveCount(0);
  await expect(
    jobs.getByText("Career opportunities", { exact: true }),
  ).toHaveCount(0);
  await expect(
    jobs.getByRole("button", { name: "Work", exact: true }),
  ).toBeVisible();
  await expect(
    jobs.getByRole("button", { name: "Study", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("jobs-owner-after.png") });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTestId("shell-pass-day").click();
  const notice = page.getByTestId("pass-outcome");
  await expect(notice).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("saved-pay-stub-1440.png") });
});
