import { expect, test, type Locator, type Page } from "./fixtures";
import {
  enterLife,
  goTo,
  passShellTime,
  startLife as walkCreator,
} from "./support/creator";

/**
 * Running for Congress from an ordinary life, played in a browser: choose a
 * seat, put your name in, campaign each week through the ordinary controls,
 * and read the result. A winner sees the transition before January 3 and the
 * seat itself afterwards; nothing is supplied to the election.
 *
 * Several states, none of them Kentucky: a small town and a larger city.
 */

async function freshBrowser(page: Page) {
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

async function campaignEachWeekUntilDecided(
  page: Page,
  status: Locator,
  limit: number,
) {
  for (let week = 0; week < limit; week += 1) {
    await goTo(page, "nav-politics-candidacy");
    if ((await status.getAttribute("data-status")) !== "pending-election")
      return;
    for (const kind of ["campaign-outreach", "campaign-fundraising"]) {
      const control = page.getByTestId(kind);
      if (
        (await control.isVisible().catch(() => false)) &&
        (await control.isEnabled().catch(() => false))
      ) {
        await control.click();
        break;
      }
    }
    await passShellTime(page, "week");
  }
  await goTo(page, "nav-politics-candidacy");
}

const calendarDate =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/;

function datedText(text: string | null, label: string): number {
  const date = text?.match(calendarDate)?.[0];
  if (!date) throw new Error(`${label} has no readable date: ${text}`);
  const day = Date.parse(`${date} GMT`);
  if (Number.isNaN(day))
    throw new Error(`${label} has an invalid date: ${date}`);
  return day;
}

const LIVES = [
  { state: "Nevada", place: "Elko", usps: "NV", seed: "congress-NV-1" },
  { state: "Georgia", place: "Savannah", usps: "GA", seed: "congress-GA-1" },
];

for (const life of LIVES) {
  test(`a ${life.state} life stands for the House and reads the result`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(900_000);
    await freshBrowser(page);
    await page.goto(`/?seed=${life.seed}`);
    await walkCreator(page, { place: life.place, state: life.state, age: 40 });
    await enterLife(page);

    await goTo(page, "nav-politics-candidacy");
    const congress = page.getByTestId("congress-candidacy");
    await expect(congress).toHaveAttribute("data-state", life.usps);
    const seat = page.getByTestId("congress-seat");
    const houseSeat = await seat
      .locator("option")
      .filter({ hasText: "congressional district" })
      .first()
      .getAttribute("value");
    await seat.selectOption(houseSeat!);
    const file = page.getByTestId("file-congress");
    await expect(file).toHaveAttribute("data-office-key", houseSeat!);
    await expect(file).toBeEnabled();
    await expect(file).toContainText("November 3, 2026");
    await page.screenshot({ path: testInfo.outputPath("congress-seat.png") });
    await file.click();

    const status = page.getByTestId("congress-status");
    await expect(status).toHaveAttribute("data-status", "pending-election");
    await campaignEachWeekUntilDecided(page, status, 60);
    const outcome = await status.getAttribute("data-status");
    expect(["won-awaiting-term", "lost"]).toContain(outcome);
    await page.screenshot({ path: testInfo.outputPath("congress-result.png") });
    if (outcome === "lost") return;

    await expect(status).toContainText("January 3, 2027");
    const termStartText = await status.textContent();
    const termStartsAt = datedText(termStartText, "Congress term start");
    await goTo(page, "elsewhere-work");
    await expect(page.getByText("Before you take office")).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("congress-transition.png"),
    });
    const today = datedText(
      await page.getByTestId("story-when").textContent(),
      "current world date",
    );
    const daysToTerm = Math.max(
      0,
      Math.ceil((termStartsAt - today) / 86_400_000),
    );
    const maxWeeks = Math.min(52, Math.ceil(daysToTerm / 7) + 12);
    for (let week = 0; week < maxWeeks; week += 1) {
      const current = datedText(
        await page.getByTestId("story-when").textContent(),
        "current world date",
      );
      if (current >= termStartsAt) break;
      await passShellTime(page, "week");
    }
    // Time may open a dated job offer and move the player to Jobs. Read the
    // same Office route again before asking whether the Congress seat exists.
    await goTo(page, "elsewhere-work");
    const observedDate = await page.getByTestId("story-when").textContent();
    const observedDay = datedText(observedDate, "current world date");
    const officeTabBefore = await page
      .getByTestId("politics-tab-office")
      .getAttribute("aria-current");
    const heldSeat = page.getByTestId("congress-seat-held");
    const seatBefore = await heldSeat.count();
    let statusAtTerm: string | null = null;
    if (seatBefore === 0) {
      await goTo(page, "nav-politics-candidacy");
      statusAtTerm = (await status.count())
        ? await status.getAttribute("data-status")
        : "none";
      await goTo(page, "elsewhere-work");
    }
    await testInfo.attach("congress-seating-observation.json", {
      body: JSON.stringify({
        state: life.state,
        result: outcome,
        termStartText,
        observedDate,
        officeTabBefore,
        seatBefore,
        statusAtTerm,
        seatAfterReopen: await heldSeat.count(),
      }),
      contentType: "application/json",
    });
    expect(observedDay).toBeGreaterThanOrEqual(termStartsAt);
    await expect(page.getByTestId("politics-tab-office")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(heldSeat).toContainText(life.state);
    await page.screenshot({
      path: testInfo.outputPath("congress-seat-held.png"),
    });
  });
}
