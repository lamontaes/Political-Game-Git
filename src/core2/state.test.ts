import { describe, expect, it } from "vitest";
import { DEFAULT_DATA, extendData } from "./data";
import { parameter as p } from "./parameters";
import {
  assertCoreIntegrity,
  coreAPI,
  createCore,
  inspectPerson,
  promoteHusk,
  registerModule,
  resolveOperation,
} from "./state";
import type { CashJournalPosting, ResolvedCashJournalSource } from "./journal";
import type {
  ActOffer,
  CoreEventInput,
  CoreInput,
  CoreModule,
  CoreState,
  DecisionResult,
  PersonInput,
  Source,
} from "./types";

const today = "2021-01-01";
const home = "place:fixture-home";
const county = "county:fixture-home";
const away = "place:fixture-away";
const player = "person:player";
const circle = "person:circle";
const outsider = "person:outsider";
const witness = "person:witness";
const huskId = "person:retained-husk";
const employer = "organization:home-employer";
const otherEmployer = "organization:away-employer";
const source: Source = {
  tag: "ESTIMATED",
  asOf: today,
  citation:
    "Controlled small writer-contract fixture, not generated real people or observed money.",
  estimatedFrom:
    "Explicit test input rows; no population generator or old clock is invoked.",
};

function person(id: string, overrides: Partial<PersonInput> = {}): PersonInput {
  return {
    id,
    givenName: "Recorded",
    familyName: id,
    birthDate: "1980-02-03",
    placeId: home,
    countyId: county,
    householdId: `household:${id}`,
    tier: "daily",
    traits: {},
    liquidMinor: 500,
    livingCostDailyMinor: 25,
    source,
    familyIds: [],
    knownIds: [],
    ...overrides,
  };
}

function input(): CoreInput {
  const people = [
    person(player, {
      givenName: "Ana",
      familyName: "Chen",
      familyIds: [circle],
      knownIds: [circle, huskId],
      jobId: "job:player",
    }),
    person(circle, {
      givenName: "Leila",
      familyName: "Chen",
      familyIds: [player],
      knownIds: [player],
    }),
    person(outsider, {
      givenName: "Max",
      familyName: "Ortiz",
      placeId: away,
      countyId: "county:fixture-away",
      tier: "weekly",
      jobId: "job:outsider",
    }),
    person(witness, { givenName: "Nora", familyName: "Park", tier: "monthly" }),
  ];
  return {
    seed: "p8-small-writer-fixture",
    startedAt: today,
    people,
    households: [
      ...people.map((row) => ({
        id: row.householdId,
        placeId: row.placeId,
        memberIds: [row.id],
        source,
      })),
      {
        id: "household:retained-husk",
        placeId: home,
        memberIds: [huskId],
        source,
      },
    ],
    jobs: [
      {
        id: "job:player",
        personId: player,
        organizationId: employer,
        title: "Recorded clerk",
        wageDailyMinor: 120,
        hoursDaily: p("one"),
        source,
      },
      {
        id: "job:outsider",
        personId: outsider,
        organizationId: otherEmployer,
        title: "Recorded technician",
        wageDailyMinor: 250,
        hoursDaily: p("two"),
        source,
      },
    ],
    organizations: [
      {
        id: employer,
        placeId: home,
        name: "Recorded home employer",
        kind: "employer",
        liquidMinor: 5_000,
        source,
      },
      {
        id: otherEmployer,
        placeId: away,
        name: "Recorded away employer",
        kind: "employer",
        liquidMinor: 7_000,
        source,
      },
    ],
    husks: [
      {
        id: huskId,
        givenName: "Lior",
        familyName: "Iyer",
        placeId: home,
        countyId: county,
        birthDate: "1971-04-05",
        familyIds: [circle],
        looks: {
          appearanceSeed: "retained-face-seed",
          hair: "recorded-silver",
        },
        said: ["A retained exact quotation."],
        source,
      },
    ],
    playerId: player,
    focusPersonIds: [circle],
    focusPlaceIds: [home, county],
    calendarDates: ["2021-01-02", "2021-01-04"],
    gaps: [],
  };
}

