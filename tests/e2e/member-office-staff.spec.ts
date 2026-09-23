import { expect, test, type Page } from "./fixtures";
import { enterLife, goTo, saveLife } from "./support/creator";

/**
 * A Nevada Assembly member's first days in office: hiring a Legislative Aide
 * from the office's own applicants. The staff briefing, empty on the first
 * day, reads the hire, and the hire survives a reload.
 *
 * Downstream of a seat, so the seat is the supplied-result fixture the unit
 * suite uses (fictional ballots, the production result and seat writers),
 * saved and continued through the ordinary front door. Winning the seat is
 * other specs' job.
 */
async function enterSuppliedNevadaSeat(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  await page.evaluate(async () => {
    const fixturePath = "/tests/fixtures/supplied-legislative-seat.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { suppliedLegislativeSeat } = await import(
      /* @vite-ignore */ fixturePath
    );
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const { world } = suppliedLegislativeSeat("US-NV", "assembly");
    const store = new BrowserSaveStore();
    const saved = await store.save(world, store.newSaveId(world));
    if (saved.status !== "saved")
      throw new Error(`Supplied seat refused: ${saved.status}`);
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
}

test("a new Nevada Assembly member hires a Legislative Aide", async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  await enterSuppliedNevadaSeat(page);

  const hiring = page.getByTestId("office-staff-hiring");
  await expect(hiring.getByTestId("office-staff-none-hired")).toBeVisible();
  await expect(page.getByTestId("office-no-staff")).toBeVisible();
  await hiring.getByTestId("office-staff-look").click();
  const aide = hiring.getByTestId(
    "office-staff-opening-member-legislative-aide",
  );
  await expect(aide.getByTestId("office-staff-hire")).toHaveCount(3);
  await expect(
    hiring.getByTestId("office-staff-opening-member-constituent-caseworker"),
  ).toBeVisible();
  await hiring.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("member-office-applicants.png"),
    fullPage: true,
  });
  await aide.getByTestId("office-staff-hire").nth(1).click();
  await expect(hiring.getByTestId("office-staff-note")).toContainText(
    "now works for you as Legislative Aide",
  );
  await expect(hiring.getByTestId("office-staff-filled")).toHaveCount(1);
  await expect(page.getByTestId("office-no-staff")).toHaveCount(0);
  await expect(page.getByTestId("office-staff-briefing")).toContainText(
    "Legislative Aide",
  );
  await page.screenshot({
    path: testInfo.outputPath("member-office-hired.png"),
    fullPage: true,
  });

  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await expect(
    page.getByTestId("office-staff-hiring").getByTestId("office-staff-filled"),
  ).toHaveCount(1);
});
