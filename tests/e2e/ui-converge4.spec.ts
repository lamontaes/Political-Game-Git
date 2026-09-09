import { saveLife } from "./support/creator";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import type { World } from "../../src/simulation";
import { expect, test } from "./fixtures";
import { fillCreator, goTo, startLife } from "./support/creator";

/** Only visible opening controls; no fixture World or hidden state injection. */
async function enterOpening(page: Page) {
  await expect(page.getByTestId("play-screen")).toBeVisible();
  const introduction = page.getByTestId("opening-life-panel");
  if (await introduction.isVisible()) {
    await introduction
      .getByRole("button", { name: "Meet your household" })
      .click();
    await expect(introduction).toHaveAttribute("aria-label", "Your household");
    await introduction
      .getByRole("button", { name: "Step inside" })
      .press("Enter");
  }
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
}

/** Inspect the actual saved payload, never change it through the test harness. */
async function savedWorld(page: Page): Promise<World> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const records = await new Promise<Array<{ payload: string }>>(
        (resolve, reject) => {
          const request = db
            .transaction("worlds", "readonly")
            .objectStore("worlds")
            .getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        },
      );
      if (records.length !== 1)
        throw new Error(`Expected one saved World, got ${records.length}`);
      return JSON.parse(records[0]!.payload).world;
    } finally {
      db.close();
    }
  });
}

async function save(page: Page) {
  await saveLife(page);
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
}

async function continueSaved(page: Page) {
  await page.reload();
  await page.getByTestId("continue").click();
  await enterOpening(page);
}

test("normal Carson City citizen attends a public session and retains the real venue and World on reload", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-converge4-municipal");
  await startLife(page, {
    age: 38,
    place: "Carson City, Nevada",
    placeScope: "locality",
    placeQuery: "Carson City",
    route: "normal",
  });
  await enterOpening(page);
  await save(page);
  const initial = await savedWorld(page);
  await goTo(page, "nav-municipal");
  const workspace = page.getByTestId("municipal-workspace");
  await expect(
    workspace.getByText("Linked to your saved home place."),
  ).toBeVisible();
  await expect(workspace).toContainText("Carson City");
  await save(page);
  expect(await savedWorld(page)).toEqual(initial);
  await goTo(page, "nav-municipal");
  await workspace
    .getByRole("button", { name: "Add public session to this world" })
    .click();
  await expect(
    workspace.getByRole("button", { name: "Prepare meeting notes" }),
  ).toBeDisabled();
  await workspace
    .getByRole("button", { name: "Attend public meeting" })
    .press("Enter");
  await expect(page.getByTestId("municipal-current-venue")).toBeVisible();
  await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
    "data-scene-id",
    "civic-community-meeting-room",
  );
  await save(page);
  const attended = await savedWorld(page);
  expect(attended.id).toBe(initial.id);
  expect(attended.people).toEqual(initial.people);
  expect(attended.history.organizationParticipations).toEqual(
    initial.history.organizationParticipations,
  );
  expect(attended.history.organizationParticipationStates).toEqual(
    initial.history.organizationParticipationStates,
  );
  expect(attended.currentMoment).not.toEqual(initial.currentMoment);
  const attendance = attended.history.events.filter(
    (event) => event.type === "municipal.public-meeting-attended",
  );
  expect(attendance).toHaveLength(1);
  expect(attendance[0]!.tags).toContain("government:us-nv-carson-city");
  await goTo(page, "nav-municipal");
  await workspace
    .getByRole("button", { name: "Attend public meeting" })
    .click();
  await save(page);
  expect(await savedWorld(page)).toEqual(attended);
  await continueSaved(page);
  await goTo(page, "nav-municipal");
  await expect(page.getByTestId("municipal-current-venue")).toBeVisible();
  await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
    "data-scene-id",
    "civic-community-meeting-room",
  );
  await expect(
    workspace.getByRole("button", { name: "Prepare meeting notes" }),
  ).toBeDisabled();
  await workspace.getByTestId("municipal-workspace-close").press("Enter");
  await page.screenshot({
    path: info.outputPath("normal-municipal-current-room.png"),
  });
  await save(page);
  expect(await savedWorld(page)).toEqual(attended);
});

