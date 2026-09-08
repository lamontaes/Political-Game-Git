import { expect, test, type Page } from "@playwright/test";

/**
 * UI-PROTOTYPE-01 browser proofs.
 *
 * DEVELOPMENT-ONLY. These exercise `/ui-prototype.html` and nothing else. The
 * last test in the file is the containment proof: it asserts that the normal
 * application route neither renders nor references any prototype code.
 *
 * The packet's paths 5, 6 and 7 (Search, News, contextual help) are NOT covered
 * here because the owner deferred those surfaces from this first review. They
 * are absent from the build, so a test for them would be a test for something
 * that does not exist.
 */

const PROTOTYPE_URL = "/ui-prototype.html";

async function enterShell(page: Page) {
  await page.goto(PROTOTYPE_URL);
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.getByTestId("title-new-game").click();
  await expect(page.getByTestId("scene-shell")).toBeVisible();
}

test.describe("UI-PROTOTYPE-01", () => {
  test("title paints a released illustrated plate with a transparent menu", async ({
    page,
  }) => {
    await page.goto(PROTOTYPE_URL);

    const backdrop = page.getByTestId("title-backdrop");
    await expect(backdrop).toHaveAttribute("data-plate", "released");
    await expect(backdrop).toHaveAttribute(
      "data-asset-id",
      "title_bg_civic_community_meeting_hero_slot_5504x3072_v1",
    );

    /* The menu is type over the art: no filled background behind an item. */
    const action = page.getByTestId("title-new-game");
    await expect(action).toBeVisible();
    const background = await action.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    expect(background).toBe("rgba(0, 0, 0, 0)");

    /* Quit is shown truthfully rather than hidden or faked. */
    await expect(page.getByTestId("title-quit")).toBeDisabled();
    await expect(page.getByTestId("title-quit")).toContainText(
      "A browser tab cannot close itself",
    );
  });

  test("1. title to scene to People to a person to the dossier and back", async ({
    page,
  }) => {
    await enterShell(page);

    await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
      "data-asset-id",
      "env_shared_workroom_office_v1",
    );

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-people").click();
    await expect(page.getByTestId("people-workspace")).toBeVisible();

    await page.getByTestId("people-row-work-person-aide").click();
    await expect(page.getByTestId("entity-workspace")).toBeVisible();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Della Okonkwo",
    );

    /* Back walks the chain the player followed, one step at a time. */
    await page.getByTestId("workspace-back").click();
    await expect(page.getByTestId("people-workspace")).toBeVisible();
    await page.getByTestId("workspace-back").click();
    await expect(page.getByTestId("workspace-scrim")).toHaveCount(0);
    await expect(page.getByTestId("scene-shell")).toBeVisible();
  });

  test("2. the Options People-view preference decides how People opens", async ({
    page,
  }) => {
    await page.goto(PROTOTYPE_URL);

    await page.getByTestId("title-options").click();
    await expect(page.getByTestId("options-workspace")).toBeVisible();
    await page.getByTestId("option-people-list").click();
    await page.getByTestId("workspace-close").click();
    await expect(page.getByTestId("options-workspace")).toHaveCount(0);

    await page.getByTestId("title-new-game").click();
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-people").click();

    await expect(page.getByTestId("people-list")).toBeVisible();
    await expect(page.getByTestId("people-categories")).toHaveCount(0);
  });

  test("3. three pin kinds coexist, resize, reorder and survive navigation", async ({
    page,
  }) => {
    await enterShell(page);

    /* A person, pinned from the scene. */
    await page.getByTestId("scene-person-person-aide").click();
    await page.getByTestId("action-pin").click();

    /* A commitment, pinned from its own record. */
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-calendar").click();
    await page.getByTestId("calendar-row-meeting-community").click();
    await page.getByTestId("workspace-pin").click();

    /* A measure, reached by following a link out of that commitment. */
    await page.getByTestId("entity-link-measure-measure-transit-pilot").click();
    await page.getByTestId("workspace-pin").click();
    await page.getByTestId("workspace-close").click();

    const personPin = page.getByTestId("pin-person:person-aide");
    const meetingPin = page.getByTestId("pin-meeting:meeting-community");
    const measurePin = page.getByTestId("pin-measure:measure-transit-pilot");
    await expect(personPin).toBeVisible();
    await expect(meetingPin).toBeVisible();
    await expect(measurePin).toBeVisible();

    /* Resize one. */
    await page.getByTestId("pin-manage-person:person-aide").click();
    await page.getByTestId("pin-size-expanded-person:person-aide").click();
    await expect(personPin).toHaveAttribute("data-size", "expanded");

    /* Reorder it. */
    await page.getByTestId("pin-down-person:person-aide").click();
    const order = await page
      .locator(".p-pin-slot .p-pin")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-testid")),
      );
    expect(order[0]).toBe("pin-meeting:meeting-community");
    expect(order[1]).toBe("pin-person:person-aide");

    /* Navigate away and come back: pins are user state, not transient chrome. */
    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-journal").click();
    await expect(page.getByTestId("journal-workspace")).toBeVisible();
    await page.getByTestId("workspace-close").click();

    await expect(personPin).toHaveAttribute("data-size", "expanded");
    await expect(meetingPin).toBeVisible();
    await expect(measurePin).toBeVisible();

    /* A pin says nothing about physical presence: the pinned aide is in this
       room, but the pinned measure and commitment obviously are not, and no
       marker appeared for them. */
    await expect(page.locator('[data-testid^="scene-person-"]')).toHaveCount(2);
  });

  test("4. a commitment pin opens its calendar record, and Back returns", async ({
    page,
  }) => {
    await enterShell(page);

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-calendar").click();
    await page.getByTestId("calendar-row-meeting-community").click();
    await page.getByTestId("workspace-pin").click();
    await page.getByTestId("workspace-close").click();

    await page.getByTestId("pin-meeting:meeting-community").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Community transit meeting",
    );
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "East End Community Room",
    );

    await page.getByTestId("workspace-back").click();
    await expect(page.getByTestId("workspace-scrim")).toHaveCount(0);
  });

  test("quick dossier leads to the full dossier and to a linked entity", async ({
    page,
  }) => {
    await enterShell(page);

    await page.getByTestId("scene-person-person-aide").click();
    await expect(page.getByTestId("person-action-menu")).toBeVisible();
    await page.getByTestId("action-inspect").click();

    const quick = page.getByTestId("quick-dossier");
    await expect(quick).toBeVisible();
    await expect(quick).toHaveAttribute("data-person-id", "person-aide");

    /* The scene person it describes is still on screen behind it. */
    await expect(page.getByTestId("scene-person-person-aide")).toBeVisible();

    await page.getByTestId("quick-dossier-full").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Della Okonkwo",
    );

    /* One linked entity, then Back through the chain. */
    await page.getByTestId("entity-link-measure-measure-transit-pilot").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Transit Access Pilot",
    );
    await page.getByTestId("workspace-back").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Della Okonkwo",
    );
  });

  test("a journal reference is a real id, and opens the same entity route", async ({
    page,
  }) => {
    await enterShell(page);

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-journal").click();
    await page.getByTestId("journal-chapter-chapter-council").click();

    const reference = page.getByTestId("ref-person-person-aide");
    await expect(reference).toBeVisible();
    /* The dotted underline is the affordance the owner asked for. */
    await expect(reference).toHaveCSS("text-decoration-style", "dotted");

    await reference.click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Della Okonkwo",
    );
    await page.getByTestId("workspace-back").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "First term",
    );
  });

  test("Personal keeps personal, campaign and public money apart", async ({
    page,
  }) => {
    await enterShell(page);

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-personal").click();
    await page.getByTestId("nav-finances").click();

    await expect(page.getByTestId("fund-personal")).toBeVisible();
    await expect(page.getByTestId("fund-campaign")).toBeVisible();
    await expect(page.getByTestId("fund-public")).toBeVisible();
    await expect(page.getByTestId("fund-public")).toContainText(
      "Public money. Not yours",
    );
  });

  test("Offices shows the role and routes its pending work to real records", async ({
    page,
  }) => {
    await enterShell(page);

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-offices").click();
    await expect(page.getByTestId("offices-workspace")).toContainText(
      "Council member, first district",
    );

    await page.getByTestId("office-pending-pending-referral").click();
    await expect(page.getByTestId("entity-workspace")).toContainText(
      "Transit Access Pilot",
    );
  });

  test("8. Escape closes the highest transient layer, not the prototype", async ({
    page,
  }) => {
    await enterShell(page);

    await page.getByTestId("scene-person-person-aide").click();
    await page.getByTestId("action-inspect").click();
    await expect(page.getByTestId("quick-dossier")).toBeVisible();

    /* Re-open the action menu so two transient layers are stacked. */
    await page.getByTestId("scene-person-person-aide").click();
    await expect(page.getByTestId("person-action-menu")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("person-action-menu")).toHaveCount(0);
    /* The layer underneath is untouched. */
    await expect(page.getByTestId("quick-dossier")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("quick-dossier")).toHaveCount(0);

    /* And at the base of the scene it does nothing at all. */
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("scene-shell")).toBeVisible();
  });

  test("9. keyboard and pointer reach the same person and the same destination", async ({
    page,
  }) => {
    await enterShell(page);

    /* Pointer. */
    await page.getByTestId("scene-person-person-colleague").click();
    await expect(page.getByTestId("person-action-menu")).toContainText(
      "Marcus Hale",
    );
    await page.keyboard.press("Escape");

    /* Keyboard: focus the same control and activate it with Enter. */
    await page.getByTestId("scene-person-person-colleague").focus();
    await expect(
      page.getByTestId("scene-person-person-colleague"),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("person-action-menu")).toContainText(
      "Marcus Hale",
    );
    await page.keyboard.press("Escape");

    /* The same holds for a navigation destination. */
    await page.getByTestId("nav-cluster").focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("nav-calendar").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("calendar-workspace")).toBeVisible();
  });

  test("reading the prototype never moves the prototype clock", async ({
    page,
  }) => {
    await enterShell(page);

    const before = await page.getByTestId("nav-cluster").innerText();

    await page.getByTestId("nav-cluster").click();
    await page.getByTestId("nav-calendar").click();
    await page.getByTestId("calendar-row-meeting-community").click();
    await page.getByTestId("workspace-close").click();
    await page.getByTestId("scene-person-person-aide").click();
    await page.getByTestId("action-inspect").click();
    await page.keyboard.press("Escape");

    expect(await page.getByTestId("nav-cluster").innerText()).toBe(before);
  });

  test("10. the normal application route is unchanged and unaware of the prototype", async ({
    page,
  }) => {
    await page.goto("/");

    /* No prototype chrome, and no prototype root, on the production entry. */
    await expect(page.locator(".p-devbar")).toHaveCount(0);
    await expect(page.locator("#ui-prototype-root")).toHaveCount(0);
    await expect(page.locator("#root")).toHaveCount(1);

    /* And the production entry does not reference the prototype in source. */
    const indexHtml = await page.request.get("/index.html");
    expect(await indexHtml.text()).not.toContain("ui-prototype");
    const mainEntry = await page.request.get("/src/main.tsx");
    expect(await mainEntry.text()).not.toContain("ui-prototype");
    const appEntry = await page.request.get("/src/App.tsx");
    expect(await appEntry.text()).not.toContain("ui-prototype");
  });
});
