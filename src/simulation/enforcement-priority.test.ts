import { describe, expect, it } from "vitest";
import { executiveEnforcementPriorityForLaw } from "./executive-enforcement";
import { lawInForce } from "./governing/law-in-force";
import { searchLifePlaces } from "./life-places";
import { SeededRng } from "./rng";
import { STATES } from "./state-reference";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "./nationwide-world/state-executives";
import {
  decideGoverningMatter,
  enforcementPriorityForLaw,
  governingMatters,
  governorOfficeForJurisdiction,
  openEnforcementDirectiveMatter,
} from "./governing/state-governing";
import { rankLegalOutcomeEnforcement } from "./law-consequences/legal-outcome";
import type { EntityId } from "./types";

describe("executive enforcement priority", () => {
  it("records a governor's statute priority in a seed-selected new game", () => {
    const seed = "session38-enforcement-priority-new-game-20261006";
    const rng = new SeededRng(seed);
    const stateUsps = rng.pick(Object.keys(STATES));
    const jurisdictionKey = `US-${stateUsps}`;
    const place = rng.pick(
      searchLifePlaces("", 100, {
        scope: "locality",
        stateJurisdictionKey: jurisdictionKey,
      }),
    );
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "normal",
      placeKey: place.key,
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      seed,
      questionnaire: "skipped",
      priors: [],
    });
    const playerId = Object.keys(game.world.people)[0] as EntityId;
    const prepared = ensureStateExecutiveIncumbent(
      game.world,
      playerId,
      stateUsps,
    );
    const governor = currentStateExecutiveHolders(prepared).find(
      (holder) => holder.stateUsps === stateUsps,
    )!;
    const office = governorOfficeForJurisdiction(prepared, jurisdictionKey)!;
    const world = {
      ...prepared,
      control: { kind: "person" as const, personId: governor.personId },
    };
    const statute = Object.values(world.policyCatalog.propositions)
      .map((proposition) => ({
        proposition,
        law: lawInForce(world, office.jurisdictionId, proposition.id),
      }))
      .find((candidate) => candidate.law?.level === "state-statute");
    if (!statute?.law)
      throw new Error("This new game has no in-force state statute to direct.");
    const sourceEventId = world.history.events.at(-1)!.id;
    const opened = openEnforcementDirectiveMatter(world, office.officeKey, {
      instance: `law:${statute.law.measureId}`,
      subject: statute.proposition.name,
      propositionId: statute.proposition.id,
      sourceEventId,
    });
    const matter = governingMatters(opened, office.officeKey).find(
      (item) => item.family === "enforcement-directive",
    );
    if (!matter)
      throw new Error("The directive did not reach the shared desk.");
    const decided = decideGoverningMatter(
      opened,
      matter.id,
      "enforcement:first",
    );

    expect(decided.ok).toBe(true);
    expect(
      executiveEnforcementPriorityForLaw(
        decided.world,
        office.jurisdictionId,
        statute.proposition.id,
        statute.law.measureId,
      ),
    ).toBe("first");
    expect(
      rankLegalOutcomeEnforcement([
        { key: "late", enforcementPriority: "lowest" as const, sequence: 1 },
        { key: "early", enforcementPriority: "first" as const, sequence: 2 },
      ]).map((row) => row.key),
    ).toEqual(["early", "late"]);
    expect(
      enforcementPriorityForLaw(
        decided.world,
        office.officeKey,
        statute.proposition.stableKey,
      ),
    ).toBe("first");
    console.info("Session 38 enforcement random new-game proof", {
      seed,
      place: place.displayName,
      jurisdictionKey,
      worldId: world.id,
      lawMeasureId: statute.law.measureId,
      directiveId: decided.world.history.legislativeMeasures?.find(
        (measure) => measure.governmentInstrument === "executive-order",
      )?.id,
      priority: "first",
    });
  });
});
