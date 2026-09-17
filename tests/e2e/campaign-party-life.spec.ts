import { fileCandidacy } from "./support/campaign";
import { expect, test, type Page } from "./fixtures";
import {
  KENTUCKY_LEXINGTON_REGRESSION,
  enterLife,
  goTo,
  openElsewhere,
  startLife,
} from "./support/creator";

/**
 * CRUNCH46 CAMPAIGN in the browser: party and community work, a week's plan
 * without staff, and what the other campaigns did in public.
 *
 * What this settles that a unit test cannot: the controls are real buttons,
 * radios and inputs a person can reach with a pointer or the keyboard; a plan
 * the committee cannot pay for is refused on screen with the money untouched;
 * and nothing on the screen is a meter or a probability.
 */

const SHOTS = "test-results/campaign46";

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

async function openWork(page: Page) {
  // Campaigns have their own Politics tab on #265.
  await openElsewhere(page, "campaign");
  await expect(page.getByTestId("work-section-campaign")).toBeVisible();
}

function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    ) {
      errors.push(message.text());
    }
  });
  return errors;
}

test("party work, a week's plan and the other side's public activity", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const errors = watchForErrors(page);
  await freshBrowser(page);
  await startLife(page, { age: 34, ...KENTUCKY_LEXINGTON_REGRESSION });
  await enterLife(page);
  await openWork(page);

  /* Party and community work: ask for a talk about running, by keyboard. */
  const partyWork = page.getByTestId("party-work");
  await expect(partyWork).toBeVisible();
  await expect(page.getByTestId("party-work-empty")).toBeVisible();
  const ask = partyWork
    .locator('[data-testid^="party-work-request-candidate-guidance-"]')
    .first();
  await ask.focus();
  await page.keyboard.press("Enter");
  const row = partyWork.locator('li[data-state="accepted"]').first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("20-minute local journey");
  await expect(row).toContainText("no fare will be charged");
  await expect(row).toContainText(/[A-Z][a-z]+ \d{1,2}, \d{4}, 6:30 PM/);
  await page.screenshot({ path: `${SHOTS}/01-party-work-requested.png` });

  // Tomorrow evening is after a day of the character's own commitments. The
  // row says so, and the player gets on with the day until the evening.
  const outcome = partyWork
    .locator('[data-testid^="party-work-outcome-"]')
    .first();
  const rowId = (await row.getAttribute("data-testid"))!;
  const sameRow = partyWork.getByTestId(rowId);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await sameRow
      .locator('[data-testid^="party-work-attend-condensed-"]')
      .click();
    const went = await outcome
      .waitFor({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (went) break;
    await expect(page.getByTestId("party-work-message")).toContainText(
      /earlier commitment|came up/,
    );
    const offered = partyWork.locator('[data-testid^="party-work-decline-"]');
    if (await offered.count()) await offered.first().click();
    else await page.getByTestId("shell-pass-day").click();
  }
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText(
    "went over what is known about running for office here",
  );
  await expect(outcome).toContainText("less of the evening shown");
  await expect(page.getByTestId("party-work-guidance")).toContainText(
    "not established by this game's sourced rules",
  );
  await page.screenshot({ path: `${SHOTS}/02-party-work-outcome.png` });

  /* File, then plan a week with no staff. */
  await fileCandidacy(page);
  // The weekly plan is a secondary, collapsible block (UI decision).
  await page.getByTestId("campaign-week-toggle").click();
  const week = page.getByTestId("campaign-week");
  await expect(week).toBeVisible();
  await expect(page.getByTestId("campaign-week-attribution")).toHaveText(
    "Planning without campaign staff.",
  );
  await expect(page.getByTestId("campaign-week-proposal")).toHaveCount(0);
  await expect(page.getByTestId("campaign-strategy-commit")).toHaveCount(0);
  const treasury =
    (await page.getByTestId("campaign-treasury").textContent()) ?? "";
  await expect(page.getByTestId("campaign-week-treasury")).toHaveText(
    "Your committee has $0.00.",
  );

  // An advertising-only week the committee cannot pay for.
  await page.getByTestId("campaign-week-field").fill("0");
  await page.getByTestId("campaign-week-fundraising").fill("0");
  await page.getByTestId("campaign-week-advertising").fill("1");
  await page.getByTestId("campaign-week-channel-digital").check();
  await page.getByTestId("campaign-week-amount").fill("50");
  await expect(page.getByTestId("campaign-week-reach")).toHaveText(
    "How many people an advertising buy reaches is not modeled. Channel limits and minimum buys are game defaults.",
  );
  await page.getByTestId("campaign-week-commit").click();
  const refusal = page.getByTestId("campaign-week-refusal");
  await expect(refusal).toContainText("did not have enough money");
  await expect(refusal).toContainText("that money was not touched");
  await expect(page.getByTestId("campaign-treasury")).toHaveText(treasury);
  await page.screenshot({ path: `${SHOTS}/03-week-refused.png` });

  // A field week: choose another card by keyboard, then the field card.
  const relationships = page.getByTestId("campaign-week-plan-relationships");
  await relationships.focus();
  await page.keyboard.press("Space");
  await expect(relationships).toBeChecked();
  await page.getByTestId("campaign-week-plan-field").click();
  await expect(page.getByTestId("campaign-week-field")).toHaveValue("3");
  await expect(page.getByTestId("campaign-week-advertising")).toHaveValue("0");
  await page.getByTestId("campaign-week-commit").focus();
  await page.keyboard.press("Enter");
  const committed = page.getByTestId("campaign-week-committed");
  await expect(committed).toContainText("You committed to a field week");
  await expect(page.getByTestId("campaign-week-refusal")).toHaveCount(0);
  await committed.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/04-week-committed.png` });

  // Do the next session now.
  await committed.locator('[data-testid^="campaign-week-do-"]').first().click();
  const doneOrBlocked = await Promise.race([
    committed
      .getByText("Done.", { exact: true })
      .first()
      .waitFor()
      .then(() => "done")
      .catch(() => "none"),
    page
      .getByTestId("campaign-week-message")
      .waitFor()
      .then(() => "blocked")
      .catch(() => "none"),
  ]);
  expect(doneOrBlocked).not.toBe("none");
  if (doneOrBlocked === "blocked") {
    // A refusal is the plain calendar reason, never a silent no-op.
    await expect(page.getByTestId("campaign-week-message")).toHaveText(
      "Something already on the calendar has to happen first.",
    );
  }
  test.info().annotations.push({
    type: "session",
    description: `First planned session: ${doneOrBlocked}`,
  });

  // Let the last one go.
  const lastLetGo = committed
    .locator('[data-testid^="campaign-week-let-go-"]')
    .last();
  const lastId = (await lastLetGo.getAttribute("data-testid"))!.replace(
    "campaign-week-let-go-",
    "",
  );
  await lastLetGo.click();
  await expect(
    page.getByTestId(`campaign-week-session-${lastId}`),
  ).toContainText("Let go.");

  /* Live on until the other campaigns' public activity is heard of. */
  const opponents = page.getByTestId("opponent-activity");
  await expect(opponents).toBeVisible();
  for (let step = 0; step < 40; step += 1) {
    if ((await opponents.locator("li").count()) > 0) break;
    // A planned session holds the clock at its start; this player lets it go.
    const holding = committed.locator(
      'li[data-holding="true"] [data-testid^="campaign-week-let-go-"], li:has-text("Its time has passed") [data-testid^="campaign-week-let-go-"]',
    );
    if (await holding.count()) {
      await holding.first().click();
      continue;
    }
    const offered = partyWork.locator('[data-testid^="party-work-decline-"]');
    if (await offered.count()) {
      await offered.first().click();
      continue;
    }
    await page.getByTestId("shell-pass-day").click();
  }
  await expect(opponents.locator("li").first()).toBeVisible();
  await expect(opponents.locator("li").first()).toContainText(
    /[A-Z][a-z]+ \d{1,2}, \d{4}/,
  );
  await opponents.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/05-opponents.png` });

  /* Nothing here is a meter or a probability. */
  const campaign = page.getByTestId("campaign-section");
  await expect(campaign.locator("progress, meter")).toHaveCount(0);
  await expect(campaign.locator("[role='progressbar']")).toHaveCount(0);
  await expect(campaign).not.toContainText(/chance of winning|probability/i);
  await expect(campaign).not.toContainText(/\d+\s*\/\s*\d+/);
  await expect(campaign).not.toContainText(/\b\d{4}-\d{2}-\d{2}\b/);

  /* Save, reload, and see the same thing. */
  const opponentText = await opponents.textContent();
  const partyText = await partyWork
    .locator('[data-testid^="party-work-outcome-"]')
    .last()
    .textContent();
  await goTo(page, "keep-world");
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openWork(page);
  await expect(page.getByTestId("opponent-activity")).toHaveText(
    opponentText ?? "",
  );
  await expect(
    page
      .getByTestId("party-work")
      .locator('[data-testid^="party-work-outcome-"]')
      .last(),
  ).toHaveText(partyText ?? "");

  expect(errors).toEqual([]);
});
