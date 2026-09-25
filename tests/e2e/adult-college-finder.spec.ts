import { test, expect } from "./fixtures";
import { startLife, enterLife, goTo } from "./support/creator";

/*
 * A nineteen-year-old in Peoria, Illinois, out of high school, opens Jobs and
 * study, then Study. (Someone still in high school sees their school there
 * instead: college comes after it.)
 *
 * A playtest there read the Study tab as offering only the game's own college:
 * the real-college finder was on the page, but a long scroll below six program
 * cards. The finder now comes first, the page carries no provenance wording,
 * and a real college can be applied to — once — and answers after a wait.
 */
test("a nineteen-year-old in Peoria finds and applies to a real college from the Study tab", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/?seed=adult-college-finder-peoria");
  await startLife(page, { place: "Peoria", state: "Illinois", age: 19 });
  await enterLife(page);
  await goTo(page, "nav-jobs");
  await page
    .getByRole("group", { name: "Browse opportunities" })
    .getByRole("button", { name: "Study", exact: true })
    .click();

  const finder = page.getByRole("region", {
    name: "Real education options",
    exact: true,
  });
  // On the screen the tab opens to, not a scroll away.
  await expect(
    finder.getByRole("heading", { name: "Find a school or college" }),
  ).toBeInViewport();

  const study = page.getByRole("region", { name: "Education and work" });
  for (const internal of [
    "(fictional)",
    "game-authored",
    "simulated days",
    "editable",
    "NCES",
  ])
    await expect(study).not.toContainText(internal);

  await finder
    .getByRole("textbox", { name: "Search institutions" })
    .fill("Bradley");
  await finder
    .getByRole("button", { name: /^Bradley University — Peoria, IL/ })
    .click();
  const apply = finder.getByRole("button", {
    name: "Apply for Bachelor's degree",
    exact: true,
  });
  await expect(apply).toBeEnabled();
  await apply.click();
  // The college answers after a wait, not on the spot.
  await expect(finder.getByTestId("study-application-waiting")).toContainText(
    "You applied to Bradley University",
  );
  // A second application for the same degree is not offered.
  await expect(apply).toBeDisabled();
  await expect(finder).toContainText(
    "You already applied to Bradley University.",
  );
});
