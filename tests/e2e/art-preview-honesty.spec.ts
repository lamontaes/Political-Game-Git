import { expect, test } from "./fixtures";
import { enterLife, startLife } from "./support/creator";

/**
 * The art-preview banner must describe the art that is actually drawn.
 *
 * Twenty-two spec files open the game with `?art-preview=candidate`. The
 * private candidate bank they want is owner-private and in no checkout a
 * machine can make, so `setupForArtPreview` and `prepareCandidateOpeningWorld`
 * hand back what they were given and the ordinary appearance path draws. Until
 * this case existed the banner went on saying "unreleased candidate art" over
 * production art — not silence, which would already break the rule that
 * unknown content is skipped with a stated reason, but a false claim about
 * itself, which is worse.
 *
 * This is deliberately the one case in the set that does not need the bank.
 * It asserts the state through `data-candidate-art` and checks only that the
 * sentence agrees with it, so it passes in the owner's checkout and on a
 * runner, and in each one it proves the screen is telling the truth about
 * which of the two it is in.
 */
test("the preview banner says which art is on screen, and is right either way", async ({
  page,
}) => {
  await page.goto("/?art-preview=candidate&seed=art-preview-honesty");
  await startLife(page, { age: 22, place: "Lexington", state: "Kentucky" });
  await enterLife(page);

  const banner = page.getByTestId("art-preview-banner");
  await expect(banner).toBeVisible();

  const showingCandidate =
    (await banner.getAttribute("data-candidate-art")) === "true";
  const said = (await banner.innerText()).trim();
  expect(said).not.toBe("");

  if (showingCandidate) {
    // The bank is present: the original warning is the right one, and the
    // point of it is that unreleased pixels are never mistaken for approved.
    expect(said).toContain("unreleased candidate art");
    expect(said).toContain("not approved");
    return;
  }

  // The bank is absent, which is every runner. The banner must not claim it.
  expect(said).not.toContain("unreleased candidate art");
  expect(said).toContain("not in this checkout");
});
