/// <reference types="node" />
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays } from "../dates";
import { createDemoWorld } from "../demo";
import { FEDERAL_TENURE_EVENT } from "../federal-tenures";
import {
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "../future-transitions";
import { addJudicialCourt, seatHolderAt, seatJudge } from "../judiciary/courts";
import type { JudicialCourtRules } from "../judiciary/types";
import { currentLifeCutoff } from "../life-queries";
import { stateJurisdictionForKey } from "../life-places";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { personName } from "../people";
import { createFormationContext, recordPrinciples } from "../politics";
import { createProductionPolicyCatalog } from "../production-catalog";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import {
  advanceWorld,
  createWorld,
  recordWorldEvent,
  writeWithWorldIntegrityOnce,
} from "../world";
import { seatedCongressChamber } from "./congress-chambers";
import {
  ASSOCIATE_JUSTICE_CONFIRMATION,
  SUPREME_COURT_APPOINTMENTS_VERSION,
  SUPREME_COURT_ID,
  SUPREME_COURT_NOMINATED_EVENT,
  SUPREME_COURT_SEATED_EVENT,
  SUPREME_COURT_VOTE_EVENT,
  confirmAssociateJustice,
} from "./supreme-court-appointments";

// The unchanged old caller runs these same inputs before the bypass is deleted.
const baseline = process.env.G8_ASSOCIATE_BASELINE === "1";
const seed = "G8-chief-justice-recorded-act";
const seatId = `${SUPREME_COURT_ID}:seat:2`;
const lowerSeatId = "G8:fixture-highest-court:seat:1";
const receipts: unknown[] = [];
let original: World;
let senate: World;
let supportingSenate: World;
let rejectingSenate: World;
let presidentId: EntityId;
let nomineeId: EntityId;
const context = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};

