import "../simulation";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createDemoWorld } from "../simulation";
import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
} from "../simulation/life-places";
import {
  createEconomicContextBrowserProvider,
  type BrowserEconomicGeographyBinding,
} from "../presentation/economic-context-browser";
import { LEXINGTON_ECONOMIC_BINDING } from "../../tests/fixtures/economic-binding";

const captured = vi.hoisted(() => ({
  binding: null as BrowserEconomicGeographyBinding | null,
}));
vi.mock("./EconomicContextPanel", () => ({
  EconomicContextPanel: ({
    binding,
  }: {
    binding: BrowserEconomicGeographyBinding;
  }) => {
    captured.binding = binding;
    return createElement("div", { "data-testid": "bound-economic-context" });
  },
}));
import { PersonalFinancesWorkspace } from "./ShellWorkspaces";

describe("Personal finances for a retained hometown", () => {
  it("passes the reviewed canonical crosswalk to the real economic provider without changing home identity", async () => {
    const world = createDemoWorld();
    const person = Object.values(world.people).find((person) => {
      const home = person.homeJurisdictionId;
      return (
        home && lifePlaceByJurisdictionId(home)?.key === "lexington-fayette"
      );
    });
    expect(person).toBeDefined();
    const before = JSON.stringify(world);
    expect(lifePlaceByKey("lexington-fayette")).toBeNull();
    const html = renderToStaticMarkup(
      createElement(PersonalFinancesWorkspace, { world, personId: person!.id }),
    );
    expect(html).toContain('data-testid="bound-economic-context"');
    expect(html).not.toContain('data-testid="economic-context-unavailable"');
    expect(captured.binding).toEqual(LEXINGTON_ECONOMIC_BINDING);
    const provider = createEconomicContextBrowserProvider({
      fetchJson: async (url) =>
        JSON.parse(
          readFileSync(
            resolve(
              import.meta.dirname,
              "../../public",
              url.replace(/^\//, ""),
            ),
            "utf8",
          ),
        ) as unknown,
    });
    const context = await provider.query(captured.binding!, "2026-09-09");
    expect(JSON.stringify(context)).toContain("30460");
    expect(JSON.stringify(context)).toContain("2106799999");
    expect(JSON.stringify(world)).toBe(before);
  });
});
