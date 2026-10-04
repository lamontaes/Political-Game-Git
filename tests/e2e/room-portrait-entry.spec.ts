import { expect, test, type Locator } from "./fixtures";
import type { Person } from "../../src/simulation";

// Controlled saved situation, using the actual new-game/opening-scene writers.
// This is entry/interaction proof, not ordinary new-game room-production proof.
test("a present eligible portrait talks to its exact person, while Inspect stays separate", async ({
  page,
}) => {
  await page.goto("/");
  const facts = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { createNewGameWorld } = await load("/src/presentation/new-game.ts");
    const { openOrdinaryLife } = await load(
      "/src/presentation/ordinary-life.ts",
    );
    const { openNextLifeScene, currentOpeningLifeScene } = await load(
      "/src/presentation/life-scene-flow.ts",
    );
    const { openConversationWith } = await load(
      "/src/presentation/person-conversation-entry.ts",
    );
    const { personName } = await load("/src/simulation/people.ts");
    const { BrowserSaveStore } = await load(
      "/src/presentation/browser-world-repository.ts",
    );
    const game = createNewGameWorld({
      startKind: "custom",
      placeKey: "kentucky",
      startAge: 10,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "room-portrait-browser-recorded-situation",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    });
    const world = openNextLifeScene(
      openOrdinaryLife(game.world, game.playerPersonId),
      game.playerPersonId,
    );
    const scene = currentOpeningLifeScene(world, game.playerPersonId);
    if (!scene)
      throw new Error("Existing opening writer supplied no actual scene.");
    const eligible = scene.presentPersonIds.filter(
      (id: string) =>
        id !== game.playerPersonId &&
        openConversationWith(world, game.playerPersonId, id).kind ===
          "available",
    );
    if (eligible.length === 0)
      throw new Error("No actual eligible person in the saved room.");
    const offsite = (Object.values(world.people) as Person[]).find(
      (person) =>
        !scene.presentPersonIds.includes(person.id) &&
        openConversationWith(world, game.playerPersonId, person.id).kind ===
          "unavailable",
    ) as { id: string };
    if (!offsite) throw new Error("No actual offsite refusal example exists.");
    const refusal = openConversationWith(
      world,
      game.playerPersonId,
      offsite.id,
    ).reason;
    const store = new BrowserSaveStore();
    const saved = await store.save(world, store.newSaveId(world));
    if (saved.status !== "saved")
      throw new Error(`Actual room save refused: ${saved.status}`);
    return {
      eligible,
      offsite: { id: offsite.id, name: personName(offsite), refusal },
      sceneEventId: scene.eventId,
    };
  });
  test.info().annotations.push({
    type: "saved-room-event",
    description: facts.sceneEventId,
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("world-orientation")).toHaveCount(0);
  const clock = await page
    .getByTestId("shell-nav-cluster")
    .getAttribute("aria-label");
  const controls = page.locator(".scene-person-token, .scene-place-person");
  await expect(controls.first()).toBeVisible({ timeout: 30_000 });
  const viewport = page.viewportSize()!;
  let selected: string | undefined;
  let portrait: Locator | undefined;
  for (const id of facts.eligible) {
    const token = page
      .getByTestId(`scene-person-${id}`)
      .or(page.locator(`.scene-place-person[data-person-id="${id}"]`));
    const box = await token.first().boundingBox();
    if (
      box &&
      box.x + box.width / 2 > 0 &&
      box.x + box.width / 2 < viewport.width &&
      box.y + box.height / 2 > 0 &&
      box.y + box.height / 2 < viewport.height
    ) {
      selected = id;
      portrait = token.first();
      break;
    }
  }
  expect(
    selected,
    "a real eligible figure must have an onscreen target",
  ).toBeTruthy();
  const inspect = page.getByTestId(`scene-inspect-${selected}`);
  await expect(inspect).toHaveAccessibleName(/^Inspect /);
  await inspect.click();
  await expect(page.getByTestId("quick-dossier")).toHaveAttribute(
    "data-person-id",
    selected!,
  );
  await expect(page.getByTestId("conversation-life-talk")).toHaveCount(0);
  await page.getByTestId("quick-dossier-close").click();
  const exposedPoint = await portrait!.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    for (const vertical of [0.05, 0.15, 0.3, 0.5, 0.7, 0.9]) {
      for (const horizontal of [0.25, 0.5, 0.75]) {
        const x = rect.width * horizontal;
        const y = rect.height * vertical;
        const hit = document.elementFromPoint(rect.left + x, rect.top + y);
        if (hit && element.contains(hit)) return { x, y };
      }
    }
    return null;
  });
  expect(
    exposedPoint,
    "an actual exposed portrait target must exist",
  ).not.toBeNull();
  await portrait!.click({ position: exposedPoint! });
  const conversation = page.getByTestId("conversation-life-talk");
  await expect(conversation).toBeVisible();
  await expect(conversation).toHaveAttribute("data-addressee", selected!);
  await expect(conversation.getByTestId("talk-you")).toHaveCount(0);
  expect(
    await page.getByTestId("shell-nav-cluster").getAttribute("aria-label"),
  ).toBe(clock);
  await conversation.getByTestId("talk-back").click();
  await expect(conversation).toHaveCount(0);
  await expect(portrait!).toBeVisible();
});

test.fixme("offsite People route refuses without creating a conversation", () => {
  // The controlled child save knows only its two present household members.
  // An unrelated world person is not admitted to the People directory.
  // The actual offsite/stale entry guard is covered by room-portrait-entry.test.ts.
});
