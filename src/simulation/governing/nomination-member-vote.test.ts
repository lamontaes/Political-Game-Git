/// <reference types="node" />
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as decisions from "../decisions";
import { US_CONGRESS_PACK_ID } from "../congress-rule-pack";
import { introduceMeasure } from "../legislation";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { addDays } from "../dates";
import { currentFederalTenure } from "../federal-tenures";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
  futureDueItemStateAt,
} from "../future-transitions";
import { currentLifeCutoff } from "../life-queries";
import { advanceWorld } from "../world";
import { createDemoWorld } from "../demo";
import { FEDERAL_TENURE_EVENT } from "../federal-tenures";
import { addJudicialCourt, seatJudge } from "../judiciary/courts";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { stateJurisdictionForKey } from "../life-places";
import { personName } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  createWorld,
  recordWorldEvent,
  writeWithWorldIntegrityOnce,
} from "../world";
import type { EntityId, World } from "../types";
import {
  CHIEF_JUSTICE_NOMINATED_EVENT,
  CHIEF_JUSTICE_CONFIRMATION,
  CHIEF_JUSTICE_VACANCY_VERSION,
  confirmChiefJustice,
} from "./chief-justice-vacancy";
import { decideChamberVote } from "./chamber-votes";
import { seatedCongressChamber } from "./congress-chambers";
import {
  briefSenateOnNominee,
  recordConfirmationVote,
  senateConfirmationVote,
  supremeCourtNomineePool,
} from "./supreme-court-appointments";

const seed = "G7-recorded-nomination-member-vote";
const receipts: unknown[] = [];
let world: World;
let nomineeId: EntityId;
let presidentId: EntityId;
let nominationEventId: EntityId;
const context = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

beforeAll(() => {
  const demo = createDemoWorld(seed);
  let initial = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    currentMoment: demo.currentMoment,
    people: demo.personOrder.map((id) => demo.people[id]!),
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    policyCatalog: createProductionPolicyCatalog(),
  });
  [presidentId, nomineeId] = initial.personOrder as [EntityId, EntityId];
  initial = recordWorldEvent(initial, {
    stableKey: "G7:fixture-president",
    type: FEDERAL_TENURE_EVENT,
    occurredAt: initial.currentDate,
    recordedAt: initial.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [presidentId],
    participants: [
      { personId: presidentId, role: "focus:subject", detail: "President" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["office:us-president"],
    summary: "An actual fixture person holds the fictional Presidency.",
    context,
  });
  world = writeWithWorldIntegrityOnce(initial, () =>
    ensureLivingWorldOpening(initial, initial.personOrder[0]!),
  );
  world = addJudicialCourt(world, {
    courtId: "G7:fixture-highest-court",
    jurisdictionId: world.jurisdictionOrder[0]!,
    name: "Explicit Fixture Highest Court",
    level: "local-highest",
    parentCourtId: null,
    sourceRecordId: null,
    identityBasis: "game-profile",
    createdAt: world.currentDate,
    rules: {
      authorizedSeats: {
        state: "known",
        value: 1,
        basis: "game-profile",
        referenceId: "G7:fixture-only",
      },
      termYears: {
        state: "unknown",
        reason: "No term is established by the fixture.",
      },
      mandatoryRetirementAge: {
        state: "unknown",
        reason: "No retirement rule is established.",
      },
      caseJurisdiction: {
        state: "unknown",
        reason: "No case authority is established.",
      },
      selectionRecordId: null,
      amendmentRoute: {
        state: "unknown",
        reason: "No amendment route is established.",
      },
    },
  });
  world = seatJudge(world, {
    seatId: "G7:fixture-highest-court:seat:1",
    personId: nomineeId,
    startedAt: world.currentDate,
    termEndsAt: null,
    retentionDueAt: null,
    selection: {
      path: "initial-world",
      selectionRecordId: null,
      decisionRecordId: null,
      selectingPersonId: null,
      contestId: null,
      note: "An actual recorded bench in an authored fixture.",
    },
  });
  nomineeId = supremeCourtNomineePool(world, "chief")[0]!.personId;
  world = recordWorldEvent(world, {
    stableKey: "G7:recorded-chief-nomination",
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
    tags: ["office:us-chief-justice", `vacancy:${world.currentDate}`],
    summary: "The fixture President names an actual recorded judge.",
    context,
  });
  nominationEventId = world.history.events.at(-1)!.id;
  world = briefSenateOnNominee(world, nomineeId);
}, 30000);

