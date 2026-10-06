import { expect, test } from "./fixtures";
import { enterLife, goTo } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";

test("routine notice omits the clock and fades after actual paycheck details", async ({
  page,
}, info) => {
  const place = drawRandomPlace("session8-clock-toast-2026-10-05");
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  await page.evaluate(async (placeKey) => {
    const gamePath = "/src/presentation/new-game.ts";
    const lifePath = "/src/simulation/life-paths2.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } = await import(
      /* @vite-ignore */ gamePath
    );
    const { enterLifePath, scheduleLifePathSession, performLifePathSession } =
      await import(/* @vite-ignore */ lifePath);
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    // A randomly drawn locality with actual recorded earnings and taxes.
    // This path reads saved world facts and does not invent a paycheck.
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
    const store = new BrowserSaveStore();
    const saved = await store.save(worked.world, store.newSaveId(worked.world));
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
  await expect(notice).not.toContainText("It is now");
  await expect(notice).toContainText("Paycheck: gross");
  await expect(notice).toContainText("net received");
  await page.screenshot({ path: info.outputPath("saved-pay-stub-1440.png") });
  await expect(notice).toBeHidden({ timeout: 10000 });
});
