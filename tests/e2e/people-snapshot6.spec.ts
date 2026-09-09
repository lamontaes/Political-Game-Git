import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import registry from "../../art/manifest/character_candidate_visual4_registry.json";
import hairRegistry from "../../art/manifest/character_candidate_visual4_hair_registry.json";

const key = "political-game:people-visual4:review-snapshot:v1";
const body = "wave_a_average_man_standing_neutral_front_a_v1_pv4";
const head = "pv4_ocd_head_adult_light_square_older_lined_v1";
const hair = "pv4_hair_01_light_square_older_lined_v1_front";
const bottom = "pv4_wave_a_male_bottom_black_joggers_v1";
const shoe =
  "pv4_wave_a_footwear_low_top_sneaker_gray_v1_wave_a_average_man_standing_neutral_front_a_v1_pv4";
const parka = "pv4_wave_a_male_top_brown_fur_hood_parka_v1";
const polo = "pv4_wave_a_male_top_burgundy_long_sleeve_polo_v1";
const expected = (top: string) => [body, bottom, top, head, shoe, hair];
const records = [...registry.assets, ...hairRegistry.assets];
const family = (id: string) =>
  records.find((r) => r.asset_id === id)!.candidate_component.family;
const artifactDir = process.env.PEOPLE_SNAPSHOT6_EVIDENCE
  ? path.resolve("docs/agent/evidence/people-snapshot6")
  : null;

async function configure(page: Page, top: string) {
  for (const [name, id] of [
    ["Body", body],
    ["Face", head],
    ["Hairstyle", hair],
    ["bottom", bottom],
    ["footwear", shoe],
    ["top", top],
  ]) {
    await page
      .getByRole("combobox", { name, exact: true })
      .selectOption(family(id!));
  }
}

async function loadedProof(page: Page, ids: string[]) {
  const surfaces = [
    "[data-testid='candidate-review-character']",
    "[data-testid='person-portrait-character']",
    "[data-testid='scene-people']",
  ];
  const proof = [];
  for (const selector of surfaces) {
    const images = page.locator(`${selector} img`);
    await expect(images).toHaveCount(ids.length);
    const rows = [];
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index]!;
      const record = records.find((r) => r.asset_id === id)!;
      const bytes = fs.readFileSync(record.final_path);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        record.hash,
      );
      const image = images.nth(index);
      await expect(image).toHaveAttribute(
        "src",
        new RegExp(record.final_path.replaceAll(".", "\\.") + "$"),
      );
      await expect
        .poll(() =>
          image.evaluate(
            (i) =>
              (i as HTMLImageElement).complete &&
              (i as HTMLImageElement).naturalWidth > 0,
          ),
        )
        .toBe(true);
      const pixels = await image.evaluate(async (element, expectedBase64) => {
        const actual = element as HTMLImageElement;
        await actual.decode();
        const reference = new Image();
        reference.src = `data:image/png;base64,${expectedBase64}`;
        await reference.decode();
        async function digest(image: HTMLImageElement) {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const hash = await crypto.subtle.digest("SHA-256", data);
          return [...new Uint8Array(hash)]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        }
        return {
          assetId: actual.dataset.assetId ?? null,
          src: actual.getAttribute("src"),
          currentSrc: actual.currentSrc,
          width: actual.naturalWidth,
          height: actual.naturalHeight,
          actualPixels: await digest(actual),
          expectedPixels: await digest(reference),
        };
      }, bytes.toString("base64"));
      expect(pixels.currentSrc).toContain(record.final_path);
      expect(pixels.actualPixels).toBe(pixels.expectedPixels);
      if (selector !== surfaces[2]) expect(pixels.assetId).toBe(id);
      rows.push({ expectedAssetId: id, sourceHash: record.hash, ...pixels });
    }
    proof.push({ surface: selector, layers: rows });
  }
  return proof;
}

