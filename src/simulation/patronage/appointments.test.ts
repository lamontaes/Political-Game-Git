import { describe, expect, test } from "vitest";
import { createPortabilityFixture } from "../portability-fixture";
import { recordRelationshipInteraction } from "../records";
import { readRelationshipStanding } from "../relationship-standing";
import type { EntityId, World } from "../types";
import {
  APPOINTMENTS_VERSION,
  chooseAppointee,
  recordPassedOver,
} from "./appointments";

const POST = { officeKey: "fixture-council-seat", title: "council member" };

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
