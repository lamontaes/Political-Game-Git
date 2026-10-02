import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { pickDistinct, SeededRng } from "../simulation/rng";
import { serializeWorld } from "../simulation/serialization";
import { PressWorkspace } from "./PressWorkspace";

const seed = "team3-a153-unavailable-workspace-all56";
const places = pickDistinct(new SeededRng(seed), lifePlaceStateIdentities(), 5);

describe("the press workspace without recorded reporters", () => {
  it.each(places)(
    "shows the unavailable message without a creation action in $jurisdictionKey",
    (place) => {
      const { world } = smallWorld({
        place: place.jurisdictionKey,
        seed: `${seed}:${place.jurisdictionKey}`,
      });
      const before = serializeWorld(world);
      const html = renderToStaticMarkup(
        <PressWorkspace
          world={world}
          onWorldChange={() => {}}
          onOpenPerson={() => {}}
        />,
      );
      expect(html).toContain(
        "No current journalism role is recorded in this life.",
      );
      expect(html).not.toContain("press-seek-reporter");
      expect(html).toContain("press-request-form");
      expect(serializeWorld(world)).toBe(before);
    },
  );
});
