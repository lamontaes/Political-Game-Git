import { expect, test } from "@playwright/test";
import { enterLife, fillCreator } from "./support/creator";

/**
 * The first object in a room that does something.
 *
 * What is waiting on a character used to be two navigations away, inside the
 * Calendar, behind the corner cluster, and nothing in the room mentioned it.
 * This walks the real build to the opening room and checks the papers on the
 * table are there, open, lead somewhere — and cost nothing to read, which is
 * the rule the whole object stands on.
 */
test("the papers on the table open, lead somewhere, and spend no time", async ({
  page,
}) => {
  await page.goto("/?seed=room-papers");
  await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 60_000 });
  await fillCreator(page, {
    age: 26,
    state: "Kentucky",
    place: "Lexington",
    route: "normal",
  });
  await page.getByTestId("begin").click();
  await enterLife(page);

  /*
   * The teeth. An ordinary week posts the meeting and the errands, so the
   * table has something on it — and it is in the room, with no navigation at
   * all, which is the entire point of the change.
   */
  const papers = page.getByTestId("room-papers");
  await expect(papers).toBeVisible();

  const clock = page
    .getByRole("navigation", { name: "Time, place and navigation" })
    .getByRole("button")
    .first();
  const clockBefore = await clock.innerText();

  // Reaching it reveals how much is waiting, without saying what.
  await papers.focus();
  await expect(page.getByTestId("room-papers")).toContainText(
    /waiting for you/,
  );

  // Activation inspects.
  await papers.click();
  const list = page.getByTestId("room-papers-open");
  await expect(list).toBeVisible();
  expect(await clock.innerText()).toBe(clockBefore);

  // Escape puts them down and gives focus back to the table.
  await list.press("Escape");
  await expect(list).toBeHidden();
  await expect(papers).toBeFocused();

  // And following one of them lands on the record that answers it, still
  // without spending an evening.
  await papers.click();
  await list.getByRole("button").first().click();
  await expect(page.getByRole("region", { name: "Commitment" })).toBeVisible();
  expect(await clock.innerText()).toBe(clockBefore);
});
