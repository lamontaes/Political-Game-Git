import { afterAll, describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import {
  constitutionalActions,
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
import { stateVoice } from "../simulation/governing/article-v";
import {
  createFormationContext,
  recordPrinciples,
} from "../simulation/politics";
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

let openedGrandIsland:
  { readonly world: World; readonly governmentKey: string } | undefined;
// Release the shared opening when this file is done, so a worker that runs
// the next file does not keep it.
afterAll(() => {
  openedGrandIsland = undefined;
});

/**
 * One Grand Island life, opened once and shared by every case: a World is an
 * immutable value, so each case amends its own copy of the same opening.
 */
function grandIsland() {
  openedGrandIsland ??= openGrandIsland();
  return openedGrandIsland;
}

function openGrandIsland() {
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
  // Opening the shared life is most of this file's time; it is paid here,
  // once, rather than inside whichever amendment case happens to run first.
  it("opens a Grand Island life under a town government", () => {
    const { world, governmentKey } = grandIsland();
    expect(governmentKey).toBeTruthy();
    expect(municipalRecallRule(governmentKey, world)).toMatchObject({
      available: true,
    });
  });

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
      circulationBasis: "national-estimated",
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

describe("policy amendments the legislators' own principles carry", () => {
  it("decide the same way each year, from the members' principles, and say so", () => {
    const { world } = grandIsland();
    expect(stateDecidedPropositions(world).length).toBeGreaterThan(0);
    const results = [2030, 2031, 2052].map((year) =>
      constitutionalReformReviewHandler(world, review(world, year)),
    );
    const proposed = results.map((result) =>
      (result.world.history.constitutionalMeasures ?? []).filter((measure) =>
        measure.stableKey.endsWith(":principles"),
      ),
    );
    // The same members with the same principles give the same answer.
    expect(new Set(proposed.map((rows) => rows.length)).size).toBe(1);
    expect(
      new Set(
        proposed.map((rows) =>
          rows.map((row) => JSON.stringify(row.ruleDelta)).join(),
        ),
      ).size,
    ).toBe(1);
    // Nothing is proposed by a draw any more, and town recall has no cause.
    for (const result of results)
      expect(
        (result.world.history.constitutionalMeasures ?? []).some(
          (measure) =>
            measure.stableKey.endsWith(":background") ||
            measure.ruleDelta.kind === "rule-field",
        ),
      ).toBe(false);
    for (const [index, rows] of proposed.entries()) {
      const result = results[index]!;
      if (rows.length === 0) {
        expect(result.context).toMatch(
          /No policy has most of the legislature behind a change|would not carry/,
        );
        continue;
      }
      const measure = rows.at(-1)!;
      expect(reformMeasureCause(measure)).toBe(
        "The legislators' own principles",
      );
      // Nothing is in force yet, so a policy amendment proposes adoption.
      expect(measure.ruleDelta).toMatchObject({
        kind: "policy-provision",
        stance: "adopt",
      });
      // It was filed because it carries, so it goes to the voters.
      expect(constitutionalPosition(result.world, measure.id).phase).toBe(
        "ratification",
      );
      expect(() => assertWorldIntegrity(result.world)).not.toThrow();
      const row = projectObserverRecord(result.world).amendments[0]!;
      expect(row.cause).toBe("The legislators' own principles");
    }
  });
});

describe("a policy amendment most of the legislature holds by conviction", () => {
  it("is filed, carries every chamber, and names the members' reasons", () => {
    const { world } = grandIsland();
    // A policy several principles bear on, so a settled view on each weighs
    // "strong", past the constitutional bar.
    const proposition = stateDecidedPropositions(world).find(
      (candidate) => (candidate.principles ?? []).length >= 2,
    )!;
    expect(proposition).toBeDefined();
    const voice = stateVoice(world, "NE").personIds;
    expect(voice.length).toBeGreaterThan(0);
    const convinced = recordPrinciples(
      world,
      voice.flatMap((personId) =>
        proposition.principles!.map((bearing) => ({
          stableKey: `fixture:convinced:${personId}:${bearing.principleId}`,
          personId,
          principleId: bearing.principleId,
          formedAt: world.currentDate,
          stance:
            bearing.bearing === "consistent-with"
              ? ("endorses" as const)
              : ("rejects" as const),
          strength: 1,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("other:drawn-before-play", {
            note: "Fixture: every member holds this settled view.",
          }),
          supersedesPrincipleRecordId: null,
        })),
      ),
    );
    const first = constitutionalReformReviewHandler(
      convinced,
      review(convinced, 2030),
    );
    const again = constitutionalReformReviewHandler(
      convinced,
      review(convinced, 2030),
    );
    expect(again.world.history.constitutionalMeasures).toEqual(
      first.world.history.constitutionalMeasures,
    );
    const measure = first.world.history.constitutionalMeasures!.find(
      (candidate) => candidate.stableKey.endsWith(":principles"),
    )!;
    expect(measure.ruleDelta).toEqual({
      kind: "policy-provision",
      propositionId: proposition.id,
      stance: "adopt",
    });
    expect(first.context).toMatch(/from the legislators' own principles/);
    expect(constitutionalPosition(first.world, measure.id).phase).toBe(
      "ratification",
    );
    const vote = constitutionalActions(first.world, measure.id).flatMap(
      (action) =>
        action.detail.kind === "proposal-vote" ? [action.detail] : [],
    )[0]!;
    expect(vote.vote.provenance.note).toMatch(
      /decided for their own reasons, most often member:principle:for/,
    );
    expect(() => assertWorldIntegrity(first.world)).not.toThrow();
    const saved = deserializeWorld(serializeWorld(first.world));
    expect(saved.history.constitutionalMeasures).toEqual(
      first.world.history.constitutionalMeasures,
    );
  });
});
