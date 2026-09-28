import { describe, expect, it } from "vitest";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import { isSittingJudge, workUniform } from "./work-uniform";

const LEXINGTON = "2146027";

describe("work uniforms", () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "uniform-check",
      placeKey: LEXINGTON,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  const withOccupation = (pattern: RegExp) =>
    Object.keys(world.people).find((id) =>
      activeWorkRelationshipsAt(world, id as never).some((job) =>
        pattern.test(job.role.occupationClassification ?? ""),
      ),
    );

  it("puts the town's police officers and nurses in uniform at work and in their portraits, not at home", () => {
    const officer = withOccupation(/^profession:police-officer$/);
    const nurse = withOccupation(/^profession:registered-nurse$/);
    expect(officer).toBeDefined();
    expect(nurse).toBeDefined();
    expect(workUniform(world, officer as never, undefined)).toBe("police");
    expect(workUniform(world, officer as never, "business")).toBe("police");
    expect(workUniform(world, officer as never, "formal")).toBe("police");
    expect(workUniform(world, officer as never, "casual")).toBeUndefined();
    expect(workUniform(world, nurse as never, undefined)).toBe("scrubs");
    expect(workUniform(world, nurse as never, "formal")).toBeUndefined();
    expect(workUniform(world, nurse as never, "cold")).toBeUndefined();
  });

  it("gives nobody without a uniformed job a uniform", () => {
    const clerk = withOccupation(
      /^occupation:(office-clerk|cashier|retail-sales)$/,
    );
    expect(clerk).toBeDefined();
    expect(workUniform(world, clerk as never, undefined)).toBeUndefined();
  });

  it("robes sitting judges in court and in their portraits, not at home or at the office", () => {
    const tenure = world.judiciary!.seatTenures.find(
      (row) => row.endedAt === null && row.startedAt <= world.currentDate,
    )!;
    expect(tenure).toBeDefined();
    const judge = tenure.personId;
    expect(isSittingJudge(world, judge)).toBe(true);
    expect(workUniform(world, judge, "formal")).toBe("judge-robe");
    expect(workUniform(world, judge, undefined)).toBe("judge-robe");
    expect(workUniform(world, judge, "business")).toBeUndefined();
    expect(workUniform(world, judge, "casual")).toBeUndefined();
    const nurse = withOccupation(/^profession:registered-nurse$/)!;
    expect(isSittingJudge(world, nurse as never)).toBe(false);
  });
});