test("private Journal intentions, grouped notes, real person links and history bookmarks survive reload without changing World", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-converge4-journal");
  await startLife(page, {
    age: 38,
    route: "custom",
    household: "shares-a-home",
  });
  await enterOpening(page);
  await save(page);
  const initial = await savedWorld(page);
  await goTo(page, "nav-journal-entry");
  const notebook = page.getByRole("region", { name: "Private notebook" });
  await notebook
    .getByLabel("My intentions")
    .fill("I want to remember the people I meet.");
  await notebook
    .getByRole("button", { name: "Add private note" })
    .press("Enter");
  const note = notebook.getByTestId("private-note").first();
  await note.getByLabel("Title", { exact: true }).fill("A private reminder");
  await note
    .getByRole("textbox", { name: "Note", exact: true })
    .fill("Ask about their week when we next talk.");
  await note.getByLabel("Group", { exact: true }).fill("People");
  const personOption = note
    .getByLabel("Linked person")
    .locator("option")
    .nth(1);
  const personId = await personOption.getAttribute("value");
  const personName = await personOption.innerText();
  expect(personId).toBeTruthy();
  expect(initial.people[personId!]).toBeDefined();
  await note.getByLabel("Linked person").selectOption(personId!);
  await note.getByLabel("History bookmark").selectOption({ index: 1 });
  const bookmark = await note.getByLabel("History bookmark").inputValue();
  await note.getByRole("link", { name: "Read bookmarked history" }).click();
  await expect(
    page.locator(`[id="journal-entry-${encodeURIComponent(bookmark)}"]`),
  ).toBeInViewport();
  await note
    .getByRole("button", { name: `Open ${personName}`, exact: true })
    .press("Enter");
  await expect(
    page.getByTestId("person-workspace").locator("[data-person-id]").first(),
  ).toHaveAttribute("data-person-id", personId!);
  await page.getByTestId("person-workspace-back").click();
  await expect(note.getByLabel("Title", { exact: true })).toHaveValue(
    "A private reminder",
  );
  await notebook.getByRole("button", { name: "Add private note" }).click();
  const second = notebook.getByTestId("private-note").nth(1);
  await second.getByLabel("Title", { exact: true }).fill("Another thought");
  await second.getByLabel("Group", { exact: true }).fill("Later");
  await notebook.getByLabel("Show group").focus();
  await notebook.getByLabel("Show group").selectOption("People");
  await expect(notebook.getByTestId("private-note")).toHaveCount(1);
  await notebook.getByLabel("Show group").selectOption("");
  await expect(notebook.getByTestId("private-note")).toHaveCount(2);
  await save(page);
  expect(await savedWorld(page)).toEqual(initial);
  await continueSaved(page);
  await goTo(page, "nav-journal-entry");
  await expect(notebook.getByLabel("My intentions")).toHaveValue(
    "I want to remember the people I meet.",
  );
  await expect(notebook.getByTestId("private-note")).toHaveCount(2);
  await expect(
    note.getByRole("textbox", { name: "Note", exact: true }),
  ).toHaveValue("Ask about their week when we next talk.");
  await expect(note.getByLabel("Linked person")).toHaveValue(personId!);
  await expect(note.getByLabel("History bookmark")).toHaveValue(bookmark);
  await notebook.getByLabel("Show group").selectOption("Later");
  await expect(
    notebook.getByTestId("private-note").getByLabel("Title", { exact: true }),
  ).toHaveValue("Another thought");
  await page.screenshot({
    path: info.outputPath("private-journal-reloaded.png"),
  });
  await save(page);
  expect(await savedWorld(page)).toEqual(initial);
});

