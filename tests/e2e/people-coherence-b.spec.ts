import { writeFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { startLife, enterLife, saveLife } from "./support/creator";

test.use({ video: "on" });

async function captureRoom(page: Page, path: string) {
  const figures = await page.locator(".scene-person-token").evaluateAll((es) =>
    es.map((e) => ({
      attributes: Object.fromEntries(
        Array.from(e.attributes).map((a) => [a.name, a.value]),
      ),
      rect: e.getBoundingClientRect().toJSON(),
      layers: Array.from(e.querySelectorAll("img")).map((i) => ({
        src: i.getAttribute("src"),
        style: i.getAttribute("style"),
        rect: i.getBoundingClientRect().toJSON(),
      })),
    })),
  );
  writeFileSync(path, JSON.stringify(figures, null, 2));
  return figures;
}
async function openOwnWardrobe(page: Page) {
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("nav-personal-group").click();
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("personal-appearance").click();
  const controls = page.getByTestId("saved-appearance-controls");
  await controls.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("wardrobe-full-body")).toBeVisible();
}
const layerIds = async (page: Page) =>
  page
    .getByTestId("wardrobe-full-body")
    .locator("img")
    .evaluateAll((es) =>
      es.map((e) => ({ id: e.dataset.assetId, kind: e.dataset.kind })),
    );

// The first case repeats the original exact custom household, without injected residents.
test("same Haley room composition after neckline repair", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.goto("/?seed=morning23-b-play&art-preview=candidate");
  await startLife(page, {
    age: 34,
    household: "shares-a-home",
    givenName: "Coherence",
    familyName: "Review",
  });
  await enterLife(page);
  const p = page.locator(".scene-person-token").first();
  await expect(p).toHaveAttribute(
    "data-testid",
    "scene-person-person_5e116c245562a11a",
  );
  await expect(p.locator("img[src*=neckline_v1]")).toHaveCount(1);
  await expect(
    p.locator("img[src*=wave_a_skinny_man_standing_neutral_front_a]"),
  ).toHaveCount(2);
  await expect(
    p.locator("img[src*=pv4_ocd_head_adult_light_oval_young_v1]"),
  ).toHaveCount(1);
  await expect(
    p.locator("img[src*=pv4_hair_20_light_oval_young_v1_front]"),
  ).toHaveCount(1);
  await page.screenshot({ path: info.outputPath("room-after.png") });
  await p.screenshot({ path: info.outputPath("person-after.png") });
  await captureRoom(page, info.outputPath("room-transforms.json"));
});

for (const seed of [
  "coherence-normal-0",
  "coherence-normal-1",
  "coherence-normal-2",
  "coherence-normal-3",
  "coherence-normal-4",
])
  test(`disclosed normal generation ${seed}`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.goto(`/?seed=${seed}&art-preview=candidate`);
    await startLife(page, {
      age: 34,
      givenName: "Normal",
      familyName: "Review",
    });
    await enterLife(page);
    // Solo homes remain solo. Record all supported/unsupported people; never inject a cast.
    const figures = await captureRoom(
      page,
      info.outputPath("room-transforms.json"),
    );
    await page.screenshot({ path: info.outputPath("normal-room.png") });
    writeFileSync(
      info.outputPath("presence.json"),
      JSON.stringify({ seed, figures: figures.length }, null, 2),
    );
  });

for (const body of ["average-man", "skinny-man"])
  test(`controlled wardrobe ${body}: identity preserved through real swaps`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.goto("/?seed=coherence-wardrobe&art-preview=candidate");
    await startLife(page, {
      age: 34,
      household: "shares-a-home",
      givenName: "Wardrobe",
      familyName: "Review",
    });
    await enterLife(page);
    await openOwnWardrobe(page);
    // Disclosed authoring diagnostic: select the supported starting body once BEFORE
    // recording identity. Clothing changes below never select another face/body/hair.
    await page
      .getByRole("combobox", { name: "Body", exact: true })
      .selectOption(`wave-a-${body}-standing-neutral-front-a-v1-pv4`);
    const top = page.getByRole("combobox", { name: "top", exact: true });
    await top.selectOption("pv4-wave-a-male-top-burgundy-long-sleeve-polo-v1");
    const start = await layerIds(page);
    const identity = start.filter((c) =>
      ["body", "head", "hair-front", "hair-back"].includes(c.kind!),
    );
    await page
      .getByTestId("wardrobe-figure")
      .screenshot({ path: info.outputPath("polo.png") });
    // Native control change; keyboard-only selection remains a separate failed proof.
    await top.selectOption("pv4-wave-a-male-top-white-button-up-shirt-v1");
    await expect(top).toHaveValue(
      "pv4-wave-a-male-top-white-button-up-shirt-v1",
    );
    await page
      .getByTestId("wardrobe-figure")
      .screenshot({ path: info.outputPath("button-up.png") });
    const afterTop = await layerIds(page);
    expect(
      afterTop.filter((c) =>
        ["body", "head", "hair-front", "hair-back"].includes(c.kind!),
      ),
    ).toEqual(identity);
    expect(afterTop.find((c) => c.kind === "top")!.id).not.toBe(
      start.find((c) => c.kind === "top")!.id,
    );
    const bottom = page.getByRole("combobox", { name: "bottom", exact: true });
    const options = await bottom
      .locator("option")
      .evaluateAll((es) =>
        es.map((e) => (e as HTMLOptionElement).value).filter(Boolean),
      );
    if (body === "average-man") {
      await bottom.selectOption("pv4-wave-a-male-bottom-khaki-shorts-v1");
      const shorts = await layerIds(page);
      await page
        .getByTestId("wardrobe-figure")
        .screenshot({ path: info.outputPath("shorts.png") });
      await bottom.selectOption(
        "pv4-wave-a-male-bottom-blue-straight-jeans-v1",
      );
      const jeans = await layerIds(page);
      expect(jeans.find((c) => c.kind === "bottom")!.id).not.toBe(
        shorts.find((c) => c.kind === "bottom")!.id,
      );
      expect(
        jeans.filter((c) =>
          ["body", "head", "hair-front", "hair-back"].includes(c.kind!),
        ),
      ).toEqual(identity);
      await page
        .getByTestId("wardrobe-figure")
        .screenshot({ path: info.outputPath("jeans.png") });
    } else {
      expect(options.filter((v) => v.includes("bottom"))).toEqual([
        "pv4-wave-a-male-bottom-khaki-shorts-v1",
      ]);
      writeFileSync(
        info.outputPath("bottom-limit.json"),
        JSON.stringify(
          {
            body,
            options,
            limitation:
              "Only khaki shorts fitted. No second bottom claim or threshold relaxation.",
          },
          null,
          2,
        ),
      );
    }
    const final = await layerIds(page);
    await saveLife(page);
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await openOwnWardrobe(page);
    expect(await layerIds(page)).toEqual(final);
    await expect(page.getByTestId("wardrobe-full-body")).toHaveAttribute(
      "data-catalog-generation",
      "3",
    );
    await page
      .getByTestId("wardrobe-figure")
      .screenshot({ path: info.outputPath("reload.png") });
    writeFileSync(
      info.outputPath("identity.json"),
      JSON.stringify({ body, identity, start, afterTop, final }, null, 2),
    );
  });
