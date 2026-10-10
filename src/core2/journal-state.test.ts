/** Meaningful source-only counterexamples; NOT EXECUTED and no world proof is claimed. */
import { describe, expect, it } from "vitest";
import { P } from "./parameters";
import {
  cashJournalFieldWrite,
  cashJournalFieldDelete,
  cashJournalMapSet,
  cashJournalMapDelete,
  cashJournalSetWrite,
  completeCashJournalSource,
  emptyCashJournalRuntime,
  postCashJournal,
  registerCashAccount,
  registerCashJournalSourceProviders,
  releaseCashJournalSource,
} from "./journal-state";
import type {
  CashJournalCashOwner,
  CashJournalHost,
  CashJournalMetadataWrite,
  CashJournalPostedMarker,
  CashJournalSourceSlot,
} from "./journal-state";
import type {
  CashJournalInput,
  CashJournalPosting,
  ResolvedCashJournalSource,
} from "./journal";
import type { Source } from "./types";

const date = "2021-01-31",
  future = "2021-02-01";
const ownerA = "fixture:person",
  ownerB = "fixture:organization";
const residualA = "fixture:person:residual",
  fundA = "fixture:person:fund";
const residualB = "fixture:organization:residual",
  sourceKind = "fixture:actual-settlement";
const source: Source = {
  tag: "SOURCED",
  asOf: date,
  citation:
    "Technical canonical settlement fixture; no real payment or legal authority is asserted.",
};
type CanonicalSource = ResolvedCashJournalSource &
  CashJournalPostedMarker & {
    retainFull: boolean;
    metadata: readonly CashJournalMetadataWrite[];
    secondaryMarkers?: CashJournalSourceSlot["secondaryMarkers"];
  };

function payment(
  amount = 400,
  from = residualA,
  to = residualB,
): CashJournalPosting[] {
  return [
    { id: "fixture:out", accountId: from, deltaMinor: -amount },
    { id: "fixture:in", accountId: to, deltaMinor: amount },
  ];
}

function fixture() {
  const runtime = emptyCashJournalRuntime();
  const host: CashJournalHost = {
    state: {
      date,
      people: new Map<string, CashJournalCashOwner>([
        [ownerA, { id: ownerA, liquidMinor: 1000 }],
      ]),
      organizations: new Map<string, CashJournalCashOwner>([
        [ownerB, { id: ownerB, liquidMinor: 200 }],
      ]),
      focusPersonIds: new Set<string>(),
      observer: false,
    },
    parameters: { zero: P.zero, one: P.one },
  };
  const records = new Map<string, CanonicalSource>();
  const control: { calls: number; beforeResolve?: (count: number) => void } = {
    calls: P.zero,
  };
  registerCashJournalSourceProviders(runtime, {
    [sourceKind]: (reference) => {
      control.calls += P.one;
      control.beforeResolve?.(control.calls);
      const row = records.get(reference.id);
      return row
        ? {
            resolved: row,
            marker: row,
            retainFull: row.retainFull,
            metadata: row.metadata,
            secondaryMarkers: row.secondaryMarkers,
          }
        : undefined;
    },
  });
  registerCashAccount(runtime, host, {
    id: residualA,
    ownerId: ownerA,
    name: "Available cash",
    source,
  });
  registerCashAccount(runtime, host, {
    id: fundA,
    ownerId: ownerA,
    name: "Named cash partition",
    source,
    allocatedMinor: P.zero,
  });
  registerCashAccount(runtime, host, {
    id: residualB,
    ownerId: ownerB,
    name: "Available cash",
    source,
  });
  const addSource = (
    lines: readonly CashJournalPosting[] = payment(),
    id = "fixture:current-settlement",
  ) => {
    control.calls = P.zero;
    const canonical: CanonicalSource = {
      kind: sourceKind,
      id,
      date: host.state.date,
      source: { ...source },
      expectedPostings: lines.map((row) => ({ ...row })),
      requiredRelatedRefs: [
        { kind: "fixture:actual-act", id: "fixture:committed-act" },
      ],
      relatedRecords: [
        {
          kind: "fixture:actual-act",
          id: "fixture:committed-act",
          date: host.state.date,
          source: { ...source },
        },
      ],
      retainFull: false,
      metadata: [],
    };
    records.set(id, canonical);
    const input: CashJournalInput = {
      id: "journal:" + host.state.date + ":" + runtime.nextSequence,
      date: host.state.date,
      expectedSequence: runtime.nextSequence,
      sourceRef: { kind: sourceKind, id },
      postings: lines.map((row) => ({ ...row })),
    };
    return { input, canonical };
  };
  return { runtime, host, records, control, addSource };
}

type Fixture = ReturnType<typeof fixture>;

function addSecondary(
  f: Fixture,
  primary: CanonicalSource,
  id = "fixture:funding-request",
) {
  const secondary: CanonicalSource = {
    kind: "fixture:funding",
    id,
    date: f.host.state.date,
    source: { ...source },
    expectedPostings: [],
    requiredRelatedRefs: [],
    relatedRecords: [],
    retainFull: false,
    metadata: [],
  };
  f.records.set(id, secondary);
  const reference = { kind: secondary.kind, id };
  primary.relatedRecords = [
    ...primary.relatedRecords,
    {
      ...reference,
      date: secondary.date,
      source: secondary.source,
    },
  ];
  primary.requiredRelatedRefs = [...primary.requiredRelatedRefs, reference];
  primary.secondaryMarkers = [
    ...(primary.secondaryMarkers ?? []),
    { reference, marker: secondary },
  ];
  return secondary;
}

function addOutsidePayment(f: Fixture, amount = 400) {
  const outsideId = "fixture:outside-owner",
    accountId = "fixture:outside-flow-account";
  (f.host.state.organizations as Map<string, CashJournalCashOwner>).set(
    outsideId,
    {
      id: outsideId,
      liquidMinor: P.zero,
      outsideFlow: { ...source },
    },
  );
  registerCashAccount(f.runtime, f.host, {
    id: accountId,
    ownerId: outsideId,
    name: "Outside obligation flow",
    source,
    outsideFlow: true,
  });
  const current = f.addSource([
    { id: "fixture:outside-out", accountId, deltaMinor: -amount },
    { id: "fixture:local-in", accountId: residualA, deltaMinor: amount },
  ]);
  const obligation = {
    kind: "fixture:outside-obligation",
    id: "fixture:due-benefit",
  };
  current.canonical.requiredRelatedRefs = [
    ...current.canonical.requiredRelatedRefs,
    obligation,
  ];
  current.canonical.relatedRecords = [
    ...current.canonical.relatedRecords,
    { ...obligation, date, source: { ...source } },
  ];
  current.canonical.externalFlowAuthorizations = [{ accountId, obligation }];
  return { ...current, outsideId, accountId };
}

function snapshot(f: Fixture): string {
  return JSON.stringify(
    {
      state: f.host.state,
      runtime: {
        ...f.runtime,
        sourceProviders: [...f.runtime.sourceProviders.keys()],
      },
      markers: [...f.records].map(([id, row]) => ({
        id,
        date: row.date,
        postedJournalSequence: row.postedJournalSequence,
        retainFull: row.retainFull,
        source: row.source,
        expectedPostings: row.expectedPostings,
        relatedRecords: row.relatedRecords,
        requiredRelatedRefs: row.requiredRelatedRefs,
      })),
    },
    (_key, row: unknown) =>
      row instanceof Map || row instanceof Set ? [...row] : row,
  );
}

function rejectUnchanged(
  f: Fixture,
  input: CashJournalInput,
  error: RegExp,
): void {
  const before = snapshot(f);
  expect(() => postCashJournal(f.runtime, f.host, input)).toThrow(error);
  expect(snapshot(f)).toBe(before);
}

