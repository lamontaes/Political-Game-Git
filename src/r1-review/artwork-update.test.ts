import { describe, it, expect } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "../presentation/engine-people29-review";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  proposeCorrectedGeneration,
  commitCorrectedGeneration,
  commitCompleteOutfit,
  findCompleteOutfit,
} from "../presentation/complete-outfit";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import {
  preparedFamily,
  defaultPreparedMaterial,
} from "../presentation/engine-people29-data";
const poseFamily = "standing-neutral";
describe.skipIf(library.catalogGeneration < 16)(
  "explicit corrected artwork consent",
  () => {
    it("preview and Cancel preserve the original; Apply pins only the compatible controlled identity and saved rollback remains exact", () => {
      let world = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "r1-migration",
        startAge: 30,
        appearanceCatalogGeneration: 15,
      }).world;
      if (world.control.kind !== "person") throw Error("fixture control");
      const id = world.control.personId;
      const saved = world.people[id]!.appearance!;
      const appearance = {
        ...saved,
        selection: {
          bodyFamily: "ep41-masc-average-body",
          headFamily: "m47-head-rowan",
          hairFamily: null,
        },
        material: defaultPreparedMaterial(
          preparedFamily("ep41-masc-average-body")!,
          15,
        ),
      };
      // Use an actual installed logical family, not an invented fixture identity.
      appearance.selection.headFamily = [...library.components.values()].find(
        (c) =>
          c.definition.kind === "head" &&
          c.definition.catalog_generation === 15 &&
          c.definition.compatible_body_families?.includes(
            appearance.selection.bodyFamily,
          ),
      )!.definition.family;
      const outfit = findCompleteOutfit({ appearance, library, poseFamily });
      expect(outfit.ok).toBe(true);
      if (!outfit.ok) throw Error(outfit.message);
      world = commitCompleteOutfit(world, id, appearance, {
        library,
        poseFamily,
        families: outfit.families,
      });
      const before = serializeWorld(world);
      const proposal = proposeCorrectedGeneration(
        world.people[id]!.appearance!,
        16,
        library,
        poseFamily,
      );
      expect(proposal.ok).toBe(true);
      expect(serializeWorld(world)).toBe(before);
      if (!proposal.appearance) throw Error("no proposal");
      expect(proposal.appearance.selection).toEqual(appearance.selection);
      expect(() =>
        commitCorrectedGeneration(
          world,
          id,
          { ...proposal.appearance!, seed: "changed" },
          { library, poseFamily },
        ),
      ).toThrow(/identity/);
      expect(
        proposeCorrectedGeneration(appearance, 17, library, poseFamily).ok,
      ).toBe(false);
      expect(serializeWorld(world)).toBe(before); // Cancel is discarding the proposal.
      const committed = commitCorrectedGeneration(
        world,
        id,
        proposal.appearance,
        { library, poseFamily },
      );
      expect(committed.people[id]!.appearance!.catalogGeneration).toBe(16);
      expect(committed.people[id]!.appearance!.selection).toEqual(
        appearance.selection,
      );
      expect(
        deserializeWorld(serializeWorld(committed)).people[id]!.appearance,
      ).toEqual(committed.people[id]!.appearance);
      expect(deserializeWorld(before).people[id]!.appearance).toEqual(
        world.people[id]!.appearance,
      );
      for (const other of world.personOrder.filter((x) => x !== id))
        expect(committed.people[other]).toBe(world.people[other]);
    });
  },
);
