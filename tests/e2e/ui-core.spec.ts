import { expect, test, type Page } from "@playwright/test";

import { enterLife, goTo, openShellMenu, startLife } from "./support/creator";

/**
 * The shell, on the route a player actually opens.
 *
 * Every path here goes through the front door: title, the real creator, the
 * real world. Nothing routes to a fixture and nothing reaches the development
 * prototype — the last test in this file proves the production bundle does not
 * even contain it.
 */

/*
 * Every test here builds a real world through the real creator, which is
 * genuinely slow, and several then save it and reload. The default per-test
 * budget is not enough for that on a loaded machine, and a timeout that fires
 * mid-creator says nothing about the shell.
 */
test.describe.configure({ timeout: 120_000 });

/** Clears saved games so each test starts from a browser nobody has played in. */
async function freshBrowser(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
}

async function beginOrdinaryLife(page: Page) {
  await startLife(page, { age: 34, household: "shares-a-home" });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
}

/** The people the rail actually has in this generated life. */
async function railPeople(page: Page): Promise<string[]> {
  const ids = await page
    .locator('[data-testid^="rail-person-"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-testid") ?? ""),
    );
  return ids.map((id) => id.replace("rail-person-", ""));
}

test.describe("the corner cluster", () => {
  test("rests small, rises on approach, and rises on keyboard focus alone", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const nav = page.getByTestId("shell-nav");
    await expect(nav).toHaveAttribute("data-state", "rest");

    const cluster = page.getByTestId("shell-nav-cluster");
    const box = await cluster.boundingBox();
    expect(box).not.toBeNull();

    /* The approach zone reaches past the control, so it has already risen by
       the time the pointer arrives. */
    await page.mouse.move(box!.x + box!.width + 60, box!.y + box!.height / 2);
    await expect(nav).toHaveAttribute("data-state", "near");

    /* And the click target never moved while it rose. */
    const raisedBox = await cluster.boundingBox();
    expect(raisedBox!.width).toBeCloseTo(box!.width, 0);
    expect(raisedBox!.height).toBeCloseTo(box!.height, 0);

    /* Nothing here is reachable only by hovering. */
    await page.mouse.move(600, 300);
    await expect(nav).toHaveAttribute("data-state", "rest");
    await cluster.focus();
    await expect(nav).toHaveAttribute("data-state", "near");
  });

  test("holds its size when motion is reduced", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const inner = page.locator(".pg-nav-cluster-inner");
    await expect(inner).toHaveCSS("transform", "none");
    await context.close();
  });

  test("opens one submenu level, and it is darker than its parent", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    await openShellMenu(page);
    const flyout = page.getByTestId("shell-nav-flyout");
    await expect(flyout).toHaveAttribute("data-level", "primary");

    await page.getByTestId("nav-personal-group").click();
    await expect(flyout).toHaveAttribute("data-level", "submenu");
    await expect(page.getByTestId("nav-personal")).toBeVisible();

    await page.getByTestId("nav-submenu-back").click();
    await expect(flyout).toHaveAttribute("data-level", "primary");
  });
});

