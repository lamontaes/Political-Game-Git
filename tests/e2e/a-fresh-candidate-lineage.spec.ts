import { test, expect, type Page } from "./fixtures";
import { fillCreator, enterLife, saveLife } from "./support/creator";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  replayDescriptorUrl,
  readReplaySetup,
} from "../../src/presentation/new-game-identity";

const databaseName = "political-life-worlds-art-preview";
async function savedPayloads(
  page: Page,
  name = databaseName,
): Promise<string[]> {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<string[]>((resolve, reject) => {
        const request = db
          .transaction("worlds", "readonly")
          .objectStore("worlds")
          .getAll();
        request.onsuccess = () =>
          resolve(
            request.result.map((record: { payload: string }) => record.payload),
          );
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, name);
}
function generations(payload: string): number[] {
  const world = JSON.parse(payload).world;
  return Object.values(world.people)
    .map(
      (person) =>
        (person as { appearance?: { catalogGeneration?: number } }).appearance
          ?.catalogGeneration,
    )
    .filter(
      (value: number | undefined): value is number => value !== undefined,
    );
}

test("fresh candidate draft pins before replay encoding; replay and saved life retain that identity", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/?seed=a-fresh-candidate&art-preview=candidate");
  await fillCreator(page, { age: 34 });
  await page.getByTestId("setup-advanced").locator("summary").press("Enter");
  await expect(page.getByTestId("setup-replay-link")).toBeVisible();
  const replay = (
    (await page.getByTestId("setup-replay-link").textContent()) ?? ""
  ).trim();
  expect(
    readReplaySetup(new URL(replay, "http://localhost").search)
      ?.appearanceCatalogGeneration,
  ).toBe(4);
  await page.getByTestId("begin").focus();
  await page.keyboard.press("Enter");
  await enterLife(page);
  await saveLife(page);
  const before = await savedPayloads(page);
  expect(before).toHaveLength(1);
  expect(new Set(generations(before[0]!))).toEqual(new Set([4]));
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  expect(await savedPayloads(page)).toEqual(before);
  const address = new URL(replay, "http://localhost");
  address.searchParams.set("art-preview", "candidate");
  await page.goto(address.pathname + address.search);
  await enterLife(page);
  await saveLife(page);
  const after = await savedPayloads(page);
  expect(after).toHaveLength(2);
  for (const payload of after) expect(payload).toBe(before[0]);
});

for (const pin of [undefined, 1, 2, 3]) {
  test(`old candidate replay pin ${pin ?? "absent"} and old saved life stay unchanged`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `a-old-candidate-${pin ?? "absent"}`,
      startAge: 34,
      placeKey: "lexington-fayette",
      questionnaire: "skipped" as const,
      ...(pin === undefined ? {} : { appearanceCatalogGeneration: pin }),
    };
    const replay = new URL(
      replayDescriptorUrl("", "/", setup),
      "http://localhost",
    );
    replay.searchParams.set("art-preview", "candidate");
    await page.goto(replay.pathname + replay.search);
    await enterLife(page);
    await saveLife(page);
    const before = await savedPayloads(page);
    expect(before).toHaveLength(1);
    expect(new Set(generations(before[0]!))).toEqual(new Set([pin ?? 2]));
    await page.goto("/?art-preview=candidate");
    await page.reload();
    await page.getByTestId("continue").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("play-screen")).toBeVisible();
    expect(await savedPayloads(page)).toEqual(before);
    await page.goto(replay.pathname + replay.search);
    await enterLife(page);
    await saveLife(page);
    const after = await savedPayloads(page);
    expect(after).toHaveLength(2);
    for (const payload of after) expect(payload).toBe(before[0]);
  });
}

test("fresh production draft does not mount generation four", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/?seed=a-fresh-production");
  await fillCreator(page, { age: 34 });
  await page.getByTestId("setup-advanced").locator("summary").press("Enter");
  await expect(page.getByTestId("setup-replay-link")).toBeVisible();
  const replay = (
    (await page.getByTestId("setup-replay-link").textContent()) ?? ""
  ).trim();
  expect(
    readReplaySetup(new URL(replay, "http://localhost").search)
      ?.appearanceCatalogGeneration,
  ).toBeUndefined();
  await page.getByTestId("begin").click();
  await enterLife(page);
  await saveLife(page);
  const payloads = await savedPayloads(page, "political-life-worlds");
  expect(payloads).toHaveLength(1);
  expect(new Set(generations(payloads[0]!))).toEqual(new Set([2]));
  await expect(page.getByTestId("art-preview-banner")).toHaveCount(0);
});
