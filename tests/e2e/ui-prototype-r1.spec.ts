import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * UI-PROTOTYPE-01-R1 browser proofs.
 *
 * DEVELOPMENT-ONLY. One test per owner correction in the R1 pass, exercising
 * `/ui-prototype.html` and nothing else. These are additions: the original
 * prototype proofs in `ui-prototype.spec.ts` still run unweakened, and none of
 * their assertions were relaxed to make room for these.
 */

const PROTOTYPE_URL = "/ui-prototype.html";

async function openTitle(page: Page) {
  await page.goto(PROTOTYPE_URL);
  await page.getByTestId("preview-dismiss").click();
  await expect(page.getByTestId("preview-disclosure")).toHaveCount(0);
}

async function enterShell(page: Page) {
  await openTitle(page);
  await page.getByTestId("title-new-game").click();
  await expect(page.getByTestId("scene-shell")).toBeVisible();
}

/**
 * Pins one person, one commitment and one measure, in that order.
 *
 * Deliberately the same route the original proof uses, so a drag test cannot
 * quietly pass against a differently-built rail.
 */
async function pinThreeKinds(page: Page) {
  await page.getByTestId("scene-person-person-aide").click();
  await page.getByTestId("action-pin").click();

  await page.getByTestId("nav-cluster").click();
  await page.getByTestId("nav-calendar").click();
  await page.getByTestId("calendar-row-meeting-community").click();
  await page.getByTestId("workspace-pin").click();

  await page.getByTestId("entity-link-measure-measure-transit-pilot").click();
  await page.getByTestId("workspace-pin").click();
  await page.getByTestId("workspace-close").click();

  await expect(page.getByTestId("pin-person:person-aide")).toBeVisible();
  await expect(page.getByTestId("pin-meeting:meeting-community")).toBeVisible();
  await expect(
    page.getByTestId("pin-measure:measure-transit-pilot"),
  ).toBeVisible();
}

/** The pin keys currently in rail order. */
async function railOrder(page: Page): Promise<string[]> {
  return page
    .locator(".p-pin-slot .p-pin")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-testid") ?? ""),
    );
}

/**
 * Drags a pin onto another pin with real pointer movement.
 *
 * The intermediate steps matter: the rail starts a drag only after the pointer
 * has actually travelled past its threshold, which is exactly what stops an
 * ordinary click from being mistaken for a reorder.
 */
async function dragPinOnto(page: Page, from: Locator, to: Locator) {
  const source = await from.boundingBox();
  const target = await to.boundingBox();
  if (!source || !target) throw new Error("A pin has no box to drag.");
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
}

