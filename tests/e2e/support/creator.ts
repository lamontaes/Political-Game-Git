import { expect, type Page } from "@playwright/test";

/**
 * Walking the character creator the way a player does.
 *
 * Packet 77 turned New Game from one page of seven headed sections into one
 * screen that opens a stage at a time, and every browser test that starts a
 * life had its own copy of the old walk. Six copies of a flow is six places to
 * forget when the flow changes, which is exactly what happened, so the walk
 * lives here once and the specs say what kind of life they want.
 *
 * Nothing here reaches past the controls a player has. It types in the search
 * box, it clicks the buttons, and it waits for the stage that click opens.
 */

export interface CreatorLife {
  readonly age: number;
  /** Matched against the place buttons. Defaults to Kentucky. */
  readonly place?: string;
  /** The explicit route. Defaults to the ordinary generated one. */
  readonly route?: "normal" | "custom";
  /**
   * Play the early years rather than summarizing them. On a normal start this
   * is automatic below eighteen; it is only a control on the custom route.
   */
  readonly childhood?: boolean;
  /** Custom-start only: who is at home. A normal start generates it (Task E). */
  readonly household?: "lives-alone" | "shares-a-home";
  /** Custom-start only: begin already working an office. */
  readonly office?: boolean;
  /**
   * Whether to answer the "Who are you?" questions. Defaults to discovering
   * through play, which is one of the two things the screen offers.
   */
  readonly calibration?: "short" | "deep" | "skipped";
  /** A `gender-*` test id suffix, when the test cares. */
  readonly gender?: string;
}

/** Opens the creator and stops at the first stage. */
export async function openCreator(page: Page): Promise<void> {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
}

/**
 * Opens the creator and answers every step, stopping with Begin enabled.
 *
 * The post-#87 flow is: route → character → place → (background, on the custom
 * route only) → who-are-you → begin. Who is at home, whether the character
 * already works, and how much of the early life is played are the generator's
 * to decide on a normal start (Task E), so a test that pins any of them takes
 * the custom route automatically.
 *
 * Deliberately does not press Begin: some tests want to read the setup screen
 * first, and pressing it is one line in the caller.
 */
export async function fillCreator(
  page: Page,
  life: CreatorLife,
): Promise<void> {
  await openCreator(page);

  const custom =
    life.route === "custom" ||
    life.office === true ||
    life.household !== undefined;
  await page.getByTestId(custom ? "start-custom" : "start-normal").click();

  await expect(page.getByTestId("creator-stage-character")).toBeVisible();
  await page.getByTestId("start-age").fill(String(life.age));
  if (life.gender) await page.getByTestId(`gender-${life.gender}`).click();
  await page.getByTestId("creator-continue-character").click();

  await expect(page.getByTestId("creator-stage-place")).toBeVisible();
  const place = life.place ?? "Kentucky";
  await page.getByTestId("place-search").fill(place.slice(0, 5));
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: new RegExp(place, "i") })
    .first()
    .click();
  await page.getByTestId("creator-continue-place").click();

  if (custom) {
    await expect(page.getByTestId("creator-stage-background")).toBeVisible();
    if (life.childhood) await page.getByTestId("depth-childhood").click();
    if (life.office) await page.getByTestId("office-start").click();
    if (life.household) await page.getByTestId(life.household).click();
    await page.getByTestId("creator-continue-background").click();
  }

  await expect(page.getByTestId("creator-stage-whoareyou")).toBeVisible();
  const calibration = life.calibration ?? "skipped";
  await page
    .getByTestId(
      calibration === "skipped" ? "whoareyou-play" : "whoareyou-answer",
    )
    .click();
  await expect(page.getByTestId("begin")).toBeEnabled();
}

/** The whole walk, ending on the play screen or the calibration. */
export async function startLife(page: Page, life: CreatorLife): Promise<void> {
  await fillCreator(page, life);
  await page.getByTestId("begin").click();
}

/**
 * Dismisses the family introduction, when there is one.
 *
 * A normal start now explains the household the generator wrote before the
 * first beat. A life with no household on record has nothing to introduce and
 * shows no gate, so this is tolerant by design rather than by accident.
 */
export async function enterLife(page: Page): Promise<void> {
  const gate = page.getByTestId("introduction-continue");
  if ((await gate.count()) > 0) await gate.click();
}

/**
 * Opens one of the play screen's secondary surfaces.
 *
 * Packet 77 moved the day, the people and the office out from under the
 * current moment and behind a row of controls, so a test that wants one of
 * them asks for it the way a player does.
 */
export async function openElsewhere(
  page: Page,
  key: "day" | "people" | "work",
): Promise<void> {
  const control = page.getByTestId(`elsewhere-${key}`);
  await expect(control).toBeVisible();
  if ((await control.getAttribute("aria-pressed")) !== "true") {
    await control.click();
  }
}
