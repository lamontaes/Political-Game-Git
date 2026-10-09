import { describe, expect, it } from "vitest";
import eventInputs from "./tooling/fixtures/event-inputs.json" with { type: "json" };
import { DEFAULT_DATA, extendData } from "./data";
import { advanceCore, availableActs, chooseAct, createLifeCore } from "./life";
import { parameter as p } from "./parameters";
import { assertCoreIntegrity, coreAPI } from "./state";
import { LIFE_MODULE } from "./modules/life";
import { WORK_MODULE } from "./modules/work";
import type {
  ActionDefinition,
  CoreData,
  CoreEventInput,
  CoreInput,
  CoreState,
  LogRecord,
  PersonInput,
  PublicOrganization,
  Source,
} from "./types";

const startedAt = "2021-01-01";
const nextDay = "2021-01-02";
const home = "place:life-fixture-home";
const county = "county:life-fixture-home";
const employer = "organization:recorded-fixture-employer";
const institution = "organization:recorded-fixture-institution";
const actorId = "person:actor";
const npcId = "person:npc";
const staffId = "person:recorded-staff";
const uninformedId = "person:uninformed";
const voluntaryEffort = "personality-v1:voluntary-effort";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Controlled small life-contract input, not observed people, cash, or a historical institution.",
  estimatedFrom:
    "Authored identity, job, and public-directory records; model parameters use the tagged table, while adverse-event impulses come from the developer-only synthetic test fixture.",
};

function person(id: string, overrides: Partial<PersonInput> = {}): PersonInput {
  return {
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId: home,
    countyId: county,
    householdId: `household:${id}`,
    tier: "daily",
    traits: {},
    liquidMinor: p("zero"),
    livingCostDailyMinor: p("zero"),
    familyIds: [],
    knownIds: [],
    source,
    ...overrides,
  };
}

function input(
  people: readonly PersonInput[],
  extra: Partial<CoreInput> = {},
): CoreInput {
  return {
    seed: "p8-small-causal-life-contract",
    startedAt,
    people,
    households: people.map((actor) => ({
      id: actor.householdId,
      placeId: actor.placeId,
      memberIds: [actor.id],
      source,
    })),
    jobs: [],
    organizations: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    ...extra,
  };
}

function workers(
  ids: readonly string[],
  overrides: Partial<PersonInput> = {},
): CoreInput {
  const people = ids.map((id) =>
    person(id, {
      traits: { [voluntaryEffort]: p("traitScale") },
      traitSources: { [voluntaryEffort]: source },
      livingCostDailyMinor: p("minorPerDollar"),
      ...overrides,
      jobId: `job:${id}`,
    }),
  );
  return input(people, {
    jobs: people.map((actor) => ({
      id: actor.jobId!,
      personId: actor.id,
      organizationId: employer,
      title: "Recorded fixture worker",
      wageDailyMinor: p("minorPerDollar") * p("percent"),
      hoursDaily: p("workHours"),
      source,
    })),
    organizations: [
      {
        id: employer,
        name: "Recorded fixture employer",
        kind: "employer",
        placeId: home,
        liquidMinor: p("minorPerDollar") * p("targetPopulation"),
        source,
      },
    ],
  });
}

function definition(
  effect: string,
  data: CoreData = DEFAULT_DATA,
): ActionDefinition {
  const row = data.actions.find((action) => action.effect === effect);
  if (!row) throw new Error(`Fixture requires an existing effect: ${effect}`);
  return row;
}

function lastAct(core: CoreState, id: string): LogRecord {
  const rows = [...(core.logByPerson.get(id) ?? [])]
    .map((recordId) => core.durableLog.get(recordId)!)
    .filter((row) => row.actorId === id && row.decision !== undefined);
  const row = rows.at(-p("one"));
  if (!row) throw new Error(`No committed traced act for ${id}`);
  return row;
}

function money(core: CoreState): number {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (total, row) => total + row.liquidMinor,
    p("zero"),
  );
}