test.describe("people, and who was chosen", () => {
  test("A then B then A: the record always follows the selection", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    await goTo(page, "elsewhere-people");
    await expect(page.getByTestId("people-overlay")).toBeVisible();

    const people = await page
      .locator('[data-testid^="people-person-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          id: (node.getAttribute("data-testid") ?? "").replace(
            "people-person-",
            "",
          ),
          name: node.querySelector("strong")?.textContent ?? "",
        })),
      );
    expect(people.length).toBeGreaterThanOrEqual(2);
    const [first, second] = people;

    async function open(person: { id: string; name: string }) {
      await page.getByTestId(`people-person-${person.id}`).click();
      const dossier = page.getByTestId("full-dossier");
      await expect(dossier).toBeVisible();
      /* Name, record and interaction target all follow the selection. */
      await expect(dossier).toHaveAttribute("data-person-id", person.id);
      await expect(page.getByTestId("dossier-name")).toHaveText(person.name);
      await page.getByTestId("person-workspace-back").click();
      await expect(page.getByTestId("people-overlay")).toBeVisible();
    }

    await open(first!);
    await open(second!);
    await open(first!);
  });

  test("selecting somebody in the room opens a menu about them", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const people = await railPeople(page);
    expect(people.length).toBeGreaterThan(0);

    await page.getByTestId(`rail-person-${people[0]}`).click();
    const menu = page.getByTestId("person-action-menu");
    await expect(menu).toHaveAttribute("data-person-id", people[0]!);

    await page.getByTestId("action-inspect").click();
    await expect(page.getByTestId("quick-dossier")).toHaveAttribute(
      "data-person-id",
      people[0]!,
    );

    /* The full record is the same person, reached from the quick one. */
    await page.getByTestId("quick-dossier-full").click();
    await expect(page.getByTestId("full-dossier")).toHaveAttribute(
      "data-person-id",
      people[0]!,
    );
  });

  test("Talk opens the real conversation with that person, or says why not", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    await goTo(page, "elsewhere-people");
    const rows = page.locator('[data-testid^="people-person-"]');
    const count = await rows.count();

    let opened = false;
    for (let index = 0; index < count; index += 1) {
      await rows.nth(index).click();
      const talk = page.getByTestId("dossier-talk");
      if (await talk.isEnabled()) {
        await talk.click();
        const conversation = page.getByTestId("dossier-conversation");
        await expect(conversation).toBeVisible();
        /* A real conversation surface, not a fake exchange. */
        await expect(
          conversation.locator('[data-testid^="conversation-"]').first(),
        ).toBeVisible();
        opened = true;
        break;
      }
      /* A route the world cannot offer names its own limitation. */
      await expect(
        page.getByTestId("dossier-talk-unavailable"),
      ).not.toBeEmpty();
      await page.getByTestId("person-workspace-back").click();
    }
    expect(opened).toBe(true);
  });

  test("a dossier reveals nothing the record does not establish", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);
    await goTo(page, "elsewhere-people");
    await page.locator('[data-testid^="people-person-"]').first().click();

    /* Ordinary knowledge carries no badge; anything marked says which kind of
       claim it is, in words rather than only in colour. */
    const marks = await page
      .locator("#root .pg-fact-attribution")
      .allTextContents();
    for (const mark of marks) {
      expect(["On the record", "Reported"]).toContain(mark.trim());
    }

    /* And what is missing is said, not silently dropped. */
    const facts = page.getByTestId("dossier-facts");
    const empty = page.getByTestId("dossier-facts-empty");
    expect((await facts.count()) + (await empty.count())).toBeGreaterThan(0);
  });
});