function mutableSnapshot(core: CoreState) {
  return structuredClone({
    date: core.date,
    people: core.people,
    husks: core.husks,
    households: core.households,
    jobs: core.jobs,
    organizations: core.organizations,
    organizationsByPlaceKind: core.organizationsByPlaceKind,
    relationships: core.relationships,
    familyLinks: core.familyLinks,
    memberships: core.memberships,
    peopleByPlace: core.peopleByPlace,
    peopleByTier: core.peopleByTier,
    relationshipsByPerson: core.relationshipsByPerson,
    membershipsByPerson: core.membershipsByPerson,
    knowledgeByPerson: core.knowledgeByPerson,
    calendarDates: core.calendarDates,
    pendingCallbacks: core.pendingCallbacks,
    durableLog: core.durableLog,
    logByPerson: core.logByPerson,
    logByKind: core.logByKind,
    logByPlace: core.logByPlace,
    actCounters: core.actCounters,
    eventIds: core.eventIds,
    sequence: core.sequence,
    cashJournal: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
  });
}

/** Technical boundary fixture with actual registered owners and canonical current terms.
 * It supplies no ordinary-game payment authority or generated-world evidence. */
function journalBoundary(core: CoreState) {
  const api = coreAPI(core),
    kind = "fixture:writer-cash-boundary";
  const current = new Map<
    string,
    ResolvedCashJournalSource & { payerId: string; payeeId: string }
  >();
  registerModule(core, {
    id: "module:writer-cash-boundary",
    journalSourceProviders: {
      [kind]: (_api, reference) => {
        const row = current.get(reference.id);
        if (!row || row.kind !== reference.kind) return undefined;
        for (const id of [row.payerId, row.payeeId]) {
          if (
            (!core.people.has(id) && !core.organizations.has(id)) ||
            !core.cashJournal.residualAccountByOwner.has(id)
          )
            throw new Error("Actual journal fixture endpoint is absent.");
        }
        return { resolved: row, marker: row, metadata: [], retainFull: false };
      },
    },
  });
  return (payerId: string, payeeId: string, requested: number): number => {
    const valid = Number.isSafeInteger(requested) && requested >= p("zero");
    const payer = core.people.get(payerId) ?? core.organizations.get(payerId);
    const actual = valid
      ? Math.min(requested, payer?.liquidMinor ?? p("zero"))
      : p("one");
    const id = `fixture:cash-terms:${current.size}`;
    const lines = (amount: number): CashJournalPosting[] => [
      {
        id: id + ":out",
        accountId:
          core.cashJournal.residualAccountByOwner.get(payerId) ??
          "fixture:absent-payer",
        deltaMinor: -amount,
      },
      {
        id: id + ":in",
        accountId:
          core.cashJournal.residualAccountByOwner.get(payeeId) ??
          "fixture:absent-payee",
        deltaMinor: amount,
      },
    ];
    const row = {
      kind,
      id,
      date: core.date,
      source,
      payerId,
      payeeId,
      expectedPostings: actual > p("zero") ? lines(actual) : [],
      requiredRelatedRefs: [],
      relatedRecords: [],
    };
    current.set(id, row);
    if (actual === p("zero")) api.completeJournalSource({ kind, id });
    else
      api.postJournal({
        id: `journal:${core.date}:${core.cashJournal.nextSequence}`,
        date: core.date,
        expectedSequence: core.cashJournal.nextSequence,
        sourceRef: { kind, id },
        postings: valid ? row.expectedPostings : lines(requested),
      });
    return actual;
  };
}

function totalMoney(core: CoreState): number {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    p("zero"),
  );
}

function event(
  id: string,
  overrides: Partial<CoreEventInput> = {},
): CoreEventInput {
  return {
    id,
    date: today,
    kind: "fixture.recorded-change",
    personIds: [outsider],
    placeId: away,
    source,
    ...overrides,
  };
}

