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
  readonly givenName?: string;
  readonly familyName?: string;
  /** Matched against the locality buttons. Defaults to Lexington. */
  readonly place?: string;
  /** What to type into the town search, when it differs from `place`. */
  readonly placeQuery?: string;
  /**
   * `state` takes the custom-only statewide choice. A normal start is always a
   * town now (PT3-CREATOR B), and no creator route offers a county.
   */
  readonly placeScope?: "state" | "county" | "locality";
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
  // An office start needs a place with a staffed legislature on record, which
  // is the state rather than a town; everything else starts in a town.
  const requested = life.place ?? (life.office ? "Kentucky" : "Lexington");
  const stateName = life.state ?? inferredStateName(requested);
  const state = namedState(stateName);
  if (!state) throw new Error(`No canonical state named ${stateName}.`);

  await page.getByTestId("state-search").fill(state.name);
  await page.getByTestId(`state-${state.usps}`).click();
  await expect(page.getByTestId("creator-change-state")).toBeVisible();

  if (life.placeScope === "county")
    throw new Error("The creator offers no county start; choose a town.");
  const statewide =
    life.statewide === true ||
    life.placeScope === "state" ||
    (Boolean(namedState(requested)) && (custom || life.office === true));
  if (statewide) {
    await page.getByTestId("place-statewide-choice").click();
    await page.getByTestId("creator-continue-place").click();
    return;
  }

  /*
   * A state named as the place, on a normal start, means "a town there": the
   * creator no longer takes a state as a hometown. Kentucky keeps Lexington,
   * which every older spec meant by it; any other state takes the first town
   * its own search lists, which is deterministic for a given corpus.
   */
  const stateOnly = Boolean(namedState(requested));
  const locality = stateOnly
    ? state.name === "Kentucky"
      ? "Lexington"
      : null
    : requested;
  // The town's own name, without the ", State" a caller may have added.
  const town = locality?.split(",")[0]?.trim() ?? null;
  await page
    .getByTestId("place-search")
    .fill(life.placeQuery ?? (town ? town.slice(0, 8) : "a"));
  const choices = page.getByTestId("place-choices").getByRole("button");
  await (town ? choices.filter({ hasText: new RegExp(town, "i") }) : choices)
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
 * Dismisses the family introduction, when there is one.
 *
 * A normal start now explains the household the generator wrote before the
 * first beat. A life with no household on record has nothing to introduce and
 * shows no gate, so this is tolerant by design rather than by accident.
 */
export async function enterLife(page: Page): Promise<void> {
  await expect(page.getByTestId("play-screen")).toBeVisible();

  /*
   * Wait for the introduction to settle before deciding whether there is one.
   *
   * `isVisible()` answers immediately and does not wait, so on a slower render
   * this walked straight past a panel that was about to appear, clicked
   * nothing, and left the life sitting behind its own gate. Every later step
   * then timed out somewhere else entirely — on `play-screen`, on `keep-world`,
   * on `elsewhere-work` — which is why one race showed up as failures spread
   * across a dozen specs that have nothing to do with each other.
   *
   * Racing to a decision is the bug, so this waits for the page to be in one of
   * the two states it can actually be in: showing the introduction, or already
   * past it. A life with no household on record has nothing to introduce and
   * shows no gate, and that is still tolerated — by waiting for the alternative
   * rather than by failing to notice the panel.
   */
  const opening = page.getByTestId("opening-life-panel");
  const scene = page.getByTestId("opening-life-scene");
  const story = page.getByTestId("story-section");
  await expect
    .poll(async () =>
      (await opening.count()) > 0 ||
      (await scene.count()) > 0 ||
      (await story.count()) > 0
        ? "ready"
        : "",
    )
    .toBe("ready");
  /*
   * Already in the continuing life: entering it again is a no-op rather than a
   * wait for an introduction that is not coming. Several specs call this after
   * a helper that already did, and that used to time out here.
   */
  if ((await story.count()) > 0 && (await opening.count()) === 0) return;

  if ((await opening.count()) > 0) {
    // Two beats: the world, then the household. Both use the same control.
    await opening.getByRole("button", { name: "Meet your household" }).click();
    await opening.getByRole("button", { name: "Step inside" }).click();
  }
  if ((await scene.count()) > 0) {
    await page
      .getByRole("button", { name: "Continue your life", exact: true })
      .first()
      .click();
  }
  const gate = page.getByTestId("introduction-continue");
  if ((await gate.count()) > 0) await gate.click();
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
export async function goTo(page: Page, testid: string): Promise<void> {
  await openShellMenu(page);
  await page.getByTestId(testid).click();
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
  await openShellMenu(page);
  const control = page.getByTestId(`elsewhere-${key}`);
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
  const state = namedState(stateName);
  if (!state) throw new Error(`No canonical state named ${stateName}.`);
  await page.getByTestId("state-search").fill(state.name);
  await page.getByTestId(`state-${state.usps}`).click();
  await page.getByTestId("place-search").fill(townQuery);
  await page
    .getByTestId("place-choices")
    .getByRole("button")
    .filter({ hasText: town })
    .first()
    .click();
}