test.describe("mixed pins", () => {
  test("keep their identity, order and size across navigation and a reload", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const people = await railPeople(page);
    expect(people.length).toBeGreaterThanOrEqual(2);
    await page.getByTestId(`rail-pin-${people[0]}`).click();
    await page.getByTestId(`rail-pin-${people[1]}`).click();

    const first = `person:${people[0]}`;
    const second = `person:${people[1]}`;
    await expect(page.getByTestId(`pin-${first}`)).toBeVisible();
    await expect(page.getByTestId(`pin-${second}`)).toBeVisible();

    /* Sizes: choosing one closes its own menu, and only its own. */
    await page.getByTestId(`pin-manage-${first}`).click();
    await page.getByTestId(`pin-size-expanded-${first}`).click();
    await expect(page.getByTestId(`pin-menu-${first}`)).toHaveCount(0);
    await expect(page.getByTestId(`pin-${first}`)).toHaveAttribute(
      "data-size",
      "expanded",
    );

    /* Move up and down are the keyboard route, and leave their menu standing —
       which is what makes repeated reordering bearable without a pointer. */
    await page.getByTestId(`pin-manage-${second}`).click();
    await page.getByTestId(`pin-up-${second}`).click();
    await expect(page.getByTestId(`pin-menu-${second}`)).toBeVisible();
    await page.getByTestId(`pin-down-${second}`).click();
    await expect(page.getByTestId(`pin-menu-${second}`)).toBeVisible();
    await page.keyboard.press("Escape");

    async function order(): Promise<string[]> {
      return page
        .locator('[data-testid^="pin-"][data-size]')
        .evaluateAll((nodes) =>
          nodes.map((node) =>
            (node.getAttribute("data-testid") ?? "").replace("pin-", ""),
          ),
        );
    }
    const before = await order();

    /* Navigating away and back leaves the rail exactly as it was. */
    await goTo(page, "nav-journal-entry");
    await expect(page.getByTestId("journal")).toBeVisible();
    await page.getByTestId("journal-close").click();
    expect(await order()).toEqual(before);

    /* And so does saving, reloading, and continuing. Pins come back from
       storage, so the rail is waited for rather than read the instant the
       room appears. */
    await goTo(page, "keep-world");
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await enterLife(page);
    await expect(page.getByTestId(`pin-${first}`)).toBeVisible();
    expect(await order()).toEqual(before);
    await expect(page.getByTestId(`pin-${first}`)).toHaveAttribute(
      "data-size",
      "expanded",
    );
  });

  test("dragging reorders, and an ordinary click still opens", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const people = await railPeople(page);
    expect(people.length).toBeGreaterThanOrEqual(2);
    await page.getByTestId(`rail-pin-${people[0]}`).click();
    await page.getByTestId(`rail-pin-${people[1]}`).click();

    const top = page.getByTestId(`pin-person:${people[0]}`);
    const bottom = page.getByTestId(`pin-person:${people[1]}`);
    const topBox = (await top.boundingBox())!;
    const bottomBox = (await bottom.boundingBox())!;

    await page.mouse.move(
      topBox.x + topBox.width / 2,
      topBox.y + topBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      bottomBox.x + bottomBox.width / 2,
      bottomBox.y + bottomBox.height + 8,
      { steps: 8 },
    );
    await page.mouse.up();

    const order = await page
      .locator('[data-testid^="pin-"][data-size]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-testid") ?? ""),
      );
    expect(order[order.length - 1]).toBe(`pin-person:${people[0]}`);

    /* A drag is not also an open — and a click still is. */
    await expect(page.getByTestId("full-dossier")).toHaveCount(0);
    await top.click();
    await expect(page.getByTestId("full-dossier")).toHaveAttribute(
      "data-person-id",
      people[0]!,
    );
  });

  test("a pin says nothing about who is in the room", async ({ page }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const people = await railPeople(page);
    const absent = await page
      .locator('[data-testid^="rail-person-"][data-present="false"]')
      .first()
      .getAttribute("data-testid");
    if (!absent) return;
    const personId = absent.replace("rail-person-", "");
    expect(people).toContain(personId);

    await page.getByTestId(`rail-pin-${personId}`).click();
    await expect(page.getByTestId(`pin-person:${personId}`)).toBeVisible();
    /* Pinned, and still not in the room. */
    await expect(page.getByTestId(`rail-person-${personId}`)).toHaveAttribute(
      "data-present",
      "false",
    );
  });
});

