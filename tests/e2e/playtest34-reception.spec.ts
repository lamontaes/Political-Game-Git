import { readFileSync } from "node:fs";
import { chooseOption, expectChosen, optionValues } from "./support/controls";
import { test, expect, type Page } from "./fixtures";
import {
  fillCreator,
  enterLife,
  saveLife,
  chooseCreatorLocation,
  goTo,
  chooseStartAge,
  completeCharacterStep,
  answerCharacterBasics,
} from "./support/creator";
import { readReplaySetup } from "../../src/presentation/new-game-identity";
import { simulationMinutesBetween } from "../../src/simulation/dates";
import type { World } from "../../src/simulation/types";

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
async function options(page: Page) {
  await goTo(page, "nav-options");
  await expect(page.getByTestId("content-pack-workspace")).toBeVisible();
}
const timing = JSON.parse(
  readFileSync("examples/content-packs/community-timing.json", "utf8"),
);
const encounter = JSON.parse(
  readFileSync("examples/content-packs/community-encounter.json", "utf8"),
);
async function upload(page: Page, data: unknown) {
  await page.getByLabel("Import content pack", { exact: true }).setInputFiles({
    name: "authored-pack.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(
    page.getByTestId("content-pack-workspace").getByRole("status"),
  ).toContainText("Content pack added");
}

async function performPackActivity(page: Page, minutes: number) {
  if (await page.getByTestId("shell-nav-flyout").isVisible()) {
    await page.keyboard.press("Escape");
  }
  await expect(page.getByTestId("shell-nav-flyout")).toBeHidden();
  await goTo(page, "nav-group-personal");
  await page.getByTestId("nav-personal").click();
  await page
    .getByTestId("personal-life-choices")
    .locator(":scope > summary")
    .click();
  const returnToDay = page.getByRole("button", {
    name: "Return to your day",
    exact: true,
  });
  if (await returnToDay.count()) await returnToDay.click();
  for (let attempt = 0; attempt < 24; attempt++) {
    const prose = page.getByTestId("life-scene-prose");
    if (await prose.count()) {
      if ((await prose.innerText()).includes("growing a few herbs")) break;
      await page
        .getByTestId("life-scene-choices")
        .getByRole("button")
        .first()
        .click();
    }
    await page.getByTestId("life-next-scene").click();
  }
  await expect(page.getByTestId("life-scene-prose")).toContainText(
    "growing a few herbs",
  );
  await expect(
    page.getByTestId("life-scene-choices").getByRole("button", {
      name: new RegExp(`Rest by the window instead.*${minutes} minutes`),
    }),
  ).toBeVisible();
  await saveLife(page);
  const current = (saved: string[]) =>
    saved
      .map((p) => JSON.parse(p).world as World)
      .find((w) =>
        w.contentPacks?.installed.some((i) =>
          i.pack.durations.some((d) => d.minutes === minutes),
        ),
      )!;
  const before = current(await payloads(page));
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("shell-nav-flyout")).toBeHidden();
  await page
    .getByTestId("life-scene-choices")
    .getByRole("button", {
      name: new RegExp(`Rest by the window instead.*${minutes} minutes`),
    })
    .press("Enter");
  await expect(page.getByTestId("life-scene-aftermath")).toContainText(
    "resting by the window",
  );
  await saveLife(page);
  const after = current(await payloads(page));
  expect(
    simulationMinutesBetween(before.currentMoment, after.currentMoment),
  ).toBe(minutes);
  expect(
    after.history.events.filter(
      (e) =>
        e.type === "life.scene.resolved" &&
        e.summary.includes("resting by the window"),
    ),
  ).toHaveLength(1);
  return (await payloads(page)).find(
    (p) => JSON.parse(p).world.id === after.id,
  )!;
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

test("external JSON import is time-neutral, refuses missing dependencies and saves independent12/17-minute definitions", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/?seed=p34-pack12&art-preview=candidate");
  await fillCreator(page, {
    age: 35,
    state: "Kentucky",
    place: "Lexington",
    household: "lives-alone",
    givenName: "Pack",
    familyName: "Twelve",
  });
  await page.getByTestId("begin").click();
  await enterLife(page);
  await saveLife(page);
  const original = (await payloads(page))[0]!;
  expect(JSON.parse(original).formatVersion).toBe(15);
  await options(page);
  await page.getByLabel("Import content pack", { exact: true }).setInputFiles({
    name: "missing.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(encounter)),
  });
  await expect(
    page.getByTestId("content-pack-workspace").getByRole("status"),
  ).toContainText("This life is unchanged");
  expect(await payloads(page)).toEqual([original]);
  await upload(page, timing);
  await upload(page, encounter);
  await page.keyboard.press("Escape");
  await saveLife(page);
  const imported = (await payloads(page))[0]!;
  const packed = JSON.parse(imported);
  expect(packed.formatVersion).toBe(16);
  expect(packed.world.currentMoment).toEqual(
    JSON.parse(original).world.currentMoment,
  );
  expect(packed.world.contentPacks.installed).toHaveLength(2);
  const first = await performPackActivity(page, 12);
  await page.goto("/?art-preview=candidate");
  await page.getByTestId("continue").click();
  await enterLife(page);
  await options(page);
  await expect(page.getByTestId("content-pack-workspace")).toContainText(
    "1.0.0",
  );
  await page.goto("/?seed=p34-pack17&art-preview=candidate");
  await fillCreator(page, {
    age: 35,
    state: "Arkansas",
    place: "Adona",
    household: "lives-alone",
    givenName: "Pack",
    familyName: "Seventeen",
  });
  await page.getByTestId("begin").click();
  await enterLife(page);
  await options(page);
  await upload(page, {
    ...timing,
    version: "1.1.0",
    durations: timing.durations.map((d: object) => ({ ...d, minutes: 17 })),
  });
  await upload(page, {
    ...encounter,
    version: "1.1.0",
    dependencies: [{ id: timing.id, version: "1.1.0" }],
    scenes: encounter.scenes.map((s: object) => ({ ...s, minutes: 17 })),
  });
  await page.keyboard.press("Escape");
  await performPackActivity(page, 17);
  const saved = await payloads(page);
  expect(saved).toHaveLength(2);
  expect(saved).toContain(first);
  const durations = saved
    .map((p) =>
      JSON.parse(p).world.contentPacks.installed.flatMap(
        (i: { pack: { durations: { minutes: number }[] } }) =>
          i.pack.durations.map((d) => d.minutes),
      ),
    )
    .flat();
  expect(durations.sort()).toEqual([12, 17]);
});
