/// <reference types="node" />
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import {
  createWorld,
  recordWorldEvent,
  advanceWorld,
  writeWithWorldIntegrityOnce,
} from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { addDays } from "../dates";
import { personName } from "../people";
import { currentLifeCutoff } from "../life-queries";
import { createFormationContext, recordPrinciples } from "../politics";
import { currentFederalTenure, FEDERAL_TENURE_EVENT } from "../federal-tenures";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { stateJurisdictionForKey } from "../life-places";
import {
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "../future-transitions";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { addJudicialCourt, seatJudge, seatHolderAt } from "../judiciary/courts";
import { deserializeWorld, serializeWorld } from "../serialization";
import { seatedCongressChamber } from "./congress-chambers";
import {
  CHIEF_JUSTICE_NOMINATED_EVENT,
  CHIEF_JUSTICE_NOMINATION,
  CHIEF_JUSTICE_CONFIRMATION,
  CHIEF_JUSTICE_VACANCY_VERSION,
  chiefJusticeNominationHandler,
  confirmChiefJustice,
} from "./chief-justice-vacancy";
import { SUPREME_COURT_VOTE_EVENT } from "./supreme-court-appointments";
import type { World, EntityId } from "../types";

// Baseline mode runs the same explicit fixtures against the unchanged old
// caller before its deletion. It is an evidence capture, not a skipped check.
const baseline = process.env.G8_CHIEF_BASELINE === "1";
const seed = "G8-chief-justice-recorded-act";
const receipts: unknown[] = [];
let original: World;
let senate: World;
let supportingSenate: World;
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

function dueState(world: World, dueItemId: EntityId) {
  return futureDueItemStateAt(world, dueItemId, currentLifeCutoff(world));
}

function hash(world: World) {
  return createHash("sha256").update(JSON.stringify(world)).digest("hex");
}
function nomination(world: World) {
  return recordWorldEvent(world, {
    stableKey: "G8:explicit-nomination",
    type: CHIEF_JUSTICE_NOMINATED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [presidentId, nomineeId],
    participants: [
      { personId: presidentId, role: "focus:actor", detail: "President" },
      {
        personId: nomineeId,
        role: "focus:subject",
        detail: "Chief Justice nominee",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [`vacancy:${world.currentDate}`, "office:us-chief-justice"],
    summary: "The fixture President explicitly nominated an existing person.",
    context,
  });
}
function scheduled(world: World) {
  const next = scheduleFutureDueItem(nomination(world), {
    stableKey: `${CHIEF_JUSTICE_VACANCY_VERSION}:confirmation:${world.currentDate}:${nomineeId}`,
    dueAt: addDays(world.currentDate, 1),
    transitionKey: CHIEF_JUSTICE_CONFIRMATION,
    entityIds: [nomineeId],
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: "One-day boundary isolates the confirmation handler; not a legal deadline.",
    },
  });
  const due = next.history.futureDueItems.at(-1)!;
  return { world: next, due };
}
const handlers = createFutureTransitionHandlerRegistry([
  [
    CHIEF_JUSTICE_CONFIRMATION,
    (world, due) => confirmChiefJustice(world, due, (next) => next),
  ],
]);

beforeAll(() => {
  const demo = createDemoWorld(seed);
  original = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    currentMoment: demo.currentMoment,
    people: demo.personOrder.map((id) => demo.people[id]!),
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    policyCatalog: createProductionPolicyCatalog(),
  });
  [presidentId, nomineeId] = original.personOrder as [EntityId, EntityId];
  original = recordWorldEvent(original, {
    stableKey: "G8:president",
    type: FEDERAL_TENURE_EVENT,
    occurredAt: original.currentDate,
    recordedAt: original.currentDate,
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
  senate = writeWithWorldIntegrityOnce(original, () =>
    ensureLivingWorldOpening(original, presidentId),
  );
  senate = addJudicialCourt(senate, {
    courtId: "G8:fixture-highest-court",
    jurisdictionId: senate.jurisdictionOrder[0]!,
    name: "Explicit Fixture Highest Court",
    level: "local-highest",
    parentCourtId: null,
    sourceRecordId: null,
    identityBasis: "game-profile",
    createdAt: senate.currentDate,
    rules: {
      authorizedSeats: {
        state: "known",
        value: 1,
        basis: "game-profile",
        referenceId: "G8:authored-fixture-only",
      },
      termYears: {
        state: "unknown",
        reason: "Fixture establishes no legal term.",
      },
      mandatoryRetirementAge: {
        state: "unknown",
        reason: "Fixture establishes no retirement rule.",
      },
      caseJurisdiction: {
        state: "unknown",
        reason: "Fixture establishes no case authority.",
      },
      selectionRecordId: null,
      amendmentRoute: {
        state: "unknown",
        reason: "Fixture establishes no amendment route.",
      },
    },
  });
  senate = seatJudge(senate, {
    seatId: "G8:fixture-highest-court:seat:1",
    personId: nomineeId,
    startedAt: senate.currentDate,
    selection: {
      path: "initial-world",
      selectionRecordId: null,
      decisionRecordId: null,
      selectingPersonId: null,
      contestId: null,
      note: "Actual saved judicial tenure in an authored fixture.",
    },
    termEndsAt: null,
    retentionDueAt: null,
  });
  const principleId = senate.policyCatalog.principleOrder[0]!;
  const actors = [
    nomineeId,
    ...seatedCongressChamber(senate, "senate")!.body.members.map(
      (member) => member.personId!,
    ),
  ];
  supportingSenate = recordPrinciples(
    senate,
    actors.map((personId) => ({
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
        note: "Controlled matching principles shared by both comparison arms, not a natural confirmation rate.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
}, 30000);

afterAll(() => {
  if (process.env.G8_CHIEF_PROOF_PATH)
    writeFileSync(
      process.env.G8_CHIEF_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

describe("Chief Justice requires the recorded act", () => {
  it("does not draw a nominee when the President has no recorded eligible candidate", () => {
    const world = scheduleFutureDueItem(original, {
      stableKey: `${CHIEF_JUSTICE_VACANCY_VERSION}:nomination:${original.currentDate}:${original.currentDate}`,
      dueAt: addDays(original.currentDate, 1),
      transitionKey: CHIEF_JUSTICE_NOMINATION,
      entityIds: [presidentId],
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Controlled nomination boundary; no eligible acquaintance or recorded bench.",
      },
    });
    const due = world.history.futureDueItems.at(-1)!;
    const next = advanceWorld(
      world,
      1,
      createFutureTransitionHandlerRegistry([
        [CHIEF_JUSTICE_NOMINATION, chiefJusticeNominationHandler],
      ]),
    );
    const nominated = next.history.events.filter(
      (event) => event.type === CHIEF_JUSTICE_NOMINATED_EVENT,
    );
    expect(nominated).toHaveLength(baseline ? 1 : 0);
    expect(currentFederalTenure(next, "us-chief-justice")).toBeNull();
    expect(dueState(next, due.id)?.status).toBe(
      baseline ? "resolved" : "blocked",
    );
    receipts.push({
      case: "no-recorded-candidate",
      seed,
      nomineeIds: nominated.flatMap((event) =>
        event.participants
          .filter((row) => row.role === "focus:subject")
          .map((row) => row.personId),
      ),
      status: dueState(next, due.id)?.status,
      inputHash: hash(world),
      outputHash: hash(next),
    });
  });
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
      const holder = currentFederalTenure(next, "us-chief-justice");
      expect(holder?.personId ?? null).toBe(baseline ? nomineeId : null);
      expect(
        next.history.events.filter(
          (event) => event.type === SUPREME_COURT_VOTE_EVENT,
        ),
      ).toHaveLength(0);
      expect(dueState(next, due.id)?.status).toBe(
        baseline ? "resolved" : "blocked",
      );
      const continued = deserializeWorld(serializeWorld(next));
      expect(
        currentFederalTenure(continued, "us-chief-justice")?.personId ?? null,
      ).toBe(baseline ? nomineeId : null);
      expect(dueState(continued, due.id)?.status).toBe(
        baseline ? "resolved" : "blocked",
      );
      expect(
        advanceWorld(continued, 1, handlers).history.futureDueItems,
      ).toEqual(continued.history.futureDueItems);
      receipts.push({
        case: "no-senate",
        code,
        seed,
        nomineeId,
        nominee: personName(next.people[nomineeId]!),
        chief: holder?.personId ?? null,
        status: dueState(next, due.id)?.status,
        inputHash: hash(world),
        outputHash: hash(next),
      });
    },
  );
  it("records the seated Senate's vote before taking office and preserves repeat/SaveContinue", () => {
    const { world, due } = scheduled(senate);
    const next = advanceWorld(world, 1, handlers);
    const vote = next.history.events.find(
      (event) => event.type === SUPREME_COURT_VOTE_EVENT,
    )!;
    expect(vote).toBeDefined();
    expect(
      vote.participants.filter((row) => row.role === "agency:senate-vote"),
    ).toHaveLength(seatedCongressChamber(world, "senate")!.body.members.length);
    const chief = currentFederalTenure(next, "us-chief-justice");
    if (vote.tags.includes("outcome:confirmed")) {
      expect(chief?.personId).toBe(nomineeId);
      expect(vote.sequence).toBeLessThan(chief!.event.sequence);
      expect(seatHolderAt(next, "G8:fixture-highest-court:seat:1")).toBeNull();
    } else {
      expect(chief).toBeNull();
      expect(
        seatHolderAt(next, "G8:fixture-highest-court:seat:1")?.personId,
      ).toBe(nomineeId);
    }
    const continued = deserializeWorld(serializeWorld(next));
    expect(currentFederalTenure(continued, "us-chief-justice")?.personId).toBe(
      chief?.personId,
    );
    expect(
      advanceWorld(continued, 1, handlers).history.events.filter(
        (event) => event.type === SUPREME_COURT_VOTE_EVENT,
      ),
    ).toEqual(
      next.history.events.filter(
        (event) => event.type === SUPREME_COURT_VOTE_EVENT,
      ),
    );
    receipts.push({
      case: "recorded-vote",
      seed,
      nomineeId,
      name: personName(next.people[nomineeId]!),
      voteId: vote.id,
      voteTags: vote.tags,
      chief: chief?.personId ?? null,
      status: dueState(next, due.id)?.status,
      inputHash: hash(world),
      outputHash: hash(next),
    });
  });
  it("fills the office only after an affirmative recorded Senate vote", () => {
    const { world } = scheduled(supportingSenate);
    const next = advanceWorld(world, 1, handlers);
    const vote = next.history.events.find(
      (event) => event.type === SUPREME_COURT_VOTE_EVENT,
    )!;
    expect(vote.tags).toContain("outcome:confirmed");
    const chief = currentFederalTenure(next, "us-chief-justice")!;
    expect(chief.personId).toBe(nomineeId);
    expect(chief.event.sequence).toBeGreaterThan(vote.sequence);
    expect(seatHolderAt(next, "G8:fixture-highest-court:seat:1")).toBeNull();
    const continued = deserializeWorld(serializeWorld(next));
    expect(currentFederalTenure(continued, "us-chief-justice")!.event).toEqual(
      chief.event,
    );
    expect(
      advanceWorld(continued, 1, handlers).history.events.filter(
        (event) => event.type === SUPREME_COURT_VOTE_EVENT,
      ),
    ).toEqual([vote]);
    receipts.push({
      case: "affirmative-vote",
      seed,
      name: personName(next.people[nomineeId]!),
      nomineeId,
      chief: chief.personId,
      voteId: vote.id,
      voteTags: vote.tags,
      inputHash: hash(world),
      outputHash: hash(next),
    });
  });
});
