import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { TransitWorkspace } from "./TransitWorkspace";

const places = lifePlaceStateIdentities();

describe("the same Transit workspace across all state jurisdictions", () => {
  it("uses the complete 56-place identity set", () => {
    expect(places).toHaveLength(56);
    expect(new Set(places.map((place) => place.jurisdictionKey)).size).toBe(56);
  });

  it.each(places)("renders the shared screen for $jurisdictionKey", (place) => {
    const { world, personId } = smallWorld({
      place: place.jurisdictionKey,
      seed: `mr12-transit-screen:${place.jurisdictionKey}`,
    });
    const html = renderToStaticMarkup(
      <TransitWorkspace
        world={world}
        personId={personId}
        onWorldChange={() => {}}
        onOpenBill={() => {}}
      />,
    );

    expect(html).toContain('class="transit-workspace"');
    expect(html).toContain('data-testid="transit-none"');
    expect(html).not.toContain("Propose added service");
    expect(html).not.toContain("Service period");
    expect(html).not.toContain("Total amount provided (USD)");
    expect(html).not.toContain("Contract records and reports");
  });
});
