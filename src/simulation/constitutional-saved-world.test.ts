import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "../presentation/new-game";
import { freshNewGameSetup } from "../presentation/new-game-geography";
import { SqliteWorldRepository } from "../persistence/sqlite-world-repository";
import { makeIsoDate } from "./dates";
import { searchLifePlaces, stateJurisdictionForKey } from "./life-places";
import { advanceWorld, assertWorldIntegrity } from "./world";
import { deserializeWorld, serializeWorld } from "./serialization";
import { resolveRequiredVotes } from "./legislature-rules";
import {
  constitutionalPosition,
  constitutionalProposalRuleAt,
  constitutionalProposalRuleForWorld,
  proposeCaliforniaConstitutionalMeasure,
  recordCaliforniaRatification,
  recordConstitutionalProposalVote,
} from "./constitutional-process";
import type { CaliforniaConstitutionalProposalInput } from "./constitutional-process";
import type { EntityId, World } from "./types";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Completed fictional institutional rollcall for a saved-World integration proof; not a player-selected collective outcome or observed real vote.",
  sourceEntityIds: [],
};
const CA = stateJurisdictionForKey("US-CA")!.id;

function life(seed: string) {
  const place = searchLifePlaces("Sacramento", 10, {
    stateJurisdictionKey: "US-CA",
    scope: "locality",
  })[0]!;
  const game = createNewGameWorld({
    ...freshNewGameSetup(seed),
    seed,
    startKind: "normal",
    placeKey: place.key,
    startAge: 38,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    givenName: null,
    familyName: null,
  });
  return {
    ...game,
    world: through(game.world, "2026-09-14"),
  };
}
function through(world: World, target: string) {
  return advanceWorld(
    world,
    Math.round((Date.parse(target) - Date.parse(world.currentDate)) / 86400000),
  );
}
function proposal(world: World, stableKey: string) {
  return proposeCaliforniaConstitutionalMeasure(world, {
    stableKey,
    processKind: "state-revision",
    designation: "Authored saved-life procedural revision",
    shortTitle: "Fictional prospective proposal rule",
    text: "Fictional game text: future constitutional proposals require three fourths of each house's membership.",
    textVersion: "v1",
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: makeIsoDate("2026-10-01"),
    ruleDelta: {
      kind: "proposal-threshold",
      numerator: 3,
      denominatorParts: 4,
    },
  });
}
function latest(world: World) {
  return world.history.constitutionalMeasures!.at(-1)!.id;
}
function vote(
  world: World,
  measureId: EntityId,
  body: "assembly" | "senate",
  yes: number,
) {
  const count = body === "assembly" ? 80 : 40;
  return recordConstitutionalProposalVote(
    world,
    measureId,
    body,
    Array.from({ length: count }, (_, i) => ({
      memberKey: `${body}:${i}`,
      personId: null,
      disposition: i < yes ? ("yea" as const) : ("nay" as const),
    })),
    count,
    AUTHORED,
  );
}
function considered(world: World) {
  const id = latest(world);
  return vote(vote(world, id, "assembly", 54), id, "senate", 27);
}
function ratification(world: World, yes: number, no: number) {
  return recordCaliforniaRatification(world, latest(world), {
    kind: "statewide-vote",
    yes,
    no,
    electionAt: world.currentDate,
    statementFiledAt: world.currentDate,
  });
}
function currentRule(world: World) {
  const context = constitutionalProposalRuleForWorld(world, {
    jurisdictionId: CA,
    processKind: "state-revision",
  });
  if (!context.available) throw Error(context.reason);
  expect(context.worldId).toBe(world.id);
  expect(context.asOfDate).toBe(world.currentDate);
  expect(context.historySequenceExclusive).toBe(world.history.nextSequence);
  return context.rule;
}

