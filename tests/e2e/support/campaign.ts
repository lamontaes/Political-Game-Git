import { expect, type Page } from "../fixtures";

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
 * Campaigns the ordinary way until the contest is decided: every day the
 * outreach control is offered it is taken, then the day passes. Since
 * CRUNCH46 (d60b2975) the rival campaigns weekly, so the three outreach
 * afternoons these journeys used to spend no longer carry the seat, and no
 * fixed number does durably either — GOVERNING's probe on p85c-owner-0 found
 * six days still losing while working every offered day wins. A day whose
 * afternoon is already spoken for renders the offer disabled and is skipped.
 * Returns whether the result surface appeared within `maxDays`.
 */
export async function campaignUntilDecided(
  page: Page,
  passDay: (page: Page) => Promise<void>,
  maxDays = 45,
) {
  for (let day = 0; day < maxDays; day += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await workOfferedOutreach(page);
    await passDay(page);
  }
  return page.getByTestId("campaign-result").isVisible();
}

/**
 * Takes the outreach offer if the day still has room for it. The day control
 * reports aria-busy while a time command settles, and the offer can flip to
 * disabled as the new day renders; checking before the clock is idle raced
 * that flip and click() then waited on a disabled control until the test
 * timed out.
 */
export async function workOfferedOutreach(page: Page) {
  await expect(page.getByTestId("pass-day")).not.toHaveAttribute(
    "aria-busy",
    "true",
  );
  const outreach = page.getByTestId("campaign-outreach");
  if (await outreach.isEnabled()) await outreach.click();
}
