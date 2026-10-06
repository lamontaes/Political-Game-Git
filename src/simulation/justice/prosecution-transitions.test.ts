import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../life";
import { createProsecutionTransitionRegistry } from "./prosecution-transitions";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import * as decisions from "../decisions";
import * as courtReasoning from "./court-reasoning";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { recordEvidenceArtifact } from "../evidence";
import { SeededRng, pickDistinct } from "../rng";
import { lifePlaceStateIdentities } from "../life-places";
import { addDays } from "../dates";
import { composeWorldTimeHandlers } from "../campaigns";
import { createPressTransitionRegistry } from "../press/transitions";
import { PRESS_DESK_SWEEP_TRANSITION_KEY } from "../press/desk";
import { currentLifeCutoff } from "../life-queries";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "../future-transitions";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { serializeWorld, deserializeWorld } from "../serialization";
import { personName } from "../people";
import type { EntityId, World } from "../types";
import {
  advanceProsecutions,
  enterPlea,
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_DECLINED_EVENT,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";
import { PROSECUTION_STAGE_TRANSITION_KEY } from "./prosecution-transitions";

function seatedProsecutor(
  world: World,
  defendantId: EntityId,
  jurisdictionId: World["people"][string]["homeJurisdictionId"],
) {
  const person = Object.values(world.people).find(
    (person) =>
      person.id !== defendantId &&
      (world.control.kind !== "person" || person.id !== world.control.personId),
  )!;
  expect(person).toBeDefined();
  const provenance = {
    kind: "authored" as const,
    note: "Controlled recorded prosecutor appointment fixture; no opening official is invented.",
  };
  let next = createOrganization(world, {
    stableKey: "a104:fixture:office",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded prosecution office",
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = createWorkRelationship(next, {
    stableKey: "a104:fixture:appointment",
    personId: person.id,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-office",
    compensation: "unpaid",
    authority: "self-directed",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Prosecutor",
      occupationClassification: "profession:prosecutor",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 0, maximumHours: 0 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  return {
    world: next,
    personId: person.id,
    workRelationship: next.history.workRelationships.at(-1)!,
  };
}
afterEach(() => vi.restoreAllMocks());

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.G12_PROOF_PATH)
    writeFileSync(
      process.env.G12_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

// Controlled real-clock proofs use the composed court handler, without a year run.
describe("a saved prosecution stage owns its due item", () => {
  const rng = new SeededRng("team9-g10-floor-five-20260930");
  const states = pickDistinct(rng, lifePlaceStateIdentities(), 1);
  it.each(states)(
    "charges the named defendant on the actual due date in $jurisdictionKey",
    (state) => {
      const seed = `team9-g12-case-clock:${state.jurisdictionKey}`;
      // A small world (tests/fixtures/small-world.ts): residents and their
      // state, no opening life, so only the court clock has anything due.
      const small = smallWorld({ place: state.jurisdictionKey, seed });
      const place = small.place;
      const isolated = seatedProsecutor(
        small.world,
        small.personId,
        small.jurisdictionId,
      ).world;
      const subjectId = small.personId;
      const evidenceWorld = recordWorldEvent(isolated, {
        stableKey: "g12-clock-evidence-source",
        type: "fixture.prosecution-evidence",
        occurredAt: isolated.currentDate,
        recordedAt: isolated.currentDate,
        jurisdictionId: small.jurisdictionId,
        involvedEntityIds: [subjectId],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: ["fixture:recorded-evidence"],
        summary: "Controlled evidence source for the charging proof.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const evidenceSource = evidenceWorld.history.events.at(-1)!;
      const evidenceWithArtifact = recordEvidenceArtifact(evidenceWorld, {
        stableKey: "g12-clock-evidence-artifact",
        evidenceKind: "record:campaign-ledger-entry",
        createdAt: evidenceWorld.currentDate,
        recordedAt: evidenceWorld.currentDate,
        relatedEntityIds: [evidenceSource.id],
        access: "restricted",
        description: "Controlled campaign ledger entry supporting the case.",
        provenance: {
          kind: "simulated",
          sourceEntityIds: [evidenceSource.id],
        },
      });
      const evidenceArtifactId =
        evidenceWithArtifact.history.evidenceArtifacts.at(-1)!.id;
      const input = {
        stableKey: "g12-clock-case",
        subjectPersonId: subjectId,
        jurisdictionId: isolated.people[subjectId]!.homeJurisdictionId,
        offenseKey: "crime:robbery",
        evidence: "documentary" as const,
        standingFindings: 6,
        basisEventIds: [evidenceSource.id],
        basisRecordIds: [evidenceArtifactId],
        referredBy: {
          kind: "police" as const,
          label: "police",
          personId: null,
        },
      };
      const referral = referForProsecution(evidenceWithArtifact, input);
      expect(referForProsecution(referral.world, input).world).toBe(
        referral.world,
      );
      const item = referral.world.history.futureDueItems.find(
        (item) => item.transitionKey === PROSECUTION_STAGE_TRANSITION_KEY,
      )!;
      expect(item.stableKey).toBe(
        `justice:prosecution-stage:${referral.referralId}`,
      );
      expect(item.entityIds).toEqual([subjectId]);
      expect(item.dueAt).toBe(
        addDays(
          isolated.currentDate,
          UNRESEARCHED_PROSECUTION.chargeDecisionDays,
        ),
      );
      let legacy: World | undefined;
      let calls = 0;
      const courtHandler = composeWorldTimeHandlers().get(
        PROSECUTION_STAGE_TRANSITION_KEY,
      )!;
      expect(courtHandler).toBeTypeOf("function");
      const registry = createFutureTransitionHandlerRegistry([
        [
          PROSECUTION_STAGE_TRANSITION_KEY,
          (world, due) => {
            calls++;
            legacy = advanceProsecutions(world);
            const result = courtHandler(world, due);
            expect(result.world.history.events).toEqual(legacy.history.events);
            return result;
          },
        ],
      ]);
      const reloaded = deserializeWorld(serializeWorld(referral.world));
      const pressOnly = scheduleFutureDueItem(
        cancelFutureDueItem(reloaded, {
          stableKey: `a10-fixture-cancel:${item.id}`,
          dueItemId: item.id,
          effectiveAt: reloaded.currentDate,
          reasonKey: "fixture:press-only",
          context: "Isolate a newspaper sweep from the court's due item.",
        }),
        {
          stableKey: "press46:desk-sweep:900",
          dueAt: item.dueAt,
          transitionKey: PRESS_DESK_SWEEP_TRANSITION_KEY,
          entityIds: [reloaded.id],
          jurisdictionId: null,
          provenance: { kind: "simulated", sourceEntityIds: [reloaded.id] },
        },
      );
      const swept = resolveFutureDueItemsThrough(
        pressOnly,
        item.dueAt,
        createPressTransitionRegistry(),
      );
      expect(swept.currentDate).toBe(item.dueAt);
      expect(
        swept.history.events.filter((event) =>
          event.type.startsWith("justice."),
        ),
      ).toEqual(
        pressOnly.history.events.filter((event) =>
          event.type.startsWith("justice."),
        ),
      );
      const before = resolveFutureDueItemsThrough(
        reloaded,
        addDays(item.dueAt, -1),
        registry,
      );
      expect(calls).toBe(0);
      const charged = resolveFutureDueItemsThrough(
        before,
        item.dueAt,
        registry,
      );
      expect(calls).toBe(1);
      expect(legacy).toBeDefined();
      const events = charged.history.events.filter(
        (event) =>
          event.type === PROSECUTION_CHARGED_EVENT &&
          event.involvedEntityIds.includes(subjectId),
      );
      expect(
        events,
        `${seed}: ${personName(charged.people[subjectId]!)}`,
      ).toHaveLength(1);
      expect(events[0]!.occurredAt).toBe(item.dueAt);
      expect(events[0]!.involvedEntityIds).toContain(evidenceArtifactId);
      expect(events[0]!.tags).toContain(
        `justice.basis-record:${evidenceArtifactId}`,
      );
      console.info(
        `WATCHED CHARGE CHAIN — ${place.key}: recorded evidence ${evidenceSource.id} supports artifact ${evidenceArtifactId}; referral ${referral.referralId} names ${personName(charged.people[subjectId]!)}; justice.charged ${events[0]!.id} records the person and artifact.`,
      );
      expect(
        enterPlea(charged, {
          personId: subjectId,
          referralId: referral.referralId,
          plea: "not-guilty",
        }).ok,
      ).toBe(true);
      expect(
        futureDueItemStateAt(charged, item.id, currentLifeCutoff(charged))
          ?.status,
      ).toBe("resolved");
      const trialItem = charged.history.futureDueItems.find(
        (next) =>
          next.stableKey === `justice:prosecution-stage:${events[0]!.id}`,
      )!;
      expect(trialItem.dueAt).toBe(
        addDays(
          item.dueAt,
          prosecutionTimingFor(state.jurisdictionKey).resolveAfterDays,
        ),
      );
      const saved = deserializeWorld(serializeWorld(charged));
      assertWorldIntegrity(saved);
      const repeated = resolveFutureDueItemsThrough(
        saved,
        item.dueAt,
        registry,
      );
      expect(calls).toBe(1);
      expect(repeated.history.events).toEqual(charged.history.events);
      expect(repeated.history.futureDueItems).toEqual(
        charged.history.futureDueItems,
      );
      receipts.push({
        seed,
        place: place.key,
        personId: subjectId,
        name: personName(charged.people[subjectId]!),
        referralId: referral.referralId,
        dueItemId: item.id,
        dueAt: item.dueAt,
        chargeId: events[0]!.id,
        chargeDate: events[0]!.occurredAt,
        trialDueItemId: trialItem.id,
        trialDueAt: trialItem.dueAt,
        legacyEventParity: true,
        composedCourtHandler: true,
        pressOnlyJusticeUnchanged: true,
        pleaAvailableWithoutPress: true,
        reloadedRepeatCalls: calls,
      });
    },
  );
});

describe("A104 an unseated prosecutor leaves the saved case pending", () => {
  const seed = "overflow8-a104-recorded-prosecutor";
  const place = drawRandomPlace(seed);
  function referralFixture(seated: boolean) {
    const fixture = smallWorld({ seed, place: place.key });
    const appointment = seated
      ? seatedProsecutor(
          fixture.world,
          fixture.personId,
          fixture.jurisdictionId,
        )
      : null;
    const world = appointment?.world ?? fixture.world;
    const referral = referForProsecution(world, {
      stableKey: "a104:saved-referral",
      subjectPersonId: fixture.personId,
      jurisdictionId: fixture.jurisdictionId,
      offenseKey: "crime:robbery",
      evidence: "documentary",
      standingFindings: 0,
      basisEventIds: [],
      basisRecordIds: [],
      referredBy: {
        kind: "police",
        label: "recorded police referral",
        personId: null,
      },
    });
    const due = referral.world.history.futureDueItems.find(
      (item) => item.transitionKey === PROSECUTION_STAGE_TRANSITION_KEY,
    )!;
    return { fixture, appointment, referral, due };
  }
  function review(built: ReturnType<typeof referralFixture>) {
    return resolveFutureDueItemsThrough(
      deserializeWorld(serializeWorld(built.referral.world)),
      built.due.dueAt,
      createProsecutionTransitionRegistry(),
    );
  }
  it("does not charge or decline when there is no prosecutor", () => {
    const built = referralFixture(false);
    const world = review(built);
    expect(
      world.history.events.filter(
        (event) =>
          event.type === PROSECUTION_CHARGED_EVENT ||
          event.type === PROSECUTION_DECLINED_EVENT,
      ),
    ).toHaveLength(0);
    expect(
      world.history.decisionTraces.filter(
        (trace) => trace.context.decisionType === "justice.charge",
      ),
    ).toHaveLength(0);
    expect(
      serializeWorld(advanceProsecutions(world, built.referral.referralId)),
    ).toBe(serializeWorld(world));
  });
  it("records the seated prosecutor's actual decision and preserves it through save/reopen", () => {
    const built = referralFixture(true);
    const world = review(built);
    const trace = world.history.decisionTraces.find(
      (trace) => trace.context.decisionType === "justice.charge",
    )!;
    expect(trace).toBeDefined();
    expect(trace.context.actorPersonId).toBe(built.appointment!.personId);
    expect(decisions.isSelectedDecision(trace)).toBe(true);
    const outcome = world.history.events.find(
      (event) =>
        event.type === PROSECUTION_CHARGED_EVENT ||
        event.type === PROSECUTION_DECLINED_EVENT,
    )!;
    expect(
      outcome.participants.some(
        (participant) =>
          participant.role === "agency:decided" &&
          participant.personId === built.appointment!.personId,
      ),
    ).toBe(true);
    expect(outcome.context.motivation).toBeTruthy();
    expect(
      serializeWorld(
        advanceProsecutions(
          deserializeWorld(serializeWorld(world)),
          built.referral.referralId,
        ),
      ),
    ).toBe(serializeWorld(world));
  });
  it("does not substitute an ended or wrong-venue appointment", () => {
    const built = referralFixture(true);
    const work = built.appointment!.workRelationship;
    const prior = built.referral.world.history.workStatuses.find(
      (status) => status.workRelationshipId === work.id,
    )!;
    const ended = recordWorkStatus(built.referral.world, {
      stableKey: "a104:fixture:ended",
      workRelationshipId: work.id,
      effectiveAt: built.referral.world.currentDate,
      status: "ended",
      reason: "Controlled vacancy fixture",
      provenance: { kind: "authored", note: "Recorded office vacancy." },
      supersedesStatusId: prior.id,
    });
    const world = review({
      ...built,
      referral: { ...built.referral, world: ended },
    });
    expect(
      world.history.events.some(
        (event) =>
          event.type === PROSECUTION_CHARGED_EVENT ||
          event.type === PROSECUTION_DECLINED_EVENT,
      ),
    ).toBe(false);
    const foreign = referralFixture(false);
    const wrong = seatedProsecutor(
      foreign.referral.world,
      foreign.fixture.personId,
      foreign.fixture.stateJurisdictionId,
    );
    if (
      foreign.fixture.stateJurisdictionId !== foreign.fixture.jurisdictionId
    ) {
      expect(
        review({
          ...foreign,
          referral: { ...foreign.referral, world: wrong.world },
        }).history.events.some(
          (event) =>
            event.type === PROSECUTION_CHARGED_EVENT ||
            event.type === PROSECUTION_DECLINED_EVENT,
        ),
      ).toBe(false);
    }
  });
  it("keeps a tied charging decision pending instead of choosing the first option", () => {
    const original = courtReasoning.jurorConsiderations;
    vi.spyOn(courtReasoning, "jurorConsiderations").mockImplementation(
      (...args) =>
        original(...args)
          .slice(0, 2)
          .map((reason) => ({
            ...reason,
            importance: "moderate",
            confidence: "high",
          })),
    );
    const built = referralFixture(true);
    const world = review(built);
    expect(
      world.history.decisionTraces.find(
        (trace) => trace.context.decisionType === "justice.charge",
      )!.outcomeKind,
    ).toBe("undecided");
    expect(
      world.history.events.some(
        (event) =>
          event.type === PROSECUTION_CHARGED_EVENT ||
          event.type === PROSECUTION_DECLINED_EVENT,
      ),
    ).toBe(false);
    expect(
      serializeWorld(advanceProsecutions(world, built.referral.referralId)),
    ).toBe(serializeWorld(world));
  });
  it("opens an actual random-place new game", () => {
    const opened = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      }),
    );
    expect(opened.game).not.toBeNull();
    receipts.push({
      seed,
      place: place.key,
      name: place.displayName,
      randomOpening: true,
      playerPersonId: opened.game!.playerPersonId,
    });
    expect(
      opened.game!.world.people[opened.game!.playerPersonId]!
        .homeJurisdictionId,
    ).toBe(place.context.jurisdiction.id);
  });
});