function offer(actorId: string): ActOffer {
  return {
    definition: DEFAULT_DATA.actions.find((row) => row.id === "rest")!,
    targetId: actorId,
    availableHours: p("one"),
  };
}

function reason(actorId: string, date = today): DecisionResult {
  return {
    actorId,
    date,
    reasonKey: "fixture-recorded-recovery-need",
    selectedReasons: {
      need: p("one"),
      goal: p("two"),
      drive: p("zero"),
      trait: p("zero"),
      emotion: p("zero"),
      effort: p("zero"),
    },
  };
}

function promotedPerson(overrides: Partial<PersonInput> = {}): PersonInput {
  return person(huskId, {
    givenName: "Lior",
    familyName: "Iyer",
    birthDate: "1971-04-05",
    householdId: "household:retained-husk",
    familyIds: [circle],
    knownIds: [player],
    looks: { appearanceSeed: "candidate-redraw" },
    said: ["Candidate replacement quotation."],
    ...overrides,
  });
}

describe("P8 mutable writer money boundaries", () => {
  it("conserves money across employers and people and returns actual partial payments", () => {
    const core = createCore(input());
    const pay = journalBoundary(core);
    const total = totalMoney(core);
    expect(pay(employer, player, 300)).toBe(300);
    expect(core.organizations.get(employer)!.liquidMinor).toBe(4_700);
    expect(core.people.get(player)!.liquidMinor).toBe(800);
    expect(totalMoney(core)).toBe(total);
    expect(pay(player, circle, 1_000)).toBe(800);
    expect(core.people.get(player)!.liquidMinor).toBe(p("zero"));
    expect(core.people.get(circle)!.liquidMinor).toBe(1_300);
    expect(totalMoney(core)).toBe(total);
    expect(pay(player, employer, p("one"))).toBe(p("zero"));
    expect(totalMoney(core)).toBe(total);
    expect(() => assertCoreIntegrity(core)).not.toThrow();
  });

  it.each([
    p("negativeOne"),
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + p("one"),
  ])(
    "rejects invalid minor units or postings contrary to current terms %s without a partial write",
    (amount) => {
      const core = createCore(input());
      const pay = journalBoundary(core);
      const before = mutableSnapshot(core);
      expect(() => pay(employer, player, amount)).toThrow();
      expect(mutableSnapshot(core)).toEqual(before);
    },
  );

  it.each([
    ["absent-payer", player],
    [employer, "absent-payee"],
  ])(
    "requires both actual source endpoints, even for a zero-cash completion",
    (payerId, payeeId) => {
      const core = createCore(input());
      const pay = journalBoundary(core);
      const before = mutableSnapshot(core);
      expect(() => pay(payerId, payeeId, p("zero"))).toThrow("endpoint");
      expect(mutableSnapshot(core)).toEqual(before);
    },
  );

  it("rejects payee overflow before changing either endpoint", () => {
    const rows = input();
    rows.organizations = rows.organizations.map((row) =>
      row.id === employer
        ? { ...row, liquidMinor: Number.MAX_SAFE_INTEGER }
        : row,
    );
    const core = createCore(rows);
    const pay = journalBoundary(core);
    const before = mutableSnapshot(core);
    expect(() => pay(player, employer, p("one"))).toThrow(
      "Invalid nonnegative integer journal amount: owner after",
    );
    expect(mutableSnapshot(core)).toEqual(before);
  });

  it.each([0.5, Number.MAX_SAFE_INTEGER + p("one")])(
    "refuses non-integer or unsafe opening cash %s",
    (amount) => {
      const rows = input();
      rows.people = rows.people.map((row) =>
        row.id === player ? { ...row, liquidMinor: amount } : row,
      );
      expect(() => createCore(rows)).toThrow();
      const core = createCore(input());
      const before = mutableSnapshot(core);
      expect(() =>
        coreAPI(core).addOrganization({
          id: "organization:bad-cash",
          placeId: home,
          name: "Invalid cash fixture",
          kind: "fixture-new-kind",
          liquidMinor: amount,
          source,
        }),
      ).toThrow();
      expect(mutableSnapshot(core)).toEqual(before);
    },
  );
});