function civicInput(
  options: { affordances?: readonly string[]; includeStaff?: boolean } = {},
): CoreInput {
  const publicRecord: PublicOrganization = {
    id: institution,
    placeId: home,
    name: "Recorded fixture public institution",
    kind: "fixture-public-institution",
    source,
    affordances: options.affordances ?? [
      "public-meeting-place",
      "known-office",
    ],
    facts: {
      address: "Recorded fixture public address",
      contactRoute: "Recorded fixture public service desk",
    },
    staff:
      options.includeStaff === false
        ? []
        : [
            {
              personId: staffId,
              jobId: "job:staff",
              title: "Recorded constituent-services worker",
              source,
            },
          ],
  };
  return input(
    [
      person(actorId, {
        traits: {
          "personality-v1:concern-for-distress": p("traitScale"),
          "personality-v1:action-despite-fear": p("traitScale"),
        },
      }),
      person(staffId, { tier: "husk", jobId: "job:staff" }),
      person(uninformedId, { tier: "husk" }),
    ],
    {
      playerId: actorId,
      publicOrganizations: [publicRecord],
      jobs: [
        {
          id: "job:staff",
          personId: staffId,
          organizationId: institution,
          title: "Recorded constituent-services worker",
          wageDailyMinor: p("minorPerDollar") * p("percent"),
          hoursDaily: p("workHours"),
          source,
        },
      ],
      organizations: [
        {
          id: institution,
          placeId: home,
          name: publicRecord.name,
          kind: publicRecord.kind,
          liquidMinor: p("minorPerDollar") * p("targetPopulation"),
          source,
        },
      ],
    },
  );
}

function adverse(core: CoreState, id = actorId): CoreEventInput {
  return {
    id: "event:recorded-adverse-service-change",
    date: core.date,
    kind: "fixture:service-loss",
    personIds: [id],
    placeId: home,
    topic: "fixture:local-service-access",
    desiredChange: "Restore the recorded local service route",
    moodImpulse: eventInputs.events.affectStimulus.moodImpulse,
    stressImpulse: eventInputs.events.affectStimulus.stressImpulse,
    facts: { "fixture:service-change": "Recorded service reduction" },
    source,
  };
}

