import { expect, type Page } from "@playwright/test";

import { lifePlaceStateIdentities } from "../../../src/simulation";

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
  /** Matched against the locality buttons. Defaults to Lexington. */
  readonly place?: string;
  /** Canonical state name. Inferred from `place` when omitted. */
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

/** Opens the creator and stops at the first stage. */
export async function openCreator(page: Page): Promise<void> {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
}

function namedState(name: string) {
  return lifePlaceStateIdentities().find(
    (state) => state.name.toLowerCase() === name.trim().toLowerCase(),
  );
}

function inferredStateName(place: string): string {
  const direct = namedState(place);
  if (direct) return direct.name;
  const afterComma = place.split(",")[1]?.trim();
  if (afterComma && namedState(afterComma)) return namedState(afterComma)!.name;
  return "Kentucky";
}

/** State, then a town in that state. Statewide is a custom-only control. */
export async function chooseCreatorLocation(
  page: Page,
  life: CreatorLife,
  custom: boolean,
): Promise<void> {
  await expect(page.getByTestId("creator-stage-place")).toBeVisible();
  const requested = life.place ?? "Lexington";
  const stateName = life.state ?? inferredStateName(requested);
  const state = namedState(stateName);
  if (!state) throw new Error(`No canonical state named ${stateName}.`);

  await page.getByTestId("state-search").fill(state.name);
  await page.getByTestId(`state-${state.usps}`).click();
  await expect(page.getByTestId("creator-change-state")).toBeVisible();

  const statewide =
    life.statewide === true ||
    (Boolean(namedState(requested)) && (custom || life.office === true));
  if (statewide) {
    await page.getByTestId("place-statewide-choice").click();
    await page.getByTestId("creator-continue-place").click();
    return;
  }

  // In-state search matches the town label, not "Town, State". A bare state
  // name means that state is already chosen. Kentucky still opens on
  // Lexington, the authored hometown; other states take the first listed town
  // rather than searching for Lexington there.
  const town = namedState(requested)
    ? state.usps === "KY"
      ? "Lexington"
      : null
    : (requested.split(",")[0]?.trim() ?? requested);
  if (town) {
    await page.getByTestId("place-search").fill(town.slice(0, 8));
  }
  const choices = page.getByTestId("place-choices").getByRole("button");
  if (town) {
    await choices
      .filter({ hasText: new RegExp(town, "i") })
      .first()
      .click();
  } else {
    await choices.first().click();
  }
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