test("title Patch notes shows every canonical section and real package version with keyboard Back", async ({
  page,
}, info) => {
  const canonical = readFileSync(
    new URL("../../PATCH_NOTES.md", import.meta.url),
    "utf8",
  );
  const headings = [...canonical.matchAll(/^##\s+(.+)$/gm)].map((match) =>
    match[1]!.trim(),
  );
  const { version } = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  await page.goto("/");
  await page.getByTestId("title-patch-notes").press("Enter");
  const workspace = page.getByTestId("title-patch-notes-workspace");
  await expect(workspace.getByTestId("patch-notes-version")).toHaveText(
    `Version ${version}`,
  );
  const sections = workspace.locator("section.pg-personal-section");
  expect(headings.length).toBeGreaterThan(1);
  await expect(sections).toHaveCount(headings.length);
  for (const [index, heading] of headings.entries()) {
    await expect(sections.nth(index).getByRole("heading")).toHaveText(
      `${heading}${/UNRELEASED/i.test(heading) ? "Not released" : ""}`,
    );
  }
  await page.screenshot({
    path: info.outputPath("title-cumulative-patch-notes.png"),
  });
  await workspace
    .getByTestId("title-patch-notes-workspace-back")
    .press("Enter");
  await expect(page.getByTestId("new-game")).toBeVisible();
  await expect(page.getByTestId("title-patch-notes-workspace")).toHaveCount(0);
});

test("normal county selection preserves unspecified town and exact saved jurisdiction", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-converge4-county");
  await fillCreator(page, {
    age: 38,
    place: "Fayette County, Kentucky",
    placeScope: "county",
    route: "normal",
  });
  await page.getByTestId("begin").press("Enter");
  await enterOpening(page);
  await save(page);
  const initial = await savedWorld(page);
  const player =
    initial.control.kind === "person"
      ? initial.people[initial.control.personId]
      : null;
  expect(player).toBeDefined();
  await expect(page.getByTestId("play-screen")).toContainText("Fayette County");
  await goTo(page, "nav-municipal");
  await expect(page.getByTestId("municipal-workspace")).toContainText(
    "No verified government link",
  );
  await save(page);
  expect(await savedWorld(page)).toEqual(initial);
  await continueSaved(page);
  await goTo(page, "nav-personal-group");
  await page.getByTestId("nav-personal").click();
  await expect(page.getByTestId("personal-workspace")).toContainText(
    "Fayette County",
  );
  await save(page);
  expect(await savedWorld(page)).toEqual(initial);
  await page.screenshot({
    path: info.outputPath("normal-county-reloaded.png"),
  });
});

for (const place of ["Lexington, Kentucky", "Carson City, Nevada"]) {
  test(`normal dated economic panel respects canonical place: ${place}`, async ({
    page,
  }) => {
    await page.goto("/?seed=ui-converge4-economics");
    await startLife(page, { age: 38, place, route: "normal" });
    await enterOpening(page);
    await save(page);
    const initial = await savedWorld(page);
    await goTo(page, "nav-personal-group");
    await goTo(page, "nav-personal");
    const panel = page.getByTestId("economic-context-panel");
    if (place === "Lexington, Kentucky") {
      await expect(panel).toBeVisible();
      await expect(panel).toContainText(initial.currentDate);
      const sources = panel
        .locator("summary")
        .filter({ hasText: "Sources and scope" });
      await sources.click();
      await expect(
        panel.getByText(
          "Reference periods, product vintages, release dates, retrieval dates, and the simulation date remain separate. Missing data stays missing.",
        ),
      ).toBeVisible();
      await sources.press("Enter");
      await expect(sources.locator("..")).not.toHaveAttribute("open", "");
      const unavailable = panel
        .locator("summary")
        .filter({ hasText: "Unavailable comparisons" });
      await unavailable.focus();
      await unavailable.press("Enter");
      await expect(unavailable.locator("..")).toHaveAttribute("open", "");
    } else {
      await expect(panel).toHaveCount(0);
    }
    await save(page);
    expect(await savedWorld(page)).toEqual(initial);
    await continueSaved(page);
    await goTo(page, "nav-personal-group");
    await goTo(page, "nav-personal");
    if (place === "Lexington, Kentucky") {
      await expect(panel).toContainText(initial.currentDate);
    } else {
      await expect(panel).toHaveCount(0);
    }
    await save(page);
    expect(await savedWorld(page)).toEqual(initial);
  });
}