describe("shared actor chooser and committed effects", () => {
  it("uses the same chooser, reasons, and money effect for player and NPC", () => {
    const core = createLifeCore({
      ...workers([actorId, npcId]),
      playerId: actorId,
      focusPersonIds: [npcId],
    });
    const openingMoney = money(core);
    const employerOpening = core.organizations.get(employer)!.liquidMinor;
    const result = advanceCore(core, nextDay);
    const playerAct = lastAct(core, actorId);
    const npcAct = lastAct(core, npcId);
    const work = definition("paid-work");
    expect(result).toEqual({
      simulatedDays: p("one"),
      decisions: p("two"),
      acts: p("two"),
    });
    expect(playerAct.actionId).toBe(work.id);
    expect(npcAct.actionId).toBe(work.id);
    expect(playerAct.decision!.selectedReasons).toEqual(
      npcAct.decision!.selectedReasons,
    );
    expect(
      playerAct.decision!.scores?.map((row) => [
        row.actionId,
        row.score,
        row.reasons,
      ]),
    ).toEqual(
      npcAct.decision!.scores?.map((row) => [
        row.actionId,
        row.score,
        row.reasons,
      ]),
    );
    const pay = core.jobs.get(`job:${actorId}`)!.wageDailyMinor;
    for (const id of [actorId, npcId]) {
      const actor = core.people.get(id)!;
      expect(actor.liquidMinor).toBe(pay);
      expect(actor.actCount).toBe(p("one"));
      expect(actor.lastActDate).toBe(nextDay);
      expect(actor.lastReason).toBe(playerAct.reasonKey);
      expect(actor.needs[work.need]).toBeGreaterThan(p("zero"));
      expect(actor.goals.get(`need:${work.need}`)).toMatchObject({
        kind: work.goalKinds[0],
        urgency: actor.needs[work.need],
      });
    }
    expect(core.organizations.get(employer)!.liquidMinor).toBe(
      employerOpening - pay * p("two"),
    );
    expect(money(core)).toBe(openingMoney);
    assertCoreIntegrity(core);
  });

  it("re-evaluates resource pressure after wages and commits a different recovery consequence", () => {
    const core = createLifeCore({ ...workers([actorId]), playerId: actorId });
    const openingMoney = money(core);
    advanceCore(core, nextDay);
    const actor = core.people.get(actorId)!;
    const priorNeed = actor.needs[definition("paid-work").need]!;
    const priorStress = actor.affect.stress;
    const earned = actor.liquidMinor;
    advanceCore(core, "2021-01-03");
    expect(actor.needs[definition("paid-work").need]!).toBeLessThan(priorNeed);
    expect(lastAct(core, actorId).actionId).toBe(definition("recover").id);
    expect(actor.affect.stress).toBeLessThan(priorStress);
    expect(actor.liquidMinor).toBe(earned);
    expect(money(core)).toBe(openingMoney);
    assertCoreIntegrity(core);
  });

  it("changes an unforced act when only a recorded existing trait direction changes", () => {
    expect(DEFAULT_DATA.traitPulls[voluntaryEffort]?.high?.toward).toContain(
      "commit",
    );
    expect(DEFAULT_DATA.traitPulls[voluntaryEffort]?.low?.away).toContain(
      "commit",
    );
    const make = (strength: number) =>
      createLifeCore({
        ...workers([actorId], {
          liquidMinor: p("minorPerDollar") * p("moneyBufferDays"),
          traits: { [voluntaryEffort]: strength },
        }),
        playerId: actorId,
      });
    const high = make(p("traitScale"));
    const low = make(p("traitScale") * p("negativeOne"));
    const openingHigh = money(high);
    const openingLow = money(low);
    advanceCore(high, nextDay);
    advanceCore(low, nextDay);
    const highAct = lastAct(high, actorId);
    const lowAct = lastAct(low, actorId);
    expect(highAct.actionId).toBe(definition("paid-work").id);
    expect(lowAct.actionId).toBe(definition("recover").id);
    const workReasons = (core: CoreState) =>
      lastAct(core, actorId).decision!.scores!.find(
        (row) => row.actionId === definition("paid-work").id,
      )!.reasons;
    const highWork = workReasons(high);
    const lowWork = workReasons(low);
    expect(highWork.trait).toBeGreaterThan(p("zero"));
    expect(lowWork.trait).toBeLessThan(p("zero"));
    expect({ ...highWork, trait: p("zero") }).toEqual({
      ...lowWork,
      trait: p("zero"),
    });
    expect(high.people.get(actorId)!.liquidMinor).toBeGreaterThan(
      low.people.get(actorId)!.liquidMinor,
    );
    expect(low.people.get(actorId)!.affect.stress).toBeLessThan(
      high.people.get(actorId)!.affect.stress,
    );
    expect(money(high)).toBe(openingHigh);
    expect(money(low)).toBe(openingLow);
  });

  it("lets mood and stress change the chosen act through action-specific recorded emotion contributions", () => {
    const decide = (mood: number, stress: number) => {
      const core = createLifeCore({ ...workers([actorId]), playerId: actorId });
      const actor = core.people.get(actorId)!;
      coreAPI(core).updatePerson(actorId, {
        affect: { ...actor.affect, mood, stress },
      });
      const before = structuredClone(actor);
      const decision = chooseAct(core, actorId, availableActs(core, actorId));
      expect(core.people.get(actorId)).toEqual(before);
      expect(actor.actCount).toBe(p("zero"));
      expect(core.durableLog.size).toBe(p("zero"));
      return decision;
    };
    const calm = decide(p("moodBaseline"), p("stressBaseline"));
    const stressed = decide(
      p("moodBaseline"),
      p("stressBaseline") +
        eventInputs.events.affectStimulus.stressImpulse * p("two"),
    );
    const goodMood = decide(
      -eventInputs.events.affectStimulus.moodImpulse * p("two"),
      p("stressBaseline"),
    );
    const lowMood = decide(
      eventInputs.events.affectStimulus.moodImpulse * p("two"),
      p("stressBaseline"),
    );
    expect(calm.selected!.definition.effect).toBe("paid-work");
    expect(stressed.selected!.definition.effect).toBe("recover");
    expect(goodMood.selected!.definition.effect).toBe("paid-work");
    expect(lowMood.selected!.definition.effect).toBe("recover");
    for (const effect of ["paid-work", "recover"]) {
      const reasons = (decision: typeof calm) =>
        decision.scores!.find((row) => row.actionId === definition(effect).id)!
          .reasons;
      expect({ ...reasons(calm), emotion: p("zero") }).toEqual({
        ...reasons(stressed),
        emotion: p("zero"),
      });
      expect({ ...reasons(goodMood), emotion: p("zero") }).toEqual({
        ...reasons(lowMood),
        emotion: p("zero"),
      });
    }
    const emotion = (decision: typeof calm, effect: string) =>
      decision.scores!.find((row) => row.actionId === definition(effect).id)!
        .reasons.emotion;
    expect(emotion(stressed, "paid-work")).toBeLessThan(
      emotion(calm, "paid-work"),
    );
    expect(emotion(stressed, "recover")).toBeGreaterThan(
      emotion(calm, "recover"),
    );
    expect(emotion(goodMood, "paid-work")).toBeGreaterThan(
      emotion(lowMood, "paid-work"),
    );
    expect(emotion(goodMood, "recover")).toBeLessThan(
      emotion(lowMood, "recover"),
    );
  });

  it("retains only an outsider's result, reasons, and compact counters for ordinary work", () => {
    const core = createLifeCore(workers([npcId]));
    const openingMoney = money(core);
    const decision = chooseAct(core, npcId, availableActs(core, npcId));
    expect(decision.scores).toBeUndefined();
    advanceCore(core, nextDay);
    const actor = core.people.get(npcId)!;
    expect(actor.lastChoice).toBe(definition("paid-work").id);
    expect(actor.lastReason).toMatch(/^utility:/);
    expect(actor.actCount).toBe(p("one"));
    expect(actor.actsByKind.get(actor.lastChoice!)).toBe(p("one"));
    expect(core.durableLog.size).toBe(p("zero"));
    expect(core.eventIds.size).toBe(p("zero"));
    const counters = [...core.actCounters.values()];
    expect(counters).toHaveLength(p("one"));
    expect(counters[0]).toMatchObject({
      actorId: npcId,
      actionId: actor.lastChoice,
      count: p("one"),
    });
    expect(counters[0]!.needContribution).toBeGreaterThan(p("zero"));
    expect(counters[0]!.goalContribution).toBeGreaterThan(p("zero"));
    expect(money(core)).toBe(openingMoney);
  });

  it("offers only recorded, known, living targets without inventing jobs or institutions", () => {
    const relative = "person:recorded-relative";
    const core = createLifeCore(
      input([
        person(actorId, { knownIds: [relative], familyIds: [relative] }),
        person(relative, { tier: "husk", familyIds: [actorId] }),
      ]),
    );
    const api = coreAPI(core);
    const initial = availableActs(core, actorId);
    expect(
      initial.some(
        (offer) =>
          offer.definition.targetKind === "known-person" &&
          offer.targetId === relative,
      ),
    ).toBe(true);
    expect(
      initial.some(
        (offer) =>
          offer.definition.targetKind === "family" &&
          offer.targetId === relative,
      ),
    ).toBe(true);
    expect(initial.some((offer) => offer.definition.targetKind === "job")).toBe(
      false,
    );
    api.updatePerson(relative, { alive: false });
    api.observe(actorId, {
      key: "organization:absent-institution:public",
      value: "A reported name without an institution row",
      learnedAt: core.date,
      sourceId: "fixture:reported-fact",
      access: "told",
    });
    const offers = availableActs(core, actorId);
    expect(offers.some((offer) => offer.targetId === relative)).toBe(false);
    expect(
      offers.some((offer) => offer.targetId === "absent-institution"),
    ).toBe(false);
    expect(offers.every((offer) => offer.targetId === actorId)).toBe(true);
    expect(availableActs(core, "person:absent")).toEqual([]);
    api.updatePerson(actorId, { alive: false });
    expect(availableActs(core, actorId)).toEqual([]);
  });
});

