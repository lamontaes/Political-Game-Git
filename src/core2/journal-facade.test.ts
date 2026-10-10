/** Facade fixtures: UNEXECUTED production-migration candidate. */
import { describe, expect, it } from "vitest";
import { CORE_API_VERSION, CORE_SCHEMA_VERSION } from "./data";
import { parameterValues, P } from "./parameters";
import { coreAPI, createCore, promoteHusk, registerModule } from "./state";
import { cashJournalFieldWrite } from "./journal-state";
import type {
  CashJournalInput,
  CashJournalPosting,
  ResolvedCashJournalSource,
} from "./journal";
import type { CashJournalMetadataWrite } from "./journal-state";
import type {
  CoreAPI,
  CoreInput,
  CoreModule,
  CoreState,
  ModuleCashJournalSourceProvider,
  PersonInput,
  Source,
} from "./types";

const date = "2021-01-01",
  future = "2021-01-02",
  place = "place:journal-fixture";
const personA = "person:journal-first",
  personB = "person:journal-second";
const organization = "organization:journal-owner",
  huskId = "person:journal-husk";
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation:
    "Controlled owner-account/facade fixture; no observed payment or generated-world result.",
  estimatedFrom: "Explicit original cash and canonical module rows.",
};
const residual = (id: string) => "cash:" + id + ":residual";

function person(id: string, liquidMinor: number): PersonInput {
  return {
    id,
    givenName: "Recorded",
    familyName: id,
    birthDate: "1980-01-01",
    placeId: place,
    householdId: "household:" + id,
    tier: "weekly",
    traits: {},
    liquidMinor,
    livingCostDailyMinor: P.zero,
    source,
    familyIds: [],
    knownIds: [],
  };
}

