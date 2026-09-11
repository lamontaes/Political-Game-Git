import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  generateOpeningLife,
  moveOpeningLife,
  prepareOpeningLife,
  projectOpeningLife,
  restoreOpeningLife,
} from "./opening-life";
import {
  establishOpeningOfficeholders,
  openingOfficeholders,
} from "./opening-officeholders";

const setup = { ...DEFAULT_NEW_GAME_SETUP, seed: "opening-proof" };
describe("OPENING-LIFE1 opening lifecycle", () => {
  it.each([5, 7, 12, 17, 18, 34, 70])(
    "keeps generation and read paths separate at age %i",
    (startAge) => {
      const prepared = prepareOpeningLife({ ...setup, startAge });
      expect(prepared.game).toBeNull();
      const generated = generateOpeningLife(prepared);
      const { world, playerPersonId } = generated.game!;
      assertWorldIntegrity(world);
      const before = serializeWorld(world);
      expect(generateOpeningLife(generated)).toBe(generated);
      expect(establishOpeningOfficeholders(world, playerPersonId)).toBe(world);
      const view = projectOpeningLife(world, playerPersonId);
      expect(view.age).toBe(startAge);
      expect(view.name).toBeTruthy();
      expect(view.date).toBe(world.currentDate);
      expect(view.officeholders).toHaveLength(2);
      expect(
        new Set(view.officeholders.map((holder) => holder.personId)).size,
      ).toBe(2);
      for (const holder of view.officeholders) {
        expect(world.people[holder.personId]).toBeDefined();
        expect(
          world.history.events.find((event) => event.id === holder.termId)
            ?.involvedEntityIds,
        ).toContain(holder.organizationId);
      }
      const skipped = moveOpeningLife(generated, "skip");
      expect(skipped.phase).toBe("play");
      const back = moveOpeningLife(skipped, "back");
      expect(back.phase).toBe("household");
      expect(back.game!.world).toBe(world);
      expect(serializeWorld(world)).toBe(before);
      const restored = restoreOpeningLife(back, deserializeWorld(before));
      expect(projectOpeningLife(restored.game!.world, playerPersonId)).toEqual(
        view,
      );
      expect(openingOfficeholders(restored.game!.world)).toEqual(
        view.officeholders,
      );
    },
  );
});
