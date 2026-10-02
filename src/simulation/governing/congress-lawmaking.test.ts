import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { createStartingPerson } from "../people";
import { createFormationContext, recordPrinciples } from "../politics";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createWorld, recordWorldEvent } from "../world";
import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { introduceMeasure, measurePosition } from "../legislation";
import { congressSeats } from "../living-world/congress-seats";
import {
  LIVING_WORLD_OPENING_KEY,
  LIVING_WORLD_WRITER_VERSION,
  SEAT_TENURE_EVENT,
} from "../living-world/opening";
import type { World } from "../types";
import { lawInForce, statuteAnswer } from "./law-in-force";
import { mayAnswerQuestion } from "./question-authority";
import {
  congressIntakeHandler,
  congressSittingHandler,
  CONGRESS_INTAKE_TRANSITION,
} from "./congress-lawmaking";

function emptyWorld(): World {
  return createWorld({
    seed: "congress-intake-report-fixture",
    currentDate: makeIsoDate("2026-03-01"),
    people: [],
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
    policyCatalog: createProductionPolicyCatalog(),
  });
}
function intake(world: World) {
  const scheduled = scheduleFutureDueItem(world, {
    stableKey: "test:congress-report-intake",
    dueAt: addDays(world.currentDate, 1),
    transitionKey: CONGRESS_INTAKE_TRANSITION,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: {
      kind: "authored",
      note: "Explicit report fixture, not a watched-world proof.",
    },
  });
  const due = scheduled.history.futureDueItems.at(-1)!;
  // Only the intake handler is under test; this partial chamber cannot run
  // the full Congress turnover simulation. Keep the canonical clock aligned.
  const ready = {
    ...scheduled,
    currentDate: due.dueAt,
    currentMoment: simulationMomentOnLocalDate(
      scheduled.currentMoment,
      due.dueAt,
    ),
  };
  return congressIntakeHandler(ready, due);
}
function oneSenator(): World {
  const base = emptyWorld();
  const senator = createStartingPerson({
    worldId: base.id,
    worldSeed: base.seed,
    currentDate: base.currentDate,
    homeJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    age: 45,
    givenName: "Morgan",
    familyName: "Fixture",
  });
  let world = createWorld({
    seed: base.seed,
    currentDate: base.currentDate,
    people: [senator],
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
    policyCatalog: base.policyCatalog,
  });
  const event = {
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    involvedEntityIds: [senator.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public" as const,
    tags: [LIVING_WORLD_WRITER_VERSION, "test:partial-congress-report-fixture"],
    summary: "An explicit fictional seated-member fixture, not a full Senate.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  };
  world = recordWorldEvent(world, {
    ...event,
    stableKey: LIVING_WORLD_OPENING_KEY,
    type: "setup.living-world-opening",
  });
  const seat = congressSeats().find((row) => row.chamberKey === "us-senate")!;
  world = recordWorldEvent(world, {
    ...event,
    stableKey: `test:senator:${seat.seatKey}`,
    type: SEAT_TENURE_EVENT,
    participants: [
      {
        personId: senator.id,
        role: "focus:subject",
        detail: "Explicit fixture senator.",
      },
    ],
    tags: [...event.tags, `seat:${seat.seatKey}`],
  });
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => {
      const issue = world.policyCatalog.issues[row.issueId];
      return (
        issue?.stableKey.startsWith("us-federal:") &&
        !issue.stableKey.startsWith("us-federal:tax.") &&
        row.principles?.length &&
        mayAnswerQuestion(world, NATIONAL_ELECTION_JURISDICTION.id, row.id) &&
        statuteAnswer(
          lawInForce(world, NATIONAL_ELECTION_JURISDICTION.id, row.id),
        ) !== "closed"
      );
    },
  )!;
  expect(question).toBeDefined();
  const desiredYes =
    statuteAnswer(
      lawInForce(world, NATIONAL_ELECTION_JURISDICTION.id, question.id),
    ) !== "yes";
  return recordPrinciples(
    world,
    question.principles!.map((bearing, index) => ({
      stableKey: `test:senator-principle:${index}`,
      personId: senator.id,
      principleId: bearing.principleId,
      formedAt: world.currentDate,
      stance:
        (bearing.bearing === "consistent-with") === desiredYes
          ? "endorses"
          : "rejects",
      conviction: "strong",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("other:explicit-fixture", {
        note: "Authored report fixture only.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
}

describe("Congress intake reports actual new measures", () => {
  it("reports zero and preserves next-intake scheduling when no member files", () => {
    const result = intake(emptyWorld());
    expect(result.world.history.legislativeMeasures ?? []).toHaveLength(0);
    expect(result.context).toBe(
      "No bill was filed during this Congress intake.",
    );
    expect(result.status).toBe("resolved");
    expect(
      result.world.history.futureDueItems.some(
        (row) =>
          row.transitionKey === CONGRESS_INTAKE_TRANSITION &&
          row.dueAt === "2026-04-01",
      ),
    ).toBe(true);
  });
  it("does not count a bill recorded before this intake", () => {
    const world = emptyWorld();
    const prior = introduceMeasure(world, {
      stableKey: "test:prior-congress-bill",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_PACK_ID,
      designation: "H.R. 1",
      shortTitle: "Prior bill",
      summary: "A prior authored fixture bill.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
    });
    const result = intake(prior);
    expect(result.world.history.legislativeMeasures).toEqual(
      prior.history.legislativeMeasures,
    );
    expect(result.context).toBe(
      "No bill was filed during this Congress intake.",
    );
  });
  it("reports the actual single filing from a coherent partial-chamber fixture", () => {
    const result = intake(oneSenator());
    expect(result.world.history.legislativeMeasures).toHaveLength(1);
    expect(result.context).toBe("Members of Congress filed 1 bill.");
    expect(result.world.history.legislativeMeasures![0]!.originChamberKey).toBe(
      "senate",
    );
    const measure = result.world.history.legislativeMeasures![0]!;
    expect(measurePosition(result.world, measure.id).phase).toBe(
      "awaiting-referral",
    );
    const sitting = result.world.history.futureDueItems.find(
      (row) => row.transitionKey === "congress:sitting",
    )!;
    expect(sitting).toBeDefined();
    // Direct handler fixture: apply the next institutional step without
    // skipping the unresolved fixture due items on a partial world clock.
    const referred = congressSittingHandler(result.world);
    expect(measurePosition(referred.world, measure.id).phase).toBe(
      "in-committee",
    );
    expect(
      measurePosition(referred.world, measure.id).committeeKey,
    ).not.toBeNull();
  });
});
