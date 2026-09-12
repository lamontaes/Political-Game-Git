import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import type oldUnpinned from "../../src/presentation/fixtures/morning23-old-unpinned.json";
import { test, expect } from "./fixtures";
import { startLife, enterLife, saveLife } from "./support/creator";

async function openOwnWardrobe(page: Page) {
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("nav-personal-group").click();
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("personal-appearance").click();
  const controls = page.getByTestId("saved-appearance-controls");
  await controls.locator("summary").focus();
  await page.keyboard.press("Enter");
  return controls;
}

for (const seed of [
  "morning23-b-play",
  "morning23-b-life2",
  "morning23-b-life3",
])
  test(`MORNING23 candidate people through actual play ${seed}`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.goto(`/?seed=${seed}&art-preview=candidate`);
    await startLife(page, {
      age: 34,
      household: "shares-a-home",
      givenName: "MORNING23",
      familyName: "Review",
    });
    await enterLife(page);
    await page.screenshot({ path: info.outputPath("room.png") });
    const pendingChoices = await page
      .getByRole("heading", { name: "What do you do?", exact: true })
      .locator("..")
      .innerText();
    const person = page.locator('[data-testid^="scene-person-"]').first();
    await expect(person).toBeVisible();
    await person.click({ position: { x: 30, y: 55 } });
    await page.getByTestId("action-inspect").click();
    await page.screenshot({ path: info.outputPath("card.png") });
    await page.getByTestId("quick-dossier-full").click();
    await expect(page.getByTestId("full-dossier")).toBeVisible();
    await expect(
      page.getByTestId("saved-appearance-controls"),
    ).not.toBeVisible();
    await page.screenshot({ path: info.outputPath("npc-readonly.png") });
    await page.getByTestId("dossier-talk").click();
    await expect(
      page.getByRole("region", { name: /^Conversation with / }),
    ).toBeVisible();
    await page
      .getByTestId("person-portrait")
      .first()
      .screenshot({ path: info.outputPath("conversation-portrait.png") });
    await page.getByTestId("talk-back").click();
    await expect(
      page.getByRole("region", { name: /^Conversation with / }),
    ).toHaveCount(0);
    await expect(person).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: "What do you do?", exact: true })
        .locator(".."),
    ).toHaveText(pendingChoices, { useInnerText: true });
    await openOwnWardrobe(page);
    await expect(page.getByTestId("wardrobe-full-body")).toBeVisible();
    const body = page.getByRole("combobox", { name: "Body", exact: true });
    await body.selectOption(
      "wave-a-average-woman-standing-neutral-front-a-v1-pv4",
    );
    await page.screenshot({ path: info.outputPath("own-outfit-original.png") });
    const identity = await page
      .getByTestId("wardrobe-full-body")
      .getAttribute("data-appearance-seed");
    const top = page.getByRole("combobox", { name: "top", exact: true });
    const tops = await top
      .locator("option")
      .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    const masked = tops.find((v) => v.includes("armmasked"));
    expect(masked).toBeTruthy();
    await top.selectOption(masked!);
    await page.screenshot({ path: info.outputPath("own-outfit-masked.png") });
    await page
      .getByRole("combobox", { name: "Outfit view", exact: true })
      .selectOption("seated-guest-neutral");
    await page.screenshot({ path: info.outputPath("seated-fit-refusal.png") });
    await page
      .getByRole("combobox", { name: "Outfit view", exact: true })
      .selectOption("standing-neutral");
    await expect(page.getByTestId("wardrobe-full-body")).toHaveAttribute(
      "data-appearance-seed",
      identity!,
    );
    const layers = await page
      .getByTestId("wardrobe-full-body")
      .locator("img")
      .evaluateAll((es) => es.map((e) => e.getAttribute("data-asset-id")));
    await saveLife(page);
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await openOwnWardrobe(page);
    await expect(page.getByTestId("wardrobe-full-body")).toHaveAttribute(
      "data-appearance-seed",
      identity!,
    );
    expect(
      await page
        .getByTestId("wardrobe-full-body")
        .locator("img")
        .evaluateAll((es) => es.map((e) => e.getAttribute("data-asset-id"))),
    ).toEqual(layers);
    await page.screenshot({ path: info.outputPath("reload.png") });
  });

