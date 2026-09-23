import { expect, test, type Locator, type Page } from "./fixtures";
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
  // WebKit's first load of the dev server is slow; give it room.
  await page.goto("/", { timeout: 120_000 });
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

/**
 * Pass weeks and do the campaign's own work each week, through the ordinary
 * controls, until the contest is decided.
 *
 * This case used to file and then do NOTHING, on the premise that some seed
 * would win anyway. That premise is gone: the rival campaigns weekly since
 * d60b2975, and measured headlessly a Colorado life that files and does not
 * campaign loses on all eight of this case's own seeds — on three of them it
 * was the projected winner at filing and still lost by election day, because
 * the rival kept working for ten months and the player did not. No ninth seed
 * fixes that; the win rate is zero for the right reason.
 *
 * So the life campaigns. Nothing is supplied to the election — this case
 * exists to prove the ordinary route — and the work is whatever the campaign
 * offers that week, which cannot go stale the way a fixed number of days can.
 */
async function campaignEachWeekUntilDecided(
  page: Page,
  status: Locator,
  limit: number,
) {
  let worked = 0;
  for (let week = 0; week < limit; week += 1) {
    if ((await status.getAttribute("data-status")) !== "pending-election")
      break;
    for (const kind of ["campaign-outreach", "campaign-fundraising"]) {
      const control = page.getByTestId(kind);
      if (
        (await control.isVisible().catch(() => false)) &&
        (await control.isEnabled().catch(() => false))
      ) {
        await control.click();
        worked += 1;
        break;
      }
    }
    await page.getByTestId("shell-pass-week").click();
    await page.waitForTimeout(50);
  }
  // A silent no-op must not look like an unwinnable model. If this route
  // offers the player no ordinary way to work their own campaign, that is a
  // gap in the route and this case should say so rather than losing quietly.
  expect(
    worked,
    "The state-executive route offered no enabled campaign control in any week, so the life could not campaign at all. That is a gap in the route, not a seed to retry.",
  ).toBeGreaterThan(0);
}

test("a Colorado life wins the governorship, takes office and governs", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
  // A seed on which this ordinary life wins without campaigning. The creator
  // decides the rest of the life, so a few seeds are tried; nothing is
  // supplied to the election.
  // One seed, not eight. The seeds were a search for a life that wins without
  // campaigning, and no such life exists any more; the life campaigns instead.
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

  await campaignEachWeekUntilDecided(page, status, 60);
  await expect(
    status,
    "The life filed and campaigned every week the controls offered and still lost. That is a statement about the campaign model, not a seed to retry.",
  ).not.toHaveAttribute("data-status", "lost");
  // No Qualify step: the office's requirements are checked for the winner.
  await expect(status).toHaveAttribute(
    "data-status",
    "qualified-awaiting-entry",
  );
  await expect(status).toContainText("January 4, 2027");
  await expect(page.getByTestId("qualify-state-executive")).toHaveCount(0);
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
  // The office's other sections sit in the page beside the decisions, never
  // over them. The desk once shared a class name with a room scene's floating
  // desk, and the office work was mounted as a raised workspace; either one
  // drew a card over every decision a governor is meant to make.
  const briefingBox = (await briefing.boundingBox())!;
  for (const other of [
    page.getByTestId("office-desk"),
    page.getByRole("region", { name: "Executive work" }),
  ]) {
    if ((await other.count()) === 0) continue;
    const box = (await other.boundingBox())!;
    expect(
      box.y >= briefingBox.y + briefingBox.height ||
        box.y + box.height <= briefingBox.y,
      "An office section is drawn over the governing briefing.",
    ).toBe(true);
  }
  await page.screenshot({
    path: testInfo.outputPath("governing-briefing-first-day.png"),
  });

  // Team: choose a chief of staff from three people with assessments.
  const staffCard = matters.filter({ hasText: "Choose a chief of staff" });
  await expect(staffCard.getByTestId("governing-option")).toHaveCount(3);
  await staffCard.getByTestId("governing-option").first().click();
  await expect(briefing).toContainText("Chief of staff:");

  // The office's other posts: look for staff, and hire a Legislative Director.
  const hiring = page.getByTestId("office-staff-hiring");
  await hiring.getByTestId("office-staff-look").click();
  const director = hiring.getByTestId(
    "office-staff-opening-office-legislative-director",
  );
  await expect(director.getByTestId("office-staff-hire")).toHaveCount(3);
  await director.getByTestId("office-staff-hire").first().click();
  await expect(hiring.getByTestId("office-staff-note")).toContainText(
    "now works for you as Legislative Director",
  );
  await expect(
    page.getByTestId("office-staff").getByTestId("office-staff-member"),
  ).toContainText(["Legislative Director"]);
  await hiring.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("governing-office-staff-hired.png"),
  });

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
