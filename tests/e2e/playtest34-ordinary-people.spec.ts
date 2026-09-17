import { writeFileSync } from "node:fs";
import { test, expect, type Page, type Locator } from "./fixtures";
import {
  startLife,
  enterLife,
  saveLife,
  openShellMenu,
  openNewsContext,
} from "./support/creator";
import type { World } from "../../src/simulation/types";

async function wardrobe(page: Page) {
  await openShellMenu(page);
  await page.getByTestId("nav-group-personal").click();
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("personal-appearance").click();
  await page
    .getByTestId("saved-appearance-controls")
    .locator(":scope > summary")
    .click();
  await expect(page.getByTestId("person-appearance-bodyFamily")).toBeVisible();
}
async function saved(page: Page): Promise<World> {
  return page.evaluate(async () => {
    const names = await indexedDB.databases();
    const name = names.find((d) => d.name?.endsWith("-art-preview"))!.name!;
    return new Promise<World>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result,
          get = db.transaction("worlds").objectStore("worlds").getAll();
        get.onsuccess = () => {
          const record = get.result.find((r) => r.payload);
          db.close();
          resolve(JSON.parse(record.payload).world);
        };
        get.onerror = () => {
          db.close();
          reject(get.error);
        };
      };
    });
  });
}
async function rendered(figure: Locator) {
  await expect(figure.locator('[data-material-state="loading"]')).toHaveCount(
    0,
  );
  await expect(
    figure.locator('[data-material-state="unavailable"]'),
  ).toHaveCount(0);
  return figure.locator("img[data-asset-id]").evaluateAll(async (imgs) =>
    Promise.all(
      imgs.map(async (element) => {
        const img = element as HTMLImageElement;
        await img.decode();
        const svg = await (await fetch(img.src)).text();
        return {
          id: img.dataset.assetId,
          kind: img.dataset.kind,
          material: JSON.parse(img.dataset.materialParameters ?? "null"),
          svg,
        };
      }),
    ),
  );
}
for (const [town, gender] of [
  ["Lexington", "female"],
  ["Louisville", "male"],
] as const)
  test(`ordinary ${town} ${gender} body preview, Cancel, Apply, save and portrait coherence`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1366, height: 768 });
    const seed = `p34-ordinary-${town}-${gender}-0`;
    await page.goto(`/?seed=${seed}&art-preview=candidate`);
    await startLife(page, {
      age: 34,
      route: "normal",
      place: town,
      state: "Kentucky",
      gender,
    });
    await enterLife(page);
    const returnToRoom = page.getByRole("button", {
      name: "Return to your day",
      exact: true,
    });
    if (await returnToRoom.isVisible()) await returnToRoom.click();
    await page.screenshot({ path: info.outputPath("ordinary-room.png") });
    await saveLife(page);
    await page.keyboard.press("Escape");
    const before = await saved(page);
    if (before.control.kind !== "person")
      throw Error("Expected controlled person");
    const id = before.control.personId,
      person = before.people[id]!;
    expect(person.identity!.gender).toBe(gender);
    expect(person.appearance!.selection!.bodyFamily).toMatch(
      gender === "female" ? /^ep35-fem-/ : /^ep35-masc-/,
    );
    expect(person.appearance!.catalogGeneration).toBe(7);
    await openShellMenu(page);
    await page.getByTestId("nav-calendar").click();
    await page.getByTestId("calendar-tab-interruptions").click();
    const interruption = page.getByTestId("interruption-stopForWorkShifts");
    await interruption.focus();
    await interruption.press("Space");
    await expect(interruption).toBeChecked();
    await openShellMenu(page);
    await page.getByTestId("nav-options").click();
    await expect(page.getByTestId("content-pack-workspace")).toBeVisible();
    await openShellMenu(page);
    await page.getByTestId("nav-news").click();
    await openNewsContext(page, "directory");
    await expect(page.getByTestId("public-information-empty")).toBeVisible();
    await saveLife(page);
    expect((await saved(page)).currentMoment).toEqual(before.currentMoment);
    await page.keyboard.press("Escape");
    const scene = page
      .locator(`[data-person-id="${id}"] img[data-kind="head"]`)
      .first();
    const sceneHead = (await scene.count())
      ? await scene.getAttribute("data-material-parameters")
      : null;
    const other = page
      .locator(
        `[data-testid^="scene-person-"]:not([data-testid="scene-person-${id}"])`,
      )
      .first();
    if (await other.count()) {
      const otherId = (await other.getAttribute("data-testid"))!.replace(
        "scene-person-",
        "",
      );
      const roomParts = await rendered(other);
      await other.click();
      await expect(page.getByTestId("quick-dossier")).toBeFocused();
      await page.getByTestId("dossier-talk").click();
      const portrait = page.getByTestId("person-portrait").first();
      await expect(portrait).toBeVisible();
      const portraitParts = await rendered(portrait);
      expect(portraitParts.find((p) => p.kind === "head")).toEqual(
        roomParts.find((p) => p.kind === "head"),
      );
      expect(portraitParts.find((p) => p.kind === "head")!.material).toEqual(
        before.people[otherId]!.appearance!.material,
      );
      await portrait.screenshot({
        path: info.outputPath("ordinary-conversation-portrait.png"),
      });
      await page.keyboard.press("Escape");
    }
    await wardrobe(page);
    const controls = page.getByTestId("person-appearance-controls"),
      body = page.getByTestId("person-appearance-bodyFamily");
    expect(await controls.innerText()).not.toMatch(/ep29|ep34|ep35|palette/i);
    const figure = page.getByTestId("wardrobe-full-body"),
      first = await rendered(figure);
    expect(first.length).toBeGreaterThanOrEqual(6);
    expect(
      first.every(
        (p) => p.material.familyId === person.appearance!.material!.familyId,
      ),
    ).toBe(true);
    if (sceneHead)
      expect(JSON.parse(sceneHead)).toEqual(person.appearance!.material);
    await figure.screenshot({
      path: info.outputPath("ordinary-complete-person.png"),
    });
    const oldBody = await body.inputValue();
    // Activate the actual native select using keyboard typeahead, then a native dialog button.
    await body.focus();
    const options = await body
      .locator("option")
      .evaluateAll((items) =>
        items.map((item) => (item as HTMLOptionElement).value),
      );
    expect(options.every((value) => value.startsWith("ep35-"))).toBe(true);
    // B's native macOS Chrome receipt: arrows/Home do not commit this select;
    // typeahead changes its value and opens the real preview dialog.
    await body.press(gender === "female" ? "m" : "f");
    await page.keyboard.press("Tab");
    const dialog = page.getByTestId("outfit-replacement-preview");
    await expect(dialog).toBeVisible();
    const proposed = await body.inputValue();
    expect(proposed).not.toBe(oldBody);
    await expect(
      dialog.getByRole("button", { name: "Apply this outfit", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    const box = await dialog.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(768);
    await rendered(page.getByTestId("outfit-pending-full-body"));
    expect((await saved(page)).people[id]!.appearance).toEqual(
      person.appearance,
    );
    await dialog.screenshot({
      path: info.outputPath("body-preview-apply-cancel.png"),
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(body).toHaveValue(oldBody);
    expect(await rendered(figure)).toEqual(first);
    expect((await saved(page)).people[id]!.appearance).toEqual(
      person.appearance,
    );
    await body.selectOption(proposed);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(body).toHaveValue(oldBody);
    await body.selectOption(proposed);
    if (gender === "female") {
      await dialog
        .getByRole("button", { name: "Apply this outfit", exact: true })
        .focus();
      await page.keyboard.press("Enter");
    } else {
      await dialog
        .getByRole("button", { name: "Apply this outfit", exact: true })
        .click();
    }
    await expect(dialog).toHaveCount(0);
    await expect(body).toHaveValue(proposed);
    const after = await rendered(figure);
    await figure.screenshot({
      path: info.outputPath("applied-complete-person.png"),
    });
    await saveLife(page);
    const committed = await saved(page);
    expect(committed.people[id]!.identity).toEqual(person.identity);
    expect(committed.people[id]!.appearance!.selection!.bodyFamily).toBe(
      proposed,
    );
    await page.goto("/?art-preview=candidate");
    await page.getByTestId("open-saves").click();
    await page
      .getByTestId("save-entry")
      .first()
      .getByRole("button", { name: "Open", exact: true })
      .click();
    await enterLife(page);
    await wardrobe(page);
    await openShellMenu(page);
    await page.getByTestId("nav-calendar").click();
    await page.getByTestId("calendar-tab-interruptions").click();
    await expect(
      page.getByTestId("interruption-stopForWorkShifts"),
    ).toBeChecked();
    await wardrobe(page);
    expect(await rendered(page.getByTestId("wardrobe-full-body"))).toEqual(
      after,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByTestId("person-appearance-bodyFamily")
      .selectOption(oldBody);
    await expect(dialog).toBeVisible();
    const small = await dialog.boundingBox();
    expect(small!.y).toBeGreaterThanOrEqual(0);
    expect(small!.y + small!.height).toBeLessThanOrEqual(844);
    await expect(
      dialog.getByRole("button", { name: "Apply this outfit" }),
    ).toBeInViewport();
    await dialog.screenshot({
      path: info.outputPath("narrow-body-preview.png"),
    });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);
    writeFileSync(
      info.outputPath("ordinary-canonical-evidence.json"),
      JSON.stringify(
        {
          seed,
          town,
          id,
          before: person,
          after: committed.people[id],
          cast: before.personOrder.map((key) => ({
            id: key,
            identity: before.people[key]!.identity,
            appearance: before.people[key]!.appearance,
          })),
          kinship: before.history.kinshipRelationships,
          oldBody,
          proposed,
        },
        null,
        2,
      ),
    );
  });

test("ordinary child household preserves each generated parent's canonical figure and portrait", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/?seed=p34-child-household&art-preview=candidate");
  await startLife(page, {
    age: 10,
    route: "normal",
    place: "Adona",
    state: "Arkansas",
    gender: "male",
  });
  await enterLife(page);
  const returnToRoom = page.getByRole("button", {
    name: "Return to your day",
    exact: true,
  });
  if (await returnToRoom.isVisible()) await returnToRoom.click();
  await saveLife(page);
  await page.keyboard.press("Escape");
  const world = await saved(page);
  if (world.control.kind !== "person") throw Error("Expected person");
  const child = world.control.personId;
  const parents = world.history.kinshipRelationships
    .filter(
      (k) => k.kind === "lineal:parent-child" && k.personIds.includes(child),
    )
    .flatMap((k) => k.personIds.filter((id) => id !== child));
  expect(parents.length).toBeGreaterThan(0);
  const rows = [];
  for (const id of parents) {
    const person = world.people[id]!;
    if (person.identity?.gender === "female")
      expect(person.appearance!.selection!.bodyFamily).toMatch(/^ep34-fem-/);
    if (person.identity?.gender === "male")
      expect(person.appearance!.selection!.bodyFamily).toMatch(/^ep34-masc-/);
    const token = page.getByTestId(`scene-person-${id}`);
    if (!(await token.count())) continue;
    const room = await rendered(token);
    expect(room.length).toBeGreaterThanOrEqual(6);
    await page.screenshot({
      path: info.outputPath(`household-room-${rows.length}.png`),
    });
    await token.screenshot({
      path: info.outputPath(`parent-complete-person-${rows.length}.png`),
    });
    await token.click();
    await page.getByTestId("action-talk").click();
    const portrait = page.getByTestId("person-portrait").first();
    const face = await rendered(portrait);
    expect(face.find((p) => p.kind === "head")).toEqual(
      room.find((p) => p.kind === "head"),
    );
    await portrait.screenshot({
      path: info.outputPath(`parent-conversation-portrait-${rows.length}.png`),
    });
    await page.keyboard.press("Escape");
    await token.click();
    await page.getByTestId("action-inspect").click();
    const dossierPortrait = page.getByTestId("person-portrait").first();
    const dossierFace = await rendered(dossierPortrait);
    expect(dossierFace.find((p) => p.kind === "head")).toEqual(
      face.find((p) => p.kind === "head"),
    );
    await dossierPortrait.screenshot({
      path: info.outputPath(`parent-dossier-portrait-${rows.length}.png`),
    });
    await page.keyboard.press("Escape");
    rows.push({
      id,
      identity: person.identity,
      appearance: person.appearance,
      roomAssetIds: room.map((p) => p.id),
      portraitAssetIds: face.map((p) => p.id),
    });
  }
  expect(rows.length).toBeGreaterThan(0);
  writeFileSync(
    info.outputPath("synthetic-household-evidence.json"),
    JSON.stringify({ seed: "p34-child-household", rows }, null, 2),
  );
});
