import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { createWorkRelationship } from "../life";
import { activeWorkRelationshipsAt } from "../life-queries";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import type { DecisionContext, World } from "../types";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  recordWorldEvent,
} from "../world";
import { officeConsequences } from "../governing/office-consequence";
import {
  answerForOfficeOnDesk,
  projectOfficeMatters,
} from "../../presentation/office-response";
import { appendPressRecord, pressRecordsOfKind } from "./store";
import {
  findingOfficeResponseBinding,
  recordFindingOfficeResponse,
  PRESS_MATTER_TAG,
} from "./index";

const seed = "team8-finding-office-response-all56";
const places = Object.keys(STATES)
  .sort((a, b) =>
    createStableId("decision", `${seed}:${a}`).localeCompare(
      createStableId("decision", `${seed}:${b}`),
    ),
  )
  .slice(0, 5);
function fixture(usps: string, controlled = false) {
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  const date = makeIsoDate("2026-03-02");
  const person = createLightweightPerson({
    worldId: createWorldId(`${seed}:${usps}`),
    worldSeed: `${seed}:${usps}`,
    index: 0,
    currentDate: date,
    homeJurisdictionId: state.id,
  });
  let world = createWorld({
    seed: `${seed}:${usps}`,
    currentDate: date,
    jurisdictions: [state],
    people: [person],
    control: controlled
      ? { kind: "person", personId: person.id }
      : { kind: "observer" },
  });
  world = createWorkRelationship(world, {
    stableKey: "fixture:held-office",
    personId: person.id,
    organizationId: null,
    startedAt: date,
    kind: "employment:legislative-member",
    compensation: "paid",
    authority: "self-directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note: "Controlled recorded office tenure, not an elected-world proof.",
    },
    initialRole: {
      title: "Recorded fixture legislator",
      occupationClassification: "profession:public-service",
      locationJurisdictionId: state.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: state.id,
      },
    },
  });
  world = recordWorldEvent(world, {
    stableKey: "fixture:finding",
    type: "matter.finding",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: state.id,
    involvedEntityIds: [person.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "Explicit controlled public finding fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = world.history.events.at(-1)!;
  const matter = appendPressRecord(world, "matter", {
    stableKey: "fixture:matter",
    family: "M1",
    subjectPersonIds: [person.id],
    occurrenceId: null,
    openedAt: date,
    originEventId: event.id,
    jurisdictionId: state.id,
  });
  world = matter.world;
  const proceeding = appendPressRecord(world, "matter-proceeding", {
    stableKey: "fixture:proceeding",
    matterId: matter.record.id,
    procedureKey: "fec-enforcement",
    institutionLabel: "Federal Election Commission",
    complainantPersonId: null,
    respondentPersonIds: [person.id],
    openedAt: date,
    openingEventId: event.id,
    confidentialWhilePending: true,
    simulatedDisclosure: null,
  });
  world = proceeding.world;
  const step = appendPressRecord(world, "proceeding-step", {
    stableKey: "fixture:step",
    proceedingId: proceeding.record.id,
    step: "finding",
    at: date,
    eventId: event.id,
    nextDueAt: null,
    nextDueBasis: null,
    outcome: "finding",
    closes: true,
    publicStep: true,
    evidenceArtifactIds: [],
  });
  world = step.world;
  if (controlled)
    world = recordWorldEvent(world, {
      ...event,
      stableKey: "fixture:player-finding-notice",
      type: "fixture.player-finding-notice",
      tags: [`${PRESS_MATTER_TAG}${matter.record.id}`],
      summary: "Controlled public notice of the saved finding.",
    });
  const subject = {
    proceedingId: proceeding.record.id,
    stepId: step.record.id,
    personId: person.id,
    officeKey: "fixture:held-office",
  };
  return { world, person, subject, event };
}
function decision(
  f: ReturnType<typeof fixture>,
  choice: "resign" | "remain" | null,
) {
  const binding = findingOfficeResponseBinding(f.world, f.subject)!;
  const context: DecisionContext = {
    stableKey: "fixture:subject-choice",
    decisionType: binding.decisionType,
    actorPersonId: f.person.id,
    cutoff: {
      asOfDate: f.world.currentDate,
      historySequenceExclusive: f.world.history.nextSequence,
    },
    subject: binding.subject,
    options: binding.options,
    constraints:
      choice === null
        ? binding.options.map((o) => ({
            stableKey: `fixture:block:${o.key}`,
            optionKey: o.key,
            kind: "fixture:blocked-choice",
            explanation: "Controlled blocked-choice fixture.",
            sourceRefs: [],
          }))
        : [],
    considerations:
      choice === null
        ? []
        : [
            {
              stableKey: "fixture:explicit-choice",
              optionKey: choice,
              sourceType: "context:explicit-fixture-choice",
              direction: "supports",
              importance: "strong",
              confidence: "high",
              explanation:
                "The controlled fixture supplies this explicit choice; no NPC motive is inferred.",
              sourceRefs: [],
            },
          ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  };
  const world = recordDurableDecisionTrace(
    f.world,
    evaluateDecision(f.world, context),
  );
  return {
    world,
    input: {
      ...f.subject,
      decisionTraceId: world.history.decisionTraces.at(-1)!.id,
      statement: "I am standing down from this office today.",
    },
  };
}

describe("saved finding subject choice reaches the existing office writer", () => {
  it.each(places)(
    "records only the actual selected respondent resignation in %s",
    (usps) => {
      const f = fixture(usps),
        d = decision(f, "resign");
      const before = serializeWorld(d.world);
      const next = recordFindingOfficeResponse(d.world, d.input);
      expect(serializeWorld(d.world)).toBe(before);
      expect(activeWorkRelationshipsAt(next, f.person.id)).toHaveLength(0);
      const responses = pressRecordsOfKind(next, "matter-response");
      expect(responses).toHaveLength(1);
      expect(responses[0]).toMatchObject({
        actorPersonId: f.person.id,
        actorRole: "subject",
        response: "resign",
        decisionTraceId: d.input.decisionTraceId,
      });
      expect(officeConsequences(next, f.subject.officeKey)).toMatchObject([
        { kind: "resignation", changed: true },
      ]);
      const words = next.history.events.find(
        (e) => e.id === responses[0]!.eventId,
      )!;
      expect(words.context.immediateReaction).toBe(d.input.statement);
      const officeEvent = next.history.events.find(
        (e) => e.type === "governing.office-consequence",
      )!;
      expect(officeEvent.tags).toContain(`evidence:${f.event.id}`);
      expect(officeEvent.tags).toContain(`evidence:${words.id}`);
      assertWorldIntegrity(next);
      expect(recordFindingOfficeResponse(next, d.input)).toBe(next);
      const loaded = deserializeWorld(serializeWorld(next));
      expect(recordFindingOfficeResponse(loaded, d.input)).toBe(loaded);
      expect(serializeWorld(loaded)).toBe(serializeWorld(next));
      if (process.env.WATCHED_RUN_OUT)
        appendFileSync(
          process.env.WATCHED_RUN_OUT,
          JSON.stringify({
            seed: `${seed}:${usps}`,
            usps,
            personId: f.person.id,
            name: `${f.person.givenName} ${f.person.familyName}`,
            officeKey: f.subject.officeKey,
            findingEventId: f.event.id,
            decisionTraceId: d.input.decisionTraceId,
            responseEventId: words.id,
            officeEventId: officeEvent.id,
            statement: d.input.statement,
            repeatUnchanged: true,
            reloadUnchanged: true,
          }) + "\n",
        );
    },
  );
  it("keeps the office for a selected remain response", () => {
    const f = fixture(places[0]!),
      d = decision(f, "remain");
    const next = recordFindingOfficeResponse(d.world, {
      ...d.input,
      statement: "I am remaining in this office.",
    });
    expect(activeWorkRelationshipsAt(next, f.person.id)).toHaveLength(1);
    expect(officeConsequences(next)).toEqual([]);
    expect(pressRecordsOfKind(next, "matter-response")[0]!.response).toBe(
      "no-action",
    );
    assertWorldIntegrity(deserializeWorld(serializeWorld(next)));
  });
  it("does not turn a blocked/null decision or missing words into resignation", () => {
    const f = fixture(places[0]!),
      blocked = decision(f, null),
      selected = decision(f, "resign");
    expect(recordFindingOfficeResponse(blocked.world, blocked.input)).toBe(
      blocked.world,
    );
    expect(
      recordFindingOfficeResponse(selected.world, {
        ...selected.input,
        statement: "  ",
      }),
    ).toBe(selected.world);
    expect(
      recordFindingOfficeResponse(selected.world, {
        ...selected.input,
        officeKey: "unrecorded-office",
      }),
    ).toBe(selected.world);
  });
  it("refuses an undecided saved-trace shape even with a stale selected key", () => {
    const f = fixture(places[0]!),
      d = decision(f, "resign");
    // Consumer guard fixture, not a canonical evaluator/reload proof for undecided.
    const world: World = {
      ...d.world,
      history: {
        ...d.world.history,
        decisionTraces: d.world.history.decisionTraces.map((t) => ({
          ...t,
          outcomeKind: "undecided" as const,
        })),
      },
    };
    expect(recordFindingOfficeResponse(world, d.input)).toBe(world);
  });
  it("requires the saved finding, subject and office scope to match the decision", () => {
    const f = fixture(places[0]!),
      d = decision(f, "resign");
    expect(
      recordFindingOfficeResponse(d.world, {
        ...d.input,
        personId: createStableId("person", "fixture:missing-person"),
      }),
    ).toBe(d.world);
    const wrong: World = {
      ...d.world,
      history: {
        ...d.world.history,
        decisionTraces: d.world.history.decisionTraces.map((t) => ({
          ...t,
          context: {
            ...t.context,
            subject: { ...t.context.subject, entityId: null },
          },
        })),
      },
    };
    expect(recordFindingOfficeResponse(wrong, d.input)).toBe(wrong);
  });
});

describe("actual player office-response caller after a finding", () => {
  it.each(places)(
    "saves the controlled subject's own chosen words and trace in %s",
    (usps) => {
      const f = fixture(usps, true);
      const view = projectOfficeMatters(f.world, f.person.id)[0]!;
      const statement = "  I choose to resign this office today.  ";
      const before = serializeWorld(f.world);
      const result = answerForOfficeOnDesk(f.world, {
        personId: f.person.id,
        matterId: view.matterId,
        kind: "resignation",
        statement,
      });
      expect(serializeWorld(f.world)).toBe(before);
      const trace = result.world.history.decisionTraces.at(-1)!;
      expect(trace.context.actorPersonId).toBe(f.person.id);
      expect(trace.selectedOptionKey).toBe("resign");
      expect(trace.context.subject.entityId).toBe(f.event.id);
      expect(trace.context.randomness).toBe("none");
      expect(trace.context.considerations[0]?.explanation).toBe(statement);
      const choiceEvent = result.world.history.events.find(
        (event) => event.type === "office.answered-for-matter",
      )!;
      expect(choiceEvent.context.immediateReaction).toBe(statement);
      expect(trace.context.considerations[0]?.sourceRefs).toEqual([
        { kind: "historical-event", eventId: choiceEvent.id },
      ]);
      expect(
        result.world.history.events.find(
          (event) => event.type === "press.finding-office-response",
        )?.context.immediateReaction,
      ).toBe(statement);
      expect(activeWorkRelationshipsAt(result.world, f.person.id)).toHaveLength(
        0,
      );
      expect(result.line).toContain("The office is vacant from");
      if (process.env.PLAYER_CALLER_RUN_OUT)
        appendFileSync(
          process.env.PLAYER_CALLER_RUN_OUT,
          JSON.stringify({
            seed: `${seed}:${usps}`,
            usps,
            personId: f.person.id,
            name: `${f.person.givenName} ${f.person.familyName}`,
            findingEventId: f.event.id,
            choiceEventId: choiceEvent.id,
            decisionTraceId: trace.id,
            statement,
            line: result.line,
          }) + "\n",
        );
      assertWorldIntegrity(result.world);
      const loaded = deserializeWorld(serializeWorld(result.world));
      expect(serializeWorld(loaded)).toBe(serializeWorld(result.world));
      expect(() =>
        answerForOfficeOnDesk(loaded, {
          personId: f.person.id,
          matterId: view.matterId,
          kind: "resignation",
          statement,
        }),
      ).toThrow(/nothing of yours/);
    },
  );
  it("requires actual chosen words instead of silently generating a finding resignation", () => {
    const f = fixture(places[0]!, true);
    const view = projectOfficeMatters(f.world, f.person.id)[0]!;
    const before = serializeWorld(f.world);
    expect(() =>
      answerForOfficeOnDesk(f.world, {
        personId: f.person.id,
        matterId: view.matterId,
        kind: "resignation",
      }),
    ).toThrow(/Choose the words/);
    expect(serializeWorld(f.world)).toBe(before);
  });
  it("does not convert the player caller into an autonomous choice for another subject", () => {
    const f = fixture(places[0]!);
    const binding = findingOfficeResponseBinding(f.world, f.subject)!;
    expect(() =>
      answerForOfficeOnDesk(f.world, {
        personId: f.person.id,
        matterId: binding.proceeding.matterId,
        kind: "resignation",
        statement: "I resign.",
      }),
    ).toThrow(/Only the character/);
    expect(activeWorkRelationshipsAt(f.world, f.person.id)).toHaveLength(1);
    expect(f.world.history.decisionTraces).toHaveLength(0);
  });
});
