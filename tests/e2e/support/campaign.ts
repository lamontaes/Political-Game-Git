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
