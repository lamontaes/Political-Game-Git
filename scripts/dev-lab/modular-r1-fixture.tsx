/** Browser-only correction fixture. Never imported by a player route. */
import React from "react";
import { createRoot } from "react-dom/client";
import { ModularCharacter } from "../../src/player/ModularCharacter";
import { buildCharacterRenderPlan } from "../../src/presentation/character-render-plan";
import {
  ENGINE_PEOPLE29_CHARACTER_LIBRARY as library,
  ENGINE_PEOPLE29_VISUAL_LIBRARY as visuals,
} from "../../src/presentation/engine-people29-review";
import {
  PREPARED_FAMILIES,
  defaultPreparedMaterial,
} from "../../src/presentation/engine-people29-data";
import {
  preparedVariantCacheSize,
  preparedRasterDiagnostics,
  renderPreparedSvg,
} from "../../src/player/engine-people29-svg";
import type { PersonAppearance } from "../../src/simulation/types";
export function mountFixture(host: HTMLElement) {
  const generation = 16;
  const bodies = [...library.components.values()].filter(
    (c) =>
      c.definition.kind === "body" &&
      c.definition.catalog_generation === generation,
  );
  const plans = bodies.flatMap((body) => {
    const family = PREPARED_FAMILIES.find((f) =>
      f.parts.some((p) => p.id === body.assetId),
    )!;
    const heads = [...library.components.values()].filter(
      (c) =>
        c.definition.kind === "head" &&
        c.definition.catalog_generation === generation &&
        c.definition.compatible_body_families?.includes(body.definition.family),
    );
    return heads.slice(0, 2).map((head, index) => {
      const hair = [...library.components.values()].find(
        (c) =>
          c.definition.kind === "hair-front" &&
          c.definition.catalog_generation === generation &&
          c.definition.compatible_body_families?.includes(
            body.definition.family,
          ) &&
          c.definition.compatible_head_families?.includes(
            head.definition.family,
          ),
      )!;
      const appearance: PersonAppearance = {
        seed: `r1-browser-${head.assetId}`,
        recipeVersion: "appearance-recipe-v2",
        catalogGeneration: generation,
        selection: {
          bodyFamily: body.definition.family,
          headFamily: head.definition.family,
          hairFamily: hair.definition.family,
        },
        material: {
          ...defaultPreparedMaterial(family, generation),
          palettes: {
            ...defaultPreparedMaterial(family, generation).palettes,
            skin: index ? "skin-7" : "skin-1",
          },
        },
      };
      return buildCharacterRenderPlan({
        personId: head.assetId,
        appearance,
        library,
        visualLibrary: visuals,
        plate: { width: 200, height: 400 },
        anchor: {
          id: "fixture",
          xPercent: 50,
          yPercent: 50,
          scale: 1,
          poseFamily: "standing-neutral",
          depth: 1,
          bodyWidthPercent: 90,
        },
      });
    });
  });
  if (
    plans.length !== 12 ||
    plans.some((p) => !p.complete || p.layers.length !== 6)
  )
    throw Error("Fixture must resolve twelve actual complete six-layer people");
  const root = createRoot(host);
  const draw = (expression: "neutral" | "smile" = "neutral") =>
    root.render(
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 200px)",
          background: "#eee9df",
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.personId}
            style={{ position: "relative", width: 200, height: 400 }}
          >
            <ModularCharacter plan={plan} expression={expression} />
          </div>
        ))}
      </div>,
    );
  draw();
  return {
    plans,
    draw,
    unmount: () => root.unmount(),
    diagnostics: () => ({
      variants: preparedVariantCacheSize(),
      ...preparedRasterDiagnostics(),
    }),
    async materialFault(kind: "ramp" | "stops" | "map") {
      root.unmount();
      const plan = plans[0]!;
      const head = PREPARED_FAMILIES.flatMap((f) => f.parts).find(
        (p) => p.id === plan.layers.find((l) => l.kind === "head")!.assetId,
      )!;
      const region = head.materials[0]!;
      const old = JSON.parse(JSON.stringify(region));
      if (kind === "ramp") Object.assign(region, { ramps: [] });
      if (kind === "stops")
        region.ramps.forEach((r) => Reflect.deleteProperty(r, "stops"));
      if (kind === "map")
        Object.assign(region, { mapId: "missing-map-fixture" });
      const fault = createRoot(host);
      fault.render(<ModularCharacter plan={plan} />);
      return () => {
        fault.unmount();
        Object.assign(region, old);
        if (!("mapId" in old)) Reflect.deleteProperty(region, "mapId");
      };
    },
    async corrective() {
      const plan = plans[0]!;
      const body = plan.layers.find((l) => l.kind === "body")!;
      const family = PREPARED_FAMILIES.find(
        (f) => f.id === plan.material!.familyId,
      )!;
      const long = family.parts.find(
        (p) => p.introducedGeneration === 16 && p.anatomyOverride?.length,
      )!;
      if (!long) throw Error("No long sleeve corrective");
      const standalone = await renderPreparedSvg(body.assetId, plan.material!, [
        body.assetId,
      ]);
      const corrected = await renderPreparedSvg(body.assetId, plan.material!, [
        body.assetId,
        long.id,
      ]);
      if (standalone === corrected)
        throw Error("Anatomy override did not change rendered body");
      return {
        body: body.assetId,
        corrective: long.anatomyOverride,
        changed: true,
      };
    },
  };
}

export async function rasterRoundTrip() {
  // Authored four-pixel test PNG, with known unassociated RGB and alpha.
  const uri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAYAAAD5PA/NAAAAGUlEQVR4nGM4rugrKHjatkHRMfH/81RTBgAzLwYjdpI9zwAAAABJRU5ErkJggg==";
  const image = new Image();
  image.src = uri;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const decoded = ctx.getImageData(0, 0, 4, 1);
  ctx.putImageData(decoded, 0, 0);
  const result = new Image();
  result.src = canvas.toDataURL("image/png");
  await result.decode();
  ctx.clearRect(0, 0, 4, 1);
  ctx.drawImage(result, 0, 0);
  return {
    input: [
      [199, 33, 77, 17],
      [17, 203, 61, 128],
      [33, 65, 97, 255],
      [231, 101, 53, 0],
    ],
    decoded: Array.from(decoded.data),
    roundTrip: Array.from(ctx.getImageData(0, 0, 4, 1).data),
    limits:
      "PNG/canvas uses premultiplied alpha; transparent hidden RGB is discarded and semitransparent RGB quantizes. Opaque excluded RGB and alpha are checked exactly.",
  };
}
