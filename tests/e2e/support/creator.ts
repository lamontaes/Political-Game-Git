import { expect, type Page } from "@playwright/test";

import { resolveExplicitCreatorHometown } from "../../../src/presentation/new-game-geography";

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
  readonly givenName?: string;
  readonly familyName?: string;
  /**
   * Matched against the locality buttons. Required unless this is an explicit
   * statewide custom/office start. Lexington is never inferred.
   */
  readonly place?: string;
  /** What to type into the town search, when it differs from `place`. */
  readonly placeQuery?: string;
  /**
   * `state` takes the custom-only statewide choice. A normal start is always a
   * town now (PT3-CREATOR B), and no creator route offers a county.
   */
  readonly placeScope?: "state" | "county" | "locality";
  /** Canonical state name. Required unless `place` already names "Town, State". */
  readonly state?: string;
  /** Custom-only: choose the authored statewide place rather than a hometown. */
  readonly statewide?: boolean;
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

/** Named Kentucky regression hometown. Callers must opt in; it is not inferred. */
export const KENTUCKY_LEXINGTON_REGRESSION = {
  state: "Kentucky",
  place: "Lexington",
} as const;

/** Opens the creator and stops at the first stage. */
export async function openCreator(page: Page): Promise<void> {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
}

/** State, then a town in that state. Statewide is a custom-only control. */
export async function chooseCreatorLocation(
  page: Page,
  life: CreatorLife,
  custom: boolean,
): Promise<void> {
  await expect(page.getByTestId("creator-stage-place")).toBeVisible();
  const hometown = resolveExplicitCreatorHometown({
    place: life.place,
    state: life.state,
    placeQuery: life.placeQuery,
    statewide: life.statewide,
    office: life.office && custom ? true : life.office,
    placeScope: life.placeScope,
  });

  await page.getByTestId("state-search").fill(hometown.stateName);
  await page.getByTestId(`state-${hometown.usps}`).click();
  await expect(page.getByTestId("creator-change-state")).toBeVisible();

  if (hometown.statewide) {
    if (!custom) {
      throw new Error("Statewide start is a custom-only control.");
    }
    await page.getByTestId("place-statewide-choice").click();
    await page.getByTestId("creator-continue-place").click();
    return;
  }

  await page.getByTestId("place-search").fill(hometown.townQuery ?? "");
  await page
    .getByTestId("place-choices")
    .getByRole("button")
    .filter({ hasText: new RegExp(hometown.townMatch ?? "^$", "i") })
    .first()
    .click();
  await page.getByTestId("creator-continue-place").click();
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
  if (life.givenName)
    await page.getByLabel("First name", { exact: true }).fill(life.givenName);
  if (life.familyName)
    await page.getByLabel("Last name", { exact: true }).fill(life.familyName);
  if (life.gender) await page.getByTestId(`gender-${life.gender}`).click();
  await page.getByTestId("creator-continue-character").click();

  await chooseCreatorLocation(page, life, custom);

  if (custom) {
    await expect(page.getByTestId("creator-stage-background")).toBeVisible();
    // A custom child plays the early years; a custom adult summarizes them, so
    // the world is built as an adult household rather than one still in its
    // formative-years shape.
    if (life.childhood) await page.getByTestId("depth-childhood").click();
    else if (life.age >= 18) await page.getByTestId("depth-later").click();
    if (life.office) await page.getByTestId("office-start").click();
    if (life.household) await page.getByTestId(life.household).click();
    await page.getByTestId("creator-continue-background").click();
  }

  await expect(page.getByTestId("creator-stage-whoareyou")).toBeVisible();
  const calibration = life.calibration ?? "skipped";
  await page
    .getByTestId(
      calibration === "skipped"
        ? "whoareyou-play"
        : calibration === "deep"
          ? "whoareyou-deep"
          : "whoareyou-answer",
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
 * Begin lands on the play screen. A new life opens with the skippable world
 * introduction in front of the room; specs that are not about it skip it the
 * way a player would, so they start from the same room they always did.
 */
export async function enterLife(page: Page): Promise<void> {
  await expect(page.getByTestId("play-screen")).toBeVisible();
  const intro = page.getByTestId("world-orientation");
  const shown = await intro
    .waitFor({ state: "visible", timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  if (shown) {
    await page.getByTestId("orientation-skip").click();
    await expect(intro).toBeHidden();
  }
}

/**
 * Opens the corner cluster, which is where the game's destinations now live.
 *
 * The shell's navigation moved off the page and into a cluster that rests small
 * and translucent until it is reached for, so every test that wants a
 * destination opens the cluster first — the same two moves a player makes.
 */
export async function openShellMenu(page: Page): Promise<void> {
  const flyout = page.getByTestId("shell-nav-flyout");
  if (await flyout.isVisible()) return;
  await page.getByTestId("shell-nav-cluster").click();
  await expect(flyout).toBeVisible();
}

/** Opens the cluster and presses one of its destinations. */
async function revealShellDestination(page: Page, testid: string) {
  await openShellMenu(page);
  const destination = page.getByTestId(testid);
  if (await destination.isVisible()) return destination;
  const group = [
    "elsewhere-work",
    "nav-municipal",
    "nav-politics-budget",
    "nav-politics-candidacy",
    "nav-politics-tax",
    "nav-politics-transit",
  ].includes(testid)
    ? "politics"
    : ["nav-finances", "nav-jobs", "nav-personal"].includes(testid)
      ? "personal"
      : null;
  if (group) {
    const back = page.getByTestId("nav-submenu-back");
    if (await back.isVisible()) await back.click();
    await page.getByTestId(`nav-group-${group}`).click();
  }
  await expect(destination).toBeVisible();
  return destination;
}

/** Opens the cluster and presses one of its destinations. */
export async function goTo(page: Page, testid: string): Promise<void> {
  await (await revealShellDestination(page, testid)).click();
}

/**
 * Asserts a destination is not on offer, with the menu actually open.
 *
 * A control inside a closed menu is absent from the page for the wrong reason,
 * so a withheld-capability check has to look where the control would be.
 */
export async function expectNoDestination(
  page: Page,
  testid: string,
): Promise<void> {
  await openShellMenu(page);
  await expect(page.getByTestId(testid)).toHaveCount(0);
  await page.keyboard.press("Escape");
}

/** What the corner cluster says: who you are, when, and where. */
export async function shellIdentity(page: Page): Promise<string> {
  return (
    (await page.getByTestId("shell-nav-cluster").getAttribute("aria-label")) ??
    ""
  );
}

/**
 * Opens one of the play screen's secondary surfaces.
 *
 * Packet 77 moved the day, the people and the office out from under the
 * current moment; the shell then moved them into the corner cluster. A test
 * that wants one of them still asks for it the way a player does.
 */
export async function openElsewhere(
  page: Page,
  key: "day" | "people" | "work",
): Promise<void> {
  const control = await revealShellDestination(
    page,
    key === "day" ? "nav-calendar" : `elsewhere-${key}`,
  );
  await expect(control).toBeVisible();
  if ((await control.getAttribute("aria-pressed")) === "true") {
    /* Already open behind the flyout; close the flyout and leave it open. */
    await page.keyboard.press("Escape");
    return;
  }
  await control.click();
}

/** Explicit initial retention versus an update of the existing save slot. */
export async function saveLife(page: Page): Promise<void> {
  await openShellMenu(page);
  const keep = page.getByTestId("keep-world");
  if (await keep.count()) await keep.click();
  else await page.getByTestId("save-world").click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await openShellMenu(page);
  await expect(keep).toHaveCount(0);
  await expect(page.getByTestId("save-world")).toBeEnabled();
}

/**
 * The composed creator's place step, spelled out: a state, then a town in it.
 *
 * The microfix specs were written against UI144's single national search; on
 * the composed creator (PT3-CREATOR B) a place is chosen state-first, so they
 * reach the same "a place is chosen" state through this rather than typing a
 * state name into the town search.
 */
export async function chooseStateThenTown(
  page: Page,
  stateName: string,
  townQuery: string,
  town: RegExp,
): Promise<void> {
  const hometown = resolveExplicitCreatorHometown({
    state: stateName,
    place: townQuery,
    placeQuery: townQuery,
  });
  await page.getByTestId("state-search").fill(hometown.stateName);
  await page.getByTestId(`state-${hometown.usps}`).click();
  await page.getByTestId("place-search").fill(townQuery);
  await page
    .getByTestId("place-choices")
    .getByRole("button")
    .filter({ hasText: town })
    .first()
    .click();
}

/** Compatibility name used by the completed L route. */
export const KENTUCKY_REGRESSION_HOMETOWN = KENTUCKY_LEXINGTON_REGRESSION;
