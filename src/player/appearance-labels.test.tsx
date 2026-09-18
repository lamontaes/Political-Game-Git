import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  appearanceFamilyLabel,
  PersonAppearanceControls,
} from "./PersonAppearanceControls";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "../presentation/engine-people29-review";
import {
  generatedPreparedMaterial,
  preparedFamily,
} from "../presentation/engine-people29-data";
import type { World, PersonAppearance } from "../simulation/types";

it("never reconstructs a visible label from an unknown catalog id", () => {
  for (const id of [
    "m47-face-new-private-id",
    "ep41-fem-lean-unknown-973",
    "pv4_wave_a_unknown_v99",
  ]) {
    expect(appearanceFamilyLabel(id)).toBe("Appearance choice");
    expect(appearanceFamilyLabel(id, "Face choice 7")).toBe("Face choice 7");
  }
});
const installed = library.catalogGeneration >= 16;
if (process.env.MODULAR_REQUIRE_PRIVATE === "1" && !installed)
  throw new Error(
    "D16 installed control test requires the matching generation-16 pack",
  );
describe.skipIf(!installed)(
  "D16 actual installed native appearance controls",
  () => {
    it("prefers authored part names over identifier-derived caller labels", () => {
      expect(appearanceFamilyLabel("m47-face-ellis", "M47 face ellis")).toBe(
        "Long mature face",
      );
      expect(
        appearanceFamilyLabel("m47-hair-coily-crop", "M47 hair coily crop"),
      ).toBe("Coily crop");
    });
    it("names every actual face/hair/skin input and keeps its native checked state", () => {
      const bodyFamily = "ep41-masc-lean-body";
      const appearance: PersonAppearance = {
        seed: "d16-real-controls",
        recipeVersion: "appearance-recipe-v2",
        catalogGeneration: 16,
        selection: {
          bodyFamily,
          headFamily: "m47-face-ellis",
          hairFamily: "m47-hair-coily-crop",
        },
        material: generatedPreparedMaterial(
          preparedFamily(bodyFamily)!,
          "d16-real-controls",
          16,
        ),
      };
      const world = {
        people: { subject: { id: "subject", appearance } },
        control: { kind: "person", personId: "subject" },
      } as unknown as World;
      const markup = renderToStaticMarkup(
        <PersonAppearanceControls
          world={world}
          personId="subject"
          library={library}
          poseFamily="standing-neutral"
          familyLabels={{ "m47-face-ellis": "M47 face ellis" }}
          onWorldChange={() => {}}
          onPreferenceChange={() => {}}
        />,
      );
      const inputs = markup.match(/<input\b[^>]*type="radio"[^>]*>/g) ?? [];
      expect(inputs.length).toBeGreaterThanOrEqual(16);
      expect(inputs.filter((input) => /checked=""/.test(input))).toHaveLength(
        3,
      );
      for (const input of inputs) {
        const name = input.match(/aria-label="([^"]+)"/)?.[1];
        expect(name).toBeTruthy();
        expect(name).not.toMatch(/m47|ep41|skin-\d|coily-crop/);
      }
      expect(markup).toContain('aria-label="Long mature face"');
      expect(markup).toContain('aria-label="Coily crop"');
      expect(markup).toContain('aria-label="No hair"');
      expect(markup).not.toContain(">M47 face ellis<");
    });
  },
);