for (const kind of ["unpinned", "gen2"] as const) {
  test(`old ${kind} donor life opens and persists its catalog in a distinct slot`, async ({
    page,
  }, info) => {
    const fixture = JSON.parse(
      readFileSync(
        `src/presentation/fixtures/morning23-old-${kind}.json`,
        "utf8",
      ),
    ) as typeof oldUnpinned;
    const otherFixture = JSON.parse(
      readFileSync(
        `src/presentation/fixtures/morning23-old-${kind === "unpinned" ? "gen2" : "unpinned"}.json`,
        "utf8",
      ),
    ) as typeof oldUnpinned;
    await page.goto("/?art-preview=candidate");
    const saved = await page.evaluate(
      async ({ payload, otherPayload }) => {
        const codecPath = "/src/simulation/serialization.ts";
        const storePath = "/src/presentation/browser-world-repository.ts";
        const { deserializeWorld } = await import(codecPath);
        const { BrowserSaveStore } = await import(storePath);
        const world = deserializeWorld(payload);
        const otherWorld = deserializeWorld(otherPayload);
        const libraryPath = "/src/presentation/people-visual4-review.ts";
        const recipePath = "/src/presentation/character-components.ts";
        const { PEOPLE_VISUAL4_CHARACTER_LIBRARY: library } = await import(
          libraryPath
        );
        const { resolveCharacterRecipe } = await import(recipePath);
        const selections = (value: typeof world) =>
          value.personOrder.map((id: string) => ({
            personId: id,
            recipe: resolveCharacterRecipe(
              {
                appearance: value.people[id].appearance,
                poseFamily: "standing-neutral",
                unresolvableRequiredSlots: "diagnose",
              },
              library,
            ),
          }));
        world.control = { kind: "person", personId: world.personOrder[0] };
        otherWorld.control = {
          kind: "person",
          personId: otherWorld.personOrder[0],
        };
        const store = new BrowserSaveStore({
          databaseName: "political-life-worlds-art-preview",
        });
        const first = store.newSaveId(world),
          second = store.newSaveId(otherWorld);
        await store.save(world, first);
        await store.save(otherWorld, second);
        const migrated = await store.load(first);
        await store.save(migrated, first);
        const unchanged = await store.inspectSnapshot(second);
        return {
          first,
          second,
          worldId: world.id,
          pin: migrated.people[world.personOrder[0]].appearance
            .catalogGeneration,
          otherWorldId: unchanged.id,
          firstSelections: selections(migrated),
          secondSelections: selections(unchanged),
          reloadedSelections: selections(await store.load(first)),
          controlledId: world.personOrder[0],
        };
      },
      { payload: fixture.payload, otherPayload: otherFixture.payload },
    );
    expect(saved.first).not.toBe(saved.second);
    expect(saved.pin).toBe(2);
    expect(saved.otherWorldId).not.toBe(saved.worldId);
    expect(saved.firstSelections).toEqual(fixture.recipes);
    expect(saved.secondSelections).toEqual(otherFixture.recipes);
    expect(saved.reloadedSelections).toEqual(fixture.recipes);
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await page.screenshot({ path: info.outputPath(`old-${kind}-opened.png`) });
    const person = page.locator('[data-testid^="scene-person-"]').first();
    await person.click({ position: { x: 30, y: 55 } });
    await page.getByTestId("action-inspect").click();
    await page.getByTestId("quick-dossier-full").click();
    const talk = page.getByTestId("dossier-talk");
    if (await talk.isEnabled()) {
      await talk.click();
      await page
        .getByTestId("person-portrait")
        .first()
        .screenshot({ path: info.outputPath(`old-${kind}-conversation.png`) });
      await page.getByTestId("talk-back").click();
    } else {
      await expect(page.getByTestId("dossier-talk-unavailable")).toBeVisible();
    }
    await openOwnWardrobe(page);
    await expect(page.getByTestId("wardrobe-full-body")).toHaveAttribute(
      "data-catalog-generation",
      "2",
    );
    const layers = await page
      .getByTestId("wardrobe-full-body")
      .locator("img")
      .evaluateAll((es) => es.map((e) => e.getAttribute("data-asset-id")));
    const expected = fixture.recipes.find(
      (entry) => entry.personId === saved.controlledId,
    )!;
    expect([...layers].sort()).toEqual(
      expected.recipe.context.components
        .map((component) => component.assetId)
        .sort(),
    );
    await page.screenshot({
      path: info.outputPath(`old-${kind}-wardrobe.png`),
    });
    await saveLife(page);
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await openOwnWardrobe(page);
    expect(
      await page
        .getByTestId("wardrobe-full-body")
        .locator("img")
        .evaluateAll((es) => es.map((e) => e.getAttribute("data-asset-id"))),
    ).toEqual(layers);
  });
}