describe("atomic completion of genuine composite sources", () => {
  it("posts credit and wage sources under one cash sequence and accounting commit", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    const credit = addSecondary(f, canonical);
    const act = addSecondary(f, canonical, "fixture:actual-work-act");
    const counter = { count: P.zero };
    canonical.metadata = [cashJournalFieldWrite(counter, "count", P.one)];
    postCashJournal(f.runtime, f.host, input);
    expect(canonical.postedJournalSequence).toBe(P.zero);
    expect(credit.postedJournalSequence).toBe(P.zero);
    expect(act.postedJournalSequence).toBe(P.zero);
    expect(credit.completedAt).toBeUndefined();
    expect(f.runtime.nextSequence).toBe(P.one);
    expect(f.runtime.totals.count).toBe(P.one);
    expect(counter.count).toBe(P.one);
    expect(f.control.calls).toBe(P.one + P.one);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(600);
    expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(600);
  });

  it("completes absent or unpaid work and its actual act without any cash journal", () => {
    const f = fixture(),
      { input, canonical } = f.addSource([]);
    const act = addSecondary(f, canonical);
    completeCashJournalSource(f.runtime, f.host, input.sourceRef);
    expect(canonical.completedAt).toBe(date);
    expect(act.completedAt).toBe(date);
    expect(act.postedJournalSequence).toBeUndefined();
    expect(f.runtime.nextSequence).toBe(P.zero);
    expect(f.runtime.totals.count).toBe(P.zero);
    expect(f.runtime.detailedReceipts.size).toBe(P.zero);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
  });

  it("rejects a repeated, shared, or primary secondary identity before payment", () => {
    for (const form of ["repeated", "shared-marker", "primary"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      addSecondary(f, canonical);
      const first = canonical.secondaryMarkers![0]!;
      canonical.secondaryMarkers =
        form === "repeated"
          ? [first, first]
          : form === "shared-marker"
            ? [
                first,
                {
                  reference: {
                    kind: first.reference.kind,
                    id: "fixture:another",
                  },
                  marker: first.marker,
                },
              ]
            : [
                {
                  reference: { kind: canonical.kind, id: canonical.id },
                  marker: canonical,
                },
              ];
      rejectUnchanged(f, input, /Duplicate primary or secondary/);
    }
  });

  it("requires each secondary to be both resolved, required and on the current date", () => {
    for (const missing of ["resolved", "required", "current"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      const secondary = addSecondary(f, canonical);
      if (missing === "resolved")
        canonical.relatedRecords = canonical.relatedRecords.filter(
          (row) => row.id !== secondary.id,
        );
      if (missing === "required")
        canonical.requiredRelatedRefs = canonical.requiredRelatedRefs.filter(
          (row) => row.id !== secondary.id,
        );
      if (missing === "current")
        canonical.relatedRecords = canonical.relatedRecords.map((row) =>
          row.id === secondary.id ? { ...row, date: "2021-01-30" } : row,
        );
      rejectUnchanged(f, input, /resolved required current source/);
    }
  });

  it("rejects a previously posted or zero-completed secondary on both writer paths", () => {
    for (const path of ["cash", "zero"] as const)
      for (const marker of ["posted", "completed"] as const) {
        const f = fixture(),
          { input, canonical } = f.addSource(path === "cash" ? payment() : []);
        const secondary = addSecondary(f, canonical);
        if (marker === "posted") secondary.postedJournalSequence = P.zero;
        else secondary.completedAt = date;
        const before = snapshot(f);
        expect(() =>
          path === "cash"
            ? postCashJournal(f.runtime, f.host, input)
            : completeCashJournalSource(f.runtime, f.host, input.sourceRef),
        ).toThrow(/already posted|completed/);
        expect(snapshot(f)).toBe(before);
      }
  });

  it("rejects a secondary marker mutation after the last lookup without cash or accounting writes", () => {
    for (const path of ["cash", "zero"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource(path === "cash" ? payment() : []);
      const secondary = addSecondary(f, canonical),
        counter = { count: P.zero };
      canonical.metadata = [cashJournalFieldWrite(counter, "count", P.one)];
      f.control.beforeResolve = (count) => {
        if (count === P.one + P.one) secondary.completedAt = date;
      };
      expect(() =>
        path === "cash"
          ? postCashJournal(f.runtime, f.host, input)
          : completeCashJournalSource(f.runtime, f.host, input.sourceRef),
      ).toThrow(/Stale secondary/);
      expect(canonical.completedAt).toBeUndefined();
      expect(canonical.postedJournalSequence).toBeUndefined();
      expect(counter.count).toBe(P.zero);
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(f.runtime.nextSequence).toBe(P.zero);
    }
  });

  it("rejects replacement of the secondary list during the final source lookup", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    addSecondary(f, canonical);
    rejectAfterInterference(
      f,
      input,
      () => {
        canonical.secondaryMarkers = [];
      },
      /source or its staged metadata changed/,
    );
  });

  it("reserves secondary completion fields from generic metadata on cash and zero paths", () => {
    for (const path of ["cash", "zero"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource(path === "cash" ? payment() : []);
      const secondary = addSecondary(f, canonical);
      canonical.metadata = [
        cashJournalFieldWrite(secondary, "completedAt", date),
      ];
      const before = snapshot(f);
      expect(() =>
        path === "cash"
          ? postCashJournal(f.runtime, f.host, input)
          : completeCashJournalSource(f.runtime, f.host, input.sourceRef),
      ).toThrow(/conflicts/);
      expect(snapshot(f)).toBe(before);
    }
  });
});

describe("atomic outside flow accounting", () => {
  it("starts at zero and commits exactly the actual incoming local payment with its source marker", () => {
    const f = fixture(),
      { input, canonical, outsideId } = addOutsidePayment(f);
    expect(f.runtime.externalFlowsByOwner.get(outsideId)).toEqual({
      netMinor: P.zero,
      incomingMinor: P.zero,
      outgoingMinor: P.zero,
    });
    postCashJournal(f.runtime, f.host, input);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1400);
    expect(f.host.state.organizations.get(outsideId)!.liquidMinor).toBe(P.zero);
    expect(f.runtime.externalFlowsByOwner.get(outsideId)).toEqual({
      netMinor: -400,
      incomingMinor: P.zero,
      outgoingMinor: 400,
    });
    expect(f.runtime.latestByOwner.get(outsideId)!.outsideNetAfterMinor).toBe(
      -400,
    );
    expect(f.runtime.nextSequence).toBe(P.one);
    expect(canonical.postedJournalSequence).toBe(P.zero);
    const before = snapshot(f);
    expect(() => postCashJournal(f.runtime, f.host, input)).toThrow();
    expect(snapshot(f)).toBe(before);
  });

  it("does not give an ordinary organization outside funds by registering a flag", () => {
    const f = fixture(),
      before = snapshot(f);
    expect(() =>
      registerCashAccount(f.runtime, f.host, {
        id: "fixture:fake-outside",
        ownerId: ownerB,
        name: "Unsupported outside",
        source,
        outsideFlow: true,
      }),
    ).toThrow(/metadata must match/);
    expect(snapshot(f)).toBe(before);
  });

  it("rejects any prepaid outside stock or local fund partition before admission", () => {
    for (const form of ["stock", "fund"] as const) {
      const f = fixture(),
        id = "fixture:outside-owner";
      (f.host.state.organizations as Map<string, CashJournalCashOwner>).set(
        id,
        {
          id,
          liquidMinor: form === "stock" ? 100 : P.zero,
          outsideFlow: source,
        },
      );
      const before = snapshot(f);
      expect(() =>
        registerCashAccount(f.runtime, f.host, {
          id: "fixture:outside-invalid",
          ownerId: id,
          name: "Outside",
          source,
          outsideFlow: true,
          ...(form === "fund" ? { allocatedMinor: P.zero } : {}),
        }),
      ).toThrow(/zero cash/);
      expect(snapshot(f)).toBe(before);
    }
  });

  it("rejects due-flow authority removed on the last lookup without paying or advancing the source", () => {
    const f = fixture(),
      { input, canonical, outsideId } = addOutsidePayment(f);
    rejectAfterInterference(
      f,
      input,
      () => {
        canonical.externalFlowAuthorizations = [];
      },
      /source or its staged metadata changed/,
    );
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
    expect(f.runtime.externalFlowsByOwner.get(outsideId)!.netMinor).toBe(
      P.zero,
    );
    expect(canonical.postedJournalSequence).toBeUndefined();
  });

  it("guards the actual outside owner Source and signed counter before any commit", () => {
    for (const form of ["source", "counter"] as const) {
      const f = fixture(),
        { input, canonical, outsideId } = addOutsidePayment(f);
      rejectAfterInterference(
        f,
        input,
        () => {
          if (form === "source")
            f.host.state.organizations.get(outsideId)!.outsideFlow!.citation =
              "changed";
          else
            f.runtime.externalFlowsByOwner.get(outsideId)!.outgoingMinor =
              P.one;
        },
        /Stale journal cash owner/,
      );
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(canonical.postedJournalSequence).toBeUndefined();
      expect(f.runtime.nextSequence).toBe(P.zero);
    }
  });

  it("protects external totals from generic metadata on cash and zero-cash paths", () => {
    for (const path of ["cash", "zero"] as const) {
      const f = fixture(),
        current = addOutsidePayment(f);
      const { input, canonical } = path === "cash" ? current : f.addSource([]);
      const totals = f.runtime.externalFlowsByOwner.get(current.outsideId)!;
      canonical.metadata = [
        cashJournalFieldWrite(totals, "incomingMinor", 100),
      ];
      const before = snapshot(f);
      expect(() =>
        path === "cash"
          ? postCashJournal(f.runtime, f.host, input)
          : completeCashJournalSource(f.runtime, f.host, input.sourceRef),
      ).toThrow(/journal-owned/);
      expect(snapshot(f)).toBe(before);
    }
  });
});

function rejectAfterInterference(
  f: Fixture,
  input: CashJournalInput,
  interfere: () => void,
  error: RegExp,
): void {
  let afterInterference: string | undefined;
  f.control.calls = P.zero;
  f.control.beforeResolve = (count) => {
    if (count !== P.one + P.one) return;
    interfere();
    afterInterference = snapshot(f);
  };
  expect(() => postCashJournal(f.runtime, f.host, input)).toThrow(error);
  expect(afterInterference).toBeDefined();
  expect(snapshot(f)).toBe(afterInterference);
}

function allocate(f: Fixture, amount = 300): void {
  const { input } = f.addSource(
    payment(amount, residualA, fundA),
    "fixture:allocation",
  );
  postCashJournal(f.runtime, f.host, input);
}

describe("synchronous canonical cash journal writer", () => {
  it("registers detached metadata and zero-funded partitions without adding owner cash", () => {
    const f = fixture(),
      actual = f.host.state.people.get(ownerA)!;
    expect(actual.liquidMinor).toBe(1000);
    expect(f.runtime.accounts.get(fundA)!.allocatedMinor).toBe(P.zero);
    expect(f.runtime.accountsByOwner.get(ownerA)).toEqual(
      new Set([residualA, fundA]),
    );
    expect(f.runtime.accountCountByOwner.get(ownerA)).toBe(2);
    expect(f.runtime.nextSequence).toBe(P.zero);
    expect(f.runtime.totals.count).toBe(P.zero);
    const proposed = {
      id: "fixture:second-fund",
      ownerId: ownerA,
      name: "Second partition",
      source: { ...source },
      allocatedMinor: P.zero,
    };
    registerCashAccount(f.runtime, f.host, proposed);
    proposed.name = "Changed caller name";
    proposed.source.citation = "Changed caller citation";
    expect(f.runtime.accounts.get(proposed.id)!.name).toBe("Second partition");
    expect(f.runtime.accounts.get(proposed.id)!.source.citation).toBe(
      source.citation,
    );
    expect(actual.liquidMinor).toBe(1000);
  });

  it("rejects opening money, duplicate residuals, missing owners and future account evidence without metadata writes", () => {
    for (const account of [
      {
        id: "fixture:top-up",
        ownerId: ownerA,
        name: "Fund",
        source,
        allocatedMinor: 100,
      },
      {
        id: "fixture:other-residual",
        ownerId: ownerA,
        name: "Second residual",
        source,
      },
      {
        id: "fixture:absent-owner",
        ownerId: "fixture:missing",
        name: "Fund",
        source,
      },
      {
        id: "fixture:future",
        ownerId: ownerA,
        name: "Fund",
        source: { ...source, asOf: future },
        allocatedMinor: P.zero,
      },
    ]) {
      const f = fixture(),
        before = snapshot(f);
      expect(() => registerCashAccount(f.runtime, f.host, account)).toThrow();
      expect(snapshot(f)).toBe(before);
    }
    const empty = fixture();
    const newcomer: CashJournalCashOwner = {
      id: "fixture:new-owner",
      liquidMinor: 10,
    };
    (empty.host.state.people as Map<string, CashJournalCashOwner>).set(
      newcomer.id,
      newcomer,
    );
    const before = snapshot(empty);
    expect(() =>
      registerCashAccount(empty.runtime, empty.host, {
        id: "fixture:fund-without-residual",
        ownerId: newcomer.id,
        name: "Fund",
        source,
        allocatedMinor: P.zero,
      }),
    ).toThrow(/residual account before a fund/);
    expect(snapshot(empty)).toBe(before);
  });

  it("validates an entire source-provider registration before installing the first key", () => {
    const f = fixture(),
      before = [...f.runtime.sourceProviders];
    const harmless = () => undefined;
    expect(() =>
      registerCashJournalSourceProviders(f.runtime, {
        "fixture:new-provider": harmless,
        [sourceKind]: harmless,
      }),
    ).toThrow(/duplicate/);
    expect([...f.runtime.sourceProviders]).toEqual(before);
    expect(() =>
      registerCashJournalSourceProviders(f.runtime, {
        "fixture:new-provider": harmless,
        " fixture:bad-key": harmless,
      }),
    ).toThrow(/identity/);
    expect([...f.runtime.sourceProviders]).toEqual(before);
  });

  it("posts real authoritative owner cash once and seals the direct current-source marker", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    const result = postCashJournal(f.runtime, f.host, input);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(600);
    expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(600);
    expect(
      result.owners.get(ownerA)!.afterMinor +
        result.owners.get(ownerB)!.afterMinor,
    ).toBe(1200);
    expect(f.runtime.accounts.get(fundA)!.allocatedMinor).toBe(P.zero);
    expect(f.runtime.nextSequence).toBe(P.one);
    expect(canonical.postedJournalSequence).toBe(P.zero);
    expect(f.runtime.totals).toEqual({
      count: P.one,
      grossDebitMinor: 400,
      grossCreditMinor: 400,
    });
    expect(f.runtime.latestByOwner.get(ownerA)!.afterMinor).toBe(600);
    expect(f.runtime.latestByAccount.get(residualB)!.afterMinor).toBe(600);
    expect(f.control.calls).toBe(P.one + P.one);
  });

  it("reclassifies existing cash into a fund and spends only that actual finite allocation", () => {
    const f = fixture();
    allocate(f);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
    expect(f.runtime.accounts.get(fundA)!.allocatedMinor).toBe(300);
    expect(f.runtime.latestByAccount.get(residualA)!.afterMinor).toBe(700);
    expect(f.runtime.latestByAccount.get(fundA)!.afterMinor).toBe(300);
    const { input } = f.addSource(payment(100, fundA, residualB));
    const result = postCashJournal(f.runtime, f.host, input);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(900);
    expect(f.runtime.accounts.get(fundA)!.allocatedMinor).toBe(200);
    expect(result.accounts.get(residualA)!.afterMinor).toBe(700);
    expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(300);
    const overFund = f.addSource(
      payment(201, fundA, residualB),
      "fixture:over-fund",
    );
    rejectUnchanged(f, overFund.input, /fund after/);
    const overResidual = f.addSource(payment(701), "fixture:over-residual");
    rejectUnchanged(f, overResidual.input, /residual after/);
  });

  it("rejects a missing complete portfolio index and ambiguous actual owners without scanning outsiders", () => {
    const missing = fixture();
    allocate(missing);
    missing.runtime.accountsByOwner.get(ownerA)!.delete(fundA);
    const { input } = missing.addSource();
    rejectUnchanged(missing, input, /incomplete/);
    const ambiguous = fixture();
    (
      ambiguous.host.state.organizations as Map<string, CashJournalCashOwner>
    ).set(ownerA, { id: ownerA, liquidMinor: 1000 });
    rejectUnchanged(ambiguous, ambiguous.addSource().input, /ambiguous/);
    const f = fixture();
    const failScan = () => {
      throw new Error("Unexpected whole-world/history scan");
    };
    Object.defineProperty(f.host.state.people, Symbol.iterator, {
      value: failScan,
    });
    Object.defineProperty(f.host.state.organizations, Symbol.iterator, {
      value: failScan,
    });
    Object.defineProperty(f.runtime.accounts, Symbol.iterator, {
      value: failScan,
    });
    const admitted = f.addSource().input;
    expect(postCashJournal(f.runtime, f.host, admitted).owners.size).toBe(2);
  });

  it("ignores caller-made source authority and requires actual independently resolved cause records", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    const forged = {
      ...input,
      sourceRef: { kind: "fixture:not-registered", id: canonical.id },
      resolvedSource: canonical,
    };
    rejectUnchanged(f, forged, /not registered/);
    const missing = {
      ...input,
      sourceRef: { kind: sourceKind, id: "fixture:not-current" },
    };
    rejectUnchanged(f, missing, /canonical.*absent/);
    canonical.relatedRecords = [];
    rejectUnchanged(f, input, /was not resolved/);
    canonical.relatedRecords = [
      {
        kind: "fixture:actual-act",
        id: "fixture:committed-act",
        date: future,
        source,
      },
    ];
    rejectUnchanged(f, input, /future/);
  });

  it("rejects stale sequence, direct source replay under a fresh sequence and unresolved pruned records", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    rejectUnchanged(
      f,
      { ...input, expectedSequence: P.one },
      /Duplicate|stale/,
    );
    postCashJournal(f.runtime, f.host, input);
    const freshId = {
      ...input,
      expectedSequence: f.runtime.nextSequence,
      id: "journal:" + date + ":" + f.runtime.nextSequence,
    };
    rejectUnchanged(f, freshId, /unposted/);
    expect(canonical.postedJournalSequence).toBe(P.zero);
    f.records.delete(canonical.id);
    rejectUnchanged(f, freshId, /canonical.*absent/);
    expect("journalIds" in f.runtime).toBe(false);
    expect("usedSources" in f.runtime).toBe(false);
  });

  it("rejects failed balance/source/date/overflow admission before any owner, fund or marker change", () => {
    const imbalance = fixture(),
      unbalanced = imbalance.addSource([
        { id: "fixture:out", accountId: residualA, deltaMinor: -400 },
        { id: "fixture:in", accountId: residualB, deltaMinor: 399 },
      ]);
    rejectUnchanged(imbalance, unbalanced.input, /balance exactly/);
    const fractional = fixture(),
      fractions = fractional.addSource(payment(0.5));
    rejectUnchanged(fractional, fractions.input, /integer actual/);
    const requested = fixture(),
      actual = requested.addSource(payment(400));
    rejectUnchanged(
      requested,
      { ...actual.input, postings: payment(1000) },
      /resolved actual/,
    );
    const wrongDate = fixture(),
      dated = wrongDate.addSource();
    rejectUnchanged(
      wrongDate,
      { ...dated.input, date: future },
      /current date/,
    );
    const overflow = fixture();
    overflow.host.state.organizations.get(ownerB)!.liquidMinor =
      Number.MAX_SAFE_INTEGER;
    rejectUnchanged(
      overflow,
      overflow.addSource(payment(1)).input,
      /integer journal amount|overflows/,
    );
    const sequence = fixture();
    sequence.runtime.nextSequence = Number.MAX_SAFE_INTEGER;
    rejectUnchanged(sequence, sequence.addSource().input, /next sequence/);
    const counters = fixture();
    counters.runtime.totals.grossCreditMinor = Number.MAX_SAFE_INTEGER;
    rejectUnchanged(
      counters,
      counters.addSource(payment(1)).input,
      /journal credits|integer journal amount/,
    );
    const empty = fixture();
    rejectUnchanged(empty, empty.addSource([]).input, /unfilled budget/);
  });

  it("rechecks every actual touched owner's original cash before the first write", () => {
    for (const id of [ownerA, ownerB]) {
      const f = fixture(),
        { input } = f.addSource();
      rejectAfterInterference(
        f,
        input,
        () => {
          const row =
            f.host.state.people.get(id) ?? f.host.state.organizations.get(id)!;
          row.liquidMinor -= P.one;
        },
        /Stale journal cash owner/,
      );
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(f.runtime.totals.count).toBe(P.zero);
    }
  });

  it("rechecks untouched fund allocations, all portfolio rows and index identity after final source resolution", () => {
    for (const interfere of [
      (f: Fixture) => {
        f.runtime.accounts.get(fundA)!.allocatedMinor = P.one;
      },
      (f: Fixture) => {
        f.runtime.accounts.get(fundA)!.name = "Changed canonical fund";
      },
      (f: Fixture) => {
        f.runtime.accounts.get(fundA)!.source.citation = "Changed source";
      },
      (f: Fixture) => {
        f.runtime.accountsByOwner.get(ownerA)!.delete(fundA);
      },
      (f: Fixture) => {
        f.runtime.accountsByOwner.set(ownerA, new Set([residualA, fundA]));
      },
      (f: Fixture) => {
        f.runtime.accounts.set(fundA, { ...f.runtime.accounts.get(fundA)! });
      },
      (f: Fixture) => {
        f.runtime.residualAccountByOwner.set(ownerA, fundA);
      },
    ]) {
      const f = fixture(),
        { input } = f.addSource();
      rejectAfterInterference(f, input, () => interfere(f), /Stale journal/);
    }
  });

  it("rechecks actual date, sequence, source marker, source content, registry and focus without retaining a partial result", () => {
    for (const interfere of [
      (f: Fixture) => {
        f.host.state.date = future;
      },
      (f: Fixture) => {
        f.runtime.nextSequence += P.one;
      },
      (_f: Fixture, row: CanonicalSource) => {
        row.postedJournalSequence = P.zero;
      },
      (_f: Fixture, row: CanonicalSource) => {
        row.expectedPostings = payment(200);
      },
      (f: Fixture) => {
        f.runtime.sourceProviders.delete(sourceKind);
      },
      (f: Fixture) => {
        (f.host.state.focusPersonIds as Set<string>).add(ownerA);
      },
    ]) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      rejectAfterInterference(
        f,
        input,
        () => interfere(f, canonical),
        /changed|Stale/,
      );
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
      expect(f.runtime.detailedReceipts.size).toBe(P.zero);
    }
  });

  it("commits staged module receipt/counter/index metadata with cash and direct marker, without a commit callback", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    const counters = { paidMinor: P.zero, count: P.zero };
    const receipts = new Map<string, { id: string; paidMinor: number }>();
    const pending = new Set([canonical.id]),
      completed = new Set<string>();
    const obsolete = new Map([["fixture:old", { id: "fixture:old" }]]);
    const receipt = { id: canonical.id, paidMinor: 400 };
    canonical.metadata = [
      cashJournalFieldWrite(counters, "paidMinor", 400),
      cashJournalFieldWrite(counters, "count", P.one),
      cashJournalMapSet(receipts, receipt.id, receipt),
      cashJournalMapDelete(obsolete, "fixture:old"),
      cashJournalSetWrite(pending, canonical.id, false),
      cashJournalSetWrite(completed, canonical.id, true),
    ];
    f.control.beforeResolve = () => {
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
      expect(counters.paidMinor).toBe(P.zero);
    };
    postCashJournal(f.runtime, f.host, input);
    expect(counters).toEqual({ paidMinor: 400, count: P.one });
    expect(receipts.get(canonical.id)).toBe(receipt);
    expect(obsolete.size).toBe(P.zero);
    expect(pending.has(canonical.id)).toBe(false);
    expect(completed.has(canonical.id)).toBe(true);
    expect(canonical.postedJournalSequence).toBe(P.zero);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(600);
    expect(f.control.calls).toBe(P.one + P.one);
  });

  it("rejects stale metadata fields/maps/sets before cash, sequence, source marker or any other staged write", () => {
    for (const kind of ["field", "map", "set"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      const counter = { count: P.zero },
        receipts = new Map<string, number>();
      const pending = new Set([canonical.id]),
        shouldStayEmpty = new Map<string, number>();
      canonical.metadata = [
        cashJournalMapSet(shouldStayEmpty, "fixture:must-not-write", 400),
        kind === "field"
          ? cashJournalFieldWrite(counter, "count", P.one)
          : kind === "map"
            ? cashJournalMapSet(receipts, canonical.id, 400)
            : cashJournalSetWrite(pending, canonical.id, false),
      ];
      rejectAfterInterference(
        f,
        input,
        () => {
          if (kind === "field") counter.count = P.one;
          else if (kind === "map") receipts.set(canonical.id, 200);
          else pending.delete(canonical.id);
        },
        /Stale staged journal metadata/,
      );
      expect(shouldStayEmpty.size).toBe(P.zero);
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(canonical.postedJournalSequence).toBeUndefined();
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
    }
  });

  it("rejects duplicate/reserved metadata targets, impossible set updates and nonfinite values without partial writes", () => {
    const duplicate = fixture(),
      d = duplicate.addSource(),
      counter = { count: P.zero };
    d.canonical.metadata = [
      cashJournalFieldWrite(counter, "count", P.one),
      cashJournalFieldWrite(counter, "count", P.one + P.one),
    ];
    rejectUnchanged(duplicate, d.input, /Duplicate staged/);
    expect(counter.count).toBe(P.zero);
    const reserved = fixture(),
      r = reserved.addSource();
    r.canonical.metadata = [
      cashJournalFieldWrite(
        reserved.host.state.people.get(ownerA)!,
        "liquidMinor",
        1,
      ),
    ];
    rejectUnchanged(reserved, r.input, /conflicts/);
    const marker = fixture(),
      m = marker.addSource();
    m.canonical.metadata = [
      cashJournalFieldWrite(m.canonical, "postedJournalSequence", P.one),
    ];
    rejectUnchanged(marker, m.input, /marker/);
    const impossible = fixture(),
      s = impossible.addSource(),
      ids = new Set([s.canonical.id]);
    s.canonical.metadata = [cashJournalSetWrite(ids, s.canonical.id, true)];
    rejectUnchanged(impossible, s.input, /must change actual membership/);
    const finite = fixture(),
      n = finite.addSource(),
      field = { paidMinor: P.zero };
    const write = cashJournalFieldWrite(field, "paidMinor", P.one);
    n.canonical.metadata = [
      {
        ...write,
        kind: "field",
        target: field,
        key: "paidMinor",
        next: Infinity,
      },
    ];
    rejectUnchanged(finite, n.input, /Non-finite/);
    expect(field.paidMinor).toBe(P.zero);
    const changed = fixture(),
      c = changed.addSource(),
      changing = { count: P.zero };
    c.canonical.metadata = [cashJournalFieldWrite(changing, "count", P.one)];
    rejectAfterInterference(
      changed,
      c.input,
      () => {
        c.canonical.metadata = [
          cashJournalFieldWrite(changing, "count", P.one + P.one),
        ];
      },
      /staged metadata changed/,
    );
    expect(changing.count).toBe(P.zero);
  });

  it("rejects an unwritable cash or metadata field before any other owner cash changes", () => {
    const cash = fixture(),
      c = cash.addSource();
    Object.defineProperty(
      cash.host.state.organizations.get(ownerB)!,
      "liquidMinor",
      { writable: false },
    );
    rejectUnchanged(cash, c.input, /direct writable/);
    const f = fixture(),
      { input, canonical } = f.addSource(),
      counter = { count: P.zero };
    canonical.metadata = [cashJournalFieldWrite(counter, "count", P.one)];
    Object.defineProperty(counter, "count", { writable: false });
    rejectUnchanged(f, input, /direct writable/);
    expect(counter.count).toBe(P.zero);
  });

  it("keeps quiet outsider retention bounded after repeated actual settlements and source pruning", () => {
    const f = fixture();
    for (let round = 0; round < 200; round += 1) {
      const lines =
        round % 2 === 0 ? payment(1) : payment(1, residualB, residualA);
      const { input, canonical } = f.addSource(
        lines,
        "fixture:settlement:" + round,
      );
      postCashJournal(f.runtime, f.host, input);
      f.records.delete(canonical.id);
    }
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
    expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
    expect(f.runtime.totals.count).toBe(200);
    expect(f.runtime.latestByOwner.size).toBe(2);
    expect(f.runtime.latestByAccount.size).toBe(2);
    expect(f.runtime.totalsByOwner.size).toBe(2);
    expect(f.runtime.totalsByAccount.size).toBe(2);
    expect(f.runtime.detailedReceipts.size).toBe(P.zero);
    expect(f.runtime.detailedByOwner.size).toBe(P.zero);
    expect(f.runtime.requiredBySource.size).toBe(P.zero);
    expect(f.runtime.accounts.size).toBe(3);
    expect(f.runtime.sourceProviders.size).toBe(P.one);
    expect(f.records.size).toBe(P.zero);
    expect(f.host.state.focusPersonIds.size).toBe(P.zero);
  });

  it("preserves player/circle full records and observer detail without promoting counterpart outsiders into focus", () => {
    for (const mode of ["player", "circle", "observer"] as const) {
      const f = fixture();
      if (mode === "player") f.host.state.playerId = ownerA;
      else if (mode === "circle")
        (f.host.state.focusPersonIds as Set<string>).add(ownerA);
      else f.host.state.observer = true;
      const focusBefore = [...f.host.state.focusPersonIds],
        { input } = f.addSource();
      postCashJournal(f.runtime, f.host, input);
      expect(f.runtime.detailedReceipts.get(input.id)!.postings).toHaveLength(
        2,
      );
      expect(f.runtime.detailedByOwner.get(ownerA)).toEqual(
        new Set([input.id]),
      );
      expect(f.runtime.detailedByOwner.has(ownerB)).toBe(mode === "observer");
      expect([...f.host.state.focusPersonIds]).toEqual(focusBefore);
      expect(f.runtime.requiredBySource.size).toBe(P.zero);
    }
  });

  it("keeps source-required detail only while its open canonical source requires it", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    canonical.retainFull = true;
    postCashJournal(f.runtime, f.host, input);
    expect(
      f.runtime.detailedReceipts.get(input.id)!.retention.requiredBySource,
    ).toBe(true);
    expect(f.runtime.detailedByOwner.size).toBe(P.zero);
    expect(f.runtime.requiredBySource.get(sourceKind)!.get(canonical.id)).toBe(
      input.id,
    );
    const before = snapshot(f);
    expect(() => releaseCashJournalSource(f.runtime, input.sourceRef)).toThrow(
      /still requires/,
    );
    expect(snapshot(f)).toBe(before);
    canonical.retainFull = false;
    releaseCashJournalSource(f.runtime, input.sourceRef);
    expect(f.runtime.detailedReceipts.size).toBe(P.zero);
    expect(f.runtime.requiredBySource.size).toBe(P.zero);
    expect(f.runtime.latestByOwner.size).toBe(2);
    expect(f.runtime.totals.count).toBe(P.one);
    expect(canonical.postedJournalSequence).toBe(P.zero);
    const focused = fixture(),
      visible = focused.addSource();
    focused.host.state.playerId = ownerA;
    visible.canonical.retainFull = true;
    postCashJournal(focused.runtime, focused.host, visible.input);
    visible.canonical.retainFull = false;
    releaseCashJournalSource(focused.runtime, visible.input.sourceRef);
    expect(
      focused.runtime.detailedReceipts.get(visible.input.id)!.retention
        .requiredBySource,
    ).toBe(false);
    expect(
      focused.runtime.detailedByOwner.get(ownerA)!.has(visible.input.id),
    ).toBe(true);
    expect(focused.runtime.requiredBySource.size).toBe(P.zero);
  });

  it("returns detached projections and stores detached full/short journal results", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    f.host.state.playerId = ownerA;
    const result = postCashJournal(f.runtime, f.host, input);
    const before = snapshot(f);
    result.postings[0]!.deltaMinor = -999;
    result.owners.get(ownerA)!.afterMinor = 1;
    result.accounts.get(residualA)!.afterMinor = 1;
    result.source.citation = "Changed returned source";
    result.sourceRef.id = "Changed returned source ID";
    result.relatedRecords[0]!.source.citation = "Changed returned cause";
    input.postings[0]!.deltaMinor = -999;
    expect(snapshot(f)).toBe(before);
    canonical.source.citation = "Changed later canonical source";
    expect(f.runtime.detailedReceipts.get(input.id)!.source.citation).toBe(
      source.citation,
    );
    expect(
      f.runtime.detailedReceipts.get(input.id)!.postings[0]!.deltaMinor,
    ).toBe(-400);
    expect(f.runtime.latestByOwner.get(ownerA)!.sourceRef.id).toBe(
      "fixture:current-settlement",
    );
  });

  it("rejects provider reentry before any nested payment or registration can change cash", () => {
    const f = fixture(),
      { input } = f.addSource();
    f.control.beforeResolve = () => {
      expect(() => postCashJournal(f.runtime, f.host, input)).toThrow(
        /Reentrant/,
      );
      expect(() =>
        registerCashAccount(f.runtime, f.host, {
          id: "fixture:reentrant-fund",
          ownerId: ownerA,
          name: "Fund",
          source,
          allocatedMinor: P.zero,
        }),
      ).toThrow(/Reentrant/);
    };
    postCashJournal(f.runtime, f.host, input);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(600);
    expect(f.runtime.accounts.has("fixture:reentrant-fund")).toBe(false);
  });
});