test.describe("UI-PROTOTYPE-01-R1", () => {
  /* ------------------------------------------------------------- U03-01 */

  test("U03-01 the title grouping is small, upper-left, and carries no slogan or asset caption", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await openTitle(page);

    const wordmark = page.locator(".p-wordmark");
    const menu = page.locator(".p-title-menu");
    const wordmarkBox = await wordmark.boundingBox();
    const menuBox = await menu.boundingBox();
    if (!wordmarkBox || !menuBox) throw new Error("The title did not render.");

    /* Upper-left: the block starts in the top third and the left quarter. */
    expect(wordmarkBox.y).toBeLessThan(900 / 3);
    expect(wordmarkBox.x).toBeLessThan(1600 / 4);

    /*
     * Small, and small AS A GROUP. Checking the union of the wordmark and the
     * menu is the point of the correction: shrinking the wordmark while the
     * menu keeps its old footprint would pass a wordmark-only assertion and
     * still look wrong.
     */
    const groupBottom = menuBox.y + menuBox.height;
    const groupRight = Math.max(
      wordmarkBox.x + wordmarkBox.width,
      menuBox.x + menuBox.width,
    );
    expect(groupBottom).toBeLessThan(900 * 0.45);
    expect(groupRight).toBeLessThan(1600 * 0.33);

    /* Readable: the title and the menu items keep real type sizes. */
    const civicSize = await page
      .locator(".p-wordmark-civic")
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    const actionSize = await page
      .getByTestId("title-new-game")
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    expect(civicSize).toBeGreaterThanOrEqual(28);
    expect(actionSize).toBeGreaterThanOrEqual(13);

    /* The slogan and the asset caption are gone from the composition. */
    await expect(page.locator(".p-title")).not.toContainText(
      "A civic-life simulation",
    );
    await expect(page.locator(".p-title")).not.toContainText(
      "title_bg_civic_community_meeting",
    );
  });

  test("U03-01 the selected cue is short and close to its item", async ({
    page,
  }) => {
    await openTitle(page);
    await page.getByTestId("title-new-game").hover();

    const marker = page
      .getByTestId("title-new-game")
      .locator(".p-title-action-marker");
    const markerBox = await marker.boundingBox();
    if (!markerBox) throw new Error("The selected marker did not render.");

    /* Short: a cue, not a rule running away from the word. */
    expect(markerBox.width).toBeLessThan(40);

    /* And close: the gap to the label is smaller than the cue itself. */
    const labelBox = await page
      .getByTestId("title-new-game")
      .locator("span:not(.p-title-action-marker)")
      .first()
      .boundingBox();
    if (!labelBox) throw new Error("The label did not render.");
    expect(labelBox.x - (markerBox.x + markerBox.width)).toBeLessThan(
      markerBox.width,
    );
  });

  test("U03-01 the asset identity survives, in the developer inspector", async ({
    page,
  }) => {
    await openTitle(page);
    await page.getByTestId("inspector-toggle").click();

    await expect(page.getByTestId("inspector-title-asset")).toHaveText(
      "title_bg_civic_community_meeting_hero_slot_5504x3072_v1",
    );
    await expect(page.getByTestId("developer-inspector")).toContainText(
      "fixed, never advances",
    );
  });

  /* ------------------------------------------------------------- U03-03 */

  test("U03-03 the cluster rests small and translucent and rises on approach", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await enterShell(page);

    const region = page.getByTestId("nav-region");
    const cluster = page.getByTestId("nav-cluster");

    /* Resting: compact and translucent, over an undisturbed scene. */
    await page.mouse.move(1400, 200);
    await expect(region).toHaveAttribute("data-state", "rest");
    const rest = await cluster.evaluate((node) => {
      const inner = node.querySelector(".p-nav-cluster-inner");
      const box = node.getBoundingClientRect();
      return {
        scale: new DOMMatrix(getComputedStyle(inner!).transform).a,
        opacity: Number(getComputedStyle(inner!).opacity),
        width: box.width,
        height: box.height,
      };
    });
    expect(rest.scale).toBeLessThan(1);
    expect(rest.opacity).toBeLessThan(1);

    /*
     * Approach, without touching it. The pointer stops OUTSIDE the control, so
     * this cannot pass on `:hover` — it is the forgiving radius or nothing.
     */
    const box = await cluster.boundingBox();
    if (!box) throw new Error("The cluster did not render.");
    await page.mouse.move(box.x + box.width + 60, box.y - 40, { steps: 8 });
    await expect(region).toHaveAttribute("data-state", "near");

    /*
     * Polled, because the rise is a transition. Sampling the computed style the
     * instant the state attribute flips reads the value it is animating FROM,
     * which is a flake rather than a finding.
     */
    await expect
      .poll(() =>
        cluster.evaluate(
          (node) =>
            new DOMMatrix(
              getComputedStyle(node.querySelector(".p-nav-cluster-inner")!)
                .transform,
            ).a,
        ),
      )
      .toBeGreaterThan(rest.scale);
    await expect
      .poll(() =>
        cluster.evaluate((node) =>
          Number(
            getComputedStyle(node.querySelector(".p-nav-cluster-inner")!)
              .opacity,
          ),
        ),
      )
      .toBeGreaterThan(rest.opacity);

    const near = await cluster.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    /* The hit target never moved or resized while all that happened. */
    expect(near.width).toBeCloseTo(rest.width, 1);
    expect(near.height).toBeCloseTo(rest.height, 1);

    /* Keyboard focus raises it identically: nothing here is hover-only. */
    await page.mouse.move(1400, 200);
    await expect(region).toHaveAttribute("data-state", "rest");
    await cluster.focus();
    await expect(region).toHaveAttribute("data-state", "near");

    /* Opening it is the third route, and it stays raised while open. */
    await cluster.press("Enter");
    await expect(region).toHaveAttribute("data-state", "open");
    await expect(page.getByTestId("nav-flyout")).toBeVisible();
  });

  test("U03-03 the quiet identity, date and place hierarchy is retained", async ({
    page,
  }) => {
    await enterShell(page);
    const cluster = page.getByTestId("nav-cluster");
    await expect(cluster).toContainText("Rowan Adeyemi");
    await expect(cluster).toContainText("11:20 AM");
    await expect(cluster).toContainText("Tuesday 14 October");
    await expect(cluster).toContainText("Legislative Office");
  });

  test("U03-03 reduced motion keeps the cluster at full size", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enterShell(page);

    await page.mouse.move(1400, 200);
    await expect(page.getByTestId("nav-region")).toHaveAttribute(
      "data-state",
      "rest",
    );
    const scale = await page
      .getByTestId("nav-cluster")
      .evaluate(
        (node) =>
          new DOMMatrix(
            getComputedStyle(node.querySelector(".p-nav-cluster-inner")!)
              .transform,
          ).a,
      );
    expect(scale).toBe(1);
  });

  /* ------------------------------------------------------------- U03-04 */

  test("U03-04 mixed pins reorder by drag and keep identity, size and target", async ({
    page,
  }) => {
    await enterShell(page);
    await pinThreeKinds(page);

    expect(await railOrder(page)).toEqual([
      "pin-person:person-aide",
      "pin-meeting:meeting-community",
      "pin-measure:measure-transit-pilot",
    ]);

    /* Give the measure a size first, so the drag has to preserve it. */
    await page.getByTestId("pin-manage-measure:measure-transit-pilot").click();
    await page
      .getByTestId("pin-size-expanded-measure:measure-transit-pilot")
      .click();
    await expect(
      page.getByTestId("pin-measure:measure-transit-pilot"),
    ).toHaveAttribute("data-size", "expanded");

    /* Drag the measure to the top of the rail, across two other kinds. */
    await dragPinOnto(
      page,
      page.getByTestId("pin-measure:measure-transit-pilot"),
      page.getByTestId("pin-person:person-aide"),
    );
    expect(await railOrder(page)).toEqual([
      "pin-measure:measure-transit-pilot",
      "pin-person:person-aide",
      "pin-meeting:meeting-community",
    ]);

    /* The drag did not open the record, and did not unpin anything. */
    await expect(page.getByTestId("entity-workspace")).toHaveCount(0);
    await expect(page.locator(".p-pin-slot")).toHaveCount(3);

    /* Order, size and target all survive navigating away and back. */
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-journal").click();
    await page.getByTestId("workspace-close").click();

    expect(await railOrder(page)).toEqual([
      "pin-measure:measure-transit-pilot",
      "pin-person:person-aide",
      "pin-meeting:meeting-community",
    ]);
    await expect(
      page.getByTestId("pin-measure:measure-transit-pilot"),
    ).toHaveAttribute("data-size", "expanded");

    await page.getByTestId("pin-person:person-aide").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Della Okonkwo",
    );
  });

  test("U03-04 cancelling a drag leaves the order exactly as it was", async ({
    page,
  }) => {
    await enterShell(page);
    await pinThreeKinds(page);
    const before = await railOrder(page);

    const source = await page
      .getByTestId("pin-measure:measure-transit-pilot")
      .boundingBox();
    const target = await page
      .getByTestId("pin-person:person-aide")
      .boundingBox();
    if (!source || !target) throw new Error("A pin has no box to drag.");

    await page.mouse.move(
      source.x + source.width / 2,
      source.y + source.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      target.x + target.width / 2,
      target.y + target.height / 2,
      { steps: 12 },
    );
    await page.keyboard.press("Escape");
    await page.mouse.up();

    expect(await railOrder(page)).toEqual(before);
    /* And Escape cancelled the drag rather than the whole prototype. */
    await expect(page.getByTestId("scene-shell")).toBeVisible();
    await expect(page.locator(".p-pin-slot")).toHaveCount(3);
  });

  test("U03-04 the keyboard alternative still reorders, and keeps its menu open", async ({
    page,
  }) => {
    await enterShell(page);
    await pinThreeKinds(page);

    await page.getByTestId("pin-manage-measure:measure-transit-pilot").click();
    await page.getByTestId("pin-up-measure:measure-transit-pilot").click();
    /* Repeated move commands leave the menu standing, as the owner found useful. */
    await expect(
      page.getByTestId("pin-menu-measure:measure-transit-pilot"),
    ).toBeVisible();
    await page.getByTestId("pin-up-measure:measure-transit-pilot").click();

    expect(await railOrder(page)).toEqual([
      "pin-measure:measure-transit-pilot",
      "pin-person:person-aide",
      "pin-meeting:meeting-community",
    ]);
  });

  test("U03-04 choosing a pin size dismisses that menu, and only that one", async ({
    page,
  }) => {
    await enterShell(page);
    await pinThreeKinds(page);

    await page.getByTestId("pin-manage-person:person-aide").click();
    await expect(page.getByTestId("pin-menu-person:person-aide")).toBeVisible();

    await page.getByTestId("pin-size-expanded-person:person-aide").click();

    await expect(page.getByTestId("pin-menu-person:person-aide")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("pin-person:person-aide")).toHaveAttribute(
      "data-size",
      "expanded",
    );
    /* Nothing else closed, nothing else moved, nothing was unpinned. */
    await expect(page.locator(".p-pin-slot")).toHaveCount(3);
    await expect(page.getByTestId("scene-shell")).toBeVisible();
  });

  test("U03-04 a pin still opens exactly the record it points at, there and back", async ({
    page,
  }) => {
    await enterShell(page);
    await pinThreeKinds(page);

    /* A -> B -> A through the rail: each pin opens ITS OWN entity. */
    await page.getByTestId("pin-person:person-aide").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Della Okonkwo",
    );
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("pin-measure:measure-transit-pilot").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Transit Access Pilot",
    );
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("pin-person:person-aide").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Della Okonkwo",
    );
    await expect(page.getByTestId("entity-workspace")).not.toContainText(
      "Transit Access Pilot — ",
    );
  });

  /* -------------------------------- R1-CI-PIN-CLOSE: the rail's own lane */

  /**
   * The regression this replaces was real and reproducible: an expanded pin
   * with a long title grew the rail past the lane the workspace reserved, and
   * the rail then sat on top of the workspace's own close button. The click
   * did not fail because it was flaky — it failed because the control was
   * genuinely covered.
   *
   * So this asserts the geometry, at every supported desktop width, with the
   * rail populated and its widest pin expanded: the rail's left edge is right
   * of the workspace's right edge, and the close button is the topmost element
   * at its own centre. Then it actually clicks it.
   */
  const REVIEW_WIDTHS = [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ] as const;

  for (const viewport of REVIEW_WIDTHS) {
    test(`the pin rail never covers workspace controls at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await enterShell(page);
      await pinThreeKinds(page);

      /* The widest label, at the widest size: the worst case, deliberately. */
      await page
        .getByTestId("pin-manage-measure:measure-transit-pilot")
        .click();
      await page
        .getByTestId("pin-size-expanded-measure:measure-transit-pilot")
        .click();

      await page.getByTestId("nav-cluster").click();
      await page.getByTestId("nav-journal").click();
      await expect(page.getByTestId("journal-workspace")).toBeVisible();

      const rail = await page.locator(".p-pin-rail").boundingBox();
      const workspace = await page
        .getByTestId("journal-workspace")
        .boundingBox();
      if (!rail || !workspace) throw new Error("No rail, or no workspace.");

      /* The two lanes do not overlap, at all, anywhere. */
      expect(rail.x).toBeGreaterThanOrEqual(workspace.x + workspace.width);

      /* Widening a pin cannot widen the rail past its lane. */
      const widest = await page
        .locator(".p-pin-slot")
        .evaluateAll((nodes) =>
          Math.max(...nodes.map((node) => node.getBoundingClientRect().right)),
        );
      expect(widest).toBeLessThanOrEqual(rail.x + rail.width + 1);

      /* And nothing is on top of the close button where it will be clicked. */
      const close = page.getByTestId("workspace-close");
      const closeBox = await close.boundingBox();
      if (!closeBox) throw new Error("No close button.");
      const onTop = await page.evaluate(
        ([x, y]) => {
          const node = document.elementFromPoint(x as number, y as number);
          return node?.closest("[data-testid=workspace-close]") !== null;
        },
        [closeBox.x + closeBox.width / 2, closeBox.y + closeBox.height / 2],
      );
      expect(onTop).toBe(true);

      /* The real click, unforced, with no extended timeout. */
      await close.click();
      await expect(page.getByTestId("journal-workspace")).toHaveCount(0);
      await expect(page.getByTestId("scene-shell")).toBeVisible();

      /* The pins are untouched by closing the workspace over them. */
      await expect(page.locator(".p-pin-slot")).toHaveCount(3);
    });
  }

  test("with the rail populated, open, back, drag, cancel and resize all still work by pointer and by keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await enterShell(page);
    await pinThreeKinds(page);

    /* Open a record from a pin, follow a link, and walk Back out of it. */
    await page.getByTestId("pin-measure:measure-transit-pilot").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Transit Access Pilot",
    );
    await page
      .getByTestId("entity-link-person-person-organizer")
      .first()
      .click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Teresa Boyd",
    );
    await page.getByTestId("workspace-back").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Transit Access Pilot",
    );
    await page.getByTestId("workspace-close").click();

    /* Drag, over a workspace-free scene, at this width. */
    await dragPinOnto(
      page,
      page.getByTestId("pin-measure:measure-transit-pilot"),
      page.getByTestId("pin-person:person-aide"),
    );
    expect((await railOrder(page))[0]).toBe(
      "pin-measure:measure-transit-pilot",
    );

    /* The keyboard equivalent reaches the same controls without a pointer. */
    await page.getByTestId("pin-manage-person:person-aide").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("pin-menu-person:person-aide")).toBeVisible();
    await page.getByTestId("pin-up-person:person-aide").focus();
    await page.keyboard.press("Enter");
    expect((await railOrder(page))[0]).toBe("pin-person:person-aide");

    await page.getByTestId("pin-size-tiny-person:person-aide").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("pin-person:person-aide")).toHaveAttribute(
      "data-size",
      "tiny",
    );
    await expect(page.getByTestId("pin-menu-person:person-aide")).toHaveCount(
      0,
    );

    /* And the resting proximity behaviour survived all of it. */
    await page.mouse.move(640, 120);
    await expect(page.getByTestId("nav-region")).toHaveAttribute(
      "data-state",
      "rest",
    );
  });

  /* ------------------------------------------------------------- U03-05 */

  test("U03-05 current activity reads as passing, not as a permanent trait", async ({
    page,
  }) => {
    await enterShell(page);
    await page.getByTestId("scene-person-person-aide").click();
    await page.getByTestId("action-inspect").click();

    const rightNow = page.getByTestId("quick-right-now");
    await expect(rightNow).toContainText("Right now");
    await expect(rightNow).toContainText("Reading a printout");

    /* It is beside the identity, above the lasting read of the relationship. */
    const impression = page.locator(".p-quick-dossier .p-impression");
    await expect(impression).not.toContainText("Reading a printout");
    await expect(impression).toContainText("You trust her judgement");
  });

  test("U03-05 Details replaces the badge-per-line presentation without flattening knowledge", async ({
    page,
  }) => {
    await enterShell(page);
    await page.getByTestId("scene-person-person-aide").click();
    await page.getByTestId("action-inspect").click();
    await page.getByTestId("quick-dossier-full").click();

    const workspace = page.getByTestId("entity-workspace");
    await expect(workspace).toContainText("Details");
    await expect(workspace).not.toContainText("What you know");
    await expect(workspace).toContainText("Last interaction");

    /* An ordinary known fact carries no database badge at all. */
    const known = page
      .locator('[data-testid="full-facts"] li[data-access="known"]')
      .first();
    await expect(known).toContainText("Has run your office");
    await expect(known.locator(".p-attribution")).toHaveCount(0);

    /*
     * The epistemic distinctions are intact and stated in words, not colour.
     * Nothing became certain and no hidden fact was revealed to tidy this up.
     */
    const publicFact = page
      .locator('[data-testid="full-facts"] li[data-access="public"]')
      .first();
    await expect(publicFact.locator(".p-attribution")).toHaveText(
      "Public record",
    );
    const unknown = page
      .locator('[data-testid="full-facts"] li[data-access="unknown"]')
      .first();
    await expect(unknown.locator(".p-attribution")).toHaveText(
      "You do not know",
    );
    await expect(unknown).toContainText("Where she grew up");
  });

  test("U03-05 the unnatural heading is gone from the office surfaces", async ({
    page,
  }) => {
    await enterShell(page);
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-offices").click();

    const workspace = page.getByTestId("offices-workspace");
    await expect(workspace).toContainText("Waiting on you");
    await expect(workspace).not.toContainText("What needs you");
  });

  /* ------------------------------------------------------------- U03-06 */

  test("U03-06 Personal states the player's name and age plainly", async ({
    page,
  }) => {
    await enterShell(page);
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-personal").click();
    await page.getByTestId("nav-personal-overview").click();

    await expect(page.getByTestId("personal-name")).toHaveText("Rowan Adeyemi");
    await expect(page.getByTestId("personal-age")).toHaveText("38 years old");

    /* And it says what the fixture is, rather than implying a real save. */
    await expect(page.getByTestId("personal-workspace")).toContainText(
      "A fixed prototype character",
    );
  });

  /* ------------------------------------------------------------- U03-07 */

  test("U03-07 the first-entry explanation is unmissable, then the marker is discreet", async ({
    page,
  }) => {
    await page.goto(PROTOTYPE_URL);

    const preview = page.getByTestId("preview-disclosure");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("New Game and Continue both walk");
    await expect(preview).toContainText("Talk is switched off");
    await expect(preview).toContainText("The clock does not run");

    await page.getByTestId("preview-dismiss").click();
    await expect(preview).toHaveCount(0);

    /* What remains is small, and cannot be dismissed. */
    await expect(page.getByTestId("prototype-mark")).toBeVisible();
    const markBox = await page.getByTestId("prototype-mark").boundingBox();
    const viewport = page.viewportSize();
    if (!markBox || !viewport) throw new Error("No mark, or no viewport.");
    expect(markBox.width).toBeLessThan(viewport.width * 0.2);
    expect(markBox.height).toBeLessThan(40);
  });

  test("U03-07 the prototype boundaries stay honest rather than concealed", async ({
    page,
  }) => {
    await enterShell(page);
    await page.getByTestId("scene-person-person-aide").click();

    const talk = page.getByTestId("action-talk");
    await expect(talk).toBeDisabled();
    await expect(talk).toContainText(
      "Conversation is not part of this prototype",
    );
  });

  /* ------------------------------------------------------------- U03-08 */

  test("U03-08 the version display equals the checked-out package version", async ({
    page,
  }) => {
    const version = (
      JSON.parse(readFileSync("package.json", "utf8")) as {
        version: string;
      }
    ).version;

    await openTitle(page);
    await expect(page.getByTestId("version-stamp")).toContainText(
      `v${version}`,
    );

    await page.getByTestId("version-stamp").click();
    await expect(page.getByTestId("patch-notes-version")).toContainText(
      `version ${version}`,
    );
  });

  test("U03-08 patch notes come from the file, and unreleased sections say so", async ({
    page,
  }) => {
    const source = readFileSync("PATCH_NOTES.md", "utf8");
    const headings = [...source.matchAll(/^##\s+(.*)$/gm)].map((match) =>
      (match[1] ?? "").trim(),
    );
    expect(headings.length).toBeGreaterThan(0);

    await enterShell(page);
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-patch-notes").click();

    const workspace = page.getByTestId("patch-notes-workspace");
    await expect(workspace).toBeVisible();

    /* Every heading in the file appears on the screen, in the file's order. */
    const rendered = await page
      .locator(".p-patch-note h2")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
    expect(rendered).toEqual(headings);

    /* And no UNRELEASED section is presented as shipped. */
    const statuses = await page.locator(".p-patch-note").evaluateAll((nodes) =>
      nodes.map((node) => ({
        heading: node.querySelector("h2")?.textContent?.trim() ?? "",
        released: node.getAttribute("data-released"),
      })),
    );
    for (const entry of statuses) {
      expect(entry.released).toBe(
        /UNRELEASED/i.test(entry.heading) ? "false" : "true",
      );
    }
    await expect(workspace).toContainText("Not released");
  });

  test("U03-08 patch notes leave the prototype clock and the World alone", async ({
    page,
  }) => {
    await enterShell(page);
    const before = await page.getByTestId("nav-cluster").innerText();

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-patch-notes").click();
    await expect(page.getByTestId("patch-notes-workspace")).toBeVisible();

    /* Escape closes it, and Back is available where the chain supports it. */
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("patch-notes-workspace")).toHaveCount(0);
    await expect(page.getByTestId("scene-shell")).toBeVisible();

    expect(await page.getByTestId("nav-cluster").innerText()).toBe(before);
  });

  /* ------------------------------------------- shell-opened overlay escape */

  test("Escape closes an overlay opened from inside the shell", async ({
    page,
  }) => {
    await enterShell(page);
    await page.getByTestId("version-stamp").click();
    await expect(page.getByTestId("patch-notes-workspace")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("patch-notes-workspace")).toHaveCount(0);
    /* It closed the overlay, not the prototype and not the surface behind it. */
    await expect(page.getByTestId("scene-shell")).toBeVisible();
  });

  /* -------------------------------------------------------- containment */

  test("the production route is still unaware of every R1 addition", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".p-mark")).toHaveCount(0);
    await expect(page.locator(".p-version")).toHaveCount(0);
    await expect(page.locator(".p-preview-scrim")).toHaveCount(0);
    await expect(page.locator("#ui-prototype-root")).toHaveCount(0);

    for (const path of ["/src/main.tsx", "/src/App.tsx"]) {
      const response = await page.request.get(path);
      const text = await response.text();
      expect(text).not.toContain("ui-prototype");
      expect(text).not.toContain("chrome");
    }
  });
});
