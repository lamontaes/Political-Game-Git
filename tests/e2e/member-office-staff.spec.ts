import { expect, test } from "./fixtures";
import { enterLife, goTo, saveLife, startLife } from "./support/creator";
import { reachMemberOffice } from "./support/legislative-entry";

/**
 * A Nevada life wins an Assembly seat through the ordinary route, then hires
 * a Legislative Aide from the office's own applicants. The staff briefing,
 * empty on the first day, reads the hire, and the hire survives a reload.
 */
test("a new Nevada legislator hires a Legislative Aide", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
  await page.goto("/?seed=member-office-staff-nv");
  await startLife(page, { age: 40, place: "Reno", state: "Nevada" });
  await enterLife(page);
  await reachMemberOffice(page);
  await goTo(page, "elsewhere-work");

  const hiring = page.getByTestId("office-staff-hiring");
  await expect(hiring.getByTestId("office-staff-none-hired")).toBeVisible();
  await expect(page.getByTestId("office-no-staff")).toBeVisible();
  await hiring.getByTestId("office-staff-look").click();
  const aide = hiring.getByTestId(
    "office-staff-opening-member-legislative-aide",
  );
  await expect(aide.getByTestId("office-staff-hire")).toHaveCount(3);
  await expect(
    hiring.getByTestId("office-staff-opening-member-constituent-caseworker"),
  ).toBeVisible();
  await hiring.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("member-office-applicants.png"),
    fullPage: true,
  });
  await aide.getByTestId("office-staff-hire").nth(1).click();
  await expect(hiring.getByTestId("office-staff-note")).toContainText(
    "now works for you as Legislative Aide",
  );
  await expect(hiring.getByTestId("office-staff-filled")).toHaveCount(1);
  await expect(page.getByTestId("office-no-staff")).toHaveCount(0);
  await expect(page.getByTestId("office-staff-briefing")).toContainText(
    "Legislative Aide",
  );
  await page.screenshot({
    path: testInfo.outputPath("member-office-hired.png"),
    fullPage: true,
  });

  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await expect(
    page.getByTestId("office-staff-hiring").getByTestId("office-staff-filled"),
  ).toHaveCount(1);
});