describe("bounded owner-field protection and exact optional-field deletion", () => {
  it("rejects cash and identity assignments or deletions on actual indexed owners without current postings or accounts", () => {
    for (const ownerKind of ["person", "organization"] as const) {
      for (const key of ["liquidMinor", "id"] as const) {
        for (const operation of ["field", "field-delete"] as const) {
          const f = fixture(),
            { input, canonical } = f.addSource();
          const unrelated: CashJournalCashOwner = {
            id: "fixture:unrelated:" + ownerKind,
            liquidMinor: 75,
          };
          const index =
            ownerKind === "person"
              ? f.host.state.people
              : f.host.state.organizations;
          (index as Map<string, CashJournalCashOwner>).set(
            unrelated.id,
            unrelated,
          );
          const counter = { count: P.zero };
          const forbidden = cashJournalFieldWrite(
            unrelated,
            key,
            key === "id" ? "fixture:renamed-owner" : 76,
          );
          canonical.metadata = [
            cashJournalFieldWrite(counter, "count", P.one),
            operation === "field"
              ? forbidden
              : { ...forbidden, kind: "field-delete" },
          ];
          rejectUnchanged(f, input, /cash\/identity\/marker/);
          expect(counter.count).toBe(P.zero);
          expect(unrelated).toEqual({
            id: "fixture:unrelated:" + ownerKind,
            liquidMinor: 75,
          });
          expect(f.runtime.accountsByOwner.has(unrelated.id)).toBe(false);
          expect(canonical.postedJournalSequence).toBeUndefined();
        }
      }
    }
  });

  it("commits exact noncash fields on a paid actor with cash, actor accounting and source marker", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    const actor = Object.assign(f.host.state.people.get(ownerA)!, {
      actCount: P.zero,
      lastChoice: "fixture:prior-choice",
      lastReason: "fixture:prior-reason",
      actsByKind: new Map<string, number>(),
    });
    canonical.metadata = [
      cashJournalFieldWrite(actor, "actCount", P.one),
      cashJournalFieldWrite(actor, "lastChoice", "fixture:current-choice"),
      cashJournalFieldWrite(actor, "lastReason", "fixture:current-reason"),
      cashJournalMapSet(actor.actsByKind, "fixture:current-choice", P.one),
    ];
    f.control.beforeResolve = () => {
      expect(actor.actCount).toBe(P.zero);
      expect(actor.lastChoice).toBe("fixture:prior-choice");
      expect(actor.liquidMinor).toBe(1000);
    };
    postCashJournal(f.runtime, f.host, input);
    expect(actor.id).toBe(ownerA);
    expect(actor.liquidMinor).toBe(600);
    expect(actor.actCount).toBe(P.one);
    expect(actor.lastChoice).toBe("fixture:current-choice");
    expect(actor.lastReason).toBe("fixture:current-reason");
    expect(actor.actsByKind).toEqual(
      new Map([["fixture:current-choice", P.one]]),
    );
    expect(canonical.postedJournalSequence).toBe(P.zero);
    expect(f.runtime.nextSequence).toBe(P.one);
    expect(f.control.calls).toBe(P.one + P.one);
  });

  it("protects an indexed cash owner with an inconsistent own ID without scanning any owner or account map", () => {
    for (const key of ["liquidMinor", "id"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      const unrelated = { id: "fixture:corrupt-own-id", liquidMinor: 75 };
      (f.host.state.people as Map<string, CashJournalCashOwner>).set(
        "fixture:actual-index-key",
        unrelated,
      );
      const counter = { count: P.zero };
      canonical.metadata = [
        cashJournalFieldWrite(counter, "count", P.one),
        cashJournalFieldWrite(
          unrelated,
          key,
          key === "id" ? "fixture:new-id" : 76,
        ),
      ];
      const failScan = () => {
        throw new Error("Unexpected whole-world/history scan");
      };
      for (const index of [
        f.host.state.people,
        f.host.state.organizations,
        f.runtime.accounts,
      ])
        Object.defineProperty(index, Symbol.iterator, { value: failScan });
      expect(() => postCashJournal(f.runtime, f.host, input)).toThrow(
        /cash\/identity\/marker/,
      );
      expect(counter.count).toBe(P.zero);
      expect(unrelated.id).toBe("fixture:corrupt-own-id");
      expect(unrelated.liquidMinor).toBe(75);
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
      expect(f.runtime.accounts.get(fundA)!.allocatedMinor).toBe(P.zero);
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(f.runtime.totals.count).toBe(P.zero);
      expect(canonical.postedJournalSequence).toBeUndefined();
    }
  });

  it("rejects a stale paid-actor field before every other actor, accounting, cash and marker write", () => {
    for (const changedKey of [
      "actCount",
      "lastChoice",
      "lastReason",
    ] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      const actor = Object.assign(f.host.state.people.get(ownerA)!, {
        actCount: P.zero,
        lastChoice: "fixture:prior-choice",
        lastReason: "fixture:prior-reason",
        actsByKind: new Map<string, number>(),
      });
      const counters = { paidMinor: P.zero },
        receiptIndex = new Map<string, number>();
      canonical.metadata = [
        cashJournalFieldWrite(counters, "paidMinor", 400),
        cashJournalFieldWrite(actor, "actCount", P.one),
        cashJournalFieldWrite(actor, "lastChoice", "fixture:current-choice"),
        cashJournalFieldWrite(actor, "lastReason", "fixture:current-reason"),
        cashJournalMapSet(actor.actsByKind, "fixture:current-choice", P.one),
        cashJournalMapSet(receiptIndex, canonical.id, 400),
      ];
      rejectAfterInterference(
        f,
        input,
        () => {
          if (changedKey === "actCount") actor.actCount = 7;
          else actor[changedKey] = "fixture:interference";
        },
        /Stale staged journal metadata field/,
      );
      expect(counters.paidMinor).toBe(P.zero);
      expect(receiptIndex.size).toBe(P.zero);
      expect(actor.actsByKind.size).toBe(P.zero);
      expect(actor.actCount).toBe(changedKey === "actCount" ? 7 : P.zero);
      expect(actor.lastChoice).toBe(
        changedKey === "lastChoice"
          ? "fixture:interference"
          : "fixture:prior-choice",
      );
      expect(actor.lastReason).toBe(
        changedKey === "lastReason"
          ? "fixture:interference"
          : "fixture:prior-reason",
      );
      expect(actor.liquidMinor).toBe(1000);
      expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
      expect(f.runtime.accounts.get(fundA)!.allocatedMinor).toBe(P.zero);
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(f.runtime.totals.count).toBe(P.zero);
      expect(canonical.postedJournalSequence).toBeUndefined();
    }
  });

  it("keeps all CoreState fields, reserved journal objects/indexes and every shared direct posted marker protected", () => {
    for (const targetKind of [
      "core-sequence",
      "core-optional",
      "journal-account",
      "journal-index",
      "unrelated-marker-set",
      "unrelated-marker-delete",
    ] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      const coreState = Object.assign(f.host.state, { sequence: P.zero });
      const otherSource: CashJournalPostedMarker = {
        postedJournalSequence: undefined,
      };
      const counter = { count: P.zero };
      const protectedWrite =
        targetKind === "core-sequence"
          ? cashJournalFieldWrite(coreState, "sequence", P.one)
          : targetKind === "core-optional"
            ? cashJournalFieldDelete(coreState, "playerId")
            : targetKind === "journal-account"
              ? cashJournalFieldDelete(
                  f.runtime.accounts.get(fundA)!,
                  "allocatedMinor",
                )
              : targetKind === "journal-index"
                ? cashJournalMapSet(
                    f.runtime.residualAccountByOwner,
                    ownerA,
                    residualB,
                  )
                : targetKind === "unrelated-marker-set"
                  ? cashJournalFieldWrite(
                      otherSource,
                      "postedJournalSequence",
                      P.one,
                    )
                  : cashJournalFieldDelete(
                      otherSource,
                      "postedJournalSequence",
                    );
      canonical.metadata = [
        cashJournalFieldWrite(counter, "count", P.one),
        protectedWrite,
      ];
      rejectUnchanged(f, input, /conflicts/);
      expect(counter.count).toBe(P.zero);
      expect(coreState.sequence).toBe(P.zero);
      expect(
        Object.prototype.hasOwnProperty.call(
          otherSource,
          "postedJournalSequence",
        ),
      ).toBe(true);
      expect(otherSource.postedJournalSequence).toBeUndefined();
    }
  });

  it("captures every own data descriptor flag on assignment and rejects descriptor or staged-preimage changes before cash", () => {
    for (const changedFlag of ["enumerable", "configurable"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      const first = { count: P.zero },
        changed = { count: P.zero };
      canonical.metadata = [
        cashJournalFieldWrite(first, "count", P.one),
        cashJournalFieldWrite(changed, "count", P.one),
      ];
      rejectAfterInterference(
        f,
        input,
        () => {
          Object.defineProperty(
            changed,
            "count",
            changedFlag === "enumerable"
              ? { enumerable: false }
              : { configurable: false },
          );
        },
        /Stale staged journal metadata field/,
      );
      expect(first.count).toBe(P.zero);
      expect(changed.count).toBe(P.zero);
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(canonical.postedJournalSequence).toBeUndefined();
    }
    const f = fixture(),
      { input, canonical } = f.addSource(),
      row = { count: P.zero };
    const staged = cashJournalFieldWrite(row, "count", P.one);
    canonical.metadata = [staged];
    rejectAfterInterference(
      f,
      input,
      () => {
        canonical.metadata = [{ ...staged, expectedEnumerable: false }];
      },
      /staged metadata changed/,
    );
    expect(row.count).toBe(P.zero);
  });

  it("deletes present optional values and present-own undefined exactly while leaving a guarded absent field absent", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    const present: { firstUnpaidAt?: string } = { firstUnpaidAt: date };
    const readonlyPresent: { firstUnpaidAt?: string } = { firstUnpaidAt: date };
    Object.defineProperty(readonlyPresent, "firstUnpaidAt", {
      writable: false,
    });
    const ownUndefined: { firstUnpaidAt?: string | undefined } = {
      firstUnpaidAt: undefined,
    };
    const absent: { firstUnpaidAt?: string } = Object.preventExtensions({});
    const counter = { count: P.zero };
    const removePresent = cashJournalFieldDelete(present, "firstUnpaidAt");
    const removeReadonly = cashJournalFieldDelete(
      readonlyPresent,
      "firstUnpaidAt",
    );
    const removeUndefined = cashJournalFieldDelete(
      ownUndefined,
      "firstUnpaidAt",
    );
    const preserveAbsent = cashJournalFieldDelete(absent, "firstUnpaidAt");
    expect(removePresent.expectedPresent).toBe(true);
    expect(removeReadonly.expectedWritable).toBe(false);
    expect(removeUndefined.expectedPresent).toBe(true);
    expect(removeUndefined.expected).toBeUndefined();
    expect(preserveAbsent.expectedPresent).toBe(false);
    expect(preserveAbsent.expected).toBeUndefined();
    canonical.metadata = [
      removePresent,
      removeReadonly,
      removeUndefined,
      preserveAbsent,
      cashJournalFieldWrite(counter, "count", P.one),
    ];
    postCashJournal(f.runtime, f.host, input);
    for (const row of [present, readonlyPresent, ownUndefined, absent]) {
      expect(Object.prototype.hasOwnProperty.call(row, "firstUnpaidAt")).toBe(
        false,
      );
      expect(row.firstUnpaidAt).toBeUndefined();
    }
    expect(counter.count).toBe(P.one);
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(600);
    expect(canonical.postedJournalSequence).toBe(P.zero);
  });

  it("rejects absent/own-undefined/value deletion preimage drift before cash or any other staged metadata", () => {
    for (const drift of [
      "absent-to-own-undefined",
      "own-undefined-to-absent",
      "changed-value",
    ] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      const row: { firstUnpaidAt?: string | undefined } =
        drift === "absent-to-own-undefined"
          ? {}
          : { firstUnpaidAt: drift === "changed-value" ? date : undefined };
      const counter = { count: P.zero },
        receiptIndex = new Map<string, number>();
      canonical.metadata = [
        cashJournalFieldWrite(counter, "count", P.one),
        cashJournalFieldDelete(row, "firstUnpaidAt"),
        cashJournalMapSet(receiptIndex, canonical.id, 400),
      ];
      rejectAfterInterference(
        f,
        input,
        () => {
          if (drift === "own-undefined-to-absent") delete row.firstUnpaidAt;
          else
            row.firstUnpaidAt = drift === "changed-value" ? future : undefined;
        },
        /Stale staged journal metadata field/,
      );
      expect(counter.count).toBe(P.zero);
      expect(receiptIndex.size).toBe(P.zero);
      expect(Object.prototype.hasOwnProperty.call(row, "firstUnpaidAt")).toBe(
        drift !== "own-undefined-to-absent",
      );
      expect(row.firstUnpaidAt).toBe(
        drift === "changed-value" ? future : undefined,
      );
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(canonical.postedJournalSequence).toBeUndefined();
    }
  });

  it("rejects nonconfigurable/accessor deletion descriptors and late descriptor drift with no partial cash or metadata commit", () => {
    for (const invalid of ["nonconfigurable", "accessor"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource();
      const row: { firstUnpaidAt?: string } = { firstUnpaidAt: date };
      const counter = { count: P.zero };
      const deletion = cashJournalFieldDelete(row, "firstUnpaidAt");
      canonical.metadata = [
        cashJournalFieldWrite(counter, "count", P.one),
        deletion,
      ];
      let getterCalls = P.zero;
      rejectAfterInterference(
        f,
        input,
        () => {
          Object.defineProperty(
            row,
            "firstUnpaidAt",
            invalid === "nonconfigurable"
              ? { configurable: false }
              : {
                  configurable: true,
                  get: () => {
                    getterCalls += P.one;
                    return date;
                  },
                },
          );
        },
        /configurable direct data field/,
      );
      expect(counter.count).toBe(P.zero);
      expect(getterCalls).toBe(P.zero);
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(canonical.postedJournalSequence).toBeUndefined();
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(() => cashJournalFieldDelete(row, "firstUnpaidAt")).toThrow(
        /configurable direct data field/,
      );
    }
    const f = fixture(),
      { input, canonical } = f.addSource();
    const row: { firstUnpaidAt?: string } = { firstUnpaidAt: date };
    const counter = { count: P.zero };
    canonical.metadata = [
      cashJournalFieldWrite(counter, "count", P.one),
      cashJournalFieldDelete(row, "firstUnpaidAt"),
    ];
    rejectAfterInterference(
      f,
      input,
      () => {
        Object.defineProperty(row, "firstUnpaidAt", { enumerable: false });
      },
      /Stale staged journal metadata field/,
    );
    expect(counter.count).toBe(P.zero);
    expect(Object.prototype.hasOwnProperty.call(row, "firstUnpaidAt")).toBe(
      true,
    );
    expect(row.firstUnpaidAt).toBe(date);
  });

  it("rejects conflicting assign/delete operations and a changed deletion plan before any cash or metadata commit", () => {
    const duplicate = fixture(),
      d = duplicate.addSource();
    const row: { firstUnpaidAt?: string } = { firstUnpaidAt: date },
      counter = { count: P.zero };
    d.canonical.metadata = [
      cashJournalFieldWrite(counter, "count", P.one),
      cashJournalFieldWrite(row, "firstUnpaidAt", future),
      cashJournalFieldDelete(row, "firstUnpaidAt"),
    ];
    rejectUnchanged(duplicate, d.input, /Duplicate staged/);
    expect(row.firstUnpaidAt).toBe(date);
    expect(counter.count).toBe(P.zero);
    const changed = fixture(),
      c = changed.addSource();
    const optional: { firstUnpaidAt?: string } = { firstUnpaidAt: date };
    const deletion = cashJournalFieldDelete(optional, "firstUnpaidAt");
    c.canonical.metadata = [deletion];
    rejectAfterInterference(
      changed,
      c.input,
      () => {
        c.canonical.metadata = [{ ...deletion, expectedConfigurable: false }];
      },
      /staged metadata changed/,
    );
    expect(optional.firstUnpaidAt).toBe(date);
    expect(
      Object.prototype.hasOwnProperty.call(optional, "firstUnpaidAt"),
    ).toBe(true);
  });
});

function completionSnapshot(f: Fixture): string {
  return JSON.stringify({
    cashAndJournal: snapshot(f),
    directMarkers: [...f.records].map(([id, row]) => ({
      id,
      posted: Object.getOwnPropertyDescriptor(row, "postedJournalSequence"),
      completed: Object.getOwnPropertyDescriptor(row, "completedAt"),
    })),
  });
}

function rejectCompletionUnchanged(
  f: Fixture,
  reference: CashJournalInput["sourceRef"],
  error: RegExp,
): void {
  const before = completionSnapshot(f);
  expect(() => completeCashJournalSource(f.runtime, f.host, reference)).toThrow(
    error,
  );
  expect(completionSnapshot(f)).toBe(before);
}

function rejectCompletionAfterInterference(
  f: Fixture,
  reference: CashJournalInput["sourceRef"],
  interfere: () => void,
  error: RegExp,
): void {
  let afterInterference: string | undefined;
  f.control.calls = P.zero;
  f.control.beforeResolve = (count) => {
    if (count !== P.one + P.one) return;
    interfere();
    afterInterference = completionSnapshot(f);
  };
  expect(() => completeCashJournalSource(f.runtime, f.host, reference)).toThrow(
    error,
  );
  expect(afterInterference).toBeDefined();
  expect(completionSnapshot(f)).toBe(afterInterference);
}

describe("canonical zero-cash completion without a cash journal", () => {
  it("commits a direct source completion and exact typed domain metadata once without cash or journal writes", () => {
    const f = fixture(),
      { input, canonical } = f.addSource([]);
    const counters = { completedCount: P.zero, paidMinor: P.zero };
    const term: { firstUnpaidAt?: string; lastSettledAt?: string } = {
      firstUnpaidAt: date,
    };
    const current = new Map<string, { id: string; paidMinor: number }>();
    const obsolete = new Map([["fixture:old-result", P.one]]);
    const pending = new Set([canonical.id]),
      completed = new Set<string>();
    const result = { id: canonical.id, paidMinor: P.zero };
    canonical.metadata = [
      cashJournalFieldWrite(counters, "completedCount", P.one),
      cashJournalFieldWrite(counters, "paidMinor", P.zero),
      cashJournalFieldWrite(term, "lastSettledAt", date),
      cashJournalFieldDelete(term, "firstUnpaidAt"),
      cashJournalMapSet(current, canonical.id, result),
      cashJournalMapDelete(obsolete, "fixture:old-result"),
      cashJournalSetWrite(pending, canonical.id, false),
      cashJournalSetWrite(completed, canonical.id, true),
    ];
    f.control.beforeResolve = () => {
      expect(canonical.completedAt).toBeUndefined();
      expect(counters.completedCount).toBe(P.zero);
      expect(term.firstUnpaidAt).toBe(date);
      expect(current.size).toBe(P.zero);
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
    };
    const beforeCashAndJournal = snapshot(f);
    const acknowledgement = completeCashJournalSource(
      f.runtime,
      f.host,
      input.sourceRef,
    );
    expect(acknowledgement).toEqual({
      sourceRef: input.sourceRef,
      completedAt: date,
    });
    expect(canonical.completedAt).toBe(date);
    expect(
      Object.prototype.hasOwnProperty.call(canonical, "postedJournalSequence"),
    ).toBe(false);
    expect(counters).toEqual({ completedCount: P.one, paidMinor: P.zero });
    expect(term.lastSettledAt).toBe(date);
    expect(Object.prototype.hasOwnProperty.call(term, "firstUnpaidAt")).toBe(
      false,
    );
    expect(current.get(canonical.id)).toBe(result);
    expect(obsolete.size).toBe(P.zero);
    expect(pending.has(canonical.id)).toBe(false);
    expect(completed.has(canonical.id)).toBe(true);
    expect(snapshot(f)).toBe(beforeCashAndJournal);
    expect(f.control.calls).toBe(P.one + P.one);
  });

  it("leaves existing funds, sequence, totals and focus/observer/source-required journal history exactly unchanged", () => {
    const f = fixture();
    f.host.state.observer = true;
    f.host.state.playerId = ownerA;
    allocate(f);
    const { input, canonical } = f.addSource(
      [],
      "fixture:current-unpaid-result",
    );
    canonical.retainFull = true;
    const before = snapshot(f);
    completeCashJournalSource(f.runtime, f.host, input.sourceRef);
    expect(snapshot(f)).toBe(before);
    expect(canonical.completedAt).toBe(date);
    expect(canonical.postedJournalSequence).toBeUndefined();
    expect(f.runtime.nextSequence).toBe(P.one);
    expect(f.runtime.totals.count).toBe(P.one);
    expect(f.runtime.accounts.get(fundA)!.allocatedMinor).toBe(300);
    expect(f.runtime.detailedReceipts.size).toBe(P.one);
    expect(f.runtime.requiredBySource.size).toBe(P.zero);
    expect(f.runtime.detailedByOwner.get(ownerA)).toEqual(
      new Set(["journal:" + date + ":" + P.zero]),
    );
  });

  it("rejects completion replay, posted cash sources and cash posting of a source completed without cash", () => {
    const f = fixture(),
      { input, canonical } = f.addSource([]);
    completeCashJournalSource(f.runtime, f.host, input.sourceRef);
    f.control.beforeResolve = undefined;
    rejectCompletionUnchanged(f, input.sourceRef, /already completed/);
    canonical.expectedPostings = payment();
    const cashInput = { ...input, postings: payment() };
    const before = completionSnapshot(f);
    expect(() => postCashJournal(f.runtime, f.host, cashInput)).toThrow(
      /already completed/,
    );
    expect(completionSnapshot(f)).toBe(before);
    expect(f.runtime.nextSequence).toBe(P.zero);
    const posted = fixture(),
      paid = posted.addSource();
    postCashJournal(posted.runtime, posted.host, paid.input);
    paid.canonical.expectedPostings = [];
    rejectCompletionUnchanged(
      posted,
      paid.input.sourceRef,
      /unposted current canonical source/,
    );
    expect(paid.canonical.completedAt).toBeUndefined();
  });

  it("requires a registered real current source, valid dated evidence and independently resolved required records", () => {
    for (const defect of [
      "kind",
      "id",
      "date",
      "citation",
      "future-source",
      "actual-lines",
      "zero-lines",
      "missing-related",
      "duplicate-related",
      "duplicate-required",
      "future-related",
      "related-evidence",
    ] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource([]);
      const counter = { count: P.zero };
      canonical.metadata = [cashJournalFieldWrite(counter, "count", P.one)];
      if (defect === "kind") canonical.kind = "fixture:wrong-kind";
      else if (defect === "id") canonical.id = "fixture:wrong-id";
      else if (defect === "date") canonical.date = future;
      else if (defect === "citation") canonical.source.citation = " ";
      else if (defect === "future-source") canonical.source.asOf = future;
      else if (defect === "actual-lines")
        canonical.expectedPostings = payment();
      else if (defect === "zero-lines")
        canonical.expectedPostings = payment(P.zero);
      else if (defect === "missing-related") canonical.relatedRecords = [];
      else if (defect === "duplicate-related")
        canonical.relatedRecords = [
          canonical.relatedRecords[0]!,
          canonical.relatedRecords[0]!,
        ];
      else if (defect === "duplicate-required")
        canonical.requiredRelatedRefs = [
          canonical.requiredRelatedRefs[0]!,
          canonical.requiredRelatedRefs[0]!,
        ];
      else if (defect === "future-related")
        canonical.relatedRecords = [
          { ...canonical.relatedRecords[0]!, date: future },
        ];
      else
        canonical.relatedRecords = [
          {
            ...canonical.relatedRecords[0]!,
            source: { ...source, citation: " " },
          },
        ];
      rejectCompletionUnchanged(
        f,
        input.sourceRef,
        /canonical source|dated source|cash postings|not resolved|Duplicate|future/,
      );
      expect(counter.count).toBe(P.zero);
      expect(canonical.completedAt).toBeUndefined();
    }
    for (const reference of [
      { kind: "fixture:not-registered", id: "fixture:current-settlement" },
      { kind: sourceKind, id: "fixture:not-current" },
      { kind: " " + sourceKind, id: "fixture:current-settlement" },
      { kind: sourceKind, id: "" },
    ]) {
      const f = fixture();
      f.addSource([]);
      rejectCompletionUnchanged(f, reference, /not registered|absent|identity/);
    }
  });

  it("rejects stale fields, map entries, set membership and optional deletions before source completion or any other staged write", () => {
    for (const kind of ["field", "map", "set", "field-delete"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource([]);
      const counter = { count: P.zero },
        values = new Map<string, number>();
      const pending = new Set([canonical.id]),
        shouldStayEmpty = new Map<string, number>();
      const term: { firstUnpaidAt?: string } = { firstUnpaidAt: date };
      canonical.metadata = [
        cashJournalMapSet(shouldStayEmpty, canonical.id, P.zero),
        kind === "field"
          ? cashJournalFieldWrite(counter, "count", P.one)
          : kind === "map"
            ? cashJournalMapSet(values, canonical.id, P.zero)
            : kind === "set"
              ? cashJournalSetWrite(pending, canonical.id, false)
              : cashJournalFieldDelete(term, "firstUnpaidAt"),
      ];
      rejectCompletionAfterInterference(
        f,
        input.sourceRef,
        () => {
          if (kind === "field") counter.count = 7;
          else if (kind === "map") values.set(canonical.id, 7);
          else if (kind === "set") pending.delete(canonical.id);
          else term.firstUnpaidAt = future;
        },
        /Stale staged journal metadata/,
      );
      expect(shouldStayEmpty.size).toBe(P.zero);
      expect(counter.count).toBe(kind === "field" ? 7 : P.zero);
      expect(values.get(canonical.id)).toBe(kind === "map" ? 7 : undefined);
      expect(pending.has(canonical.id)).toBe(kind !== "set");
      expect(term.firstUnpaidAt).toBe(kind === "field-delete" ? future : date);
      expect(canonical.completedAt).toBeUndefined();
      expect(
        Object.prototype.hasOwnProperty.call(canonical, "completedAt"),
      ).toBe(false);
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(f.runtime.totals.count).toBe(P.zero);
    }
  });

  it("rejects source/marker replacement or changed typed metadata plans after the last provider lookup", () => {
    for (const change of [
      "source-row",
      "source-content",
      "required-record",
      "field-plan",
      "payload-identity",
      "plan-length",
    ] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource([]);
      const counter = { count: P.zero },
        current = new Map<string, { paidMinor: number }>();
      const payload = { paidMinor: P.zero };
      canonical.metadata = [
        cashJournalFieldWrite(counter, "count", P.one),
        cashJournalMapSet(current, canonical.id, payload),
      ];
      rejectCompletionAfterInterference(
        f,
        input.sourceRef,
        () => {
          if (change === "source-row")
            f.records.set(canonical.id, { ...canonical });
          else if (change === "source-content")
            canonical.source.citation = "Changed canonical citation";
          else if (change === "required-record") canonical.relatedRecords = [];
          else if (change === "field-plan")
            canonical.metadata = [
              cashJournalFieldWrite(counter, "count", 7),
              cashJournalMapSet(current, canonical.id, payload),
            ];
          else if (change === "payload-identity")
            canonical.metadata = [
              cashJournalFieldWrite(counter, "count", P.one),
              cashJournalMapSet(current, canonical.id, { paidMinor: P.zero }),
            ];
          else canonical.metadata = [];
        },
        /source or its staged metadata changed/,
      );
      expect(counter.count).toBe(P.zero);
      expect(current.size).toBe(P.zero);
      expect(canonical.completedAt).toBeUndefined();
      expect(canonical.postedJournalSequence).toBeUndefined();
    }
  });

  it("rejects invalid metadata descriptors or nonfinite staged values before zero completion and every other metadata write", () => {
    for (const descriptor of ["readonly", "accessor", "enumerable"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource([]);
      const counter = { count: P.zero },
        shouldStayEmpty = new Map<string, number>();
      canonical.metadata = [
        cashJournalMapSet(shouldStayEmpty, canonical.id, P.zero),
        cashJournalFieldWrite(counter, "count", P.one),
      ];
      let getterCalls = P.zero;
      rejectCompletionAfterInterference(
        f,
        input.sourceRef,
        () => {
          Object.defineProperty(
            counter,
            "count",
            descriptor === "readonly"
              ? { writable: false }
              : descriptor === "enumerable"
                ? { enumerable: false }
                : {
                    configurable: true,
                    get: () => {
                      getterCalls += P.one;
                      return P.zero;
                    },
                  },
          );
        },
        /direct writable|Stale staged journal metadata field/,
      );
      expect(shouldStayEmpty.size).toBe(P.zero);
      expect(getterCalls).toBe(P.zero);
      expect(canonical.completedAt).toBeUndefined();
      expect(f.runtime.nextSequence).toBe(P.zero);
      expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
    }
    const f = fixture(),
      { input, canonical } = f.addSource([]);
    const counter = { count: P.zero },
      shouldStayEmpty = new Map<string, number>();
    const field = cashJournalFieldWrite(counter, "count", P.one);
    canonical.metadata = [
      cashJournalMapSet(shouldStayEmpty, canonical.id, P.zero),
      { ...field, next: Infinity },
    ];
    rejectCompletionUnchanged(f, input.sourceRef, /Non-finite/);
    expect(counter.count).toBe(P.zero);
    expect(shouldStayEmpty.size).toBe(P.zero);
    expect(canonical.completedAt).toBeUndefined();
  });

  it("preflights completion marker descriptors and exact absent/own-undefined marker presence without invoking accessors", () => {
    for (const descriptor of ["readonly", "accessor"] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource([]);
      const counter = { count: P.zero };
      canonical.metadata = [cashJournalFieldWrite(counter, "count", P.one)];
      let getterCalls = P.zero;
      Object.defineProperty(
        canonical,
        "completedAt",
        descriptor === "readonly"
          ? {
              value: undefined,
              writable: false,
              configurable: true,
              enumerable: true,
            }
          : {
              get: () => {
                getterCalls += P.one;
                return undefined;
              },
              configurable: true,
              enumerable: true,
            },
      );
      rejectCompletionUnchanged(
        f,
        input.sourceRef,
        /direct writable|direct own data/,
      );
      expect(counter.count).toBe(P.zero);
      expect(getterCalls).toBe(P.zero);
    }
    for (const drift of [
      "completed-value",
      "completed-presence",
      "completed-writable",
      "completed-enumerable",
      "posted-presence",
    ] as const) {
      const f = fixture(),
        { input, canonical } = f.addSource([]);
      const counter = { count: P.zero };
      canonical.metadata = [cashJournalFieldWrite(counter, "count", P.one)];
      if (drift === "completed-enumerable") canonical.completedAt = undefined;
      rejectCompletionAfterInterference(
        f,
        input.sourceRef,
        () => {
          if (drift === "completed-value") canonical.completedAt = date;
          else if (drift === "posted-presence")
            canonical.postedJournalSequence = undefined;
          else
            Object.defineProperty(canonical, "completedAt", {
              value: undefined,
              writable: drift !== "completed-writable",
              enumerable: drift !== "completed-enumerable",
              configurable: true,
            });
        },
        /direct writable|Stale canonical noncash/,
      );
      expect(counter.count).toBe(P.zero);
      expect(f.runtime.nextSequence).toBe(P.zero);
    }
    const f = fixture(),
      { input, canonical } = f.addSource([]);
    Object.defineProperty(canonical, "postedJournalSequence", {
      value: undefined,
      writable: false,
    });
    Object.defineProperty(canonical, "completedAt", {
      value: undefined,
      writable: true,
    });
    Object.preventExtensions(canonical);
    completeCashJournalSource(f.runtime, f.host, input.sourceRef);
    expect(canonical.completedAt).toBe(date);
    expect(canonical.postedJournalSequence).toBeUndefined();
    expect(
      Object.getOwnPropertyDescriptor(canonical, "postedJournalSequence")!
        .writable,
    ).toBe(false);
  });

  it("rejects stale host, date, parameters, owner maps, registry, sequence or journal totals before completion", () => {
    for (const interfere of [
      (f: Fixture) => {
        f.host.state.date = future;
      },
      (f: Fixture) => {
        f.host.state = { ...f.host.state };
      },
      (f: Fixture) => {
        f.host.parameters = { zero: P.zero, one: P.one };
      },
      (f: Fixture) => {
        (f.host.parameters as { zero: number; one: number }).one =
          P.one + P.one;
      },
      (f: Fixture) => {
        f.host.state.people = new Map(f.host.state.people);
      },
      (f: Fixture) => {
        f.host.state.organizations = new Map(f.host.state.organizations);
      },
      (f: Fixture) => {
        f.host.state.focusPersonIds = new Set([ownerA]);
      },
      (f: Fixture) => {
        f.host.state.playerId = ownerA;
      },
      (f: Fixture) => {
        f.host.state.observer = true;
      },
      (f: Fixture) => {
        f.runtime.sourceProviders.set(sourceKind, () => undefined);
      },
      (f: Fixture) => {
        f.runtime.sourceProviders = new Map(f.runtime.sourceProviders);
      },
      (f: Fixture) => {
        f.runtime.accounts = new Map(f.runtime.accounts);
      },
      (f: Fixture) => {
        f.runtime.nextSequence += P.one;
      },
      (f: Fixture) => {
        f.runtime.totals.count += P.one;
      },
    ]) {
      const f = fixture(),
        { input, canonical } = f.addSource([]),
        counter = { count: P.zero };
      canonical.metadata = [cashJournalFieldWrite(counter, "count", P.one)];
      rejectCompletionAfterInterference(
        f,
        input.sourceRef,
        () => interfere(f),
        /Stale noncash host/,
      );
      expect(counter.count).toBe(P.zero);
      expect(canonical.completedAt).toBeUndefined();
      expect(canonical.postedJournalSequence).toBeUndefined();
    }
  });

  it("protects an unrelated actual funded partition and portfolio Set on both cash and zero paths without injecting registration cash", () => {
    for (const path of ["cash", "zero"] as const) {
      for (const target of [
        "fund",
        "portfolio-add",
        "portfolio-remove",
        "latest-row",
      ] as const) {
        const f = fixture(),
          unrelatedId = "fixture:unrelated-owner";
        const unrelated: CashJournalCashOwner = {
          id: unrelatedId,
          liquidMinor: 75,
        };
        (f.host.state.people as Map<string, CashJournalCashOwner>).set(
          unrelatedId,
          unrelated,
        );
        const residual = unrelatedId + ":residual",
          fund = unrelatedId + ":fund";
        registerCashAccount(f.runtime, f.host, {
          id: residual,
          ownerId: unrelatedId,
          name: "Available cash",
          source,
        });
        registerCashAccount(f.runtime, f.host, {
          id: fund,
          ownerId: unrelatedId,
          name: "Named partition",
          source,
          allocatedMinor: P.zero,
        });
        expect(unrelated.liquidMinor).toBe(75);
        expect(f.runtime.accounts.get(fund)!.allocatedMinor).toBe(P.zero);
        const allocation = f.addSource(
          payment(30, residual, fund),
          "fixture:unrelated-allocation",
        );
        postCashJournal(f.runtime, f.host, allocation.input);
        const { input, canonical } = f.addSource(
          path === "cash" ? payment() : [],
          "fixture:current-attempt",
        );
        const counter = { count: P.zero },
          portfolio = f.runtime.accountsByOwner.get(unrelatedId)!;
        canonical.metadata = [
          cashJournalFieldWrite(counter, "count", P.one),
          target === "fund"
            ? cashJournalFieldWrite(
                f.runtime.accounts.get(fund)!,
                "allocatedMinor",
                31,
              )
            : target === "portfolio-add"
              ? cashJournalSetWrite(
                  portfolio,
                  "fixture:unregistered-account",
                  true,
                )
              : target === "portfolio-remove"
                ? cashJournalSetWrite(portfolio, residual, false)
                : cashJournalFieldWrite(
                    f.runtime.latestByOwner.get(unrelatedId)!,
                    "afterMinor",
                    76,
                  ),
        ];
        if (path === "cash") rejectUnchanged(f, input, /journal-owned state/);
        else
          rejectCompletionUnchanged(f, input.sourceRef, /journal-owned state/);
        expect(counter.count).toBe(P.zero);
        expect(unrelated.liquidMinor).toBe(75);
        expect(f.runtime.accounts.get(fund)!.allocatedMinor).toBe(30);
        expect(portfolio).toEqual(new Set([residual, fund]));
        expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
        expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
        expect(f.runtime.nextSequence).toBe(P.one);
        expect(canonical.completedAt).toBeUndefined();
        expect(canonical.postedJournalSequence).toBeUndefined();
      }
    }
  });

  it("blocks primary completedAt and all shared posted markers in metadata while keeping CoreState sequence reserved", () => {
    for (const path of ["cash", "zero"] as const) {
      for (const target of [
        "completion-set",
        "completion-delete",
        "posted-set",
        "posted-delete",
        "core-sequence",
      ] as const) {
        const f = fixture(),
          { input, canonical } = f.addSource(path === "cash" ? payment() : []);
        const coreState = Object.assign(f.host.state, { sequence: P.zero });
        const counter = { count: P.zero };
        canonical.metadata = [
          cashJournalFieldWrite(counter, "count", P.one),
          target === "completion-set"
            ? cashJournalFieldWrite(canonical, "completedAt", date)
            : target === "completion-delete"
              ? cashJournalFieldDelete(canonical, "completedAt")
              : target === "posted-set"
                ? cashJournalFieldWrite(
                    canonical,
                    "postedJournalSequence",
                    P.one,
                  )
                : target === "posted-delete"
                  ? cashJournalFieldDelete(canonical, "postedJournalSequence")
                  : cashJournalFieldWrite(coreState, "sequence", P.one),
        ];
        if (path === "cash") rejectUnchanged(f, input, /conflicts/);
        else rejectCompletionUnchanged(f, input.sourceRef, /conflicts/);
        expect(counter.count).toBe(P.zero);
        expect(coreState.sequence).toBe(P.zero);
        expect(canonical.completedAt).toBeUndefined();
        expect(canonical.postedJournalSequence).toBeUndefined();
      }
    }
  });

  it("rechecks a cash source's completion marker after the final provider lookup before any payment or metadata commit", () => {
    const f = fixture(),
      { input, canonical } = f.addSource();
    const counter = { count: P.zero };
    canonical.metadata = [cashJournalFieldWrite(counter, "count", P.one)];
    rejectAfterInterference(
      f,
      input,
      () => {
        canonical.completedAt = date;
      },
      /Stale canonical noncash completion marker/,
    );
    expect(counter.count).toBe(P.zero);
    expect(canonical.completedAt).toBe(date);
    expect(canonical.postedJournalSequence).toBeUndefined();
    expect(f.host.state.people.get(ownerA)!.liquidMinor).toBe(1000);
    expect(f.host.state.organizations.get(ownerB)!.liquidMinor).toBe(200);
    expect(f.runtime.nextSequence).toBe(P.zero);
  });

  it("uses bounded lookups for zero-cash actor metadata and rejects reentry before any source completion", () => {
    const f = fixture(),
      { input, canonical } = f.addSource([]);
    const actor = Object.assign(f.host.state.people.get(ownerA)!, {
      actCount: P.zero,
    });
    canonical.metadata = [cashJournalFieldWrite(actor, "actCount", P.one)];
    const failScan = () => {
      throw new Error("Unexpected whole-world/history scan");
    };
    for (const index of [
      f.host.state.people,
      f.host.state.organizations,
      f.runtime.accounts,
      f.runtime.accountsByOwner,
    ])
      Object.defineProperty(index, Symbol.iterator, { value: failScan });
    f.control.beforeResolve = () => {
      expect(() =>
        completeCashJournalSource(f.runtime, f.host, input.sourceRef),
      ).toThrow(/Reentrant/);
      expect(() => postCashJournal(f.runtime, f.host, input)).toThrow(
        /Reentrant/,
      );
      expect(() =>
        registerCashAccount(f.runtime, f.host, {
          id: "fixture:reentrant-noncash-fund",
          ownerId: ownerA,
          name: "Partition",
          source,
          allocatedMinor: P.zero,
        }),
      ).toThrow(/Reentrant/);
      expect(actor.actCount).toBe(P.zero);
      expect(canonical.completedAt).toBeUndefined();
    };
    completeCashJournalSource(f.runtime, f.host, input.sourceRef);
    expect(actor.actCount).toBe(P.one);
    expect(actor.liquidMinor).toBe(1000);
    expect(canonical.completedAt).toBe(date);
    expect(f.runtime.nextSequence).toBe(P.zero);
    expect(f.runtime.accounts.has("fixture:reentrant-noncash-fund")).toBe(
      false,
    );
  });

  it("returns a detached acknowledgement and retains no extra noncash receipt or historical source ID after quiet source pruning", () => {
    const f = fixture(),
      { input, canonical } = f.addSource([]);
    const acknowledgement = completeCashJournalSource(
      f.runtime,
      f.host,
      input.sourceRef,
    );
    const before = completionSnapshot(f);
    acknowledgement.sourceRef.id = "fixture:changed-return";
    acknowledgement.completedAt = future;
    input.sourceRef.id = "fixture:changed-caller-reference";
    expect(completionSnapshot(f)).toBe(before);
    expect(canonical.completedAt).toBe(date);
    f.records.delete(canonical.id);
    for (let round = 0; round < 200; round += 1) {
      const current = f.addSource([], "fixture:quiet-zero-result:" + round);
      completeCashJournalSource(f.runtime, f.host, current.input.sourceRef);
      f.records.delete(current.canonical.id);
    }
    expect(f.records.size).toBe(P.zero);
    expect(f.runtime.nextSequence).toBe(P.zero);
    expect(f.runtime.totals).toEqual({
      count: P.zero,
      grossDebitMinor: P.zero,
      grossCreditMinor: P.zero,
    });
    expect(f.runtime.detailedReceipts.size).toBe(P.zero);
    expect(f.runtime.detailedByOwner.size).toBe(P.zero);
    expect(f.runtime.requiredBySource.size).toBe(P.zero);
    expect(f.runtime.latestByOwner.size).toBe(P.zero);
    expect(f.runtime.latestByAccount.size).toBe(P.zero);
    expect(f.runtime.totalsByOwner.size).toBe(P.zero);
    expect(f.runtime.totalsByAccount.size).toBe(P.zero);
    expect(Object.keys(f.runtime)).not.toContain("noncashReceipts");
    expect(Object.keys(f.runtime)).not.toContain("completedSourceIds");
    expect(Object.keys(f.runtime)).not.toContain("usedSources");
  });
});
