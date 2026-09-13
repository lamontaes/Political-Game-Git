import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { enterLife, fillCreator, goTo } from "./support/creator";

async function personnel(page: Page) {
  await goTo(page, "elsewhere-work");
  const panel = page
    .getByTestId("personal-work-section")
    .getByRole("region", { name: "Personnel matters" });
  await expect(panel).toBeVisible();
  return panel;
}

async function passTimeUntilSeptember(page: Page) {
  for (let turn = 0; turn < 60; turn += 1) {
    const panel = await personnel(page);
    const datedRefusal = panel
      .getByText(/observed in current text on 2026-09-06/)
      .first();
    if ((await datedRefusal.count()) === 0) return;
    await goTo(page, "elsewhere-day");
    const quiet = page.getByTestId("story-let-time-pass");
    if (await quiet.isVisible().catch(() => false)) await quiet.click();
    else await page.getByTestId("pass-day").click();
  }
  throw new Error("Ordinary time did not reach the observation date.");
}

test("current Custom Start reaches dated personnel work, an NPC answer, and save/reopen", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Current main's compact Day overlay still intercepts the story time control;
  // #178's reviewed handoff records that owner-bound shell defect. The normal
  // route is proved at the supported desktop viewport without bypassing time.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?seed=recovery25-civil-normal-route");
  await fillCreator(page, {
    age: 40,
    route: "custom",
    place: "Minneapolis, Minnesota",
    placeQuery: "Minneapolis",
    placeScope: "locality",
  });
  await page.getByTestId("creator-summary-background").click();
  const start = page.getByTestId("state-agency-start");
  await expect(start).toBeEnabled();
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(start).toHaveClass(/is-chosen/);
  await page.getByTestId("creator-continue-background").click();
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("begin").click();
  await enterLife(page);

  let panel = await personnel(page);
  const employee = panel.getByRole("article", {
    name: /, Records specialist$/,
  });
  await expect(employee).toContainText(
    "observed in current text on 2026-09-06",
  );
  await expect(employee.getByRole("textbox")).toHaveCount(0);
  const initialVacancy = panel.getByRole("article", {
    name: "Vacant Records specialist position",
  });
  await expect(
    initialVacancy.getByRole("button", { name: "Offer direct reinstatement" }),
  ).toBeDisabled();

  await passTimeUntilSeptember(page);
  panel = await personnel(page);
  const vacancy = panel.getByRole("article", {
    name: "Vacant Records specialist position",
  });
  const offer = vacancy.getByRole("button", { name: "Offer reinstatement" });
  await expect(offer).toBeEnabled();
  await offer.click();
  await expect(
    page.getByText(
      "The offer was made and answered on receipt. Only an acceptance is an appointment.",
      { exact: true },
    ),
  ).toBeVisible();
  const answered = panel.getByRole("article", {
    name: /^Reinstatement offer to /,
  });
  await expect(answered).toContainText(
    /answer on receiving it: (accepted|declined)/,
  );
  const heading = await answered.getAttribute("aria-label");

  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  panel = await personnel(page);
  await expect(panel.getByRole("article", { name: heading! })).toContainText(
    /answer on receiving it: (accepted|declined)/,
  );
});
