import { expect, test } from "./fixtures";
import { enterLife, goTo } from "./support/creator";

test("payday displays actual starting federal and state withholding on the player's stub", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  await page.evaluate(async () => {
    const gamePath = "/src/presentation/new-game.ts";
    const lifePath = "/src/simulation/life-paths2.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } = await import(
      /* @vite-ignore */ gamePath
    );
    const { enterLifePath, scheduleLifePathSession, performLifePathSession } =
      await import(/* @vite-ignore */ lifePath);
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    // One of the five sampled nationwide projection cases, with real recorded
    // starting federal/state taxes. No invented paycheck or rendered stub.
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 30,
      placeKey: "2743000",
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
      priors: [],
      seed: "saved-pay-stub:2743000",
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
  });
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
  const notice = page.getByTestId("payday-notification");
  await expect(notice).toContainText(
    "Payday · Neighborhood Supply Cooperative · You took home $64.47 of $72.",
  );
  await expect(
    notice.getByText("Federal income tax withheld $1.01.", { exact: true }),
  ).not.toBeVisible();
  await expect(notice.locator("details")).not.toHaveAttribute("open");
  await page.screenshot({ path: info.outputPath("payday-owner-after.png") });
  await notice.locator("summary").click();
  await expect(notice).toContainText("Federal income tax withheld $1.01");
  await expect(notice).toContainText("State income tax withheld $0.70");
  await expect(notice).not.toContainText("Other payroll tax not priced");
  await expect(notice).not.toContainText("Additional Medicare withheld $0");
  await expect(page.getByTestId("pass-outcome")).not.toContainText(
    "Paid $7.53",
  );
  await page.screenshot({ path: info.outputPath("payday-owner-details.png") });
  await notice
    .getByRole("button", { name: "Dismiss payday notification" })
    .click();
  await expect(page.getByTestId("payday-notification")).toHaveCount(0);
});