afterAll(() => {
  if (process.env.G7_NOMINATION_PROOF_PATH)
    writeFileSync(
      process.env.G7_NOMINATION_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});
afterEach(() => vi.restoreAllMocks());

describe("recorded nominations use the member vote survivor", () => {
  it("keeps the existing bill arm on the same real sponsor and Senate", () => {
    const members = seatedCongressChamber(world, "senate")!.body.members;
    const propositionId = world.policyCatalog.propositionOrder.find(
      (id) =>
        world.policyCatalog.propositions[id]!.stableKey ===
        "us-federal-positions:tax.raise-top-income-tax-rate",
    )!;
    expect(propositionId).toBeDefined();
    const inputWorld = introduceMeasure(
      ensureNationalElectionJurisdiction(world),
      {
        stableKey: "G7:bill-arm-fixture",
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: US_CONGRESS_PACK_ID,
        designation: "S. G7",
        shortTitle: "Explicit bill-arm fixture",
        summary: "A controlled bill question, separate from the nomination.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "senate",
        sponsorPersonId: members[0]!.personId,
        propositionIds: [propositionId],
        propositionAnswers: [{ propositionId, answer: "yes" }],
      },
    );
    const measure = inputWorld.history.legislativeMeasures!.at(-1)!;
    const ballots = decideChamberVote(inputWorld, {
      stableKey: "G7:bill-floor-question",
      members,
      question: {
        question: {
          measureId: measure.id,
          purpose: "floor-stage",
          forumKey: "senate",
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Pass the fixture bill?",
      },
    });
    expect(
      ballots.find((row) => row.personId === measure.sponsorPersonId)
        ?.disposition,
    ).toBe("yea");
    receipts.push({
      case: "bill-arm",
      seed,
      measureId: measure.id,
      sponsorPersonId: measure.sponsorPersonId,
      inputHash: hash(inputWorld),
      ballots,
    });
  });
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "preserves the same recorded nominee and Senate reasons for an observer in %s",
    (code) => {
      const jurisdiction = stateJurisdictionForKey(`US-${code}`)!;
      const observer = world.personOrder[0]!;
      const inputWorld: World = {
        ...world,
        people: {
          ...world.people,
          [observer]: {
            ...world.people[observer]!,
            homeJurisdictionId: jurisdiction.id,
            establishedFacts: world.people[observer]!.establishedFacts.map(
              (fact) =>
                fact.kind === "residence" && fact.endedAt === null
                  ? { ...fact, jurisdictionId: jurisdiction.id }
                  : fact,
            ),
          },
        },
        jurisdictions: {
          ...world.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: [
          ...new Set([...world.jurisdictionOrder, jurisdiction.id]),
        ],
      };
      const input = {
        stableKey: "G7:chief-confirmation",
        nomineeId,
        presidentId,
        nominationEventId,
        officeKey: "us-chief-justice",
      };
      const vote = senateConfirmationVote(inputWorld, input)!;
      expect(vote).not.toBeNull();
      expect(vote.ballots).toHaveLength(
        seatedCongressChamber(inputWorld, "senate")!.body.members.length,
      );
      expect(vote.yeas + vote.nays).toBeGreaterThan(0);
      const recorded = recordConfirmationVote(inputWorld, {
        stableKey: input.stableKey,
        nomineeId,
        officeTitle: "Chief Justice",
        vote,
        tags: ["office:us-chief-justice"],
      });
      const continued = deserializeWorld(serializeWorld(recorded.world));
      expect(
        continued.history.events.find((event) => event.id === recorded.eventId),
      ).toEqual(
        recorded.world.history.events.find(
          (event) => event.id === recorded.eventId,
        ),
      );
      expect(senateConfirmationVote(continued, input)).toEqual(vote);
      receipts.push({
        code,
        seed,
        nomineeId,
        nomineeName: personName(inputWorld.people[nomineeId]!),
        presidentId,
        nominationEventId,
        inputHash: hash(inputWorld),
        vote,
        recordedWorldHash: hash(recorded.world),
      });
    },
  );

  it("maps no reasons to present, protects the player, and creates no vacant-seat person", () => {
    const members = seatedCongressChamber(world, "senate")!.body.members;
    const playerId = members[0]!.personId!;
    const input = {
      kind: "nomination" as const,
      stableKey: "G7:empty-considerations",
      nominationEventId,
      nomineeId,
      presidentId,
      officeKey: "us-chief-justice",
      members: [
        ...members,
        {
          memberKey: "G7:vacant-seat",
          personId: null,
          name: "Vacant",
          partyKey: null,
          caucusLabel: "Vacant",
        },
      ],
      considerationsByMember: new Map(),
      playerPersonId: playerId,
    };
    const ballots = decideChamberVote(world, input);
    expect(
      ballots.filter((row) => row.disposition === "present-not-voting"),
    ).toHaveLength(members.length - 1);
    expect(ballots.find((row) => row.personId === playerId)?.disposition).toBe(
      "absent",
    );
    expect(ballots.at(-1)).toEqual({
      memberKey: "G7:vacant-seat",
      personId: null,
      disposition: "absent",
    });
    const continued = deserializeWorld(serializeWorld(world));
    expect(decideChamberVote(continued, input)).toEqual(ballots);
  });

  it.each([
    "missing-event",
    "wrong-nominee",
    "wrong-president",
    "wrong-office",
  ])("refuses an unsupported nomination identity: %s", (failure) => {
    const input = {
      kind: "nomination" as const,
      stableKey: "G7:invalid-source",
      nominationEventId,
      nomineeId,
      presidentId,
      officeKey: "us-chief-justice",
      members: seatedCongressChamber(world, "senate")!.body.members,
      considerationsByMember: new Map(),
    };
    if (failure === "missing-event")
      input.nominationEventId = world.personOrder[0]!;
    if (failure === "wrong-nominee") input.nomineeId = presidentId;
    if (failure === "wrong-president") input.presidentId = nomineeId;
    if (failure === "wrong-office") input.officeKey = "us-supreme-court:seat:2";
    expect(() => decideChamberVote(world, input)).toThrow(
      /actual dated nomination event/,
    );
  });

  it("admits only the saved executive nomination, appointer trace and causal vacancy", () => {
    const postOfficeKey = "us-ak-personnel-board";
    const seatOrdinal = 1;
    const jurisdictionId = world.jurisdictionOrder[0]!;
    let source = recordWorldEvent(world, {
      stableKey: "G7:appointment-incumbent-term",
      type: "world.office-tenure",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [presidentId],
      participants: [
        {
          personId: presidentId,
          role: "focus:subject",
          detail: "Former holder",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `appointment-post:${postOfficeKey}`,
        `appointment-seat:${seatOrdinal}`,
        `term-end:${world.currentDate}`,
      ],
      summary: "A recorded incumbent term reaches its end date.",
      context,
    });
    const incumbentTermEventId = source.history.events.at(-1)!.id;
    source = recordWorldEvent(source, {
      stableKey: "G7:appointment-vacancy",
      type: "world.office-vacancy",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [presidentId],
      participants: [
        {
          personId: presidentId,
          role: "focus:subject",
          detail: "Former holder",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `office:${postOfficeKey}:seat:${seatOrdinal}`,
        `appointment-post:${postOfficeKey}`,
        `appointment-seat:${seatOrdinal}`,
        `appointment-term:${incumbentTermEventId}`,
        "vacancy-cause:term-expired",
        `source-event:${incumbentTermEventId}`,
      ],
      summary: "The recorded incumbent term expired.",
      context,
    });
    const vacancyEventId = source.history.events.at(-1)!.id;
    source = recordWorldEvent(source, {
      stableKey: "G7:appointment-matter",
      type: "governing.matter-opened",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [presidentId],
      participants: [
        {
          personId: presidentId,
          role: "agency:officeholder",
          detail: "Governor",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`office:${postOfficeKey}`, "matter-family:appointment"],
      summary: "The Governor considers a recorded appointment.",
      context,
    });
    const matter = source.history.events.at(-1)!;
    const decisionContext: Parameters<typeof decisions.evaluateDecision>[1] = {
      stableKey: `appointments-v1:${matter.stableKey}:choose`,
      decisionType: "appointment.choose-appointee",
      actorPersonId: presidentId,
      cutoff: {
        asOfDate: source.currentDate,
        historySequenceExclusive: source.history.nextSequence,
      },
      subject: {
        kind: "context:appointment",
        key: postOfficeKey,
        entityId: null,
      },
      options: [
        {
          key: `person:${nomineeId}`,
          label: "Nominee",
          description: "Select.",
        },
        {
          key: `person:${presidentId}`,
          label: "Other",
          description: "Do not select.",
        },
      ],
      constraints: [
        {
          stableKey: "G7:other-option-unavailable",
          optionKey: `person:${presidentId}`,
          kind: "fixture",
          explanation: "The fixture leaves the actual nominee available.",
          sourceRefs: [{ kind: "historical-event", eventId: matter.id }],
        },
      ],
      considerations: [],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    };
    const evaluation = decisions.evaluateDecision(source, decisionContext);
    source = decisions.recordDurableDecisionTrace(source, evaluation);
    const appointmentDecisionTraceId = source.history.decisionTraces.at(-1)!.id;
    source = recordWorldEvent(source, {
      stableKey: "G7:appointment-matter-decision",
      type: "governing.matter-decided",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [presidentId, nomineeId],
      participants: [
        { personId: presidentId, role: "agency:decider", detail: "Governor" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`matter:${matter.id}`, `choice:person:${nomineeId}`],
      summary: "The Governor selected the nominee.",
      context,
    });
    const decision = source.history.events.at(-1)!;
    source = recordWorldEvent(source, {
      stableKey: "G7:executive-appointment-nomination",
      type: "executive.appointment-nominated",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [presidentId, nomineeId],
      participants: [
        { personId: presidentId, role: "agency:appointer", detail: "Governor" },
        { personId: nomineeId, role: "agency:nominee", detail: "Board member" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `appointment-post:${postOfficeKey}`,
        `appointment-seat:${seatOrdinal}`,
        `appointment-vacancy:${vacancyEventId}`,
        `appointment-term:${incumbentTermEventId}`,
        `appointment-decision:${appointmentDecisionTraceId}`,
        `appointment-matter:${matter.id}`,
        `source-event:${decision.id}`,
      ],
      summary: "The Governor nominated the selected person.",
      context,
    });
    const nominationEventId = source.history.events.at(-1)!.id;
    const members = [
      ...seatedCongressChamber(source, "house")!.body.members,
      ...seatedCongressChamber(source, "senate")!.body.members,
    ];
    const input = {
      kind: "nomination" as const,
      nominationKind: "executive-appointment" as const,
      stableKey: "G7:executive-appointment-confirmation",
      nominationEventId,
      nomineeId,
      officeKey: postOfficeKey,
      postOfficeKey,
      seatOrdinal,
      appointerId: presidentId,
      jurisdictionId,
      vacancyEventId,
      incumbentTermEventId,
      appointmentDecisionTraceId,
      members,
      considerationsByMember: new Map(),
    };
    const ballots = decideChamberVote(source, input);
    expect(ballots).toHaveLength(members.length);
    const reloaded = deserializeWorld(serializeWorld(source));
    expect(decideChamberVote(reloaded, input)).toEqual(ballots);

    expect(() =>
      decideChamberVote(source, { ...input, appointerId: nomineeId }),
    ).toThrow(/actual dated nomination/);
    expect(() =>
      decideChamberVote(source, {
        ...input,
        jurisdictionId: "G7:other-jurisdiction" as EntityId,
      }),
    ).toThrow(/actual dated nomination/);
    expect(() =>
      decideChamberVote(source, {
        ...input,
        appointmentDecisionTraceId: "G7:other-trace" as EntityId,
      }),
    ).toThrow(/actual dated nomination/);
    expect(() =>
      decideChamberVote(source, {
        ...input,
        incumbentTermEventId: "G7:other-incumbent-term" as EntityId,
      }),
    ).toThrow(/actual dated nomination/);

    const withoutCause = {
      ...source,
      history: {
        ...source.history,
        events: source.history.events.map((event) =>
          event.id === vacancyEventId
            ? {
                ...event,
                tags: event.tags.filter(
                  (tag) => !tag.startsWith("vacancy-cause:"),
                ),
              }
            : event,
        ),
      },
    };
    expect(() => decideChamberVote(withoutCause, input)).toThrow(
      /causal vacancy/,
    );
    const withoutDecisionLink = {
      ...source,
      history: {
        ...source.history,
        events: source.history.events.map((event) =>
          event.id === nominationEventId
            ? {
                ...event,
                tags: event.tags.map((tag) =>
                  tag.startsWith("source-event:")
                    ? "source-event:G7:unrelated-decision"
                    : tag,
                ),
              }
            : event,
        ),
      },
    };
    expect(() => decideChamberVote(withoutDecisionLink, input)).toThrow(
      /actual dated nomination/,
    );
  });

  it("keeps an all-withheld native Chief Justice roll pending across reload and repeat", () => {
    const evaluate = decisions.evaluateDecision;
    const spy = vi
      .spyOn(decisions, "evaluateDecision")
      .mockImplementation((inputWorld, decision) => {
        const actual = evaluate(inputWorld, decision);
        return decision.subject.kind === "context:supreme-court-nomination"
          ? { ...actual, outcomeKind: "undecided", selectedOptionKey: null }
          : actual;
      });
    const input = scheduleFutureDueItem(world, {
      stableKey: `${CHIEF_JUSTICE_VACANCY_VERSION}:confirmation:${world.currentDate}:${nomineeId}`,
      dueAt: addDays(world.currentDate, 1),
      transitionKey: CHIEF_JUSTICE_CONFIRMATION,
      entityIds: [nomineeId],
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Controlled one-day confirmation callback, not a legal interval.",
      },
    });
    const due = input.history.futureDueItems.at(-1)!;
    const handlers = createFutureTransitionHandlerRegistry([
      [
        CHIEF_JUSTICE_CONFIRMATION,
        (next, item) => confirmChiefJustice(next, item, (same) => same),
      ],
    ]);
    const output = advanceWorld(input, 1, handlers);
    const roll = output.history.events.find(
      (event) => event.stableKey === `${due.stableKey}:senate-vote`,
    )!;
    expect(roll).toBeDefined();
    expect(roll.tags).toContain("outcome:pending");
    expect(roll.tags).toContain("yeas:0");
    expect(roll.tags).toContain("nays:0");
    expect(
      roll.participants
        .filter((row) => row.role === "agency:senate-vote")
        .every(
          (row) =>
            row.detail?.startsWith("present-not-voting|") ||
            row.detail?.startsWith("absent|"),
        ),
    ).toBe(true);
    expect(currentFederalTenure(output, "us-chief-justice")).toBeNull();
    expect(
      futureDueItemStateAt(output, due.id, currentLifeCutoff(output))?.status,
    ).toBe("blocked");
    expect(
      spy.mock.calls
        .filter(
          ([, decision]) =>
            decision.subject.kind === "context:supreme-court-nomination",
        )
        .every(
          ([, decision]) =>
            decision.decisionType === "legislation.member-vote" &&
            decision.subject.key ===
              world.history.events.find(
                (event) => event.id === nominationEventId,
              )!.stableKey &&
            decision.subject.entityId === null,
        ),
    ).toBe(true);
    const continued = deserializeWorld(serializeWorld(output));
    expect(currentFederalTenure(continued, "us-chief-justice")).toBeNull();
    const repeated = advanceWorld(continued, 1, handlers);
    expect(
      repeated.history.events.filter(
        (event) => event.stableKey === roll.stableKey,
      ),
    ).toEqual([roll]);
    expect(currentFederalTenure(repeated, "us-chief-justice")).toBeNull();
    expect(repeated.history.futureDueItems).toEqual(
      continued.history.futureDueItems,
    );
  });
});
