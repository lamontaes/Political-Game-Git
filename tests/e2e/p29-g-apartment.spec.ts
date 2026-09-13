import { writeFileSync } from "node:fs";
import { test, expect } from "./fixtures";
import { startLife, enterLife } from "./support/creator";

for (const room of [
  {
    seed: "people-fresh-1",
    id: "residence-apartment-living-canonical-03",
    floor: 0.92,
    margin: 40,
    cap: 0.55,
  },
  {
    seed: "people-fresh-2",
    id: "residence-apartment-living-ordinary-02",
    floor: 0.95,
    margin: 28,
    cap: 0.75,
  },
])
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1200, height: 720 },
  ])
    test(`apartment ${room.id} on ordinary controls at ${viewport.width}`, async ({
      page,
    }, info) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?seed=${room.seed}&art-preview=candidate`);
      await startLife(page, { age: 34, household: "shares-a-home" });
      await enterLife(page);
      await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
        "data-has-plate",
        "true",
      );
      await expect(
        page.locator('[data-testid^="scene-person-"][data-has-art="true"]'),
      ).toHaveCount(1);
      await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
        "data-scene-id",
        room.id,
      );
      await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
        "data-headroom",
        "0",
      );
      const token = page.locator(
        '[data-testid^="scene-person-"][data-has-art="true"]',
      );
      await expect(token).toHaveAttribute("data-art-diagnostics", "");
      await expect(token).toHaveAttribute("data-occlusion-count", "0");
      const bounds = await token.boundingBox();
      expect(bounds!.y).toBeGreaterThan(28);
      expect(bounds!.y + bounds!.height).toBeLessThan(
        viewport.height - room.margin,
      );
      expect(bounds!.height / viewport.height).toBeLessThan(room.cap);
      const geometry = await token.locator("img").evaluateAll((images) =>
        images.map((image) => {
          const i = image as HTMLImageElement;
          const r = i.getBoundingClientRect();
          return {
            body: /wave_a_.*standing_neutral.*pv4/.test(i.src),
            ratio: r.width / r.height,
            nativeRatio: i.naturalWidth / i.naturalHeight,
            top: r.top,
            bottom: r.bottom,
          };
        }),
      );
      expect(geometry.some((layer) => layer.body)).toBe(true);
      for (const layer of geometry) {
        // Garments retain B's authored attachment transforms. The body canvas
        // and the scene camera must preserve the full person's aspect ratio.
        if (layer.body)
          expect(Math.abs(layer.ratio - layer.nativeRatio)).toBeLessThan(0.002);
        expect(layer.top).toBeGreaterThan(28);
        expect(layer.bottom).toBeLessThan(viewport.height - room.margin);
      }
      // Each scene's own foreground contact is declared in plate coordinates; the unchanged covering camera
      // maps it to y92% at these two aspect ratios, once for room and figure.
      expect(
        Math.abs(bounds!.y + bounds!.height - viewport.height * room.floor),
      ).toBeLessThan(2);
      const records = await page
        .getByTestId("scene-backdrop")
        .evaluate((el) => ({
          scene: el.getAttribute("data-scene-id"),
          camera: el
            .querySelector('[data-testid="scene-backdrop-camera"]')
            ?.getAttribute("style"),
          people: Array.from(
            el.querySelectorAll('[data-testid^="scene-person-"]'),
          ).map((p) => ({
            id: p.getAttribute("data-testid"),
            diagnostics: p.getAttribute("data-art-diagnostics"),
            box: p.getBoundingClientRect().toJSON(),
            layers: Array.from(p.querySelectorAll("img")).map((i) => ({
              src: i.getAttribute("src"),
              box: i.getBoundingClientRect().toJSON(),
            })),
          })),
        }));
      writeFileSync(
        info.outputPath("geometry.json"),
        JSON.stringify(records, null, 2),
      );
      await page.screenshot({ path: info.outputPath("apartment.png") });
      if (viewport.width === 1440) await token.click();
      else {
        await token.focus();
        await page.keyboard.press("Space");
      }
      await expect(page.getByTestId("person-action-menu")).toBeVisible();
      await expect(token).toHaveAttribute("aria-expanded", "true");
    });

for (const room of ["apartment", "apartment02"])
  test(`apartment ${room} furniture silhouette masks the rear depth control only`, async ({
    page,
  }, info) => {
    await page.goto(`/tests/e2e/support/scene-depth.html?scene=${room}`);
    await page.getByRole("button", { name: "Toggle depth control" }).focus();
    await page.keyboard.press("Space");
    const rear = page.getByTestId("scene-person-depth-control");
    await expect(rear).toHaveAttribute("data-occlusion-count", "3");
    await expect(rear).toBeVisible();
    await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
      "data-has-plate",
      "true",
    );
    await page.screenshot({
      path: info.outputPath("apartment-rear-depth-control.png"),
    });
  });
