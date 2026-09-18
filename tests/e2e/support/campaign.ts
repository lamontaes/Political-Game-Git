import type { Page } from "../fixtures";

/** Deliberate office selection in the existing Kentucky campaign scenarios. */
export async function fileCandidacy(
  page: Page,
  officeKey = "us-ky-general-assembly-v1:house",
) {
  await page
    .getByTestId("campaign-office-browser")
    .locator(`input[value="${officeKey}"]`)
    .check();
  await page.getByTestId("file-candidacy").click();
}

/**
 * The afternoons a Lexington House filer on the `p85c-owner-*` seeds needs
 * to carry the seat. Since CRUNCH46 (d60b2975) the rival campaigns every
 * week too, so the three outreach afternoons these journeys used to spend no
 * longer win; `campaign-integration.test.ts` measured six as the fewest that
 * still do (five lose) and this is the browser form of the same premise.
 * A day whose afternoon is already spoken for renders the offer disabled and
 * is simply skipped, as the unit test skips it.
 */
export const WINNING_OUTREACH_DAYS = 6;

export async function campaignOutreachDays(
  page: Page,
  passDay: (page: Page) => Promise<void>,
  days = WINNING_OUTREACH_DAYS,
) {
  for (let day = 0; day < days; day += 1) {
    await passDay(page);
    const outreach = page.getByTestId("campaign-outreach");
    if (await outreach.isEnabled()) await outreach.click();
  }
}