describe("P8 actor knowledge and inspection privacy", () => {
  it("keeps a named acquaintance's dated prior source without exposing private facts", () => {
    const opening = input();
    const actor = opening.people.find((row) => row.id === player)!;
    const learnedAt = "1998-08-31";
    const sourceFactId = "prior:recorded-acquaintance";
    actor.knownIds = [...actor.knownIds, outsider];
    actor.pastFacts = [
      {
        id: sourceFactId,
        date: learnedAt,
        kind: "fixture:acquaintance",
        summary: "Controlled acquaintance input",
        source,
      },
    ];
    actor.knownIdSources = { [outsider]: { sourceFactId, learnedAt } };
    const core = createCore(opening);
    expect(
      core.knowledgeByPerson.get(player)?.get(`person:${outsider}:name`),
    ).toMatchObject({
      value: "Max Ortiz",
      sourceId: sourceFactId,
      learnedAt,
    });
    expect(
      inspectPerson(core, player, outsider).facts.some((row) =>
        row.key.includes(":pay"),
      ),
    ).toBe(false);
    expect(
      core.knowledgeByPerson.get(player)?.get(`person:${circle}:name`)
        ?.sourceId,
    ).toBe(actor.id);
    expect(core.durableLog.size).toBe(0);
  });

  it.each([
    ["missing source fact", "prior:absent", "1998-08-31", "1998-08-31"],
    ["future learning", "prior:contact", "2021-01-02", "2021-01-02"],
    ["before the source fact", "prior:contact", "1997-01-01", "1998-08-31"],
    [
      "before either participant was born",
      "prior:contact",
      "1970-01-01",
      "1970-01-01",
    ],
  ])(
    "rejects %s in supplied acquaintance provenance",
    (_case, sourceFactId, learnedAt, factDate) => {
      const opening = input();
      const actor = opening.people.find((row) => row.id === player)!;
      actor.pastFacts = [
        {
          id: "prior:contact",
          date: factDate,
          kind: "fixture:contact",
          summary: "Controlled provenance input",
          source,
        },
      ];
      actor.knownIdSources = { [circle]: { sourceFactId, learnedAt } };
      expect(() => createCore(opening)).toThrow("opening name provenance");
    },
  );

  it("uses the same prior-name contract during promotion and rejects invalid sources before admission", () => {
    const core = createCore(input());
    const bad = promotedPerson({
      knownIdSources: {
        [player]: { sourceFactId: "missing", learnedAt: "1999-01-01" },
      },
    });
    const before = mutableSnapshot(core);
    expect(() => promoteHusk(core, bad)).toThrow("opening name provenance");
    expect(mutableSnapshot(core)).toEqual(before);
    const sourceFactId = "prior:promoted-name";
    const learnedAt = "1999-01-01";
    promoteHusk(
      core,
      promotedPerson({
        pastFacts: [
          {
            id: sourceFactId,
            date: learnedAt,
            kind: "fixture:acquaintance",
            summary: "Controlled promotion input",
            source,
          },
        ],
        knownIdSources: { [player]: { sourceFactId, learnedAt } },
      }),
    );
    expect(
      core.knowledgeByPerson.get(huskId)?.get(`person:${player}:name`),
    ).toMatchObject({ sourceId: sourceFactId, learnedAt });
  });

  it("seeds own recorded pay but cannot inspect a stranger's pay, cash or traits", () => {
    const core = createCore(input());
    const api = coreAPI(core);
    expect(api.knows(player, "job:job:player:pay")).toEqual({
      key: "job:job:player:pay",
      value: "120",
      learnedAt: today,
      sourceId: "job:player",
      access: "self",
    });
    expect(api.knows(player, "job:job:outsider:pay")).toBeUndefined();
    expect(
      inspectPerson(core, player, player).facts.some(
        (fact) => fact.key === "job:job:player:pay",
      ),
    ).toBe(true);
    const stranger = inspectPerson(core, player, outsider);
    expect(stranger.facts).toEqual([]);
    expect("liquidMinor" in stranger).toBe(false);
    expect("traits" in stranger).toBe(false);
    expect(api.knows(outsider, "job:job:outsider:pay")?.value).toBe("250");
  });

  it("rejects a borrowed or absent own-job pointer rather than exposing another person's pay", () => {
    for (const jobId of ["job:outsider", "job:absent"]) {
      const rows = input();
      rows.people = rows.people.map((row) =>
        row.id === player ? { ...row, jobId } : row,
      );
      expect(() => createCore(rows)).toThrow();
    }
  });

  it("learns only an explicit witnessed or told fact, with its source and access", () => {
    const core = createCore(input());
    const api = coreAPI(core);
    const nameKey = `person:${outsider}:name`;
    expect(api.knows(player, nameKey)).toBeUndefined();
    api.emit(
      event("event:heard-name", {
        witnessIds: [player],
        facts: { [nameKey]: "Max Ortiz" },
      }),
    );
    expect(api.knows(player, nameKey)).toEqual({
      key: nameKey,
      value: "Max Ortiz",
      learnedAt: today,
      sourceId: "event:heard-name",
      access: "perceived",
    });
    expect(api.knows(witness, nameKey)).toBeUndefined();
    expect(api.knows(circle, nameKey)).toBeUndefined();
    const payKey = `person:${outsider}:pay`;
    api.observe(player, {
      key: payKey,
      value: "250",
      learnedAt: today,
      sourceId: "event:direct-pay-disclosure",
      access: "told",
    });
    expect(
      inspectPerson(core, player, outsider)
        .facts.map((fact) => fact.key)
        .sort(),
    ).toEqual([nameKey, payKey].sort());
    expect(api.knows(circle, payKey)).toBeUndefined();
  });

  it("does not turn durable public records or news into omniscient actor knowledge", () => {
    const core = createCore(input());
    const api = coreAPI(core);
    const key = "fixture:public-notice-detail";
    api.emit(
      event("event:public-notice", {
        personIds: [],
        placeId: home,
        publicRecord: true,
        facts: { [key]: "Recorded public notice" },
      }),
    );
    api.emit(
      event("event:news-notice", {
        personIds: [],
        news: true,
        facts: { "fixture:news-detail": "Recorded news fact" },
      }),
    );
    expect(core.durableLog.has("event:public-notice")).toBe(true);
    expect(core.durableLog.has("event:news-notice")).toBe(true);
    for (const id of [player, circle, outsider, witness]) {
      expect(api.knows(id, key)).toBeUndefined();
      expect(api.knows(id, "fixture:news-detail")).toBeUndefined();
    }
  });

  it("rejects future learning and absent recipients without changing knowledge", () => {
    const core = createCore(input());
    const before = mutableSnapshot(core);
    const future = {
      key: "fixture:future",
      value: "Not yet observed",
      learnedAt: "2021-01-02",
      sourceId: "event:future",
      access: "perceived" as const,
    };
    expect(() => coreAPI(core).observe(player, future)).toThrow("future");
    expect(() =>
      coreAPI(core).observe("person:absent", { ...future, learnedAt: today }),
    ).toThrow("absent");
    expect(() => inspectPerson(core, "person:absent", player)).toThrow(
      "viewer",
    );
    expect(() => inspectPerson(core, player, "person:absent")).toThrow(
      "target",
    );
    expect(mutableSnapshot(core)).toEqual(before);
  });
});

