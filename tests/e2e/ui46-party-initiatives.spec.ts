import { expect, test } from "./fixtures";

import { enterLife, openPoliticsHub, startLife } from "./support/creator";

/*
 * CRUNCH46 UI: Politics > Parties carries the WORLD46 party proposals. A new
 * life reaches the panel the ordinary way, proposes a party with the keyboard,
 * and sees the proposal and its own next step. A refused command leaves a
 * reason in the status note.
 */

test.describe.configure({ timeout: 180_000 });

test("Parties tab mounts party proposals, reachable by keyboard", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?art-preview=candidate");
  await startLife(page, {
    state: "Nevada",
    place: "Alamo",
    age: 34,
    calibration: "skipped",
  });
  await enterLife(page);

  await openPoliticsHub(page, "nav-parties");
  const panel = page.getByTestId("party-initiatives");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: "Party proposals" }),
  ).toBeVisible();
  // A fresh life is involved in nothing yet: the honest empty state.
  await expect(page.getByTestId("party-initiatives-none")).toBeVisible();
  // Bodies the player does not sit on are not shown at all.
  await expect(page.getByTestId("party-bodies")).toHaveCount(0);

  const status = page.getByTestId("party-initiatives-status");
  await expect(status).toHaveAttribute("role", "status");

  // Submitting without a name is refused and focus goes to the name.
  const submit = page.getByTestId("party-propose-submit");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Give the new party a name first.");
  const name = page.getByTestId("party-propose-name");
  await expect(name).toBeFocused();
  await expect(page.getByTestId("party-initiative-list")).toHaveCount(0);

  // Level by keyboard: open, Escape returns focus, then choose State.
  const level = page.getByTestId("party-propose-level");
  await level.focus();
  await page.keyboard.press("Enter");
  await expect(level).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(level).toHaveAttribute("aria-expanded", "false");
  await expect(level).toBeFocused();
  await expect(level).toContainText("Local");
  await page.keyboard.press("ArrowDown");
  await expect(level).toContainText("State");
  const place = page.getByTestId("party-propose-place");
  await expect(place).toBeVisible();
  await expect(place).toContainText("Nevada");

  await name.focus();
  await page.keyboard.type("Silver Valley Party");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("You proposed forming Silver Valley Party.");
  await expect(name).toHaveValue("");
  const item = page
    .getByTestId("party-initiative-list")
    .locator("li")
    .filter({ hasText: "Proposal to form Silver Valley Party" });
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute("data-stage", "open");
  await expect(item).toContainText("Proposed by");
  await page.screenshot({ path: info.outputPath("01-party-proposal.png") });

  // The proposer's own next step is a real button; pressing it by keyboard
  // either records the decision or states why it could not.
  const decide = item.getByRole("button", { name: "Put it to a decision" });
  await decide.focus();
  await page.keyboard.press("Enter");
  await expect(status).not.toHaveText(
    "You proposed forming Silver Valley Party.",
  );
  await expect(status).not.toBeEmpty();
  await page.screenshot({ path: info.outputPath("02-after-decision.png") });

  expect(errors).toEqual([]);
});
