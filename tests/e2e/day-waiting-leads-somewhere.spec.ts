import { expect, test } from "./fixtures";
import { enterLife, fillCreator, goTo } from "./support/creator";

/**
 * What is waiting on you has somewhere to go, and reading it costs nothing.
 *
 * "Waiting on you" was a list of true sentences with no way to answer any of
 * them. A player read that the posted meeting was waiting for a decision and
 * then went looking for the screen that takes one. This proves the route is
 * there in the real build, and — the half that is easy to break later —
 * that following it is still reading: the clock does not move, because
 * inspecting a commitment is not attending it.
 */
test("a waiting item opens the record that answers it, and the day does not move", async ({
  page,
}) => {
  await page.goto("/?seed=day-waiting-route");
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
   * Today is not in the room. It lives inside the Calendar, which is itself
   * behind the corner cluster, so what is waiting on this character is two
   * navigations away from where they are standing. That is worth knowing and
   * is not this change's to fix; the route is taken here the way a player
   * takes it rather than by mounting the panel directly.
   */
  await goTo(page, "elsewhere-day");

  const pending = page.getByTestId("day-pending");
  await expect(pending).toBeVisible();

  /*
   * The teeth. An ordinary week posts the public meeting, and that item's
   * recorded focus is the calendar activity for it — so a routed control has
   * to be here. If the ordinary-life writer stops producing it, or the route
   * stops resolving, this fails rather than quietly asserting nothing.
   */
  const routed = pending.getByRole("button");
  await expect(routed.first()).toBeVisible();

  /*
   * The clock is read from the shell's own place-and-time control, not from
   * Today: opening the record replaces Today, and a reading taken from a
   * panel that is no longer on screen would prove nothing.
   */
  const clock = page
    .getByRole("navigation", { name: "Time, place and navigation" })
    .getByRole("button")
    .first();
  const clockBefore = await clock.innerText();

  await routed.first().click();

  // It lands on the record that answers it.
  await expect(page.getByRole("region", { name: "Commitment" })).toBeVisible();

  // And the day is where it was. Reading what an evening would cost is not
  // spending it, which is the rule the whole surface stands on.
  expect(await clock.innerText()).toBe(clockBefore);
});