describe("P8 visible records and calendar boundaries", () => {
  it("keeps circles, local public records and news but drops ordinary outsider detail", () => {
    const core = createCore(input());
    const api = coreAPI(core);
    api.emit(event("event:outside-routine"));
    api.emit(event("event:circle", { personIds: [circle] }));
    api.emit(event("event:player", { personIds: [player] }));
    api.emit(event("event:town-public", { placeId: home, publicRecord: true }));
    api.emit(
      event("event:county-public", { placeId: county, publicRecord: true }),
    );
    api.emit(event("event:outside-public", { publicRecord: true }));
    api.emit(event("event:news", { news: true }));
    expect(core.eventIds.has("event:outside-routine")).toBe(true);
    expect(core.durableLog.has("event:outside-routine")).toBe(false);
    expect(core.durableLog.has("event:outside-public")).toBe(false);
    for (const id of ["event:circle", "event:player"])
      expect(core.durableLog.get(id)?.visibility).toBe("circle");
    for (const id of ["event:town-public", "event:county-public"])
      expect(core.durableLog.get(id)?.visibility).toBe("public");
    expect(core.durableLog.get("event:news")?.visibility).toBe("news");
    expect(core.logByPerson.get(outsider)).not.toContain(
      "event:outside-routine",
    );
    for (const record of core.durableLog.values()) {
      expect(core.logByKind.get(record.kind)).toContain(record.id);
      expect(core.logByPlace.get(record.placeId)).toContain(record.id);
      for (const id of record.personIds)
        expect(core.logByPerson.get(id)).toContain(record.id);
    }
    expect(() => assertCoreIntegrity(core)).not.toThrow();
  });

  it("keeps a player-witnessed source record after its facts become visible", () => {
    const core = createCore(input());
    coreAPI(core).emit(
      event("event:player-witnessed", {
        witnessIds: [player],
        facts: { "fixture:witnessed": "An explicitly perceived fact" },
      }),
    );
    expect(coreAPI(core).knows(player, "fixture:witnessed")?.sourceId).toBe(
      "event:player-witnessed",
    );
    expect(core.durableLog.get("event:player-witnessed")?.visibility).toBe(
      "circle",
    );
  });

  it("lets explicit observer mode retain outsider records", () => {
    const core = createCore(input(), { observer: true });
    coreAPI(core).emit(event("event:observed-outside"));
    expect(core.durableLog.get("event:observed-outside")?.visibility).toBe(
      "observer",
    );
  });

  it("keeps outsider act counters and reasons without durable per-act history", () => {
    const core = createCore(input());
    const api = coreAPI(core);
    api.recordAct(outsider, offer(outsider), today, reason(outsider));
    api.recordAct(outsider, offer(outsider), today, reason(outsider));
    const actor = core.people.get(outsider)!;
    expect(actor.actCount).toBe(p("two"));
    expect(actor.lastChoice).toBe("rest");
    expect(actor.lastReason).toBe("fixture-recorded-recovery-need");
    expect(core.durableLog.size).toBe(p("zero"));
    expect(core.actCounters.get(`2021-01:${outsider}:rest`)).toMatchObject({
      count: p("two"),
      needContribution: p("two"),
      goalContribution: p("two") * p("two"),
      driveContribution: p("zero"),
    });
    api.recordAct(circle, offer(circle), today, reason(circle));
    expect(
      [...core.durableLog.values()].some(
        (record) =>
          record.actorId === circle &&
          record.reasonKey === "fixture-recorded-recovery-need",
      ),
    ).toBe(true);
  });

  it("is idempotent for an event ID and keeps the original visible facts", () => {
    const core = createCore(input());
    const api = coreAPI(core);
    const first = event("event:once", {
      personIds: [circle],
      facts: { "fixture:original": "First recorded fact" },
    });
    api.emit(first);
    const before = mutableSnapshot(core);
    api.emit({
      ...first,
      facts: { "fixture:original": "Conflicting duplicate" },
    });
    expect(mutableSnapshot(core)).toEqual(before);
  });

  it.each(["2020-12-31", "2021-01-02"])(
    "refuses events and act records dated %s before any write",
    (date) => {
      const core = createCore(input());
      const before = mutableSnapshot(core);
      expect(() =>
        coreAPI(core).emit(event("event:wrong-date", { date })),
      ).toThrow("current date");
      expect(mutableSnapshot(core)).toEqual(before);
      expect(() =>
        coreAPI(core).recordAct(
          outsider,
          offer(outsider),
          date,
          reason(outsider, date),
        ),
      ).toThrow();
      expect(mutableSnapshot(core)).toEqual(before);
      expect(core.calendarDates).toEqual(new Set(["2021-01-02", "2021-01-04"]));
    },
  );
});