test("saved outfit and person A/B/A keep captions and decoded layers aligned under delayed loading", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = 0;
  await page.route(`**/${polo}.png`, async (route) => {
    held++;
    await gate;
    await route.continue().catch(() => {}); // navigation may cancel an old request
  });
  await page.goto("/?view=character-proof&set=visual4");
  await configure(page, parka);
  const personControl = page.getByRole("combobox", {
    name: "Person",
    exact: true,
  });
  const personA = await personControl.inputValue();
  const personB = await personControl
    .locator("option")
    .evaluateAll((options) => (options[1] as HTMLOptionElement).value);
  const character = page.getByTestId("candidate-review-character");
  const identity = await character.getAttribute("data-recipe-key");
  const a = await loadedProof(page, expected(parka));
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  const originalAppearance = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).world,
    key,
  );
  const top = page.getByRole("combobox", { name: "top", exact: true });
  await top.click();
  await page.keyboard.press("Escape");
  await top.focus();
  await page.keyboard.press("t");
  await page.keyboard.press("Enter");
  await expect(top).toHaveValue(family(polo));
  await expect.poll(() => held).toBeGreaterThan(0);
  await expect(page.getByTestId("visual4-completeness")).toContainText(
    `top=${polo}`,
  );
  // A delayed replacement must not keep the old garment element/current pixels.
  for (const selector of [
    "[data-testid='candidate-review-character']",
    "[data-testid='person-portrait-character']",
    "[data-testid='scene-people']",
  ]) {
    await expect(
      page.locator(`${selector} img[src$='/${parka}.png']`),
    ).toHaveCount(0);
    await expect(
      page.locator(`${selector} img[src$='/${polo}.png']`),
    ).toHaveCount(1);
  }
  await page
    .getByText("Identity and wardrobe details", { exact: true })
    .click();
  await expect(page.getByTestId("snapshot6-requested")).toContainText(
    family(polo),
  );
  await expect(page.getByTestId("snapshot6-saved")).toContainText(
    family(parka),
  );
  await expect(page.getByTestId("snapshot6-base-recipe")).toContainText(
    "top=pv4-wave-a-male-top-green-cable-sweater-v1",
  );
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  // Actual page reload plus saved-review reload while the B image is pending.
  await page.reload();
  await page
    .getByRole("button", { name: "Reload review", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(top).toHaveValue(family(polo));
  release();
  const b = await loadedProof(page, expected(polo));
  if (artifactDir) {
    fs.mkdirSync(artifactDir, { recursive: true });
    await page.getByTestId("snapshot6-full-figure").screenshot({
      path: path.join(
        artifactDir,
        "corrected-burgundy-polo-joggers-full-figure.png",
      ),
    });
    await page.getByTestId("person-portrait").screenshot({
      path: path.join(
        artifactDir,
        "corrected-burgundy-polo-joggers-portrait.png",
      ),
    });
    await page.locator(".people-visual4-scene-preview").screenshot({
      path: path.join(artifactDir, "corrected-burgundy-polo-joggers-scene.png"),
    });
  }
  await expect(character).toHaveAttribute("data-recipe-key", identity!);
  await top.selectOption(family(parka));
  const restoredA = await loadedProof(page, expected(parka));
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).world, key),
  ).toBe(originalAppearance);
  // Separate canonical person, with a separately saved effective wardrobe.
  await personControl.selectOption(personB);
  await configure(page, polo);
  await expect(page.getByTestId(`scene-person-${personB}`)).toHaveAttribute(
    "data-has-art",
    "true",
  );
  await expect(page.getByTestId("person-portrait-character")).toHaveAttribute(
    "data-person-id",
    personB,
  );
  await loadedProof(page, expected(polo));
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await personControl.selectOption(personA);
  await expect(top).toHaveValue(family(parka));
  const personABA = await loadedProof(page, expected(parka));
  await expect(page.getByTestId(`scene-person-${personA}`)).toHaveAttribute(
    "data-has-art",
    "true",
  );
  await expect(page.getByTestId("person-portrait-character")).toHaveAttribute(
    "data-person-id",
    personA,
  );
  await expect(character).toHaveAttribute("data-person-id", personA);
  await expect(character).toHaveAttribute("data-recipe-key", identity!);
  // Rapid selections followed immediately by the real reload button restore B.
  await personControl.selectOption(personB);
  await personControl.selectOption(personA);
  await page
    .getByRole("button", { name: "Reload review", exact: true })
    .click();
  await expect(personControl).toHaveValue(personB);
  await loadedProof(page, expected(polo));
  await personControl.selectOption(personA);
  await loadedProof(page, expected(parka));
  await expect(page.getByTestId("visual4-completeness")).toContainText(
    `top=${parka}`,
  );
  await expect(page.getByTestId("visual4-completeness")).not.toContainText(
    "green-cable-sweater",
  );
  if (artifactDir) {
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(
      path.join(artifactDir, "corrected-saved-outfit-layer-proof.json"),
      JSON.stringify(
        {
          revision: process.env.PEOPLE_SNAPSHOT6_EVIDENCE,
          personA,
          personB,
          identity,
          heldRequests: held,
          a,
          b,
          restoredA,
          personABA,
          acceptance: "Engineering proof; candidate art remains unapproved.",
        },
        null,
        2,
      ) + "\n",
    );
    await page.getByTestId("snapshot6-full-figure").screenshot({
      path: path.join(artifactDir, "corrected-parka-joggers-full-figure.png"),
    });
    await page.getByTestId("person-portrait").screenshot({
      path: path.join(artifactDir, "corrected-parka-joggers-portrait.png"),
    });
    await page.locator(".people-visual4-scene-preview").screenshot({
      path: path.join(artifactDir, "corrected-parka-joggers-scene.png"),
    });
  }
});
