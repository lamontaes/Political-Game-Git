import { expect, test } from "./fixtures";
import { startLife, enterLife, goTo, openElsewhere } from "./support/creator";
/**
 * Requires the UI owner's LIFE-panel registration patch, never a fixture
 * route. That registration is UI's own composition (LifePathsPanel mounting
 * CareerPathsPanel, itself reached through the "Jobs and study" entry) - a
 * standalone tree built from this donor plus current main, without UI's
 * actual PlayerGame.tsx merged in, does not carry it. Verified end-to-end
 * against UI's real current composition in an isolated combined checkout:
 * offer, refuse, offer, accept, blocked-by-commitment, fulfill via Day,
 * begin, schedule, submit, resign, save, reload all pass with zero further
 * changes on either side (docs/integration/career-path7-ui-combined.md).
 * So this checks reachability rather than assuming it, and names the real
 * reason when it's absent - never an unconditional skip, and never a
 * fixture standing in for the actual root.
 *
 * The reachability probe has to look where the destination actually lives.
 * Every real destination renders inside the shell-nav flyout, not on the page
 * by default (see openShellMenu/goTo in support/creator.ts, used the same way
 * by 29 other specs) - checking for it without opening that menu first
 * reports "absent" on every tree, composed or not, which is a false
 * negative, not an honest one.
 *
 * And a civilian career is a Personal destination, not a political one. The
 * accepted split is that household and ordinary working life stay in
 * Personal while office duties are Politics, so CareerPathsPanel is reached
 * through Personal -> Jobs and study. Politics -> Your office is a different
 * screen that never held this panel.
 */
test("normal civilian career offer, keyboard consent, work, resignation and save", async ({
  page,
}) => {
  await page.goto("/?seed=career-path7-normal");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 35,
    route: "custom",
    household: "lives-alone",
  });
  await enterLife(page);
  await goTo(page, "nav-jobs");
  const career = page.getByRole("region", {
    name: "Career opportunities",
    exact: true,
  });
  const composed = await career
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  test.skip(
    !composed,
    "Jobs and study does not mount the career panel on this tree - needs UI's actual composition (LifePathsPanel mounting CareerPathsPanel); proven working against it separately, see docs/integration/career-path7-ui-combined.md",
  );
  await expect(career).toBeVisible();
  await career
    .getByRole("button", { name: "Seek an offer", exact: true })
    .click();
  await career
    .getByRole("button", { name: "Refuse offer", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(career.getByRole("status")).toContainText("declined");
  await career
    .getByRole("button", { name: "Seek an offer", exact: true })
    .click();
  await career
    .getByRole("button", { name: "Accept offer", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(career.getByRole("status")).toContainText("Accepted");
  await career
    .getByRole("button", { name: "Wait one day", exact: true })
    .click();
  /*
    The settled contract, ruled by GOVERNING against their own first answer
    and checked here against source before it was written down.

    The 20:00 item is a tentative HOLD, not a confirmed commitment, and the
    two are not treated alike. interruption-policy.ts says what stops a skip
    whatever the player prefers — "a confirmed commitment, a journey, a
    decision that needs the player" — and then says of holds: "Passing a day
    lets an optional hold lapse at its start, recorded as a decline. Asking
    to be stopped for holds halts the skip at the hold instead."
    ordinary-life.ts:284-292 is exactly that: stop when the player asked to
    be stopped, otherwise decline the hold and carry on.

    So with the default preference the day SHOULD advance past this hold.
    This spec used to promise the opposite and was left failing on purpose
    waiting for a ruling; the ruling is that the browser was right. What the
    contract actually owes the player is that the hold is not skipped in
    silence — declineVenueActivity writes it into the record they can read.
  */
  await expect(career.getByRole("status")).toContainText(
    /passed \(\d+ minutes\)/,
  );
  await expect(page.getByTestId("shell-nav-cluster")).toContainText(
    "January 6, 2026",
  );
  /*
    The other half of the contract is NOT asserted here, because it cannot be
    seen yet. interruption-policy.ts promises the lapse is "recorded as a
    decline", and scheduled-activity-choice.ts does write that event —
    "<title> was declined and its calendar hold was released", carrying
    involvedEntityIds [personId, activityId]. But opening the Journal and its
    Record shows only "I remember making room at the table": projectLifeRecord
    does not carry the venue-activity decline through, so a player cannot read
    the thing the policy says is recorded. That is a gap between the stated
    contract and the surface. It is filed separately with this evidence, and
    left unasserted rather than asserted against a surface that would have to
    change to make it true.
  */
  await goTo(page, "nav-jobs");
  // The normal start has a real commitment; fulfill it through Day.
  await openElsewhere(page, "day");
  // Today is the Calendar's first tab now, not a separate day overlay.
  const activities = page
    .getByTestId("calendar-workspace")
    .getByTestId("venue-activities");
  await activities
    .getByRole("button", { name: "Carry out activity", exact: true })
    .first()
    .click();
  await expect(
    activities.getByTestId("venue-activity-completed"),
  ).toBeVisible();
  await goTo(page, "nav-jobs");
  await career
    .getByRole("button", { name: "Wait one day", exact: true })
    .click();
  // The command's receipt reports the clock it actually moved, and this time
  // nothing stopped it.
  await expect(career.getByRole("status")).toContainText(
    /passed \(\d+ minutes\)/,
  );
  await expect(career.getByRole("status")).not.toContainText(
    "resolve this commitment before continuing",
  );
  await career
    .getByRole("button", { name: "Begin accepted work", exact: true })
    .click();
  await expect(career.getByRole("status")).toContainText("began");
  await career
    .getByRole("button", { name: "Perform work", exact: true })
    .click();
  await expect(career.getByRole("status")).toContainText("recorded");
  await expect(
    career.getByRole("textbox", { name: "Work submission", exact: true }),
  ).toHaveCount(0);
  await career.getByRole("button", { name: "Resign", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(career.getByRole("status")).toContainText("left");
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("keep-world").click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-jobs");
  await expect(
    career.getByText(
      "Completed shift recorded. No written submission was required.",
      {
        exact: false,
      },
    ),
  ).toBeVisible();
});
