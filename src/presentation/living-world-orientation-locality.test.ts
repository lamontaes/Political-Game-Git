import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import { homeLocalGovernmentStatus } from "../simulation";
import { projectWorldOrientation } from "./living-world-orientation";

function fixture(key: string) {
  const place = requireLifePlace(key);
  const world = createScenarioWorld(
    `locality-resident-name:${key}`,
    place.context,
    { peopleCount: 4 },
  );
  const id = place.context.jurisdiction.id;
  // Exercise formal names already present in the source directory. The
  // actual saved parent stays attached; game code never guesses it.
  return {
    world: {
      ...world,
      jurisdictions: {
        ...world.jurisdictions,
        [id]: {
          ...world.jurisdictions[id]!,
          name: place.formalName ?? place.context.jurisdiction.name,
        },
      },
    },
    id,
  };
}

describe("orientation locality names from actual jurisdiction parents", () => {
  it.each([
    ["2146027", "Lexington"],
    ["4752006", "Nashville"],
    ["5645050", "Laramie"],
  ])(
    "uses the resident name for %s while preserving formal records",
    (key, expected) => {
      const { world, id } = fixture(key);
      const personId = world.personOrder[0]!;
      const before = JSON.stringify(world);
      const governmentNames = homeLocalGovernmentStatus(
        world,
        personId,
      ).governments.map((g) => g.name);
      const view = projectWorldOrientation(world, personId);
      expect(view.locality?.name).toBe(expected);
      expect(view.locality?.jurisdictionId).toBe(id);
      expect(view.locality?.governments.map((g) => g.name)).toEqual(
        governmentNames,
      );
      expect(JSON.stringify(world)).toBe(before);
    },
  );

  it("does not infer a parent for an unknown-parent jurisdiction", () => {
    const { world, id } = fixture("2146027");
    const unknownParent = {
      ...world,
      jurisdictions: {
        ...world.jurisdictions,
        [id]: { ...world.jurisdictions[id]!, parentName: null },
      },
    };
    expect(
      projectWorldOrientation(unknownParent, world.personOrder[0]!).locality
        ?.name,
    ).toBe(world.jurisdictions[id]!.name);
  });

  it("keeps an absent jurisdiction name unknown without inventing a place", () => {
    const { world, id } = fixture("5645050");
    const missing = {
      ...world,
      jurisdictions: Object.fromEntries(
        Object.entries(world.jurisdictions).filter(([key]) => key !== id),
      ),
    };
    expect(
      projectWorldOrientation(missing, world.personOrder[0]!).locality,
    ).toMatchObject({ jurisdictionId: id, name: null });
  });
});