describe("REST37-K actual saved-World proposal rule", () => {
  it("rejects, ratifies, becomes operative and changes later validation only in that life", () => {
    const original = life("REST37-K first normal life");
    const other = life("REST37-K distinct normal life");
    expect(original.world.id).not.toBe(other.world.id);
    expect(original.world.control).toEqual({
      kind: "person",
      personId: original.playerPersonId,
    });
    expect(original.world.personOrder.length).toBeGreaterThan(1);
    const otherBefore = serializeWorld(other.world);
    const residenceBefore = original.world.history.householdLocations;

    let changed = ratification(
      considered(proposal(original.world, "rejected-revision")),
      99,
      100,
    );
    expect(constitutionalPosition(changed, latest(changed)).phase).toBe(
      "rejected",
    );
    expect(changed.history.constitutionalRuleVersions ?? []).toHaveLength(0);
    expect(resolveRequiredVotes(currentRule(changed), 80).requiredVotes).toBe(
      54,
    );

    changed = considered(proposal(changed, "approved-revision"));
    const approved = latest(changed);
    changed = ratification(changed, 100, 99);
    expect(constitutionalPosition(changed, approved)).toMatchObject({
      phase: "ratified",
      effectiveAt: "2026-09-19",
      operativeAt: "2026-10-01",
    });
    expect(changed.jurisdictions[CA]).toEqual(stateJurisdictionForKey("US-CA"));
    expect(changed.history.householdLocations).toEqual(residenceBefore);
    expect(serializeWorld(other.world)).toBe(otherBefore);
    changed = deserializeWorld(serializeWorld(changed));
    expect(resolveRequiredVotes(currentRule(changed), 80).requiredVotes).toBe(
      54,
    );

    changed = through(changed, "2026-09-30");
    expect(resolveRequiredVotes(currentRule(changed), 80).requiredVotes).toBe(
      54,
    );
    changed = proposal(changed, "introduced-before-operation");
    const earlierProposal = latest(changed);
    changed = through(changed, "2026-10-01");
    expect(constitutionalPosition(changed, approved).phase).toBe("operative");
    expect(resolveRequiredVotes(currentRule(changed), 80).requiredVotes).toBe(
      60,
    );
    changed = vote(changed, earlierProposal, "assembly", 54);
    expect(changed.history.constitutionalActions!.at(-1)!.detail).toMatchObject(
      {
        vote: { requiredVotes: 54, outcome: "passed" },
      },
    );
    changed = proposal(changed, "introduced-after-operation");
    changed = vote(changed, latest(changed), "assembly", 54);
    expect(constitutionalPosition(changed, latest(changed)).phase).toBe(
      "rejected",
    );
    expect(changed.history.constitutionalActions!.at(-1)!.detail).toMatchObject(
      {
        vote: { requiredVotes: 60, outcome: "failed" },
      },
    );

    let unchanged = through(deserializeWorld(otherBefore), "2026-10-01");
    unchanged = proposal(unchanged, "independent-life-proposal");
    unchanged = vote(unchanged, latest(unchanged), "assembly", 54);
    expect(
      unchanged.history.constitutionalActions!.at(-1)!.detail,
    ).toMatchObject({
      vote: { requiredVotes: 54, outcome: "passed" },
    });
    expect(unchanged.history.constitutionalRuleVersions ?? []).toHaveLength(0);
    expect(resolveRequiredVotes(currentRule(unchanged), 80).requiredVotes).toBe(
      54,
    );
    for (const world of [changed, unchanged]) {
      assertWorldIntegrity(world);
      expect(deserializeWorld(serializeWorld(world))).toEqual(world);
      expect(world.history.legislativeMeasures ?? []).toHaveLength(0);
      expect(world.history.legislativeAmendments ?? []).toHaveLength(0);
      expect(world.history.executiveDispositions ?? []).toHaveLength(0);
    }
    // Exercise the actual repository save/load seam without exporting any save.
    const repository = new SqliteWorldRepository(":memory:");
    try {
      repository.save(changed);
      repository.save(unchanged);
      expect(repository.list()).toHaveLength(2);
      expect(repository.load(changed.id)).toEqual(changed);
      expect(repository.load(unchanged.id)).toEqual(unchanged);
      expect(
        resolveRequiredVotes(currentRule(repository.load(unchanged.id)!), 80)
          .requiredVotes,
      ).toBe(54);
    } finally {
      repository.close();
    }
  });

  it("detaches current, historical and sourced rule reads without time/history writes", () => {
    let world = considered(
      proposal(life("REST37-K detached rules").world, "revision"),
    );
    world = through(ratification(world, 100, 99), "2026-10-01");
    const before = serializeWorld(world);
    Object.assign(currentRule(world), { minimumVotes: 80 });
    Object.assign(constitutionalProposalRuleAt(world, "US-CA", "2026-09-30"), {
      minimumVotes: 80,
    });
    expect(serializeWorld(world)).toBe(before);
    expect(resolveRequiredVotes(currentRule(world), 80).requiredVotes).toBe(60);
    expect(
      resolveRequiredVotes(
        constitutionalProposalRuleAt(world, "US-CA", "2026-09-30"),
        80,
      ).requiredVotes,
    ).toBe(54);
  });

  it("keeps a locality, wrong process and invented member authority out of the adapter", () => {
    const game = life("REST37-K scope refusal");
    const before = serializeWorld(game.world);
    expect(
      constitutionalProposalRuleForWorld(game.world, {
        jurisdictionId: game.place.context.jurisdiction.id,
        processKind: "state-revision",
      }).available,
    ).toBe(false);
    expect(
      constitutionalProposalRuleForWorld(game.world, {
        jurisdictionId: CA,
        processKind: "municipal-charter",
      }).available,
    ).toBe(false);
    for (const processKind of ["municipal-charter", "ordinary-bill"]) {
      expect(() =>
        proposeCaliforniaConstitutionalMeasure(game.world, {
          processKind,
        } as unknown as CaliforniaConstitutionalProposalInput),
      ).toThrow(/not ordinary bills or charters/);
    }
    expect(() =>
      proposeCaliforniaConstitutionalMeasure(game.world, {
        ...({} as CaliforniaConstitutionalProposalInput),
        stableKey: "visitor",
        processKind: "state-amendment",
        designation: "No seat",
        shortTitle: "No seat",
        text: "Fictional text",
        textVersion: "v1",
        sponsorPersonId: game.playerPersonId,
        ratificationMode: "statewide-electors",
        deadlineAt: null,
        delayedOperativeAt: null,
        ruleDelta: {
          kind: "proposal-threshold",
          numerator: 3,
          denominatorParts: 4,
        },
      }),
    ).toThrow(/seat|member/);
    expect(serializeWorld(game.world)).toBe(before);
  });
});