describe("P8 open module and tier registries", () => {
  const operations: Omit<CoreModule, "id"> = {
    needEvaluators: { "fixture:shared-operation": () => p("zero") },
    offerProviders: { "fixture:shared-operation": () => [] },
    effectHandlers: { "fixture:shared-operation": () => {} },
    eligibilityRules: { "fixture:shared-operation": () => true },
  };

  it.each([
    "needEvaluators",
    "offerProviders",
    "effectHandlers",
    "eligibilityRules",
  ] as const)(
    "rejects a duplicate %s operation without admitting its module",
    (category) => {
      const core = createCore(input());
      const first: CoreModule = {
        id: "module:first",
        [category]: operations[category],
      };
      registerModule(core, first);
      expect(() =>
        registerModule(core, {
          id: "module:duplicate-operation",
          [category]: operations[category],
        }),
      ).toThrow("Duplicate engine operation");
      expect(core.modules.size).toBe(p("one"));
      expect(core.modules.get(first.id)).toBe(first);
      expect(resolveOperation(core, category, "fixture:shared-operation")).toBe(
        operations[category]!["fixture:shared-operation"],
      );
      expect(
        resolveOperation(core, category, "fixture:unregistered"),
      ).toBeUndefined();
    },
  );

  it("rejects duplicate module identity while allowing distinct operation namespaces", () => {
    const core = createCore(input());
    registerModule(core, {
      id: "module:need",
      needEvaluators: operations.needEvaluators,
    });
    expect(() =>
      registerModule(core, {
        id: "module:need",
        eligibilityRules: operations.eligibilityRules,
      }),
    ).toThrow("Duplicate module");
    registerModule(core, {
      id: "module:eligibility",
      eligibilityRules: operations.eligibilityRules,
    });
    expect(core.modules.size).toBe(p("two"));
  });

  it("admits a new data-defined tier and maintains town, county and tier indexes", () => {
    const tier = "fixture:fortnight-review";
    const data = extendData(DEFAULT_DATA, {
      tiers: [{ id: tier, cadence: "days", intervalParameter: "daysPerWeek" }],
    });
    const core = createCore(input(), { data });
    const api = coreAPI(core);
    api.updatePerson(outsider, { tier });
    expect(core.people.get(outsider)!.tier).toBe(tier);
    expect(core.peopleByTier.get(tier)).toEqual(new Set([outsider]));
    expect(core.peopleByTier.get("weekly")?.has(outsider)).toBe(false);
    expect(core.peopleByPlace.get(away)).toContain(outsider);
    expect(core.peopleByPlace.get("county:fixture-away")).toContain(outsider);
    api.updatePerson(outsider, { tier: "daily" });
    expect(core.peopleByTier.get(tier)?.size).toBe(p("zero"));
    expect(core.peopleByTier.get("daily")).toContain(outsider);
    expect(() => assertCoreIntegrity(core)).not.toThrow();
  });

  it("rejects unknown tiers and failed combined updates without corrupting existing indexes", () => {
    const core = createCore(input());
    const api = coreAPI(core);
    const before = mutableSnapshot(core);
    expect(() =>
      api.updatePerson(outsider, { tier: "fixture:unregistered-tier" }),
    ).toThrow("Unregistered tier");
    expect(mutableSnapshot(core)).toEqual(before);
    expect(() =>
      api.updatePerson(outsider, {
        tier: "daily",
        affect: { ...core.people.get(outsider)!.affect, stress: Number.NaN },
      }),
    ).toThrow("Non-finite affect");
    expect(mutableSnapshot(core)).toEqual(before);
    expect(() => assertCoreIntegrity(core)).not.toThrow();
  });

  it("adds a new organization kind and indexes idempotent membership through the facade", () => {
    const core = createCore(input());
    const api = coreAPI(core);
    const id = "organization:new-data-kind";
    api.addOrganization({
      id,
      placeId: home,
      name: "Recorded fixture association",
      kind: "fixture:association",
      liquidMinor: p("zero"),
      source,
    });
    expect(
      core.organizationsByPlaceKind.get(`${home}:fixture:association`),
    ).toEqual(new Set([id]));
    api.join(player, id);
    api.join(player, id);
    expect(core.memberships.size).toBe(p("one"));
    expect(core.membershipsByPerson.get(player)).toEqual(
      new Set([`${player}:${id}`]),
    );
    expect(() => api.join("person:absent", id)).toThrow("endpoint");
    expect(() => assertCoreIntegrity(core)).not.toThrow();
  });
});