describe("learned civic cause and honest requests", () => {
  it("freely follows a learned event through lookup and an organizing plan to a recorded staff callback", () => {
    const core = createLifeCore(civicInput());
    const api = coreAPI(core);
    const actor = core.people.get(actorId)!;
    const openingMoney = money(core);
    expect(actor.drives.size).toBe(p("zero"));
    expect(actor.goals.size).toBe(p("zero"));
    expect(core.organizedTopicsByPerson.has(actorId)).toBe(false);
    expect(core.pendingCallbacks.size).toBe(p("zero"));
    expect(
      api.knows(actorId, `organization:${institution}:public`),
    ).toBeUndefined();
    expect(api.knows(actorId, `person:${staffId}:name`)).toBeUndefined();
    const event = adverse(core);
    api.emit(event);
    const drives = [...actor.drives.values()];
    expect(drives).toHaveLength(p("one"));
    const drive = drives[0]!;
    expect(drive).toMatchObject({
      sourceEventId: event.id,
      topic: event.topic,
      desiredChange: event.desiredChange,
    });
    expect(drive.strength).toBeGreaterThan(p("zero"));
    const situation = core.data.situations.find(
      (row) => row.driveKind === drive.kind,
    );
    expect(situation).toBeDefined();
    expect([...actor.goals.values()]).toContainEqual(
      expect.objectContaining({
        kind: situation!.goalKind,
        sourceDriveId: drive.id,
        urgency: drive.strength,
      }),
    );
    expect(api.knows(actorId, `event:${event.id}:experienced`)).toMatchObject({
      sourceId: event.id,
      learnedAt: startedAt,
    });
    expect(core.people.get(uninformedId)!.drives.size).toBe(p("zero"));
    expect(core.people.get(uninformedId)!.goals.size).toBe(p("zero"));
    expect(
      api.knows(uninformedId, `event:${event.id}:experienced`),
    ).toBeUndefined();
    expect(
      availableActs(core, actorId).some(
        (offer) =>
          offer.definition.effect === "organize" ||
          offer.definition.effect === "approach",
      ),
    ).toBe(false);

    advanceCore(core, nextDay);
    const lookup = lastAct(core, actorId);
    expect(lookup.actionId).toBe(definition("public-lookup").id);
    expect(lookup.targetId).toBe(institution);
    expect(lookup.driveId).toBe(drive.id);
    expect(lookup.decision!.selectedReasons!.drive).toBeGreaterThan(p("zero"));
    expect(
      api.knows(actorId, `organization:${institution}:public`),
    ).toMatchObject({
      sourceId: institution,
      access: "public",
      learnedAt: nextDay,
    });
    expect(api.knows(actorId, `person:${staffId}:public-role`)).toMatchObject({
      value: core.publicOrganizations.get(institution)!.staff![0]!.title,
      sourceId: "job:staff",
      access: "public",
    });
    expect(api.knows(actorId, `job:job:staff:pay`)).toBeUndefined();
    expect(
      api.knows(uninformedId, `organization:${institution}:public`),
    ).toBeUndefined();
    expect(core.organizedTopicsByPerson.has(actorId)).toBe(false);
    expect(core.pendingCallbacks.size).toBe(p("zero"));

    advanceCore(core, "2021-01-03");
    const plan = lastAct(core, actorId);
    expect(plan.actionId).toBe(definition("organize").id);
    expect(plan.driveId).toBe(drive.id);
    expect(core.organizedTopicsByPerson.get(actorId)).toContain(drive.topic);
    expect(core.logByKind.get("initiative.organizing-started")?.size).toBe(
      p("one"),
    );
    expect(core.pendingCallbacks.size).toBe(p("zero"));
    expect(core.memberships.size).toBe(p("zero"));

    advanceCore(core, "2021-01-04");
    const approach = lastAct(core, actorId);
    expect(approach.actionId).toBe(definition("approach").id);
    expect(approach.targetId).toBe(institution);
    expect(approach.driveId).toBe(drive.id);
    expect(approach.reasonKey).toMatch(/^utility:/);
    expect(core.pendingCallbacks.size).toBe(p("one"));
    const callback = [...core.pendingCallbacks.values()][0]!;
    expect(callback).toMatchObject({
      date: "2021-01-04",
      kind: "office.approached",
      personIds: [actorId],
      witnessIds: [staffId],
      topic: drive.topic,
      desiredChange: drive.desiredChange,
      facts: { organizationId: institution, sourceEventId: event.id },
    });
    expect(core.jobs.get("job:staff")!.personId).toBe(staffId);
    const approachEvents = [
      ...(core.logByKind.get("office.approached") ?? []),
    ].map((id) => core.durableLog.get(id)!);
    expect(approachEvents).toHaveLength(p("one"));
    expect(
      api.knows(staffId, `event:${approachEvents[0]!.id}:experienced`),
    ).toMatchObject({ sourceId: approachEvents[0]!.id, learnedAt: core.date });
    expect(core.memberships.size).toBe(p("zero"));
    expect(core.logByKind.has("meeting.held")).toBe(false);
    expect(core.logByKind.has("membership.confirmed")).toBe(false);
    expect(
      availableActs(core, actorId).some(
        (offer) => offer.definition.effect === "approach",
      ),
    ).toBe(false);
    expect(money(core)).toBe(openingMoney);
    assertCoreIntegrity(core);
  });

  it("keeps association membership requested after an unforced lookup and joining attempt", () => {
    const core = createLifeCore(civicInput({ affordances: ["known-group"] }));
    const event = adverse(core);
    coreAPI(core).emit(event);
    advanceCore(core, nextDay);
    expect(lastAct(core, actorId).actionId).toBe(
      definition("public-lookup").id,
    );
    advanceCore(core, "2021-01-03");
    expect(lastAct(core, actorId).actionId).toBe(definition("join").id);
    const memberships = [...core.memberships.values()];
    expect(memberships).toHaveLength(p("one"));
    expect(memberships[0]).toMatchObject({
      personId: actorId,
      organizationId: institution,
      status: "requested",
      sourceDriveId: [...core.people.get(actorId)!.drives.keys()][0],
    });
    expect(core.logByKind.get("association.requested")?.size).toBe(p("one"));
    expect(core.logByKind.has("membership.confirmed")).toBe(false);
    expect(
      availableActs(core, actorId).some(
        (offer) => offer.definition.effect === "join",
      ),
    ).toBe(false);
    assertCoreIntegrity(core);
  });

  it("keeps an office approach unavailable when the directory has no recorded staff", () => {
    const core = createLifeCore(civicInput({ includeStaff: false }));
    coreAPI(core).emit(adverse(core));
    advanceCore(core, "2021-01-03");
    expect(lastAct(core, actorId).actionId).toBe(definition("organize").id);
    expect(core.organizedTopicsByPerson.get(actorId)?.size).toBe(p("one"));
    expect(
      coreAPI(core).knows(actorId, `organization:${institution}:public`),
    ).toBeDefined();
    expect(
      availableActs(core, actorId).some(
        (offer) => offer.definition.effect === "approach",
      ),
    ).toBe(false);
    expect(core.pendingCallbacks.size).toBe(p("zero"));
  });

  it("does not turn an unlearned adverse event into another actor's cause", () => {
    const core = createLifeCore(civicInput());
    const event = adverse(core, uninformedId);
    const before = structuredClone(core.people.get(actorId)!);
    coreAPI(core).emit(event);
    expect(core.people.get(uninformedId)!.drives.size).toBe(p("one"));
    expect(core.people.get(actorId)).toEqual(before);
    expect(
      coreAPI(core).knows(actorId, `event:${event.id}:experienced`),
    ).toBeUndefined();
    expect(
      availableActs(core, actorId).every(
        (offer) => offer.driveId === undefined,
      ),
    ).toBe(true);
  });
});

