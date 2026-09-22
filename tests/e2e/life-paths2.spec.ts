import { test, expect, type Page } from "./fixtures";
import { chooseOption } from "./support/controls";

/*
  The day is one submission to the shell's time command now, not a direct call
  into the simulation, so the control is busy until the command finishes and a
  second press while it runs is ignored. Waiting for that is the honest way to
  drive it.

  `aria-busy` reads "false" both before the pending state paints and after the
  command lands, so polling it alone could pass without a day having passed.
  This proof has the clock on the page, so it waits for the date itself to
  move and only then for the control to be idle again.
*/
async function passOneDay(page: Page) {
  const day = page.getByRole("button", {
    name: "Continue one day",
    exact: true,
  });
  const clock = page.getByTestId("clock");
  const before = (await clock.textContent()) ?? "";
  await day.click();
  await expect(clock).not.toHaveText(before);
  await expect(day).toHaveAttribute("aria-busy", "false");
}
test("LIFE-PATHS2 pointer, keyboard, period, interruption and reload proof", async ({
  page,
}) => {
  await page.goto("/life-paths2-proof.html");
  await expect(
    page.getByRole("heading", { name: "LIFE-PATHS2 isolated proof" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Enroll in College office administration certificate",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("You enrolled");
  await expect(
    page.getByText(/In progress\. Year 1, period 1 of 1\./),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Schedule next session", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Interrupt", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("interrupted");
  await page.reload();
  await expect(
    page.getByText(/Interrupted\. Year 1, period 1 of 1\./),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("returned");
  await chooseOption(
    page.getByRole("combobox", { name: "Person", exact: true }),
    { index: 1 },
  );
  await page.getByRole("button", { name: "Make offer", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("Accepted");
  await passOneDay(page);
  await page
    .getByRole("button", { name: "Start engagement", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("started");
  await page.getByRole("button", { name: "Assign work", exact: true }).click();
  await passOneDay(page);
  await expect(page.getByText(/Ready for review/)).toBeVisible();
  await page
    .getByRole("button", { name: "End engagement", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Education and work", exact: true })
      .locator(":scope > [role=status]"),
  ).toContainText("ended");
});
