import { expect, test } from "./fixtures";
import { enterLife, goTo, saveLife } from "./support/creator";

for (const suffix of [1, 2, 3]) {
  const seed = `team4-home-ordinary-receipts-20261001:${suffix}`;
  test(`ordinary Day shows separate saved rent and nonhousing receipts (${seed})`, async ({
    page,
  }, info) => {
    await page.goto("/");
    await expect(page.getByTestId("new-game")).toBeVisible();
    const before = await page.evaluate(async (seed) => {
      const openingPath = "/src/presentation/opening-life.ts";
      const setupPath = "/src/presentation/new-game.ts";
      const observerPath = "/src/presentation/observer-world.ts";
      const ordinaryPath = "/src/presentation/ordinary-life.ts";
      const paymentsPath = "/src/presentation/home-payments.ts";
      const storePath = "/src/presentation/browser-world-repository.ts";
      const { generateOpeningLife, prepareOpeningLife } = await import(
        /* @vite-ignore */ openingPath
      );
      const { DEFAULT_NEW_GAME_SETUP } = await import(
        /* @vite-ignore */ setupPath
      );
      const { observerPlace } = await import(/* @vite-ignore */ observerPath);
      const { openOrdinaryLife, passOrdinaryDays } = await import(
        /* @vite-ignore */ ordinaryPath
      );
      const { homePayments } = await import(/* @vite-ignore */ paymentsPath);
      const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
      // The production opening and ordinary clock produce this save. No test
      // household, funds, lease, payment or date is inserted into its records.
      const place = observerPlace(seed);
      const opened = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey: place.key,
          seed,
          startAge: 34,
          questionnaire: "skipped",
        }),
      );
      if (!opened.game)
        throw new Error("Production opening did not create a life.");
      const personId = opened.game.playerPersonId;
      const world = passOrdinaryDays(
        openOrdinaryLife(opened.game.world, personId),
        26,
      );
      if (world.currentDate !== "2026-01-31")
        throw new Error(
          `Ordinary clock stopped at ${world.currentDate}; due-date save not fabricated.`,
        );
      const bills = homePayments(world, personId);
      const store = new BrowserSaveStore();
      const saved = await store.save(world, store.newSaveId(world));
      if (saved.status !== "saved")
        throw new Error(`Save refused: ${saved.status}`);
      return {
        seed,
        place: place.key,
        date: world.currentDate,
        bills,
        saveId: saved.summary.saveId,
      };
    }, seed);
    await info.attach("ordinary-save-before", {
      body: JSON.stringify(before, null, 2),
      contentType: "application/json",
    });
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await page.getByTestId("shell-pass-day").click();
    await expect(page.getByTestId("shell-pass-day")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await goTo(page, "nav-finances");
    const panel = page.getByTestId("home-payments");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Rent");
    await expect(panel).toContainText(
      "Food and other household costs (estimate)",
    );
    await expect(panel).toContainText("February 1");
    await saveLife(page);
    const after = await page.evaluate(async () => {
      const storePath = "/src/presentation/browser-world-repository.ts";
      const paymentsPath = "/src/presentation/home-payments.ts";
      const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
      const { homePayments } = await import(/* @vite-ignore */ paymentsPath);
      const store = new BrowserSaveStore();
      const summary = await store.mostRecent();
      const world = summary ? await store.load(summary.saveId) : null;
      if (!world || world.control.kind !== "person")
        throw new Error("Ordinary save missing.");
      return {
        date: world.currentDate,
        bills: homePayments(world, world.control.personId),
      };
    });
    await info.attach("ordinary-saved-receipts", {
      body: JSON.stringify(after, null, 2),
      contentType: "application/json",
    });
    expect(after.date).toBe("2026-02-01");
    for (const bill of after.bills) {
      const receipt = bill.payments.find(
        (payment) => payment.periodStartsAt === after.date,
      );
      expect(receipt, bill.label).toBeDefined();
      await expect(
        panel.locator(`[data-payment-id="${receipt.id}"]`),
      ).toBeVisible();
    }
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath("ordinary-home-saved-receipts-1440.png"),
    });
  });
}
