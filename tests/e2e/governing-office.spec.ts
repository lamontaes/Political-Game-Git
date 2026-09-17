import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  goTo,
  saveLife,
  startLife as walkCreator,
} from "./support/creator";

/**
 * GOVERNING increment 2, played in a browser: an ordinary Colorado life files
 * for governor in the office's own regular election, wins it on the clock,
 * qualifies, takes office on the dated start and governs: a chief of staff, a
 * first priority, an agency instruction and the report that follows.
 *
 * The seed is one on which this life wins without campaigning; nothing is
 * supplied. Colorado runs on the game's disclosed calendar.
 */

async function freshBrowser(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
}

async function passWeeksUntil(
  page: Page,
  done: () => Promise<boolean>,
  limit: number,
) {
  for (let week = 0; week < limit; week += 1) {
    if (await done()) return;
    await page.getByTestId("shell-pass-week").click();
    await page.waitForTimeout(50);
  }
  expect(await done()).toBe(true);
}

test("a Colorado life wins the governorship, takes office and governs", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
  await freshBrowser(page);
  await page.goto("/?seed=gov-win-CO-1");
  await walkCreator(page, {
    place: "Acres Green",
    state: "Colorado",
    age: 40,
  });
  await enterLife(page);

  await goTo(page, "nav-politics-candidacy");
  const candidacy = page.getByTestId("state-executive-candidacy");
  await expect(candidacy).toHaveAttribute("data-office-key", "us-co-governor");
  const calendar = page.getByTestId("state-executive-calendar");
  await expect(calendar).toHaveAttribute("data-basis", "game-profile");
  await expect(page.getByTestId("file-state-executive")).toContainText(
    "November 3, 2026",
  );
  await page.getByTestId("file-state-executive").click();
  const status = page.getByTestId("state-executive-status");
  await expect(status).toHaveAttribute("data-status", "pending-election");

  await passWeeksUntil(
    page,
    async () =>
      (await status.getAttribute("data-status")) !== "pending-election",
    60,
  );
  await expect(status).toHaveAttribute("data-status", "awaiting-qualification");
  await expect(status).toContainText("January 4, 2027");
  await page.getByTestId("qualify-state-executive").click();
  await expect(status).toHaveAttribute(
    "data-status",
    "qualified-awaiting-entry",
  );
  await passWeeksUntil(
    page,
    async () => (await status.getAttribute("data-status")) === "in-office",
    12,
  );
  await page.getByTestId("shell-pass-day").click();

  await goTo(page, "elsewhere-work");
  const briefing = page.getByTestId("governing-briefing");
  await expect(briefing).toBeVisible();
  await expect(briefing).toContainText("Governor of Colorado");
  const matters = briefing.getByTestId("governing-matter");
  await expect(matters).toHaveCount(2);
  await page.screenshot({
    path: testInfo.outputPath("governing-briefing-first-day.png"),
  });

  // Team: choose a chief of staff from three people with assessments.
  const staffCard = matters.filter({ hasText: "Choose a chief of staff" });
  await expect(staffCard.getByTestId("governing-option")).toHaveCount(3);
  await staffCard.getByTestId("governing-option").first().click();
  await expect(briefing).toContainText("Chief of staff:");

  // Agenda: the chief of staff now recommends, and the player chooses.
  const agendaCard = briefing
    .getByTestId("governing-matter")
    .filter({ hasText: "Set the first priority" });
  await expect(
    agendaCard.getByTestId("governing-recommendation"),
  ).toBeVisible();
  await agendaCard.getByTestId("governing-option").first().click();

  // One consequential task: direct the agencies, then see what came of it.
  const taskCard = briefing
    .getByTestId("governing-matter")
    .filter({ hasText: "Direct the agencies" });
  await taskCard.locator('[data-option="pace:fast"]').click();
  await expect(briefing.getByTestId("governing-nothing-open")).toBeVisible();
  await passWeeksUntil(
    page,
    async () =>
      (await briefing
        .getByTestId("governing-recent")
        .getByText("State agencies reported")
        .count()) > 0,
    12,
  );

  await briefing.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("governing-briefing-report.png"),
  });
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await expect(
    page.getByTestId("governing-recent").getByText("State agencies reported"),
  ).toBeVisible();
});
