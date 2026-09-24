import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import {
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
  recordStatewideRatification,
  stateAmendmentProfile,
} from "../simulation/constitutional-process";
import type { ConstitutionalRuleDelta } from "../simulation/constitutional-types";
import { municipalLawOfficeKey } from "../simulation/enacted-rule-changes";
import { dispositionsFromCounts } from "../simulation/legislation-scenarios";
import {
  CONSTITUTIONAL_REFORM_REVIEW,
  constitutionalReformReviewHandler,
  reformMeasureCause,
} from "../simulation/living-world/constitutional-reform";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import { chiefExecutiveJurisdictionId } from "../simulation/nationwide-world/government-jurisdiction";
import {
  constitutionalPolicyProvisions,
  stateDecidedPropositions,
} from "../simulation/policy-provisions";
import { municipalRecallRule } from "../simulation/recall";
import type { EntityId, FutureDueItem, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectObserverRecord } from "./observer-world";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { resolvePlayerCapabilities } from "./player-capabilities";

/**
 * A state constitution taking up subjects other than the governor's term
 * limit: a policy written in or out, and how its towns may recall an
 * official. An ordinary start in Grand Island, Nebraska, whose read pack
 * gives towns a keep-or-remove recall vote.
 */
const GRAND_ISLAND = "3119595";

function grandIsland() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "subjects-A",
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: GRAND_ISLAND,
    }),
  ).game!;
  const world = passOrdinaryDays(
    openOrdinaryLife(game.world, game.playerPersonId),
    1,
  );
  const place = resolvePlayerCapabilities(world).homePlace!;
  return { world, governmentKey: municipalGovernmentForLifePlace(place)!.key };
}

const FIXTURE = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this scenario.",
  sourceEntityIds: [],
};

let fixtureCount = 0;

/** Propose an amendment and pass it through the legislature and the voters. */
function amend(world: World, ruleDelta: ConstitutionalRuleDelta): World {
  fixtureCount += 1;
  // A day apart: two measures on one rule cannot both pass at one election.
  let w = proposeConstitutionalMeasure(passOrdinaryDays(world, 1), {
    stableKey: `fixture:ne-subject-${fixtureCount}`,
    jurisdictionId: chiefExecutiveJurisdictionId("NE")!,
    jurisdictionKey: "US-NE",
    processKind: "state-amendment",
    designation: `Fixture Amendment ${fixtureCount}`,
    shortTitle: "Fixture",
    text: "Fictional test text.",
    textVersion: "v1",
    sponsoringAuthority: "Nebraska Legislature",
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta,
    ordinaryMeasureId: null,
  });
  const id = w.history.constitutionalMeasures!.at(-1)!.id;
  for (const body of stateAmendmentProfile("US-NE")!.bodies) {
    const members = Array.from({ length: body.members }, (_, i) => ({
      memberKey: `m:${i}`,
      name: `Member ${i}`,
      personId: null,
      caucusLabel: "",
    }));
    w = recordConstitutionalProposalVote(
      w,
      id,
      body.bodyKey,
      dispositionsFromCounts(members, { yea: body.members }),
      body.members,
      FIXTURE,
    );
  }
  w = recordStatewideRatification(w, id, {
    kind: "statewide-vote",
    yes: 60,
    no: 40,
    electionAt: w.currentDate,
    statementFiledAt: w.currentDate,
  });
  expect(constitutionalPosition(w, id).phase).toBe("operative");
  return w;
}

function recallDoctrine(value: string): ConstitutionalRuleDelta {
  return {
    kind: "rule-field",
    officeKey: municipalLawOfficeKey("NE"),
    field: "municipal.recall.doctrine",
    value,
  };
}

function propositionId(world: World, stableKey: string): EntityId {
  return Object.values(world.policyCatalog.propositions).find(
    (proposition) => proposition.stableKey === stableKey,
  )!.id;
}

function review(world: World, year: number): FutureDueItem {
  return {
    ...world.history.futureDueItems.find(
      (due) => due.transitionKey === CONSTITUTIONAL_REFORM_REVIEW,
    )!,
    stableKey: `constitutional-reform/v1:NE:${year}:review`,
  };
}

describe("a state amendment on how towns recall their officials", () => {
  it("takes recall away, then gives it back, and the petition reads it", () => {
    const { world, governmentKey } = grandIsland();
    const before = municipalRecallRule(governmentKey, world);
    expect(before).toMatchObject({
      available: true,
      doctrine: "yes-no-retention",
      doctrineBasis: "state-law-unverified",
      circulationDays: 30,
    });

    const prohibited = amend(world, recallDoctrine("prohibited"));
    const refused = municipalRecallRule(governmentKey, prohibited);
    expect(refused).toEqual({
      available: false,
      reason: `Towns in Nebraska cannot recall their officials since ${
        prohibited.history.constitutionalMeasures!.at(-1)!.designation
      }.`,
    });
    // Without a World only the compiled rule is read.
    expect(municipalRecallRule(governmentKey)).toEqual(before);

    // Restoring the pack's own doctrine restores the pack's details with it.
    const restored = amend(prohibited, recallDoctrine("yes-no-retention"));
    expect(municipalRecallRule(governmentKey, restored)).toEqual({
      ...before,
      doctrineBasis: "enacted-in-game",
    });

    // A doctrine the pack does not read borrows nothing from it.
    const changed = amend(restored, recallDoctrine("two-question-standalone"));
    expect(municipalRecallRule(governmentKey, changed)).toMatchObject({
      available: true,
      doctrine: "two-question-standalone",
      doctrineBasis: "enacted-in-game",
      threshold: null,
      circulationBasis: "national-range-drawn",
    });
    expect(() => assertWorldIntegrity(changed)).not.toThrow();
  });

  it("refuses a doctrine the game does not know", () => {
    const { world } = grandIsland();
    expect(() => amend(world, recallDoctrine("by-lottery"))).toThrow(
      /must be one of/,
    );
  });
});

