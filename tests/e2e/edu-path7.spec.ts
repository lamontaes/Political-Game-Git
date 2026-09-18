import { test, expect, type Page } from "./fixtures";

async function continueDays(page: Page, days: number) {
  const button = page.getByRole("button", {
    name: "Continue one day",
    exact: true,
  });
  /*
    A day is one submission to the shell's time command, and while one runs
    every control reading that runner is busy and further presses are ignored
    — that is the double-submission repair. So each day waits for the previous
    one to finish rather than assuming every click lands.

    Waiting on `aria-busy` alone would race: the attribute reads "false" both
    before the pending state paints and after the command finishes, so a poll
    that happened to run early would pass without a day having passed. The
    disclosed-destination line changes either way — to "Time is passing…"
    while the command runs, and to the next morning once it lands — so this
    waits for that line to move before it calls the day done.
  */
  const destination = page.locator("#life-paths-pass-day-target");
  for (let i = 0; i < days; i++) {
    const before = (await destination.textContent()) ?? "";
    await button.click();
    await expect(destination).not.toHaveText(before);
    await expect(button).toHaveAttribute("aria-busy", "false");
  }
}

test("EDU real institution search, explicit offer, period study, interruption and save", async ({
  page,
}) => {
  await page.goto("/edu-path7-proof.html");
  await page
    .getByRole("textbox", { name: "Search institutions" })
    .fill("Bluegrass");
  const institution = page.getByRole("button", {
    name: /Bluegrass Community and Technical College/,
  });
  await expect(institution).toBeVisible();
  await institution.click();
  const request = page.getByRole("button", {
    name: "Request Workforce Education study offer",
  });
  await request.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Accept study offer" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept study offer" }).click();
  const study = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: /Workforce Education — noncredit study/,
    }),
  });
  await expect(study).toContainText("period 1 of 1");
  await expect(
    study.getByRole("button", { name: "Schedule next session", exact: true }),
  ).toHaveCount(0);
  await continueDays(page, 20);
  await study.getByRole("button", { name: "Interrupt", exact: true }).click();
  await page.getByRole("button", { name: "Save study journey" }).click();
  await page.reload();
  await expect(study).toContainText("Interrupted");
  await study.getByRole("button", { name: "Return", exact: true }).click();
  await continueDays(page, 29);
  await expect(study).toContainText("Completed");
  await page.getByRole("button", { name: "Save study journey" }).click();
  await page.reload();
  await expect(study).toContainText("Completed");
});
