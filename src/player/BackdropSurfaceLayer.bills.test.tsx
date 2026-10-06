import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BackdropSurface } from "../presentation/backdrop-surfaces";
import type { EntityId } from "../simulation";
import { BackdropSurfaceFaces } from "./BackdropSurfaceLayer";
import billSurfaceCss from "./BackdropSurfaceLayer.css?raw";

const officeBillSurface: BackdropSurface = {
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
    heading: "Bills filed",
    place: "Example City",
    bills: [
      {
        id: "measure_bg57_example" as EntityId,
        designation: "ORD 17",
        title: "Street lighting improvements",
      },
    ],
  },
};

describe("filed bills on the office's painted green sheet", () => {
  it("prints the live bill list on the green paper without a second white card", () => {
    const html = renderToStaticMarkup(
      <BackdropSurfaceFaces
        surfaces={[officeBillSurface]}
        variant="midday"
        rect={{ left: 0, top: 0, width: 1672, height: 941 }}
      />,
    );

    expect(html).toContain('data-surface-id="office-green-poster"');
    expect(html).toContain('class="bs-sheet bs-sheet--panel"');
    expect(html).toContain("Bills filed");
    expect(html).toContain("Example City");
    expect(html).toContain("ORD 17");
    expect(html).toContain("Street lighting improvements");

    const greenPaperStyle =
      '.backdrop-surface[data-surface-id="office-green-poster"] .bs-sheet';
    expect(billSurfaceCss).toContain(greenPaperStyle);
    expect(billSurfaceCss).toContain("background: transparent;");
    expect(billSurfaceCss).toContain("border: 0;");
  });
});
