import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  judicialCandidateEvidence,
  judicialCandidatesWithProfessionalRecord,
} from "./candidates";

describe("saved judicial candidate evidence", () => {
  it("offers named opening judges with their own career record and unknown view", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "judicial-candidate-records",
      }),
    ).game!;
    const world = game.world;
    const candidates = judicialCandidatesWithProfessionalRecord(world);
    expect(candidates).toHaveLength(1337);
    const judge = candidates[0]!;
    expect(judge.name).toBeTruthy();
    expect(judge.currentSeat?.courtName).toBeTruthy();
    expect(judge.professionalRecords).toHaveLength(1);
    expect(judge.professionalRecords[0]!.careerFacts).toHaveLength(1);
    expect(judge.professionalRecords[0]!.provenance).toBe(
      "generated-opening-background",
    );
    expect(judge.philosophy).toBe("unresolved");

    const player = judicialCandidateEvidence(world, game.playerPersonId)!;
    expect(player.professionalRecords).toHaveLength(0);
    expect(player.philosophy).toBe("unresolved");
    expect(world.judiciary!.professionalQualifications).toHaveLength(1337);
  });
});
