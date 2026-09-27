import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  legislativeScenarioKeys,
} from "../simulation/legislation-scenarios";
import { MeasureSurface } from "./ShellWorkspaces";

describe("a measure's opinion trend", () => {
  it("does not turn legislative votes into a public approval line", () => {
    const scenario = createLegislativeScenario(legislativeScenarioKeys()[0]!);
    const before = JSON.stringify(scenario.world);
    const html = renderToStaticMarkup(
      <MeasureSurface
        world={scenario.world}
        personId={scenario.playerPersonId}
        measureId={scenario.measureId}
      />,
    );
    expect(html).toContain('data-testid="measure-detail"');
    expect(html).toContain('data-testid="measure-opinion-series-unavailable"');
    expect(html).toContain("No aggregate, dated public opinion series");
    expect(html).not.toContain('data-graph-kind="line"');
    expect(JSON.stringify(scenario.world)).toBe(before);
  });
});