function hash(world: World) {
  return createHash("sha256").update(JSON.stringify(world)).digest("hex");
}
function dueState(world: World, id: EntityId) {
  return futureDueItemStateAt(world, id, currentLifeCutoff(world));
}
function rules(count: number): JudicialCourtRules {
  return {
    authorizedSeats: {
      state: "known",
      value: count,
      basis: "game-profile",
      referenceId: "G8:explicit-court-fixture",
    },
    termYears: { state: "unknown", reason: "No fixture term is established." },
    mandatoryRetirementAge: {
      state: "unknown",
      reason: "No fixture retirement rule is established.",
    },
    caseJurisdiction: {
      state: "unknown",
      reason: "No fixture case authority is established.",
    },
    selectionRecordId: null,
    amendmentRoute: {
      state: "unknown",
      reason: "No fixture amendment route is established.",
    },
  };
}
function withCourts(world: World): World {
  let next = addJudicialCourt(world, {
    courtId: SUPREME_COURT_ID,
    jurisdictionId: null,
    name: "Supreme Court of the United States",
    level: "federal-supreme",
    parentCourtId: null,
    sourceRecordId: null,
    identityBasis: "game-profile",
    createdAt: world.currentDate,
    rules: {
      ...rules(9),
      authorizedSeats: {
        state: "known",
        value: 9,
        basis: "sourced",
        referenceId: "28 USC 1: Chief Justice and eight associate justices",
      },
    },
  });
  next = addJudicialCourt(next, {
    courtId: "G8:fixture-highest-court",
    jurisdictionId: next.jurisdictionOrder[0]!,
    name: "Explicit Fixture Highest Court",
    level: "local-highest",
    parentCourtId: null,
    sourceRecordId: null,
    identityBasis: "game-profile",
    createdAt: next.currentDate,
    rules: rules(1),
  });
  return seatJudge(next, {
    seatId: lowerSeatId,
    personId: nomineeId,
    startedAt: next.currentDate,
    selection: {
      path: "initial-world",
      selectionRecordId: null,
      decisionRecordId: null,
      selectingPersonId: null,
      contestId: null,
      note: "Actual saved lower-court tenure in an authored fixture.",
    },
    termEndsAt: null,
    retentionDueAt: null,
  });
}
function scheduled(world: World) {
  let next = recordWorldEvent(world, {
    stableKey: "G8:explicit-associate-nomination",
    type: SUPREME_COURT_NOMINATED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [presidentId, nomineeId],
    participants: [
      { personId: presidentId, role: "focus:actor", detail: "President" },
      {
        personId: nomineeId,
        role: "focus:subject",
        detail: "Associate nominee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [`judicial-seat:${seatId}`, `vacancy:2:${world.currentDate}`],
    summary: "The fixture President explicitly nominated an existing judge.",
    context,
  });
  next = scheduleFutureDueItem(next, {
    stableKey: `${SUPREME_COURT_APPOINTMENTS_VERSION}:associate-confirmation:2:${world.currentDate}:${nomineeId}`,
    dueAt: addDays(world.currentDate, 1),
    transitionKey: ASSOCIATE_JUSTICE_CONFIRMATION,
    entityIds: [nomineeId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: "One-day boundary isolates the confirmation handler; not a legal deadline.",
    },
  });
  return { world: next, due: next.history.futureDueItems.at(-1)! };
}
const handlers = createFutureTransitionHandlerRegistry([
  [
    ASSOCIATE_JUSTICE_CONFIRMATION,
    (world, due) => confirmAssociateJustice(world, due, (next) => next),
  ],
]);

beforeAll(() => {
  const demo = createDemoWorld(seed);
  let bare = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    currentMoment: demo.currentMoment,
    people: demo.personOrder.map((id) => demo.people[id]!),
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    policyCatalog: createProductionPolicyCatalog(),
  });
  [presidentId, nomineeId] = bare.personOrder as [EntityId, EntityId];
  bare = recordWorldEvent(bare, {
    stableKey: "G8:president",
    type: FEDERAL_TENURE_EVENT,
    occurredAt: bare.currentDate,
    recordedAt: bare.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [presidentId],
    participants: [
      { personId: presidentId, role: "focus:subject", detail: "President" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["office:us-president"],
    summary: "A saved person holds the fictional fixture Presidency.",
    context,
  });
  original = withCourts(bare);
  senate = withCourts(
    writeWithWorldIntegrityOnce(bare, () =>
      ensureLivingWorldOpening(bare, presidentId),
    ),
  );
  const principleId = senate.policyCatalog.principleOrder[0]!;
  supportingSenate = recordPrinciples(
    senate,
    [
      nomineeId,
      ...seatedCongressChamber(senate, "senate")!.body.members.map(
        (member) => member.personId!,
      ),
    ].map((personId) => ({
      stableKey: `G8:explicit-shared-principle:${personId}`,
      personId,
      principleId,
      formedAt: senate.currentDate,
      stance: "endorses",
      strength: 1,
      conviction: "settled",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("reflection:test", {
        note: "Matching principles shared by both arms, not a natural confirmation rate.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
  rejectingSenate = recordPrinciples(
    senate,
    [
      nomineeId,
      ...seatedCongressChamber(senate, "senate")!.body.members.map(
        (member) => member.personId!,
      ),
    ].map((personId) => ({
      stableKey: `G8:explicit-opposing-principle:${personId}`,
      personId,
      principleId,
      formedAt: senate.currentDate,
      stance: personId === nomineeId ? "endorses" : "rejects",
      strength: 1,
      conviction: "settled",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("reflection:test", {
        note: "Opposing principles shared by both arms, not a natural rejection rate.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
}, 30000);

afterAll(() => {
  if (process.env.G8_ASSOCIATE_PROOF_PATH)
    writeFileSync(
      process.env.G8_ASSOCIATE_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

describe("Associate Justice requires recorded Senate consent", () => {
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "leaves an unvoted nomination pending for an observer in %s",
    (code) => {
      const jurisdiction = stateJurisdictionForKey(`US-${code}`)!;
      const observer = original.personOrder.at(-1)!;
      const start: World = {
        ...original,
        people: {
          ...original.people,
          [observer]: {
            ...original.people[observer]!,
            homeJurisdictionId: jurisdiction.id,
            establishedFacts: original.people[observer]!.establishedFacts.map(
              (fact) =>
                fact.kind === "residence" && fact.endedAt === null
                  ? { ...fact, jurisdictionId: jurisdiction.id }
                  : fact,
            ),
          },
        },
        jurisdictions: {
          ...original.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: [
          ...new Set([...original.jurisdictionOrder, jurisdiction.id]),
        ],
      };
      const { world, due } = scheduled(start);
      expect(seatedCongressChamber(world, "senate")).toBeNull();
      const next = advanceWorld(world, 1, handlers);
      const holder = seatHolderAt(next, seatId);
      expect(holder?.personId ?? null).toBe(baseline ? nomineeId : null);
      expect(seatHolderAt(next, lowerSeatId)?.personId ?? null).toBe(
        baseline ? null : nomineeId,
      );
      expect(
        next.history.events.filter(
          (event) => event.type === SUPREME_COURT_VOTE_EVENT,
        ),
      ).toHaveLength(0);
      expect(
        next.history.events.filter(
          (event) => event.type === SUPREME_COURT_SEATED_EVENT,
        ),
      ).toHaveLength(baseline ? 1 : 0);
      expect(dueState(next, due.id)?.status).toBe(
        baseline ? "resolved" : "blocked",
      );
      const continued = deserializeWorld(serializeWorld(next));
      expect(continued.judiciary).toEqual(next.judiciary);
      expect(dueState(continued, due.id)?.status).toBe(
        baseline ? "resolved" : "blocked",
      );
      const repeated = advanceWorld(continued, 1, handlers);
      expect(repeated.judiciary).toEqual(continued.judiciary);
      expect(repeated.history.futureDueItems).toEqual(
        continued.history.futureDueItems,
      );
      receipts.push({
        case: "no-senate",
        code,
        seed,
        nomineeId,
        name: personName(next.people[nomineeId]!),
        justice: holder?.personId ?? null,
        status: dueState(next, due.id)?.status,
        inputHash: hash(world),
        outputHash: hash(next),
      });
    },
  );

  it.each([
    ["recorded-vote", () => senate],
    ["affirmative-vote", () => supportingSenate],
    ["rejected-vote", () => rejectingSenate],
  ] as const)(
    "preserves %s and requires the saved vote before the judicial tenure",
    (label, getWorld) => {
      const { world, due } = scheduled(getWorld());
      const next = advanceWorld(world, 1, handlers);
      const vote = next.history.events.find(
        (event) => event.type === SUPREME_COURT_VOTE_EVENT,
      )!;
      expect(vote).toBeDefined();
      expect(
        vote.participants.filter((row) => row.role === "agency:senate-vote"),
      ).toHaveLength(
        seatedCongressChamber(world, "senate")!.body.members.length,
      );
      const holder = seatHolderAt(next, seatId);
      if (label === "affirmative-vote")
        expect(vote.tags).toContain("outcome:confirmed");
      if (label === "rejected-vote")
        expect(vote.tags).toContain("outcome:rejected");
      if (vote.tags.includes("outcome:confirmed")) {
        expect(holder?.personId).toBe(nomineeId);
        const tenure = next.judiciary!.seatTenures.find(
          (row) => row.tenureId === holder!.tenureId,
        )!;
        expect(tenure.selection.decisionRecordId).toBe(vote.id);
        expect(tenure.selection.note).toMatch(/^Confirmed by the Senate,/);
        expect(seatHolderAt(next, lowerSeatId)).toBeNull();
        const seated = next.history.events.find(
          (event) => event.type === SUPREME_COURT_SEATED_EVENT,
        )!;
        expect(seated.sequence).toBeGreaterThan(vote.sequence);
      } else {
        expect(holder).toBeNull();
        expect(seatHolderAt(next, lowerSeatId)?.personId).toBe(nomineeId);
      }
      const continued = deserializeWorld(serializeWorld(next));
      expect(continued.judiciary).toEqual(next.judiciary);
      const repeated = advanceWorld(continued, 1, handlers);
      expect(repeated.judiciary).toEqual(continued.judiciary);
      expect(
        repeated.history.events.filter(
          (event) => event.type === SUPREME_COURT_VOTE_EVENT,
        ),
      ).toEqual([vote]);
      receipts.push({
        case: label,
        seed,
        nomineeId,
        name: personName(next.people[nomineeId]!),
        justice: holder?.personId ?? null,
        voteId: vote.id,
        voteTags: vote.tags,
        status: dueState(next, due.id)?.status,
        inputHash: hash(world),
        outputHash: hash(next),
      });
    },
  );
});
