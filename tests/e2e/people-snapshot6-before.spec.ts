import fs from "node:fs";
import { captureDirectory } from "./support/evidence-path";
import path from "node:path";
import { expect, test } from "@playwright/test";

// A historical reproduction against unmodified 303c7ad; opt in, never overwrite
// the independently reviewed Visual4 evidence.
test("SNAPSHOT6 reproduces the saved primary caption discrepancy", async ({
  page,
}) => {
  test.skip(
    process.env.PEOPLE_SNAPSHOT6_BEFORE !== "1",
    "Historical reproduction only",
  );
  await page.goto("/?view=character-proof&set=visual4");
  await page
    .getByRole("combobox", { name: "Face", exact: true })
    .selectOption("pv4-ocd_head_adult_light_square_older_lined_v1");
  await page
    .getByRole("combobox", { name: "Hairstyle", exact: true })
    .selectOption("pv4-hair-01-light-square-older-lined-v1-front");
  await page
    .getByRole("combobox", { name: "bottom", exact: true })
    .selectOption("pv4-wave-a-male-bottom-black-joggers-v1");
  await page
    .getByRole("combobox", { name: "footwear", exact: true })
    .selectOption(
      "pv4-wave-a-footwear-low-top-sneaker-gray-v1-wave-a-average-man-standing-neutral-front-a-v1-pv4",
    );
  const top = page.getByRole("combobox", { name: "top", exact: true });
  await top.selectOption("pv4-wave-a-male-top-brown-fur-hood-parka-v1");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await top.selectOption("pv4-wave-a-male-top-burgundy-long-sleeve-polo-v1");
  await page
    .getByRole("button", { name: "Reload review", exact: true })
    .click();
  const character = page.getByTestId("candidate-review-character");
  await expect
    .poll(() =>
      character
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (i) =>
              (i as HTMLImageElement).complete &&
              (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  const caption = await page.getByTestId("visual4-completeness").innerText();
  expect(caption).toContain("top=pv4-wave-a-male-top-green-cable-sweater-v1");
  expect(caption).toContain(
    "bottom=pv4-wave-a-male-bottom-blue-straight-jeans-v1",
  );
  const layers = await character.locator("img").evaluateAll((images) =>
    images.map((element) => {
      const i = element as HTMLImageElement;
      return {
        id: i.dataset.assetId,
        src: i.src,
        currentSrc: i.currentSrc,
        width: i.naturalWidth,
        height: i.naturalHeight,
      };
    }),
  );
  expect(layers.map((l) => l.id)).toContain(
    "pv4_wave_a_male_top_brown_fur_hood_parka_v1",
  );
  expect(layers.map((l) => l.id)).toContain(
    "pv4_wave_a_male_bottom_black_joggers_v1",
  );
  const dir =
    captureDirectory("docs/agent/evidence/people-snapshot6") ??
    test.info().outputPath();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "before-saved-caption-discrepancy.json"),
    JSON.stringify(
      {
        revision: "303c7ad81ca16649f6a99e25b5ba146e637b6b0f",
        route: "/?view=character-proof&set=visual4",
        caption,
        layers,
        save: await page.evaluate(() =>
          localStorage.getItem(
            "political-game:people-visual4:review-snapshot:v1",
          ),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  await page.screenshot({
    path: path.join(dir, "before-saved-caption-discrepancy.png"),
    fullPage: true,
  });
});
