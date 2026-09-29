import { describe, expect, it } from "vitest";

import { measurePosition } from "../simulation";
import type { MeasureStepKey, World } from "../simulation";
import {
  GOVERNING_MATTER_OPENED,
  governorOfficeForJurisdiction,
} from "../simulation/governing/state-governing";
import { legislativeBlueprint } from "../simulation/legislation-scenarios";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  openLegislativeWork,
} from "./legislation-world";
import type { LegislativeAssignment } from "./legislation-world";
import { legislativeProcedureRefusal } from "./legislative-procedure-availability";
import { projectMeasureBriefing } from "./legislation-projection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { resolvePlayerCapabilities } from "./player-capabilities";

/**
 * A bill the player carries through the legislature goes to the state's
 * seated governor, who decides it on their own desk like every other bill.
 * Before, the player's bill replayed the answer written into the developer
 * scenario (eight of its nine bills always vetoed, one always signed), and in
 * a state with no written scenario the step was refused, so a player's bill
 * could never be signed or vetoed.
 */

function staffer(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed,
      startAge: 30,
      startingLife: "legislative-office",
    }),
  ).game!;
  const capabilities = resolvePlayerCapabilities(game.world);
  return openLegislativeWork(game.world, {
    scenarioKey: capabilities.legislativeScenarioKey!,
    playerPersonId: game.playerPersonId,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
}

/** Takes whatever step is open next, waiting where it is not the office's. */
function advance(
  world: World,
  assignment: LegislativeAssignment,
  until: (world: World) => boolean,
): World {
  let next = world;
  for (let i = 0; i < 60 && !until(next); i++) {
    const briefing = projectMeasureBriefing(next, assignment.measureId);
    if (briefing.finished) break;
    const option = briefing.options.find(
      (entry) => !entry.disabledReason && entry.actionKey !== "offer-amendment",
    );
    if (!option) break;
    const step: MeasureStepKey = option.actionKey;
    next = applyLegislativeCommand(next, assignment, {
      kind: institutionOwnsStep(next, assignment, step)
        ? "await-institution"
        : "take-step",
      step,
    }).world;
  }
  return next;
}

const onDesk = (assignment: LegislativeAssignment) => (world: World) =>
  measurePosition(world, assignment.measureId).phase === "awaiting-executive";

/**
 * The chambers' members decide the bill for their own reasons, and in some
 * worlds a committee holds it. The first of a few seeded worlds whose bill
 * passes both chambers is the one that reaches the governor.
 */
function billOnTheDesk(place: string) {
  let last: ReturnType<typeof staffer> & { atDesk: World };
  for (let attempt = 1; attempt <= 6; attempt++) {
    const seed =
      attempt === 1
        ? `governor-desk-${place}`
        : `governor-desk-${place}-${attempt}`;
    const opened = staffer(place, seed);
    const atDesk = advance(
      opened.world,
      opened.assignment,
      onDesk(opened.assignment),
    );
    last = { ...opened, atDesk };
    if (onDesk(opened.assignment)(atDesk)) break;
  }
  return last!;
}

describe.each(["nebraska", "alaska"])("a player's bill in %s", (place) => {
  const { assignment, atDesk } = billOnTheDesk(place);
  const jurisdictionKey = assignment.procedure.pack.jurisdictionKey;

  it("reaches a governor who is seated", () => {
    expect(onDesk(assignment)(atDesk)).toBe(true);
    expect(governorOfficeForJurisdiction(atDesk, jurisdictionKey)).not.toBe(
      null,
    );
  });

  it("is the governor's to decide, so the office can only wait", () => {
    const step: MeasureStepKey = "await-executive-decision";
    expect(institutionOwnsStep(atDesk, assignment, step)).toBe(true);
    expect(
      legislativeProcedureRefusal(atDesk, assignment.procedure, step),
    ).toBe(null);
    expect(() =>
      applyLegislativeCommand(atDesk, assignment, { kind: "take-step", step }),
    ).toThrow(/only wait/);
  });

  it("is decided on the governor's own desk, not by the written answer", () => {
    const decided = advance(
      atDesk,
      assignment,
      (next) => !onDesk(assignment)(next),
    );
    expect(onDesk(assignment)(decided)).toBe(false);
    const governor = governorOfficeForJurisdiction(decided, jurisdictionKey)!;
    const matter = decided.history.events.find(
      (event) =>
        event.type === GOVERNING_MATTER_OPENED &&
        event.tags.includes(`measure:${assignment.measureId}`) &&
        event.tags.includes("matter-family:bill"),
    );
    expect(matter?.involvedEntityIds).toContain(governor.holderPersonId);
    const executive = (decided.history.legislativeActions ?? []).filter(
      (action) =>
        action.measureId === assignment.measureId &&
        (action.kind === "signed" || action.kind === "vetoed"),
    );
    expect(executive).toHaveLength(1);
    const written = legislativeBlueprint(assignment.scenarioKey);
    expect(executive[0]!.rationale).not.toBe(written.governorRationale);
  });
});