function input(): CoreInput {
  const people = [person(personA, 1000), person(personB, 300)];
  return {
    seed: "journal-facade-source-fixture",
    startedAt: date,
    people,
    households: [
      ...people.map((row) => ({
        id: row.householdId,
        placeId: place,
        memberIds: [row.id],
        source,
      })),
      {
        id: "household:" + huskId,
        placeId: place,
        memberIds: [huskId],
        source,
      },
    ],
    organizations: [
      {
        id: organization,
        name: "Recorded owner",
        kind: "fixture:organization",
        placeId: place,
        liquidMinor: 2000,
        source,
      },
    ],
    husks: [
      {
        id: huskId,
        givenName: "Recorded",
        familyName: huskId,
        birthDate: "1980-01-01",
        placeId: place,
        source,
        looks: { identity: "recorded-husk-look" },
        said: ["Recorded words."],
      },
    ],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

type CanonicalSettlement = ResolvedCashJournalSource & {
  retainFull: boolean;
  metadata: readonly CashJournalMetadataWrite[];
};

function settlement(
  core: CoreState,
  kind = "fixture:module-payment",
  id = "fixture:current-payment",
  amount = 400,
): { canonical: CanonicalSettlement; input: CashJournalInput } {
  const lines: CashJournalPosting[] = [
    { id: id + ":out", accountId: residual(personA), deltaMinor: -amount },
    { id: id + ":in", accountId: residual(organization), deltaMinor: amount },
  ];
  const canonical: CanonicalSettlement = {
    kind,
    id,
    date: core.date,
    source: { ...source, asOf: core.date },
    expectedPostings: lines.map((row) => ({ ...row })),
    requiredRelatedRefs: [],
    relatedRecords: [],
    retainFull: false,
    metadata: [],
  };
  return {
    canonical,
    input: {
      id: "journal:" + core.date + ":" + core.cashJournal.nextSequence,
      date: core.date,
      expectedSequence: core.cashJournal.nextSequence,
      sourceRef: { kind, id },
      postings: lines,
    },
  };
}

function moduleFor(
  canonical: CanonicalSettlement,
  seen?: (api: CoreAPI) => void,
): CoreModule {
  return {
    id: "module:" + canonical.kind,
    journalSourceProviders: {
      [canonical.kind]: (api, reference) => {
        seen?.(api);
        return reference.kind === canonical.kind &&
          reference.id === canonical.id
          ? {
              resolved: canonical,
              marker: canonical,
              retainFull: canonical.retainFull,
              metadata: canonical.metadata,
            }
          : undefined;
      },
    },
  };
}

function registries(core: CoreState) {
  const sets = (map: Map<string, Set<string>>) =>
    new Map([...map].map(([key, value]) => [key, new Set(value)]));
  return {
    modules: [...core.modules],
    reasons: [...core.reasonProviders],
    journals: [...core.cashJournal.sourceProviders],
    events: [...core.eventSubscribers],
    eventKinds: sets(core.eventSubscribersByKind),
    appraisals: [...core.eventAppraisalSubscribers],
    appraisalKinds: sets(core.eventAppraisalSubscribersByKind),
    relationships: [...core.relationshipSubscribers],
    relationshipKinds: sets(core.relationshipSubscribersByKind),
  };
}

function ownersAndAccounts(core: CoreState): string {
  return JSON.stringify(
    {
      people: core.people,
      organizations: core.organizations,
      husks: core.husks,
      peopleByPlace: core.peopleByPlace,
      peopleByTier: core.peopleByTier,
      organizationsByPlaceKind: core.organizationsByPlaceKind,
      knowledge: core.knowledgeByPerson,
      journal: {
        ...core.cashJournal,
        sourceProviders: [...core.cashJournal.sourceProviders.keys()],
      },
    },
    (_key, value: unknown) =>
      value instanceof Map || value instanceof Set ? [...value] : value,
  );
}

describe("journal facade and canonical owner accounts", () => {
  it("registers exactly one source-derived residual per actual admitted cash owner without changing initial cash", () => {
    const supplied = input(),
      core = createCore(supplied);
    expect(core.people.get(personA)!.liquidMinor).toBe(1000);
    expect(core.people.get(personB)!.liquidMinor).toBe(300);
    expect(core.organizations.get(organization)!.liquidMinor).toBe(2000);
    expect(core.cashJournal.accounts.size).toBe(
      core.people.size + core.organizations.size,
    );
    for (const row of [...supplied.people, ...supplied.organizations]) {
      const account = core.cashJournal.accounts.get(residual(row.id))!;
      expect(account).toEqual({
        id: residual(row.id),
        ownerId: row.id,
        name: row.id,
        source: row.source,
      });
      expect(account.allocatedMinor).toBeUndefined();
      expect(account.source).not.toBe(row.source);
      expect(core.cashJournal.accountsByOwner.get(row.id)).toEqual(
        new Set([account.id]),
      );
      expect(core.cashJournal.residualAccountByOwner.get(row.id)).toBe(
        account.id,
      );
      expect(core.cashJournal.accountCountByOwner.get(row.id)).toBe(P.one);
    }
    expect(core.cashJournal.accountsByOwner.has(huskId)).toBe(false);
    expect(core.cashJournal.sourceProviders.size).toBe(P.zero);
    expect(core.cashJournal.nextSequence).toBe(P.zero);
    expect(core.cashJournal.totals.count).toBe(P.zero);
    expect(core.cashJournal.detailedReceipts.size).toBe(P.zero);
    expect(core.apiVersion).toBe(CORE_API_VERSION);
    expect(core.schemaVersion).toBe(CORE_SCHEMA_VERSION);
  });

  it("adds an organization's actual source/date metadata once and rolls back failed account admission before indexes", () => {
    const core = createCore(input()),
      api = coreAPI(core);
    const added = {
      id: "organization:later-owner",
      name: "Later recorded owner",
      kind: "fixture:later",
      placeId: place,
      liquidMinor: 75,
      source: { ...source },
    };
    api.addOrganization(added);
    expect(core.organizations.get(added.id)!.liquidMinor).toBe(75);
    expect(core.cashJournal.accountsByOwner.get(added.id)).toEqual(
      new Set([residual(added.id)]),
    );
    expect(core.cashJournal.accounts.get(residual(added.id))!.source).toEqual(
      added.source,
    );
    expect(() => api.addOrganization(added)).toThrow(/Duplicate/);
    const before = ownersAndAccounts(core);
    expect(() =>
      api.addOrganization({
        ...added,
        id: "organization:future-source",
        source: { ...source, asOf: future },
      }),
    ).toThrow(/available dated source/);
    expect(ownersAndAccounts(core)).toBe(before);
    expect(core.organizations.has("organization:future-source")).toBe(false);
    expect(
      core.cashJournal.accountsByOwner.has("organization:future-source"),
    ).toBe(false);
  });

  it("gives a promoted actual person one residual while preserving the supplied original cash and established husk", () => {
    const core = createCore(input()),
      promoted = person(huskId, 777);
    const actor = promoteHusk(core, promoted);
    expect(actor.liquidMinor).toBe(777);
    expect(actor.looks).toEqual({ identity: "recorded-husk-look" });
    expect(actor.said).toEqual(["Recorded words."]);
    expect(core.husks.has(huskId)).toBe(false);
    expect(core.cashJournal.accountsByOwner.get(huskId)).toEqual(
      new Set([residual(huskId)]),
    );
    expect(core.cashJournal.accountCountByOwner.get(huskId)).toBe(P.one);
    expect(core.cashJournal.accounts.get(residual(huskId))!.source).toEqual(
      promoted.source,
    );
    expect(core.cashJournal.totals.count).toBe(P.zero);
  });

  it("keeps a failed promoted person in its old husk and leaves all owner/account indexes unchanged", () => {
    const core = createCore(input()),
      api = coreAPI(core);
    api.registerCashAccount({
      id: residual(huskId),
      ownerId: personA,
      name: "Explicit conflicting fixture metadata",
      allocatedMinor: P.zero,
      source,
    });
    const before = ownersAndAccounts(core);
    expect(() => promoteHusk(core, person(huskId, 777))).toThrow(
      /Duplicate cash account/,
    );
    expect(ownersAndAccounts(core)).toBe(before);
    expect(core.people.has(huskId)).toBe(false);
    expect(core.husks.has(huskId)).toBe(true);
  });

  it("registers only zero-funded runtime metadata and rejects cash injection through the facade", () => {
    const core = createCore(input()),
      api = coreAPI(core);
    api.registerCashAccount({
      id: "fixture:named-partition",
      ownerId: personA,
      name: "Named cash partition",
      source,
      allocatedMinor: P.zero,
    });
    expect(core.people.get(personA)!.liquidMinor).toBe(1000);
    expect(
      core.cashJournal.accounts.get("fixture:named-partition")!.allocatedMinor,
    ).toBe(P.zero);
    const before = ownersAndAccounts(core);
    expect(() =>
      api.registerCashAccount({
        id: "fixture:invented-deposit",
        ownerId: personA,
        name: "Attempted deposit",
        source,
        allocatedMinor: 500,
      }),
    ).toThrow(/zero-funded/);
    expect(ownersAndAccounts(core)).toBe(before);
  });

  it("registers constructor-supplied modules after actual owner accounts and preserves the same canonical API closure", () => {
    const kind = "fixture:constructor-source",
      id = "fixture:constructor-settlement";
    const lines: CashJournalPosting[] = [
      { id: id + ":out", accountId: residual(personA), deltaMinor: -1 },
      { id: id + ":in", accountId: residual(organization), deltaMinor: 1 },
    ];
    const canonical: CanonicalSettlement = {
      kind,
      id,
      date,
      source,
      expectedPostings: lines,
      requiredRelatedRefs: [],
      relatedRecords: [],
      retainFull: false,
      metadata: [],
    };
    const seen: CoreAPI[] = [];
    const core = createCore(input(), {
      modules: [moduleFor(canonical, (received) => seen.push(received))],
    });
    expect(seen).toHaveLength(P.zero);
    const api = coreAPI(core);
    api.postJournal({
      id: "journal:" + core.date + ":" + core.cashJournal.nextSequence,
      date: core.date,
      expectedSequence: core.cashJournal.nextSequence,
      sourceRef: { kind, id },
      postings: lines,
    });
    expect(seen).toEqual([api, api]);
    expect(core.cashJournal.accounts.get(residual(personA))!.ownerId).toBe(
      personA,
    );
    expect(core.cashJournal.accounts.get(residual(organization))!.ownerId).toBe(
      organization,
    );
    expect(core.people.get(personA)!.liquidMinor).toBe(999);
    expect(canonical.postedJournalSequence).toBe(P.zero);
  });

  it("uses the canonical cached CoreAPI and an immutable numeric snapshot with the actual live date and cash rows", () => {
    const core = createCore(input()),
      api = coreAPI(core);
    expect(coreAPI(core)).toBe(api);
    const numeric = parameterValues(core.data.parameters);
    expect(Object.isFrozen(numeric)).toBe(true);
    expect(Reflect.set(numeric, "zero", P.one)).toBe(false);
    // This deliberate fixture clock change tests the cached host, not a time-advance route.
    core.date = future;
    const first = settlement(
      core,
      "fixture:earlier-payment",
      "fixture:earlier-payment",
      25,
    );
    registerModule(core, moduleFor(first.canonical));
    api.postJournal(first.input);
    expect(core.people.get(personA)!.liquidMinor).toBe(975);
    const { canonical, input: posting } = settlement(core);
    const seen: CoreAPI[] = [];
    registerModule(
      core,
      moduleFor(canonical, (received) => seen.push(received)),
    );
    expect(seen).toHaveLength(P.zero);
    const paid = api.postJournal(posting);
    expect(seen).toEqual([api, api]);
    expect(
      seen.every(
        (received) => received.state === core && received.state.date === future,
      ),
    ).toBe(true);
    expect(paid.date).toBe(future);
    expect(paid.owners.get(personA)!.beforeMinor).toBe(975);
    expect(core.people.get(personA)!.liquidMinor).toBe(575);
    expect(core.organizations.get(organization)!.liquidMinor).toBe(2425);
    expect(canonical.postedJournalSequence).toBe(P.one);
    expect(core.cashJournal.nextSequence).toBe(P.one + P.one);
    expect(core.date).toBe(future);
  });

  it("resolves current canonical source internally, commits source-owned metadata and gives callers no source override", () => {
    const core = createCore(input()),
      api = coreAPI(core);
    const { canonical, input: posting } = settlement(core);
    const moduleTotals = { paidMinor: P.zero };
    canonical.metadata = [
      cashJournalFieldWrite(moduleTotals, "paidMinor", 400),
    ];
    registerModule(core, moduleFor(canonical));
    const forged = {
      ...posting,
      sourceRef: { kind: canonical.kind, id: "fixture:not-current" },
      resolvedSource: canonical,
      metadata: canonical.metadata,
    };
    const before = ownersAndAccounts(core);
    expect(() => api.postJournal(forged)).toThrow(/canonical.*absent/);
    expect(ownersAndAccounts(core)).toBe(before);
    expect(moduleTotals.paidMinor).toBe(P.zero);
    api.postJournal(posting);
    expect(moduleTotals.paidMinor).toBe(400);
    expect(core.cashJournal.totals.count).toBe(P.one);
    expect(core.cashJournal.detailedReceipts.size).toBe(P.zero);
    const replay = {
      ...posting,
      id: "journal:" + core.date + ":" + core.cashJournal.nextSequence,
      expectedSequence: core.cashJournal.nextSequence,
    };
    expect(() => api.postJournal(replay)).toThrow(/unposted/);
    expect(core.people.get(personA)!.liquidMinor).toBe(600);
  });

  it("registers opaque open module-owned source kinds without a default authority provider", () => {
    const core = createCore(input()),
      api = coreAPI(core);
    for (const kind of [
      "fixture:custom-flow",
      "mod:unlisted-issuer",
      "module-owned:another-kind",
    ]) {
      const { canonical, input: posting } = settlement(
        core,
        kind,
        "source:" + kind,
        1,
      );
      registerModule(core, moduleFor(canonical));
      api.postJournal(posting);
    }
    expect(core.cashJournal.sourceProviders.size).toBe(3);
    expect(core.cashJournal.totals.count).toBe(3);
    const absent = settlement(core, "fixture:unregistered-authority");
    const before = ownersAndAccounts(core);
    expect(() => api.postJournal(absent.input)).toThrow(
      /provider is not registered/,
    );
    expect(ownersAndAccounts(core)).toBe(before);
  });

  it("releases source-required quiet detail through the source provider while preserving focus and cash", () => {
    const core = createCore(input()),
      api = coreAPI(core);
    const { canonical, input: posting } = settlement(core);
    canonical.retainFull = true;
    registerModule(core, moduleFor(canonical));
    api.postJournal(posting);
    expect(core.cashJournal.detailedReceipts.has(posting.id)).toBe(true);
    expect(core.cashJournal.detailedByOwner.size).toBe(P.zero);
    expect(() => api.releaseJournalSource(posting.sourceRef)).toThrow(
      /still requires/,
    );
    canonical.retainFull = false;
    api.releaseJournalSource(posting.sourceRef);
    expect(core.cashJournal.detailedReceipts.size).toBe(P.zero);
    expect(core.cashJournal.requiredBySource.size).toBe(P.zero);
    expect(core.cashJournal.latestByOwner.size).toBe(2);
    expect(core.people.get(personA)!.liquidMinor).toBe(600);
    expect(core.focusPersonIds.size).toBe(P.zero);
  });

  it("requires a canonical journal instead of bare transfer and declares the completed API9 boundary", () => {
    const core = createCore(input()),
      api = coreAPI(core);
    const payment = settlement(
      core,
      "fixture:version-payment",
      "fixture:version-payment",
      10,
    );
    registerModule(core, moduleFor(payment.canonical));
    expect(api.postJournal(payment.input).owners.get(personA)!.afterMinor).toBe(
      990,
    );
    expect("transfer" in api).toBe(false);
    expect(core.people.get(personA)!.liquidMinor).toBe(990);
    expect(core.organizations.get(organization)!.liquidMinor).toBe(2010);
    expect(core.cashJournal.nextSequence).toBe(P.one);
    expect(core.cashJournal.totals.count).toBe(P.one);
    expect(core.cashJournal.latestByOwner.size).toBe(P.one + P.one);
    expect(api.version).toBe("core2-api-v9");
    expect(core.schemaVersion).toBe("core2-schema-v9");
  });
});

describe("atomic module registration across all provider/subscription keys", () => {
  const noSource: ModuleCashJournalSourceProvider = () => undefined;
  const allRegistries = (id: string): CoreModule => ({
    id,
    journalSourceProviders: { ["journal:" + id]: noSource },
    reasonProviders: { ["reason:" + id]: () => undefined },
    needEvaluators: { ["need:" + id]: () => P.zero },
    eventKinds: ["fixture:old-event"],
    onEvent: () => {},
    appraisalEventKinds: ["fixture:appraisal"],
    onEventAppraisal: () => {},
    relationshipKinds: ["contact"],
    onRelationshipChange: () => {},
  });

  it("installs every valid registry together and never invokes a source provider during registration", () => {
    const core = createCore(input()),
      module = allRegistries("fixture:valid");
    let resolved = P.zero;
    module.journalSourceProviders = {
      "fixture:first-open-key": () => {
        resolved += P.one;
        return undefined;
      },
      "fixture:second-open-key": () => {
        resolved += P.one;
        return undefined;
      },
    };
    registerModule(core, module);
    expect(core.modules.get(module.id)).toBe(module);
    expect(core.cashJournal.sourceProviders.has("fixture:first-open-key")).toBe(
      true,
    );
    expect(
      core.cashJournal.sourceProviders.has("fixture:second-open-key"),
    ).toBe(true);
    expect(core.reasonProviders.has("reason:" + module.id)).toBe(true);
    expect(core.eventSubscribers.has("module:" + module.id)).toBe(true);
    expect(core.eventAppraisalSubscribers.has("module:" + module.id)).toBe(
      true,
    );
    expect(core.relationshipSubscribers.has("module:" + module.id)).toBe(true);
    expect(resolved).toBe(P.zero);
  });

  it("rejects a duplicate second journal key without installing the first or any other module registry", () => {
    const core = createCore(input());
    registerModule(core, {
      id: "fixture:existing",
      journalSourceProviders: { "fixture:taken": noSource },
    });
    const module = allRegistries("fixture:duplicate");
    module.journalSourceProviders = {
      "fixture:first-valid": noSource,
      "fixture:taken": noSource,
    };
    const before = registries(core),
      cashBefore = ownersAndAccounts(core);
    expect(() => registerModule(core, module)).toThrow(
      /Duplicate journal source provider/,
    );
    expect(registries(core)).toEqual(before);
    expect(ownersAndAccounts(core)).toBe(cashBefore);
  });

  it("rejects empty/untrimmed/non-callable source kinds before all first-key registry writes", () => {
    for (const badKey of ["", " fixture:kind", "fixture:kind ", " "]) {
      const core = createCore(input()),
        module = allRegistries("fixture:bad-key");
      module.journalSourceProviders = {
        "fixture:first-valid": noSource,
        [badKey]: noSource,
      };
      const before = registries(core);
      expect(() => registerModule(core, module)).toThrow(
        /Invalid journal source provider/,
      );
      expect(registries(core)).toEqual(before);
    }
    const core = createCore(input()),
      module = allRegistries("fixture:bad-provider");
    module.journalSourceProviders = {
      "fixture:first-valid": noSource,
      "fixture:not-callable": 7 as unknown as ModuleCashJournalSourceProvider,
    };
    const before = registries(core);
    expect(() => registerModule(core, module)).toThrow(
      /Invalid journal source provider/,
    );
    expect(registries(core)).toEqual(before);
  });

  it("rejects invalid later legacy/new subscriptions before installing any valid journal/reason/operation key", () => {
    for (const stream of ["legacy", "appraisal", "relationship"] as const) {
      const core = createCore(input()),
        module = allRegistries("fixture:bad-subscription");
      if (stream === "legacy") module.eventKinds = [""];
      else if (stream === "appraisal") module.appraisalEventKinds = [];
      else module.relationshipKinds = [" contact"];
      const before = registries(core);
      expect(() => registerModule(core, module)).toThrow(/subscription/);
      expect(registries(core)).toEqual(before);
      expect(core.cashJournal.sourceProviders.has("journal:" + module.id)).toBe(
        false,
      );
    }
  });

  it("rejects duplicate subscriber identities in every stream before installing journal providers", () => {
    for (const stream of ["legacy", "appraisal", "relationship"] as const) {
      const core = createCore(input()),
        module = allRegistries("fixture:collision");
      // Public consumer subscriptions have their own namespace. Preserve an
      // actual module subscription while deliberately orphaning only its module
      // entry, to exercise preflight of the canonical subscriber identity.
      const prior: CoreModule = { id: module.id };
      if (stream === "legacy") {
        prior.eventKinds = ["fixture:old-event"];
        prior.onEvent = () => {};
      } else if (stream === "appraisal") {
        prior.appraisalEventKinds = ["fixture:appraisal"];
        prior.onEventAppraisal = () => {};
      } else {
        prior.relationshipKinds = ["contact"];
        prior.onRelationshipChange = () => {};
      }
      registerModule(core, prior);
      expect(core.modules.delete(prior.id)).toBe(true);
      const before = registries(core);
      expect(() => registerModule(core, module)).toThrow(
        /Duplicate.*subscriber/,
      );
      expect(registries(core)).toEqual(before);
    }
  });

  it("rejects an operation or reason collision found after valid journal keys without partial installation", () => {
    for (const collision of ["operation", "reason"] as const) {
      const core = createCore(input());
      registerModule(core, {
        id: "fixture:old-operations",
        needEvaluators: { "fixture:taken-operation": () => P.zero },
        reasonProviders: { "fixture:taken-reason": () => undefined },
      });
      const module = allRegistries("fixture:later-collision");
      if (collision === "operation")
        module.needEvaluators = {
          "fixture:new-operation": () => P.zero,
          "fixture:taken-operation": () => P.zero,
        };
      else
        module.reasonProviders = {
          "fixture:new-reason": () => undefined,
          "fixture:taken-reason": () => undefined,
        };
      const before = registries(core);
      expect(() => registerModule(core, module)).toThrow(
        /Duplicate.*(operation|reason provider)/,
      );
      expect(registries(core)).toEqual(before);
    }
  });
});
