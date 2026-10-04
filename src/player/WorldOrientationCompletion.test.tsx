import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OrientationView } from "../presentation/world-orientation";
import { WorldOrientationPanel } from "./WorldOrientationPanel";

const steps: OrientationView["steps"] = ["executive", "state"].map((key) => ({
  key: key as "executive" | "state",
  title: key,
  summary: "",
  people: [],
  chambers: [],
}));
function render(mode: "first" | "revisit", finalOnly = false) {
  return renderToStaticMarkup(
    <WorldOrientationPanel
      view={{
        dateLabel: "January 5, 2026",
        steps: finalOnly ? steps.slice(0, 1) : steps,
      }}
      homeStateUsps={null}
      mode={mode}
      onClose={() => {}}
      onPause={() => {}}
      onOpenPerson={() => {}}
    />,
  );
}

describe("first intro completion controls", () => {
  it("offers navigation without Skip or Close before the final card", () => {
    const html = render("first");
    expect(html).toContain('data-testid="orientation-next"');
    expect(html).not.toContain('data-testid="orientation-skip"');
    expect(html).not.toContain(">Begin</button>");
  });
  it("only labels the final first-intro action Begin", () => {
    expect(render("first", true)).toContain(">Begin</button>");
    expect(render("revisit", true)).toContain(">Close</button>");
  });
  it("retains the reopened reader's early Close", () => {
    expect(render("revisit")).toContain('data-testid="orientation-skip"');
    expect(render("revisit")).toContain(">Close</button>");
  });
});
