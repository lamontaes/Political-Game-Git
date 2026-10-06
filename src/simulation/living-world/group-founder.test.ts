import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createMindProvenance, recordGoalState } from "../mind";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { lawInterestMembers } from "../official-view-reads";
import { deserializeWorld, serializeWorldPayload } from "../serialization";
import {
  organizeSharedCauseGroup,
  sharedCauseGroup,
  actForSharedCauseGroup,
} from "./law-interest-groups";
import { municipalGovernmentForLifePlace } from "../municipal-government";
import { citizenPetitions, petitionRule } from "../recall";
import { recordWorldEvent } from "../world";

function fixture(strong: boolean) {
  const small = smallWorld({
    place: drawRandomPlace("session110-group-founder", (place) => {
      const government = municipalGovernmentForLifePlace(place);
      return (
        !!government &&
        petitionRule("local-initiative", government.state, {
          governmentKey: government.key,
        }).available
      );
    }).key,
    seed: "session110-group-founder",
    people: 8,
    household: true,
  });
  let world = small.world;
  const personId = world.personOrder.find(
    (id) => world.control.kind !== "person" || id !== world.control.personId,
  )!;
  const propositionId = Object.values(world.policyCatalog.propositions).find(
    (row) =>
      world.policyCatalog.issues[row.issueId]?.levels?.includes("municipality"),
  )!.id;
  world = recordGoalState(world, {
    stableKey: "founder:goal",
    personId,
    goalKey: "civic:shared-cause",
    recordedAt: world.currentDate,
    objective: "Work with neighbors toward the recorded proposition",
    domain: "civic:policy",
    scope: "shared-cause",
    priority: "high",
    status: "active",
    targetEntityId: propositionId,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note: "A resident's recorded goal.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
  if (strong)
    world = recordPrivateBelief(world, {
      stableKey: "founder:view",
      personId,
      propositionId,
      formedAt: world.currentDate,
      position: "support",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale: "This proposition matters to the resident.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
  const input = {
    personId,
    subjectEntityId: propositionId,
    propositionId,
    stance: "support",
    goalStateId: world.history.goalStates.at(-1)!.id,
  } as const;
  return { world, input, town: world.people[personId]!.homeJurisdictionId! };
}

describe("a resident decides to found a shared-cause group", () => {
  it("keeps support and opposition to the proposition as different causes", () => {
    const f = fixture(true);
    const supported = organizeSharedCauseGroup(f.world, f.input);
    const opposed = organizeSharedCauseGroup(supported, {
      ...f.input,
      stance: "oppose",
    });
    expect(
      sharedCauseGroup(opposed, f.town, f.input.subjectEntityId, "support"),
    ).not.toBeNull();
    expect(
      sharedCauseGroup(opposed, f.town, f.input.subjectEntityId, "oppose"),
    ).toBeNull();
    expect(
      opposed.history.decisionTraces
        .at(-1)!
        .context.constraints.some((row) => row.kind === "recorded-stake"),
    ).toBe(true);
  });
  it("the leader chooses a listed petition action from their goal and uses the one petition engine", () => {
    const f = fixture(true);
    let world = organizeSharedCauseGroup(f.world, f.input);
    const organizationId = sharedCauseGroup(
      world,
      f.town,
      f.input.subjectEntityId,
      f.input.stance,
    )!;
    world = recordGoalState(world, {
      stableKey: "leader:petition-goal",
      personId: f.input.personId,
      goalKey: "civic:petition",
      recordedAt: world.currentDate,
      objective: "Gather a petition for this proposition",
      domain: "civic:policy",
      scope: "shared-cause",
      priority: "high",
      status: "active",
      targetEntityId: f.input.propositionId,
      deadline: null,
      outcome: null,
      provenance: createMindProvenance("authored", {
        note: "The leader's action goal.",
      }),
      replacesGoalId: null,
      supersedesGoalStateId: null,
    });
    world = recordWorldEvent(world, {
      stableKey: "leader:decision-day",
      type: "life.conversation",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: f.town,
      involvedEntityIds: [f.input.personId],
      participants: [
        {
          personId: f.input.personId,
          role: "agency:organizer",
          detail: "Considered what the group should do toward its goal.",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "The leader considered the group's next action.",
      context: {
        location: null,
        socialContext: "A shared-cause group",
        pressure: null,
        choice: null,
        motivation: "The recorded goal",
        immediateReaction: null,
      },
    });
    const decisionDayEventId = world.history.events.at(-1)!.id;
    world = actForSharedCauseGroup(world, {
      organizationId,
      leaderPersonId: f.input.personId,
      decisionDayEventId,
    });
    expect(world.history.decisionTraces.at(-1)!.selectedOptionKey).toBe(
      "petition",
    );
    expect(
      world.history.decisionTraces
        .at(-1)!
        .context.options.map((row) => row.key)
        .sort(),
    ).toEqual(
      [
        "petition",
        "protest",
        "letter-drive",
        "endorsement",
        "testimony",
        "suing",
        "later",
      ].sort(),
    );
    expect(citizenPetitions(world)).toHaveLength(1);
    expect(citizenPetitions(world)[0]!.petitionerPersonId).toBe(
      f.input.personId,
    );
    expect(
      citizenPetitions(deserializeWorld(serializeWorldPayload(world))),
    ).toEqual(citizenPetitions(world));
    expect(
      actForSharedCauseGroup(world, {
        organizationId,
        leaderPersonId: f.input.personId,
        decisionDayEventId,
      }),
    ).toBe(world);
  });
  it("another resident joins from a view and ties without being assigned a new goal", () => {
    const f = fixture(true);
    let world = organizeSharedCauseGroup(f.world, f.input);
    const joiner = world.personOrder.find(
      (id) =>
        id !== f.input.personId &&
        (world.control.kind !== "person" || world.control.personId !== id),
    )!;
    world = recordPrivateBelief(world, {
      stableKey: "joiner:view",
      personId: joiner,
      propositionId: f.input.propositionId,
      formedAt: world.currentDate,
      position: "support",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale: "The joiner agrees with this cause.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    const beforeGoals = world.history.goalStates;
    world = organizeSharedCauseGroup(world, {
      ...f.input,
      personId: joiner,
      goalStateId: null,
    });
    const groupId = sharedCauseGroup(
      world,
      f.town,
      f.input.subjectEntityId,
      f.input.stance,
    )!;
    expect(lawInterestMembers(world, groupId).sort()).toEqual(
      [f.input.personId, joiner].sort(),
    );
    expect(world.history.goalStates).toBe(beforeGoals);
    expect(
      world.history.decisionTraces
        .at(-1)!
        .context.considerations.some(
          (row) =>
            row.sourceType === "social:relationship" &&
            row.sourceRefs.length > 0,
        ),
    ).toBe(true);
    expect(world.history.decisionTraces.at(-1)!.context.decisionType).toBe(
      "civic.join-shared-cause-group",
    );
  });
  it("one named resident with a strong recorded view and goal founds with printed reasons", () => {
    const f = fixture(true);
    const world = organizeSharedCauseGroup(f.world, f.input);
    const groupId = sharedCauseGroup(
      world,
      f.town,
      f.input.subjectEntityId,
      f.input.stance,
    )!;
    expect(groupId).not.toBeNull();
    expect(lawInterestMembers(world, groupId)).toEqual([f.input.personId]);
    const trace = world.history.decisionTraces.at(-1)!;
    expect(trace.selectedOptionKey).toBe("organize");
    expect(trace.context.randomness).toBe("none");
    expect(
      trace.context.considerations.map((row) => row.explanation).join(" "),
    ).toContain("strong recorded view");
    expect(
      trace.sourceSnapshots.some((row) => row.reference.kind === "goal-state"),
    ).toBe(true);
    const loaded = deserializeWorld(serializeWorldPayload(world));
    expect(lawInterestMembers(loaded, groupId)).toEqual([f.input.personId]);
  });
  it("a resident with a goal but no view or stake does not found", () => {
    const f = fixture(false);
    const world = organizeSharedCauseGroup(f.world, f.input);
    expect(
      sharedCauseGroup(world, f.town, f.input.subjectEntityId, f.input.stance),
    ).toBeNull();
    expect(
      world.history.decisionTraces
        .at(-1)!
        .context.constraints.some((row) => row.kind === "recorded-stake"),
    ).toBe(true);
  });
  it("never autonomously founds for the controlled person", () => {
    const f = fixture(true);
    const world = {
      ...f.world,
      control: { kind: "person", personId: f.input.personId },
    } as const;
    expect(organizeSharedCauseGroup(world, f.input)).toBe(world);
  });
});
