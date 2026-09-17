import { test, expect, type Page } from "./fixtures";
import { chooseOption, expectChosen, optionValues } from "./support/controls";
import {
  enterLife,
  saveLife,
  chooseCreatorLocation,
  chooseStartAge,
  completeCharacterStep,
  answerCharacterBasics,
} from "./support/creator";
import { readReplaySetup } from "../../src/presentation/new-game-identity";

async function payloads(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("political-life-worlds-art-preview");
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
          resolve(request.result.map((r: { payload: string }) => r.payload));
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}
test("towns are alphabetical before the visible limit and changing state does not select a hometown", async ({
  page,
}) => {
  await page.goto("/?seed=p34-town-order&art-preview=candidate");
  await page.getByTestId("new-game").click();
  await page.getByTestId("start-normal").click();
  await completeCharacterStep(page, 30);
  await page.getByTestId("creator-continue-character").click();
  await page.getByTestId("state-search").fill("Kentucky");
  await page.getByTestId("state-KY").click();
  const towns = page.getByTestId("place-choices").getByRole("button");
  await expect(towns.first()).toBeVisible();
  const names = (await towns.allTextContents()).map((name) => name.trim());
  expect(names.length).toBeGreaterThan(1);
  expect(names).toEqual(
    [...names].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" }),
    ),
  );
  expect(names[0]).not.toContain("Lexington");
  await expect(page.getByTestId("creator-continue-place")).toHaveCount(0);
  await page.getByTestId("place-search").fill("Lexington");
  await expect(towns.first()).toContainText("Lexington");
  await towns.first().click();
  await expect(page.getByTestId("creator-continue-place")).toBeEnabled();
  await page.getByTestId("creator-change-state").click();
  await page.getByTestId("state-search").fill("Arkansas");
  await page.getByTestId("state-AR").press("Enter");
  await expect(page.getByTestId("place-search")).toHaveValue("");
  await expect(page.getByTestId("creator-continue-place")).toHaveCount(0);
  await expect(towns.first()).toBeVisible();
  const changed = (await towns.allTextContents()).map((name) => name.trim());
  expect(changed).toEqual(
    [...changed].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" }),
    ),
  );
  expect(changed.every((name) => !name.includes("Lexington"))).toBe(true);
});

test("birthday validates through actual creator keyboard/pointer controls and persists replay identity", async ({
  page,
}) => {
  // This covers two full World loads plus creation/replay/save, not one click.
  // Keep individual control/assertion waits unchanged and allow the whole walk.
  test.setTimeout(90_000);
  await page.goto("/?seed=p34-birthday&art-preview=candidate");
  await page.getByTestId("new-game").click();
  await page.getByTestId("start-normal").click();
  // Month names and a day list no longer than the month: February offers no
  // 30th to choose, and moving the month keeps a day that still exists.
  await chooseOption(page.getByTestId("start-birth-month"), "2");
  expect(await optionValues(page.getByTestId("start-birth-day"))).not.toContain(
    "30",
  );
  await chooseOption(page.getByTestId("start-birth-day"), "28");
  await chooseOption(page.getByTestId("start-birth-month"), { label: "March" });
  await expectChosen(page.getByTestId("start-birth-month"), "3");
  await expectChosen(page.getByTestId("start-birth-day"), "28");
  await answerCharacterBasics(page);
  await chooseStartAge(page, 22);
  await page.getByTestId("creator-continue-character").focus();
  await page.keyboard.press("Enter");
  await chooseCreatorLocation(
    page,
    { age: 22, place: "Lexington", state: "Kentucky" },
    false,
  );
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("setup-advanced").locator("summary").press("Enter");
  const replay = (await page
    .getByTestId("setup-replay-link")
    .textContent())!.trim();
  const setup = readReplaySetup(new URL(replay, "http://localhost").search)!;
  expect({
    month: setup.birthMonth,
    day: setup.birthDay,
    age: setup.startAge,
  }).toEqual({ month: 3, day: 28, age: 22 });
  await page.getByTestId("begin").click();
  await enterLife(page);
  await saveLife(page);
  const before = await payloads(page);
  expect(before).toHaveLength(1);
  const world = JSON.parse(before[0]!).world;
  expect(world.control.kind).toBe("person");
  expect(world.people[world.control.personId].birthDate).toMatch(/-03-28$/);
  await page.goto("/?art-preview=candidate");
  await page.getByTestId("continue").focus();
  await page.keyboard.press("Enter");
  await enterLife(page);
  expect(await payloads(page)).toEqual(before);
});
