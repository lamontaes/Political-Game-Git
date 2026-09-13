import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
  newGameSetupProblems,
  type NewGameSetup,
} from "./new-game";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";
import { passOrdinaryDays } from "./ordinary-life";
import { deserializeWorld, serializeWorld } from "../simulation";
import {
  appealDecisionFor,
  fileNoticeWithCommissioner,
  issueMinnesotaDiscipline,
  offerMinnesotaReinstatement,
  personnelMatters,
  personnelOfferResponses,
  personnelPositions,
  recordInformalResolutionAttempt,
  reinstatementOpportunities,
  type PersonnelResult,
} from "../simulation/civil-personnel-actions";
import { initializeStateAgencyStart } from "../simulation/civil-personnel-start";
import { personnelRecords } from "../simulation/civil-personnel-integrity";
import type { EntityId, World } from "../simulation/types";

/**
 * The ordinary Custom Start path: the same createNewGameWorld the creator's
 * Begin button calls, and ordinary day passage. No diagnostic fixture.
 */
const SETUP: NewGameSetup = {
  ...DEFAULT_NEW_GAME_SETUP,
  seed: "civil-authority13-entry",
  startKind: "custom",
  placeKey: "2743000", // Minneapolis, Minnesota
  startAge: 40,
  depth: "summarize-earlier-life",
  startingLife: "state-agency-director",
};

function reload(world: World): World {
  return deserializeWorld(serializeWorld(world));
}

function ok(result: PersonnelResult): { world: World; id: EntityId } {
  if (!result.ok) throw new Error(result.reason);
  return { world: result.world, id: result.recordId };
}

function matter(world: World, heading: RegExp) {
  const found = personnelMatters(world).find((m) => heading.test(m.heading));
  if (!found) throw new Error(`No matter ${heading}.`);
  return found;
}

function step(world: World, heading: RegExp, key: string) {
  const found = matter(world, heading).steps.find((s) => s.key === key);
  if (!found) throw new Error(`No step ${key}.`);
  return found;
}

describe("CIVIL-AUTHORITY13 state agency Custom Start", () => {
  it("is offered only as an explicit adult Custom Start in a state with compiled procedures", () => {
    expect(newGameSetupProblems(SETUP)).toEqual([]);
    const refused: NewGameSetup[] = [
      { ...SETUP, startKind: "normal" },
      { ...SETUP, startAge: 24 },
      { ...SETUP, depth: "play-formative-years", startAge: 12 },
      { ...SETUP, placeKey: "kentucky" },
      { ...SETUP, placeKey: "alaska" },
    ];
    for (const setup of refused)
      expect(
        newGameSetupProblems(setup).some((p) => p.field === "startingLife"),
      ).toBe(true);
    // The replay descriptor carries the start, so a shared link rebuilds it.
    expect(decodeReplayDescriptor(encodeReplayDescriptor(SETUP))).toMatchObject(
      {
        startingLife: "state-agency-director",
      },
    );
  });

  it("establishes employment, positions, classes and designated authority through the start, and nothing is backdated", () => {
    const game = createNewGameWorld(SETUP);
    const world = reload(game.world);
    expect(world.currentDate).toBe("2026-01-05");
    expect(world.control).toEqual({
      kind: "person",
      personId: game.playerPersonId,
    });
    const records = personnelRecords(world);
    const designations = records.filter(
      (r) => r.kind === "authority-designation",
    );
    expect(
      designations
        .map((d) => d.kind === "authority-designation" && d.basis.kind)
        .sort(),
    ).toEqual(["authored-charter", "statute"]);
    expect(personnelPositions(world).map((p) => p.civilClass)).toEqual([
      "classified",
      "classified",
      "classified",
      "classified",
    ]);
    const director = world.history.workRelationships.find(
      (w) =>
        w.personId === game.playerPersonId &&
        w.kind === "employment:state-agency-director",
    );
    expect(director).toBeDefined();
    // January: the procedures were observed in September, so every personnel
    // step is refused with that reason rather than applied early.
    for (const view of personnelMatters(world))
      for (const s of view.steps.filter(
        (x) =>
          x.key !== "competitive-selection" &&
          x.key !== "suspend-or-demote" &&
          x.key !== "complete-probation",
      ))
        expect(s.available).toBe(false);
    expect(
      step(world, /, Records specialist$/, "informal-resolution").reason,
    ).toContain("2026-09-06");
    expect(step(world, /^Vacant /, "reinstatement").reason).toContain(
      "2026-09-06",
    );
    expect(step(world, /^Vacant /, "competitive-selection")).toMatchObject({
      available: false,
    });
    // Re-running the initializer cannot duplicate or re-grant anything.
    const again = initializeStateAgencyStart(world, {
      mode: "custom",
      jurisdictionId: game.place.context.jurisdiction.id,
    });
    expect(again.ok && personnelRecords(again.world).length).toBe(
      records.length,
    );
  });

  it("plays the supported journey after ordinary days reach the observation date, with save and reload between steps", () => {
    const game = createNewGameWorld(SETUP);
    let world = reload(passOrdinaryDays(game.world, 244));
    expect(world.currentDate >= "2026-09-06").toBe(true);

    // Supported steps open; unsupported powers stay named and unavailable.
    expect(
      step(world, /, Records specialist$/, "informal-resolution").available,
    ).toBe(true);
    expect(step(world, /\(represented\)$/, "discipline").reason).toContain(
      "collective bargaining agreement governs",
    );
    expect(step(world, /\(new\)$/, "complete-probation")).toMatchObject({
      available: false,
    });
    expect(step(world, /^Vacant /, "competitive-selection")).toMatchObject({
      available: false,
    });
    expect(step(world, /^Vacant /, "reinstatement").available).toBe(true);

    const specialist = matter(world, /, Records specialist$/);
    world = reload(
      ok(
        recordInformalResolutionAttempt(world, {
          incumbencyId: specialist.id,
          note: "Went over the missed retention deadlines.",
        }),
      ).world,
    );
    const discharge = ok(
      issueMinnesotaDiscipline(world, {
        incumbencyId: specialist.id,
        action: "discharge",
        ground: "consistent-failure-to-perform",
        reasons: "Missed four retention deadlines after written reminders.",
      }),
    );
    world = reload(discharge.world);
    expect(["appealed", "declined"]).toContain(
      appealDecisionFor(world, discharge.id),
    );
    // The filing obligation is a real Work item for the director.
    const action = personnelRecords(world).find((r) => r.id === discharge.id)!;
    expect(
      action.kind === "disciplinary-action" && action.workItemId,
    ).toBeTruthy();
    world = reload(
      ok(fileNoticeWithCommissioner(world, { actionId: discharge.id })).world,
    );

    const vacancy = reinstatementOpportunities(world).find(
      (o) => o.candidates.length > 0,
    )!;
    const offered = ok(
      offerMinnesotaReinstatement(world, {
        positionId: vacancy.position.id,
        personId: vacancy.candidates[0]!.personId,
        probation: "not-required",
      }),
    );
    world = reload(offered.world);
    expect(personnelOfferResponses(world)).toHaveLength(1);
    expect(personnelRecords(world)).toEqual(personnelRecords(reload(world)));
  });
});
