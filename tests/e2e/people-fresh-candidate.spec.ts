import { writeFileSync } from "node:fs";
import { test, expect, type Page } from "./fixtures";
import { startLife, enterLife, saveLife } from "./support/creator";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { replayDescriptorUrl } from "../../src/presentation/new-game-identity";

test.use({ video: "on" });
async function wardrobe(page: Page) {
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("nav-personal-group").click();
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("personal-appearance").click();
  await page
    .getByTestId("saved-appearance-controls")
    .locator("summary")
    .click();
  await expect(page.getByTestId("wardrobe-full-body")).toBeVisible();
}
async function identity(page: Page) {
  return page.getByTestId("wardrobe-full-body").evaluate((el) => ({
    seed: el.getAttribute("data-appearance-seed"),
    generation: el.getAttribute("data-catalog-generation"),
    parts: Array.from(el.querySelectorAll("img")).map((i) => ({
      id: i.dataset.assetId,
      kind: i.dataset.kind,
      src: i.getAttribute("src"),
    })),
  }));
}
const top = (page: Page) =>
  page.getByRole("combobox", { name: "top", exact: true });

test("fresh candidate creates two independent lives, swaps and reopens actual matched parts", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const expected = [];
  for (const n of [1, 2]) {
    await page.goto(`/?seed=people-fresh-${n}&art-preview=candidate`);
    await startLife(page, {
      age: 34,
      household: "shares-a-home",
      givenName: `Fresh${n}`,
      familyName: "Review",
    });
    await enterLife(page);
    await wardrobe(page);
    await expect(page.getByTestId("wardrobe-full-body")).toHaveAttribute(
      "data-catalog-generation",
      "4",
    );
    // Choose a supported body once before identity comparisons; garment swaps never change it.
    await page
      .getByRole("combobox", { name: "Body", exact: true })
      .selectOption("wave-a-average-man-standing-neutral-front-a-v1-pv4");
    await top(page).selectOption(
      "pv4-wave-a-male-top-burgundy-long-sleeve-polo-v1",
    );
    const before = await identity(page);
    await top(page).selectOption(
      "pv4-wave-a-male-top-white-button-up-shirt-v1",
    );
    await page
      .getByRole("combobox", { name: "bottom", exact: true })
      .selectOption(
        n === 1
          ? "pv4-wave-a-male-bottom-blue-straight-jeans-v1"
          : "pv4-wave-a-male-bottom-khaki-shorts-v1",
      );
    const after = await identity(page);
    const person = (x: typeof after) =>
      x.parts.filter((p) =>
        ["body", "head", "hair-front", "hair-back"].includes(p.kind!),
      );
    expect(person(after)).toEqual(person(before));
    expect(
      after.parts.filter((p) => p.kind === "top").map((p) => p.id),
    ).toEqual([
      "pv4_wave_a_male_top_white_button_up_shirt_v1_matched_v1",
      "pv4_wave_a_male_top_white_button_up_shirt_v1_matched_v1_collar_front",
    ]);
    expected.push(after);
    await page.screenshot({ path: info.outputPath(`fresh${n}-swapped.png`) });
    await saveLife(page);
  }
  expect(expected[0]!.seed).not.toBe(expected[1]!.seed);
  for (const n of [1, 2]) {
    await page.goto("/?art-preview=candidate");
    await page.getByTestId("open-saves").click();
    await page
      .getByTestId("save-entry")
      .filter({ hasText: `Fresh${n} Review` })
      .getByRole("button", { name: "Open", exact: true })
      .click();
    await enterLife(page);
    await wardrobe(page);
    expect(await identity(page)).toEqual(expected[n - 1]);
    await page.screenshot({ path: info.outputPath(`fresh${n}-reopened.png`) });
  }
  writeFileSync(
    info.outputPath("two-lives.json"),
    JSON.stringify(expected, null, 2),
  );
});

for (const pin of [undefined, 2, 3, 4])
  test(`replay bypass preserves ${pin ?? "unpinned v2"} actual shirt`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "coherence-wardrobe",
      startAge: 34,
      givenName: "Replay",
      familyName: "Review",
      ...(pin === undefined ? {} : { appearanceCatalogGeneration: pin }),
    };
    const url = replayDescriptorUrl("", "/", setup) + "&art-preview=candidate";
    await page.goto(url);
    await enterLife(page);
    await wardrobe(page);
    await expect(page.getByTestId("wardrobe-full-body")).toHaveAttribute(
      "data-catalog-generation",
      String(pin ?? 2),
    );
    await page
      .getByRole("combobox", { name: "Body", exact: true })
      .selectOption("wave-a-average-man-standing-neutral-front-a-v1-pv4");
    await top(page).selectOption(
      "pv4-wave-a-male-top-burgundy-long-sleeve-polo-v1",
    );
    const actual = await identity(page);
    const suffix =
      (pin ?? 2) === 4 ? "_matched_v1" : pin === 3 ? "_neckline_v1" : "";
    expect(
      actual.parts.filter((p) => p.kind === "top").map((p) => p.id),
    ).toEqual(
      (pin ?? 2) === 4
        ? [
            `pv4_wave_a_male_top_burgundy_long_sleeve_polo_v1${suffix}`,
            `pv4_wave_a_male_top_burgundy_long_sleeve_polo_v1${suffix}_collar_front`,
          ]
        : [`pv4_wave_a_male_top_burgundy_long_sleeve_polo_v1${suffix}`],
    );
    writeFileSync(
      info.outputPath("replay-parts.json"),
      JSON.stringify(actual, null, 2),
    );
  });
