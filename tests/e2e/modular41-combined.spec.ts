import { writeFileSync } from "node:fs";
import type { World } from "../../src/simulation";
import { expect, test, type Page } from "./fixtures";
import { enterLife, saveLife } from "./support/creator";

async function savedWorld(page: Page) {
  return page.evaluate(async () => {
    const name = (await indexedDB.databases()).find((d) =>
      d.name?.endsWith("-art-preview"),
    )?.name;
    if (!name) throw Error("Missing isolated preview save database");
    return new Promise<World>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const rows = db
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .getAll();
        rows.onerror = () => reject(rows.error);
        rows.onsuccess = () => {
          db.close();
          resolve(JSON.parse(rows.result[0].payload).world);
        };
      };
    });
  });
}

for (const [generation, width, height, age, seed] of [
  [9, 1280, 860, 34, "ef481a28a3fa3d3045bff245a29a8eeff"],
  [12, 1200, 720, 42, "ef481a28a3fa3d3045bff245a29a8eeff"],
  [12, 1280, 860, 6, "talk-pair"],
] as const) {
  test(`MODULAR41 age ${age} generation ${generation}: actual room Talk and saved appearance at ${width}x${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height });
    const descriptor = {
      v: 3,
      startKind: "custom",
      seed,
      placeKey: "lexington-fayette",
      startAge: age,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      givenName: "Audience",
      familyName: "Review",
      gender: generation === 12 && age === 42 ? "female" : "male",
      pronouns: generation === 12 && age === 42 ? "she-her" : "he-him",
      appearanceOutfitVersion: "complete-outfit-v2",
      appearanceRecipeVersion: "appearance-recipe-v2",
      givenNameGenerationVersion: "given-name-v2",
      appearanceCatalogGeneration: generation,
    };
    await page.goto(
      `/?art-preview=candidate&replay=${Buffer.from(JSON.stringify(descriptor)).toString("base64url")}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
    await enterLife(page);
    const returnToDay = page.getByRole("button", {
      name: "Return to your day",
      exact: true,
    });
    if (await returnToDay.count()) await returnToDay.click();
    await saveLife(page);
    const before = await savedWorld(page);
    await page.keyboard.press("Escape");
    const npc =
      age === 6
        ? page.locator(
            '[data-testid^="scene-person-"][data-relationship*="mom"], [data-testid^="scene-person-"][data-relationship*="mother"]',
          )
        : page.locator('[data-testid^="scene-person-"]').first();
    if (age === 6) await expect(npc).toHaveCount(1);
    await expect(npc).toBeVisible();
    const npcId = (await npc.getAttribute("data-testid"))!.replace(
      /^scene-person-/,
      "",
    );
    const measure = () =>
      page.evaluate(() => ({
        people: Array.from(
          document.querySelectorAll(".scene-person-token"),
        ).map((e) => ({
          id: e.getAttribute("data-testid"),
          rect: e.getBoundingClientRect().toJSON(),
          pose: e.getAttribute("data-pose-id"),
          hasArt: e.getAttribute("data-has-art"),
          artRefusal: e.getAttribute("data-art-refusal"),
          anchor: e.getAttribute("data-anchor-id"),
        })),
        camera: document
          .querySelector(".scene-backdrop-camera")
          ?.getAttribute("style"),
      }));
    const quiet = await measure();
    if (age === 6) expect(quiet.people.length).toBeGreaterThanOrEqual(2);
    for (const person of quiet.people) {
      const id = person.id!.replace(/^scene-person-/, "");
      expect(before.people[id]).toBeDefined();
      expect(before.people[id]!.id).toBe(id);
      expect(person.hasArt).toBe("true");
      expect(person.artRefusal).toBe("");
    }
    await page.screenshot({ path: info.outputPath("quiet-private.png") });
    if (generation === 9) await npc.click();
    else await npc.press("Enter");
    if (generation === 9) await page.getByTestId("dossier-talk").press("Enter");
    else await page.getByTestId("dossier-talk").click();
    await expect(page.getByTestId(`talk-face-${npcId}`)).toHaveCount(1);
    await expect(page.locator(".pg-talk")).toBeVisible();
    expect(await measure()).toEqual(quiet);
    await page.screenshot({ path: info.outputPath("talk-private.png") });
    await saveLife(page);
    expect(await savedWorld(page)).toEqual(before);
    await page.keyboard.press("Escape");
    await page
      .getByTestId("conversation-intents")
      .getByRole("button")
      .first()
      .click();
    await expect(page.getByTestId("talk-clock")).toHaveText("No time passed.");
    expect(await measure()).toEqual(quiet);
    await page.getByTestId("talk-back").click();
    await saveLife(page);
    const after = await savedWorld(page);
    expect(after.currentMoment).toEqual(before.currentMoment);
    expect(
      Object.fromEntries(
        Object.entries(after.people).map(([id, p]) => [id, p.appearance]),
      ),
    ).toEqual(
      Object.fromEntries(
        Object.entries(before.people).map(([id, p]) => [id, p.appearance]),
      ),
    );
    await page.goto("/?art-preview=candidate", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page
      .getByRole("button", { name: /^Continue Audience Review/ })
      .click();
    await enterLife(page);
    expect(await savedWorld(page)).toEqual(after);
    writeFileSync(
      info.outputPath("composed-receipt.json"),
      JSON.stringify(
        {
          generation,
          width,
          height,
          npcId,
          quiet,
          afterMoment: after.currentMoment,
          worldId: after.id,
          unchangedAppearance: true,
          savedReopened: true,
        },
        null,
        2,
      ),
    );
  });
}