test.describe("the deliberate workspaces", () => {
  test("the calendar reads the clock and never moves it", async ({ page }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const when = await page.getByTestId("story-when").textContent();
    await goTo(page, "nav-calendar");
    await expect(page.getByTestId("calendar-workspace")).toBeVisible();
    await expect(page.getByTestId("calendar-today")).toBeVisible();

    /* Every entry says whose it is; the chamber's agenda is not yours. */
    const notes = await page
      .locator('[data-testid^="calendar-entry-"] small')
      .allTextContents();
    for (const note of notes) {
      expect(note).toMatch(/You are on this|chamber's agenda/);
    }

    await page.getByTestId("calendar-workspace-close").click();
    await expect(page.getByTestId("story-when")).toHaveText(when!);
  });

  test("Personal states the name and the age and keeps the money apart", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const name = await page.getByTestId("story-who").textContent();
    /* Personal is the one destination with children, so it opens a submenu. */
    await goTo(page, "nav-personal-group");
    await page.getByTestId("nav-personal").click();
    await expect(page.getByTestId("personal-workspace")).toBeVisible();

    const shown = await page.getByTestId("personal-name").textContent();
    expect(name).toContain(shown!.trim());
    await expect(page.getByTestId("personal-age")).not.toBeEmpty();

    /* Each purse either has a balance or says it has no record. Never a
       confident zero, and never one figure for three owners. */
    const purses = page.getByTestId("personal-purses").locator("li");
    const count = await purses.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const purse = purses.nth(index);
      const kind = await purse.getAttribute("data-purse");
      const balance = page.getByTestId(`purse-balance-${kind}`);
      const absent = page.getByTestId(`purse-absent-${kind}`);
      expect((await balance.count()) + (await absent.count())).toBe(1);
    }
  });

  test("the journal links people by their id, not by their name in prose", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);
    await goTo(page, "nav-journal-entry");
    await expect(page.getByTestId("journal")).toBeVisible();

    const links = page.locator('[data-testid^="journal-person-"]');
    if ((await links.count()) === 0) return;
    const id = (await links.first().getAttribute("data-testid"))!.replace(
      "journal-person-",
      "",
    );
    await links.first().click();
    await expect(page.getByTestId("full-dossier")).toHaveAttribute(
      "data-person-id",
      id,
    );
    await page.getByTestId("person-workspace-back").click();
    await expect(page.getByTestId("journal")).toBeVisible();
  });

  test("patch notes and the version come from this checkout", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const corner = await page.getByTestId("shell-version").textContent();
    await goTo(page, "nav-patch-notes");
    const heading = await page.getByTestId("patch-notes-version").textContent();
    /* One source. The corner and the screen cannot disagree. */
    expect(heading).toContain(corner!.replace(/^v/, ""));

    /* A section the file marks unreleased is labelled, not quietly shipped. */
    const unreleased = page.getByTestId("patch-note-unreleased-tag");
    if ((await unreleased.count()) > 0) {
      await expect(unreleased.first()).toHaveText("Not released");
    }
  });

  test("Options only offers settings something reads", async ({ page }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);
    await goTo(page, "nav-options");

    await page.getByTestId("option-pin-size-tiny").click();
    await expect(page.getByTestId("option-pin-size-tiny")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("options-workspace-close").click();

    /* The preference is real: a new pin arrives at the size it asks for. */
    const people = await railPeople(page);
    await page.getByTestId(`rail-pin-${people[0]}`).click();
    await expect(page.getByTestId(`pin-person:${people[0]}`)).toHaveAttribute(
      "data-size",
      "tiny",
    );
  });
});

test.describe("the click, back and escape contract", () => {
  test("Escape closes one layer at a time and never leaves the life", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const people = await railPeople(page);
    await page.getByTestId(`rail-pin-${people[0]}`).click();
    await goTo(page, "elsewhere-people");
    await page.locator('[data-testid^="people-person-"]').first().click();
    await expect(page.getByTestId("full-dossier")).toBeVisible();

    await page.getByTestId(`pin-manage-person:${people[0]}`).click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId(`pin-menu-person:${people[0]}`)).toHaveCount(
      0,
    );
    await expect(page.getByTestId("full-dossier")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("people-overlay")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await expect(page.getByTestId("people-overlay")).toHaveCount(0);

    /* At the base of the room, Escape does nothing rather than leaving. */
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await expect(page.getByTestId(`pin-person:${people[0]}`)).toBeVisible();
  });

  test("pointer and keyboard reach the same person", async ({ page }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);

    const people = await railPeople(page);
    const target = page.getByTestId(`rail-person-${people[0]}`);
    await target.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("person-action-menu")).toHaveAttribute(
      "data-person-id",
      people[0]!,
    );
  });
});

test.describe("containment", () => {
  test("the normal route does not know the prototype exists", async ({
    page,
  }) => {
    await freshBrowser(page);
    await beginOrdinaryLife(page);
    const html = await page.content();
    expect(html).not.toContain("ui-prototype");
    expect(html).not.toContain("PROTOTYPE");
  });
});

test.describe("the review widths", () => {
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    test(`${size.width}x${size.height} shows the shell without clipping`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await freshBrowser(page);
      await beginOrdinaryLife(page);

      /* The cluster and the room are both on the screen, and the page does not
         scroll sideways at any of the review widths. */
      const cluster = page.getByTestId("shell-nav-cluster");
      const box = (await cluster.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);

      await goTo(page, "elsewhere-people");
      const workspace = (await page
        .getByTestId("people-overlay")
        .boundingBox())!;
      expect(workspace.x).toBeGreaterThanOrEqual(0);
      expect(workspace.x + workspace.width).toBeLessThanOrEqual(size.width + 1);

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
