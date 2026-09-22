import { expect, test } from "@playwright/test";
import { enterLife, fillCreator, goTo } from "./support/creator";
import { jurisdictionFor } from "./support/jurisdictions";

/**
 * The parties screen has to say what it is, not just be empty.
 *
 * Party evolution is built and runs: parties found, split, merge and drift.
 * On an ordinary first day the screen shows none of it, because a party's
 * open proposals are settled among its own officers and committee people and
 * a new life is none of those, and because a fresh world has not yet made a
 * change for the public half to carry. Both are defensible. What was not
 * defensible is that the screen said only "No party proposals involve you
 * yet", which reads as a system that was never built rather than one that is
 * closed to you today.
 *
 * This runs wherever the suite sends it, so a state whose parties behave
 * differently cannot pass on Kentucky's behalf.
 */
test("the empty parties screen says who decides and what is public", async ({
  page,
}) => {
  const where = jurisdictionFor("parties-screen-says-what-it-is");
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 60_000 });
  await fillCreator(page, {
    age: 34,
    state: where.state,
    place: where.place,
    route: "normal",
  });
  await page.getByTestId("begin").click();
  await enterLife(page);

  await goTo(page, "nav-parties");
  const empty = page.getByTestId("party-initiatives-none");
  await expect(empty).toBeVisible();
  const said = (await empty.innerText()).replace(/\s+/g, " ").trim();
  console.log(`[parties] in ${where.name} the screen reads: "${said}"`);

  // It names who settles these, so the screen is closed rather than broken.
  expect(said).toMatch(/officer|committee/i);
  // It names a way in, so a player is not left guessing.
  expect(said).toMatch(/put it forward|propose/i);
  // It says the decided half is public, which is what the code actually does.
  expect(said).toMatch(/public/i);
  // And it is still honest about today.
  expect(said).toMatch(/no party proposals involve you yet/i);
});