describe("controller boundary and data extension", () => {
  it("rejects a controller request that is absent from the actual offers before committing an effect", () => {
    const core = createLifeCore({ ...workers([actorId]), playerId: actorId });
    const openingMoney = money(core);
    const balances = [
      core.people.get(actorId)!.liquidMinor,
      core.organizations.get(employer)!.liquidMinor,
    ];
    expect(() =>
      advanceCore(core, nextDay, {
        controller: () => "fixture:nonexistent-act:fixture:nonexistent-target",
      }),
    ).toThrow(/unavailable/i);
    expect([
      core.people.get(actorId)!.liquidMinor,
      core.organizations.get(employer)!.liquidMinor,
    ]).toEqual(balances);
    expect(core.people.get(actorId)!.actCount).toBe(p("zero"));
    expect(core.actCounters.size).toBe(p("zero"));
    expect(core.durableLog.size).toBe(p("zero"));
    expect(core.pendingCallbacks.size).toBe(p("zero"));
    expect(money(core)).toBe(openingMoney);
  });

  it("uses identical effects when a controller accepts the naturally selected offer", () => {
    const packet = { ...workers([actorId]), playerId: actorId };
    const automatic = createLifeCore(packet);
    const controlled = createLifeCore(packet);
    const automaticResult = advanceCore(automatic, nextDay);
    const controlledResult = advanceCore(controlled, nextDay, {
      controller(decision, offers) {
        expect(decision.selected).toBeDefined();
        expect(offers).toContain(decision.selected);
        return `${decision.selected!.definition.id}:${decision.selected!.targetId}`;
      },
    });
    expect(controlledResult).toEqual(automaticResult);
    const visibleState = (core: CoreState) => {
      const actor = core.people.get(actorId)!;
      return {
        date: core.date,
        money: actor.liquidMinor,
        employerMoney: core.organizations.get(employer)!.liquidMinor,
        needs: actor.needs,
        goals: actor.goals,
        drives: actor.drives,
        affect: actor.affect,
        actCount: actor.actCount,
        lastActDate: actor.lastActDate,
        lastChoice: actor.lastChoice,
        callbacks: core.pendingCallbacks,
        memberships: core.memberships,
      };
    };
    expect(visibleState(controlled)).toEqual(visibleState(automatic));
    expect(lastAct(controlled, actorId).decision!.selectedReasons).toEqual(
      lastAct(automatic, actorId).decision!.selectedReasons,
    );
    expect(lastAct(controlled, actorId).reasonKey).toMatch(
      /^controller:utility:/,
    );
    expect(lastAct(automatic, actorId).reasonKey).toMatch(/^utility:/);
  });

  it("isolates affect coefficients and writers across interleaved mod worlds", () => {
    const mod = extendData(DEFAULT_DATA, {
      parameters: {
        stressHalfLifeDays: {
          ...DEFAULT_DATA.parameters.stressHalfLifeDays!,
          value: p("stressHalfLifeDays") * p("two"),
        },
      },
    });
    const admitted = (data: CoreData) => {
      const core = createLifeCore(input([person(actorId)]), { data });
      coreAPI(core).emit({
        ...adverse(core),
        topic: undefined,
        desiredChange: undefined,
      });
      return core;
    };
    const first = admitted(DEFAULT_DATA);
    const changed = admitted(mod);
    const second = admitted(DEFAULT_DATA);
    advanceCore(first, nextDay);
    advanceCore(changed, nextDay);
    advanceCore(second, nextDay);
    const a = first.people.get(actorId)!;
    const b = changed.people.get(actorId)!;
    const c = second.people.get(actorId)!;
    expect(b.affect.stress).toBeGreaterThan(a.affect.stress);
    expect(c.affect).toEqual(a.affect);
    expect(a.actCount).toBe(p("one"));
    expect(b.actCount).toBe(p("one"));
    expect(c.actCount).toBe(p("one"));
    expect(DEFAULT_DATA.parameters.stressHalfLifeDays!.value).toBe(
      p("stressHalfLifeDays"),
    );
  });

  it("admits a new need, goal kind, trait pull, and action through data using existing module operations", () => {
    const newNeed = "fixture:resource-buffer-review";
    const newGoal = "fixture:restore-resource-buffer";
    const newTrait = "fixture:buffer-diligence";
    const newKind = "fixture:maintain-recorded-buffer";
    const newAction = "fixture:buffer-work";
    const data = extendData(DEFAULT_DATA, {
      needs: [
        {
          id: newNeed,
          evaluator: "resource-deficit",
          goalKind: newGoal,
          parameters: { horizon: "moneyBufferDays" },
        },
      ],
      actions: [
        {
          ...definition("paid-work"),
          id: newAction,
          need: newNeed,
          goalKinds: [newGoal],
          actKinds: [newKind],
        },
      ],
      actKinds: [newKind],
      traitPulls: {
        [newTrait]: { high: { toward: [newKind] }, low: { away: [newKind] } },
      },
    });
    const core = createLifeCore(
      {
        ...workers([actorId], {
          traits: { [newTrait]: p("traitScale") },
          traitSources: { [newTrait]: source },
        }),
        playerId: actorId,
      },
      { data },
    );
    const openingMoney = money(core);
    expect(core.modules.size).toBe(p("two"));
    expect([...core.modules.keys()].sort()).toEqual(
      [LIFE_MODULE.id, WORK_MODULE.id].sort(),
    );
    advanceCore(core, nextDay);
    const actor = core.people.get(actorId)!;
    const chosen = lastAct(core, actorId);
    expect(chosen.actionId).toBe(newAction);
    expect(actor.needs[newNeed]).toBeGreaterThan(p("zero"));
    expect(actor.goals.get(`need:${newNeed}`)).toMatchObject({
      kind: newGoal,
      urgency: actor.needs[newNeed],
    });
    expect(chosen.decision!.selectedReasons!.need).toBeGreaterThan(p("zero"));
    expect(chosen.decision!.selectedReasons!.goal).toBeGreaterThan(p("zero"));
    expect(chosen.decision!.selectedReasons!.trait).toBeGreaterThan(p("zero"));
    expect(actor.liquidMinor).toBe(core.jobs.get(actor.jobId!)!.wageDailyMinor);
    expect(money(core)).toBe(openingMoney);
    expect(core.modules.size).toBe(p("two"));
    expect([...core.modules.keys()].sort()).toEqual(
      [LIFE_MODULE.id, WORK_MODULE.id].sort(),
    );
    assertCoreIntegrity(core);
  });
});
