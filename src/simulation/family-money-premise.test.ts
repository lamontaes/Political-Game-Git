import { randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { lifePlaces } from "./life-places";

describe("family money premise", () => {
  it("carries the selected family-money premise through Begin", () => {
    const places = lifePlaces().filter(
      (candidate) => candidate.scope === "locality",
    );
    const place = places[randomInt(places.length)]!;
    const base = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "family-money-premise-proof-49",
      placeKey: place.key,
      startAge: 10,
      givenName: "Alex",
      familyName: "Morgan",
    };
    const ordinaryGame = createNewGameWorld(base);
    const ordinary = ordinaryGame.world;
    const comfortableGame = createNewGameWorld({
      ...base,
      playSettings: {
        ...DEFAULT_NEW_GAME_SETUP.playSettings!,
        premises: {
          ...DEFAULT_NEW_GAME_SETUP.playSettings!.premises,
          familyMoney: "comfortable",
        },
      },
    });
    const comfortable = comfortableGame.world;
    expect(ordinary.playSettings?.premises.familyMoney).toBe("ordinary");
    expect(comfortable.playSettings?.premises.familyMoney).toBe("comfortable");
    expect(ordinary.seed).toBe(comfortable.seed);
    process.stdout.write(
      `${JSON.stringify({ proof: "family-money-premise-input", place: place.key, seed: base.seed, ordinary: ordinary.playSettings?.premises.familyMoney, comfortable: comfortable.playSettings?.premises.familyMoney })}\n`,
    );
  });
});
