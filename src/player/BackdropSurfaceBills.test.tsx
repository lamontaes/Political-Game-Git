import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BackdropSurface } from "../presentation/backdrop-surfaces";
import { BackdropSurfaceFaces } from "./BackdropSurfaceLayer";

describe("record content on painted bill surfaces", () => {
  it("renders recorded bill fields without a fixed heading", () => {
    const surface: BackdropSurface = {
      slot: {
        id: "office-corkboard",
        kind: "board",
        finish: "cork",
        what: "cork board",
        quad: [
          [0, 0],
          [300, 0],
          [300, 200],
          [0, 200],
        ],
        perspective: false,
        shows: ["bills"],
      },
      content: {
        kind: "bills",
        place: "Recorded Town",
        bills: [
          {
            id: "bill-record-1",
            designation: "ORD 12-34",
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

    expect(html).not.toContain("Bills filed");
    expect(html).toContain("Recorded Town");
    expect(html).toContain("ORD 12-34");
    expect(html).toContain("Recorded measure title");
  });
});