describe("a state amendment writing a policy into its constitution", () => {
  it("adopts a policy and later repeals it, and a save keeps both", () => {
    const { world } = grandIsland();
    const cannabis = propositionId(
      world,
      "us-policy-positions:business-commerce.legalize-cannabis-sales",
    );
    expect(constitutionalPolicyProvisions(world, "NE")).toEqual([]);
    const adopted = amend(world, {
      kind: "policy-provision",
      propositionId: cannabis,
      stance: "adopt",
    });
    expect(constitutionalPolicyProvisions(adopted, "NE")).toMatchObject([
      { propositionId: cannabis, stance: "adopt" },
    ]);
    // Another state's constitution is untouched.
    expect(constitutionalPolicyProvisions(adopted, "OH")).toEqual([]);
    const repealed = amend(adopted, {
      kind: "policy-provision",
      propositionId: cannabis,
      stance: "repeal",
    });
    expect(constitutionalPolicyProvisions(repealed, "NE")).toMatchObject([
      { propositionId: cannabis, stance: "repeal" },
    ]);
    const saved = deserializeWorld(serializeWorld(repealed));
    expect(constitutionalPolicyProvisions(saved, "NE")).toEqual(
      constitutionalPolicyProvisions(repealed, "NE"),
    );
    expect(() => assertWorldIntegrity(saved)).not.toThrow();
  });

  it("refuses a policy no state decides, or one not in the catalog", () => {
    const { world } = grandIsland();
    const catalog = world.policyCatalog;
    const local = catalog.propositionOrder.find(
      (id) =>
        !(
          catalog.issues[catalog.propositions[id]!.issueId]!.levels ?? []
        ).includes("state"),
    )!;
    expect(local).toBeDefined();
    expect(() =>
      amend(world, {
        kind: "policy-provision",
        propositionId: local,
        stance: "adopt",
      }),
    ).toThrow(/cannot take it up/);
    expect(() =>
      amend(world, {
        kind: "policy-provision",
        propositionId: "policy-proposition:none" as EntityId,
        stance: "adopt",
      }),
    ).toThrow(/does not hold/);
  });
});

describe("amendments the world proposes with no recorded cause", () => {
  it("are rare, drawn among the subjects a state can change, and say so", () => {
    const { world } = grandIsland();
    expect(stateDecidedPropositions(world).length).toBeGreaterThan(0);
    const background: World[] = [];
    for (let year = 2030; year < 2230; year += 1) {
      const result = constitutionalReformReviewHandler(
        world,
        review(world, year),
      ).world;
      if (
        (result.history.constitutionalMeasures ?? []).some((measure) =>
          measure.stableKey.endsWith(":background"),
        )
      )
        background.push(result);
    }
    expect(background.length).toBeGreaterThan(0);
    expect(background.length).toBeLessThan(15);
    for (const result of background) {
      const measure = result.history.constitutionalMeasures!.at(-1)!;
      expect(reformMeasureCause(measure)).toBe("No recorded cause");
      // Nothing is in force yet, so a policy amendment proposes adoption.
      if (measure.ruleDelta.kind === "policy-provision")
        expect(measure.ruleDelta.stance).toBe("adopt");
      else
        expect(measure.ruleDelta).toMatchObject({
          kind: "rule-field",
          field: "municipal.recall.doctrine",
        });
      expect(["ratification", "rejected"]).toContain(
        constitutionalPosition(result, measure.id).phase,
      );
      expect(() => assertWorldIntegrity(result)).not.toThrow();
      const row = projectObserverRecord(result).amendments[0]!;
      expect(row.cause).toBe("No recorded cause");
    }
  });
});

describe("a background amendment on town recall", () => {
  it("proposes a doctrine other than the one in force", () => {
    const { world } = grandIsland();
    let found = null;
    for (let year = 2030; year < 30_000 && !found; year += 1) {
      const result = constitutionalReformReviewHandler(
        world,
        review(world, year),
      ).world;
      const measure = (result.history.constitutionalMeasures ?? []).find(
        (candidate) =>
          candidate.stableKey.endsWith(":background") &&
          candidate.ruleDelta.kind === "rule-field",
      );
      if (measure) found = { year, measure };
    }
    expect(found).not.toBeNull();
    expect(found!.measure.ruleDelta).toMatchObject({
      field: "municipal.recall.doctrine",
      officeKey: "us-ne-municipal-law",
    });
    expect(
      found!.measure.ruleDelta.kind === "rule-field" &&
        found!.measure.ruleDelta.value,
    ).not.toBe("yes-no-retention");
    expect(found!.measure.text).toMatch(
      /^How the towns of Nebraska may recall/,
    );
  });
});
