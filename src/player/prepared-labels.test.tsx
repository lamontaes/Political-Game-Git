import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { PersonAppearance } from "../simulation/types";
vi.mock("../presentation/engine-people29-data", () => {
  const part = (id: string, label?: string) => ({
    id,
    label,
    materials: [],
    features: [
      {
        id: "eyes-internal-code-847",
        parameters: { x: [-1, 1], y: [0, 0], scaleX: [1, 1], scaleY: [1, 1] },
      },
    ],
  });
  const parts = [
    part("private-feature-a", "Soft round eyes"),
    part("private-feature-b"),
  ];
  return {
    PREPARED_SKIN_RAMPS: [],
    preparedFamily: () => ({ parts }),
    preparedPartsAt: () => parts,
    preparedRampsAt: () => [],
  };
});
import { PreparedAppearanceControls } from "./PreparedAppearanceControls";
function render(variant: string) {
  return renderToStaticMarkup(
    <PreparedAppearanceControls
      appearance={
        {
          selection: { bodyFamily: "fixture" },
          material: {
            palettes: {},
            features: { eyes: { variant, x: 0, y: 0, scaleX: 1, scaleY: 1 } },
          },
        } as unknown as PersonAppearance
      }
      onChange={() => {}}
    />,
  );
}
it("uses an authored feature label instead of un-slugging its internal feature id", () => {
  const html = render("private-feature-a");
  expect(html).toContain("Soft round eyes");
  expect(html).not.toContain("internal code 847");
});
it("uses a contextual numbered choice when a feature has no authored label", () => {
  const html = render("private-feature-b");
  expect(html).toContain("Eyes choice 2");
  expect(html).not.toContain("internal code 847");
});
