import { describe, expect, test } from "vitest";
import { createPortabilityFixture } from "../portability-fixture";
import { recordRelationshipInteraction } from "../records";
import { readRelationshipStanding } from "../relationship-standing";
import { recordWorldEvent } from "../world";
import type { EntityId, World } from "../types";
import {
  APPOINTMENTS_VERSION,
  appointmentShortList,
  chooseAppointee,
  recordPassedOver,
} from "./appointments";

const POST = { officeKey: "fixture-council-seat", title: "council member" };

function playerMatter(
  world: World,
  appointer: EntityId,
  candidates: EntityId[],
) {
  const controlled: World = {
    ...world,
    control: { kind: "person", personId: appointer },
  };
  return recordWorldEvent(controlled, {
    stableKey: "fixture:appointment-matter",
    type: "governing.matter-opened",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[appointer]!.homeJurisdictionId,
    involvedEntityIds: [appointer, ...candidates],
    participants: [
      { personId: appointer, role: "agency:officeholder", detail: null },
      ...candidates.map((personId) => ({
        personId,
        role: "focus:candidate" as const,
        detail: null,
      })),
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["matter-family:appointment", `appointment-post:${POST.officeKey}`],
    summary: "The officeholder has an appointment choice.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("recorded player appointment instructions", () => {
  test("the player can choose another eligible person without fabricated preferences", () => {
    const { world, appointer, helper, stranger } = fixture();
    const before = playerMatter(
      helped(world, helper, appointer, "player-help", "major"),
      appointer,
      [helper, stranger],
    );
    const input = {
      stableKey: "fixture:player-choice",
      appointerPersonId: appointer,
      post: POST,
      circle: [helper, stranger],
      eligible: () => true,
      playerChoice: {
        personId: stranger,
        matterEventId: before.history.events.at(-1)!.id,
      },
    };
    const history = JSON.stringify(before.history);
    expect(
      appointmentShortList(before, input).map((row) => row.personId),
    ).toContain(stranger);
    expect(JSON.stringify(before.history)).toBe(history);
    const choice = chooseAppointee(before, input)!;
    expect(choice.personId).toBe(stranger);
    const trace = choice.world.history.decisionTraces.find(
      (row) => row.id === choice.decisionTraceId,
    )!;
    expect(trace.context.randomness).toBe("none");
    expect(trace.context.constraints[0]?.kind).toBe("player:recorded-choice");
    expect(trace.context.constraints[0]?.sourceRefs).toContainEqual({
      kind: "historical-event",
      eventId: input.playerChoice.matterEventId,
    });
    const replay = chooseAppointee(choice.world, input)!;
    expect(replay.decisionTraceId).toBe(choice.decisionTraceId);
    expect(replay.world.history.decisionTraces).toHaveLength(
      choice.world.history.decisionTraces.length,
    );
  });

  test("foreign, closed, or newly ineligible choices do not write a trace", () => {
    const { world, appointer, helper, stranger } = fixture();
    const before = playerMatter(world, appointer, [helper]);
    const matter = before.history.events.at(-1)!;
    const input = {
      stableKey: "fixture:invalid-choice",
      appointerPersonId: appointer,
      post: POST,
      circle: [helper, stranger],
      eligible: () => true,
      playerChoice: { personId: stranger, matterEventId: matter.id },
    };
    expect(chooseAppointee(before, input)).toBeNull();
    const offered = {
      ...input,
      playerChoice: { personId: helper, matterEventId: matter.id },
    };
    expect(
      chooseAppointee(before, { ...offered, eligible: () => false }),
    ).toBeNull();
    const closed = recordWorldEvent(before, {
      ...matter,
      stableKey: "fixture:appointment-decided",
      type: "governing.matter-decided",
      tags: [`matter:${matter.id}`],
    });
    expect(chooseAppointee(closed, offered)).toBeNull();
    expect(closed.history.decisionTraces).toHaveLength(
      before.history.decisionTraces.length,
    );
  });
});

/** One person helped another; the helper holds the commitment. */
function helped(
  world: World,
  helperId: EntityId,
  helpedId: EntityId,
  key: string,
  significance: "meaningful" | "major",
): World {
  return recordRelationshipInteraction(world, {
    stableKey: `test:${key}`,
    personIds: [helperId, helpedId],
    eventId: null,
    occurredAt: world.currentDate,
    kind: "support:helped-through-a-hard-time",
    change: "strengthened",
    significance,
    summary: "One helped the other through a hard time.",
    tags: [`relationship.actor:${String(helperId)}`],
  });
}

function fixture() {
  const world = createPortabilityFixture();
  const [appointer, helper, second, stranger, ...rest] = world.personOrder;
  return {
    world,
    appointer: appointer!,
    helper: helper!,
    second: second!,
    stranger: stranger!,
    rest,
  };
}

describe("an appointer names someone they know", () => {
  test("the person who helped them is chosen over a stranger, for recorded reasons", () => {
    const { world, appointer, helper, stranger } = fixture();
    const before = helped(world, helper, appointer, "help", "major");
    const choice = chooseAppointee(before, {
      stableKey: "fixture:seat-1",
      appointerPersonId: appointer,
      post: POST,
      circle: [stranger, helper],
      eligible: () => true,
    });
    expect(choice?.personId).toBe(helper);
    expect(
      choice!.reasons.some((line) => /^The appointer trusts /.test(line)),
    ).toBe(true);
    const trace = choice!.world.history.decisionTraces.find(
      (row) => row.id === choice!.decisionTraceId,
    );
    expect(trace?.context.decisionType).toBe("appointment.choose-appointee");
    expect(trace?.context.actorPersonId).toBe(appointer);
    expect(choice!.shortList[0]).toBe(helper);
    expect(choice!.shortList).toContain(stranger);
  });

  test("the same world and seat always name the same person", () => {
    const { world, appointer, helper, second, stranger } = fixture();
    let before = helped(world, helper, appointer, "a", "meaningful");
    before = helped(before, second, appointer, "b", "meaningful");
    const input = {
      stableKey: "fixture:seat-2",
      appointerPersonId: appointer,
      post: POST,
      circle: [stranger, helper, second],
      eligible: () => true,
    };
    expect(chooseAppointee(before, input)?.personId).toBe(
      chooseAppointee(before, input)?.personId,
    );
  });

  test("the post's own rules decide who can be named", () => {
    const { world, appointer, helper, stranger } = fixture();
    const before = helped(world, helper, appointer, "help", "major");
    const choice = chooseAppointee(before, {
      stableKey: "fixture:seat-3",
      appointerPersonId: appointer,
      post: POST,
      circle: [stranger, helper],
      eligible: (id) => id !== helper,
    });
    // The helper cannot be named. The stranger has nothing for them, so the
    // appointer may name them or look beyond their circle; never the helper.
    expect([stranger, undefined]).toContain(choice?.personId);
    expect(
      chooseAppointee(before, {
        stableKey: "fixture:seat-4",
        appointerPersonId: appointer,
        post: POST,
        circle: [helper],
        eligible: () => false,
      }),
    ).toBeNull();
  });

  test("the controlled character's appointments are never chosen for them", () => {
    const { world, appointer, helper } = fixture();
    const controlled: World = {
      ...world,
      control: { kind: "person", personId: appointer },
    } as World;
    expect(
      chooseAppointee(controlled, {
        stableKey: "fixture:seat-5",
        appointerPersonId: appointer,
        post: POST,
        circle: [helper],
        eligible: () => true,
      }),
    ).toBeNull();
  });
});

describe("the disappointed office seeker", () => {
  test("someone who helped the appointer and was passed over holds a grievance", () => {
    const { world, appointer, helper, second, stranger } = fixture();
    // The helper helped twice as much, so the appointer names the helper; the
    // second person had helped too and expected something.
    let before = helped(world, helper, appointer, "a1", "major");
    before = helped(before, helper, appointer, "a2", "major");
    before = helped(before, second, appointer, "b", "meaningful");
    const choice = chooseAppointee(before, {
      stableKey: "fixture:seat-6",
      appointerPersonId: appointer,
      post: POST,
      circle: [stranger, helper, second],
      eligible: () => true,
    })!;
    expect(choice.personId).toBe(helper);
    // A stranger who never helped expected nothing.
    expect(choice.passedOver).toEqual([second]);

    const tensionBefore = readRelationshipStanding(
      choice.world,
      second,
      appointer,
    ).readings.tension.band;
    const after = recordPassedOver(choice.world, {
      stableKey: "fixture:seat-6",
      appointerPersonId: appointer,
      passedOver: choice.passedOver,
      post: POST,
    });
    const grievance = after.history.relationshipInteractions.at(-1)!;
    expect(grievance.kind).toBe("conflict:passed-over-for-appointment");
    expect(grievance.tags).toContain(APPOINTMENTS_VERSION);
    expect(tensionBefore).toBe("none");
    expect(
      readRelationshipStanding(after, second, appointer).readings.tension.band,
    ).not.toBe("none");
    // Nobody else holds one.
    expect(
      readRelationshipStanding(after, stranger, appointer).readings.tension
        .band,
    ).toBe("none");
  });
});
