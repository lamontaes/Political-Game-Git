import fs from "node:fs";
import path from "node:path";
import { expect, test, type TestInfo } from "@playwright/test";

/**
 * Where this run's captures go.
 *
 * Every run gets its own artifact directory. Writing into
 * `docs/agent/evidence/people1-r1` unconditionally is what silently rewrote the
 * identified PEOPLE1-R1 captures twice — once inside a commit that said it only
 * repaired four tests, and once inside a commit that said it only recorded a
 * browser count. Neither declared an art recapture, and the second one is what
 * failed the push-scope declaration gate.
 *
 * Banking a capture into tracked evidence is therefore an explicit act, exactly
 * as `people-snapshot6` already does it: set `PEOPLE1_R1_EVIDENCE=1` when you
 * mean to replace the historical set, and say so in the commit. A test capture
 * is never an art approval either way.
 */
const bankedEvidence = process.env.PEOPLE1_R1_EVIDENCE
  ? path.resolve("docs/agent/evidence/people1-r1")
  : null;

function capturePath(testInfo: TestInfo, name: string): string {
  if (bankedEvidence === null) return testInfo.outputPath(name);
  fs.mkdirSync(bankedEvidence, { recursive: true });
  return path.join(bankedEvidence, name);
}

for (const set of ["dev", "real"]) {
  test(`saved ${set} world keeps identity across actual wardrobe changes, pointer and keyboard`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/?view=character-proof&set=${set}`);
    const authored = page
      .getByTestId("people1-dossier-consumers")
      .locator('[data-likeness="authored"] img');
    await expect(authored).toHaveCount(2);
    for (const portrait of await authored.all()) {
      await expect(portrait).toBeVisible();
      expect(
        await portrait.evaluate(
          (node) => (node as HTMLImageElement).naturalWidth,
        ),
      ).toBeGreaterThan(0);
    }
    const person = page.getByTestId("character-proof-stage-character").first();
    const identity = await person.getAttribute("data-recipe-key");
    const stableLayers = () =>
      person
        .locator(
          'img[data-kind="body"],img[data-kind="head"],img[data-kind^="hair"]',
        )
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-asset-id")),
        );
    const stable = await stableLayers();
    const select = page.getByTestId("character-proof-wardrobe");
    await select.selectOption("casual");
    const casualTop = await person
      .locator('img[data-kind="top"]')
      .getAttribute("data-asset-id");
    await page.getByTestId("character-proof-save").click();
    await page.getByTestId("character-proof-reload").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("character-proof")).toHaveAttribute(
      "data-world-source",
      "restored-snapshot",
    );
    await select.focus();
    await page.keyboard.press("f");
    await page.keyboard.press("Enter");
    await expect(select).toHaveValue("formal");
    await expect(person).toHaveAttribute("data-recipe-key", identity!);
    expect(await stableLayers()).toEqual(stable);
    expect(
      await person
        .locator('img[data-kind="top"]')
        .getAttribute("data-asset-id"),
    ).not.toBe(casualTop);
    await expect(person).toHaveAttribute("data-complete", "true");
    await page
      .getByTestId("character-proof-stage")
      .screenshot({ path: capturePath(testInfo, `saved-formal-${set}.png`) });
  });
}

test("normalized candidate states name head and fit limitations beside the actual layers", async ({
  page,
}, testInfo) => {
  await page.goto("/?view=character-proof&set=wave-a");
  await page
    .getByTestId("candidate-review-body-select")
    .selectOption("wave_a_average_man_standing_neutral_front_a_v1_rt960");
  await expect(page.getByTestId("candidate-fit-evidence")).toContainText(
    "no facial features",
  );
  await expect(
    page
      .getByTestId("candidate-review-character")
      .locator('img[data-kind="head"]'),
  ).toHaveCount(0);
  await expect(
    page
      .getByTestId("candidate-review-character")
      .locator('img[data-kind="top"]'),
  ).toHaveCount(1);
  await page
    .getByRole("checkbox", { name: "Show root and attachment anchors" })
    .click();
  await page.getByTestId("candidate-review-stage").screenshot({
    path: capturePath(testInfo, "normalized-standing-candidate.png"),
  });
  await page
    .getByTestId("candidate-review-body-select")
    .selectOption("wave_a_average_woman_seated_front_neutral_v1_rt960");
  await expect(page.getByTestId("candidate-review-complete")).toHaveText(
    "false",
  );
  await expect(
    page
      .getByTestId("candidate-review-character")
      .locator('img[data-kind="bottom"]'),
  ).toHaveCount(0);
  await page
    .getByTestId("candidate-review-stage")
    .screenshot({ path: capturePath(testInfo, "seated-candidate-gaps.png") });
});

test("normal play uses the canonical person's portrait fallback and named people", async ({
  page,
}, testInfo) => {
  const { startLife, enterLife } = await import("./support/creator");
  await page.goto("/");
  await startLife(page, {
    age: 10,
    route: "custom",
    childhood: true,
    household: "shares-a-home",
  });
  await enterLife(page);
  const portrait = page.getByTestId("life-hud").getByTestId("person-portrait");
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute("data-likeness", "none");
  await expect(portrait.locator("img")).toHaveCount(0);
  await expect(portrait.locator("strong")).not.toHaveText("");
  const people = page.getByRole("complementary", {
    name: "People in this life",
  });
  await expect(people).toBeVisible();
  await expect(people.getByRole("listitem")).toHaveCount(2);
  await page.getByTestId("elsewhere-people").click();
  await page.screenshot({
    path: capturePath(testInfo, "normal-player-people-1440.png"),
  });
  await page.setViewportSize({ width: 1200, height: 720 });
  await expect(portrait).toBeVisible();
  await page.screenshot({
    path: capturePath(testInfo, "normal-player-people-1200.png"),
  });
});