describe("P8 retained husk identity and family continuity", () => {
  it.each([
    ["given name", { givenName: "Replacement" }],
    ["family name", { familyName: "Replacement" }],
    ["birth date", { birthDate: "1972-04-05" }],
    ["home place", { placeId: away }],
    ["county", { countyId: "county:other" }],
    ["known family", { familyIds: [] }],
  ] satisfies readonly (readonly [string, Partial<PersonInput>])[])(
    "rejects a contradictory %s without deleting the retained person",
    (_field, changes) => {
      const core = createCore(input());
      const before = mutableSnapshot(core);
      expect(() => promoteHusk(core, promotedPerson(changes))).toThrow();
      expect(mutableSnapshot(core)).toEqual(before);
      expect(core.husks.has(huskId)).toBe(true);
      expect(core.people.has(huskId)).toBe(false);
    },
  );

  it("preserves the recorded face, exact quotations, known family and already-learned name on promotion", () => {
    const core = createCore(input());
    const retained = structuredClone(core.husks.get(huskId)!);
    const visibleBefore = inspectPerson(core, player, huskId);
    const promoted = promoteHusk(core, promotedPerson());
    expect(core.husks.has(huskId)).toBe(false);
    expect(core.people.get(huskId)).toBe(promoted);
    expect(promoted.looks).toEqual(retained.looks);
    expect(promoted.said).toEqual(retained.said);
    expect(promoted.birthDate).toBe(retained.birthDate);
    expect(promoted.familyIds).toContain(circle);
    expect(inspectPerson(core, player, huskId)).toEqual(visibleBefore);
    expect(core.peopleByPlace.get(home)).toContain(huskId);
    expect(core.peopleByPlace.get(county)).toContain(huskId);
    expect(core.peopleByTier.get("daily")).toContain(huskId);
    expect(() => assertCoreIntegrity(core)).not.toThrow();
  });

  it.each([
    { householdId: "household:absent" },
    { householdId: `household:${outsider}` },
    { familyIds: [circle, "person:absent-relative"] },
    { jobId: "job:outsider" },
  ] satisfies readonly Partial<PersonInput>[])(
    "refuses invalid promoted relational evidence atomically: %j",
    (changes) => {
      const core = createCore(input());
      const before = mutableSnapshot(core);
      expect(() => promoteHusk(core, promotedPerson(changes))).toThrow();
      expect(mutableSnapshot(core)).toEqual(before);
    },
  );

  it("refuses a second promotion and preserves the existing admitted face", () => {
    const core = createCore(input());
    promoteHusk(core, promotedPerson());
    const before = mutableSnapshot(core);
    expect(() => promoteHusk(core, promotedPerson())).toThrow("recorded husk");
    expect(mutableSnapshot(core)).toEqual(before);
  });
});
