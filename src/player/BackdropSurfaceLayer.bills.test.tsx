import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BackdropSurface } from "../presentation/backdrop-surfaces";
import type { EntityId } from "../simulation";
import { BackdropSurfaceFaces } from "./BackdropSurfaceLayer";

const css = readFileSync("src/player/BackdropSurfaceLayer.css", "utf8");

describe("filed bills on the office's painted green sheet", () => {
  it("uses the painted sheet behind recorded bills without a white overlay", () => {
    const surface: BackdropSurface = {
      slot: {
        id: "office-green-poster",
        kind: "poster",
        finish: "panel",
        what: "green sheet pinned to the office corkboard",
        quad: [
          [0, 0],
          [120, 0],
          [120, 90],
          [0, 90],
        ],
        perspective: false,
        shows: ["bills"],
      },
      content: {
        kind: "bills",
        place: "Recorded City",
        bills: [
          {
            id: "measure-bg57-test-1" as EntityId,
            designation: "ORD 17",
            title: "Recorded measure title",
          },
        ],
      },
    };

    const html = renderToStaticMarkup(
      <BackdropSurfaceFaces
        surfaces={[surface]}
        variant="midday"
        rect={{ left: 0, top: 0, width: 1672, height: 941 }}
      />,
    );

    expect(html).toContain('data-surface-id="office-green-poster"');
    expect(html).toContain("bs-sheet--office-green-bills");
    expect(html).not.toContain("Bills filed");
    expect(html).toContain("Recorded City");
    expect(html).toContain("ORD 17");
    expect(html).toContain("Recorded measure title");
    expect(css).toContain(".bs-sheet--office-green-bills");
    expect(css).toContain("background: transparent;");
    expect(css).toContain("border: 0;");
  });
});
