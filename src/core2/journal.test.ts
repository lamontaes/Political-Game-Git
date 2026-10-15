/** Technical admission fixtures only; unexecuted and not empirical accounting priors. */
import { describe, expect, it } from "vitest";
import { P } from "./parameters";
import { projectCashJournal } from "./journal";
import type {
  CashAccountSnapshot,
  CashJournalContext,
  CashJournalInput,
  CashJournalPosting,
  CashOwnerSnapshot,
} from "./journal";
import type { Source } from "./types";

const date = "2021-01-31",
  earlier = "2021-01-01",
  future = "2021-02-01";
const ownerA = "fixture:person",
  ownerB = "fixture:organization";
const residualA = "fixture:person:residual",
  fundA = "fixture:person:tax-fund";
const residualB = "fixture:organization:residual";
const source: Source = {
  tag: "SOURCED",
  asOf: date,
  citation:
    "Explicit technical canonical-source fixture; no observed transaction or legal tax authority is asserted.",
};
const payment = (amount = 400): CashJournalPosting[] => [
  { id: "fixture:out", accountId: residualA, deltaMinor: -amount },
  { id: "fixture:in", accountId: residualB, deltaMinor: amount },
];

function fixture(lines: readonly CashJournalPosting[] = payment()): {
  input: CashJournalInput;
  context: CashJournalContext;
} {
  const allAccounts: CashAccountSnapshot[] = [
    { id: residualA, ownerId: ownerA, name: "Unrestricted cash", source },
    {
      id: fundA,
      ownerId: ownerA,
      name: "Named cash partition",
      allocatedMinor: 300,
      source,
    },
    { id: residualB, ownerId: ownerB, name: "Unrestricted cash", source },
  ];
  const allOwners: CashOwnerSnapshot[] = [
    { id: ownerA, liquidMinor: 1000, accountIds: [residualA, fundA] },
    { id: ownerB, liquidMinor: 200, accountIds: [residualB] },
  ];
  const touched = new Set(
    lines.map(
      (line) => allAccounts.find((row) => row.id === line.accountId)?.ownerId,
    ),
  );
  return {
    input: {
      id: `journal:${date}:${P.zero}`,
      date,
      expectedSequence: P.zero,
      sourceRef: {
        kind: "fixture:actual-payment",
        id: "fixture:canonical-receipt",
      },
      postings: lines,
    },
    context: {
      date,
      nextSequence: P.zero,
      resolvedSource: {
        kind: "fixture:actual-payment",
        id: "fixture:canonical-receipt",
        date,
        source,
        expectedPostings: lines.map((row) => ({ ...row })),
        requiredRelatedRefs: [
          { kind: "fixture:actual-act", id: "fixture:committed-act" },
        ],
        relatedRecords: [
          {
            kind: "fixture:actual-act",
            id: "fixture:committed-act",
            date,
            source,
          },
        ],
      },
      owners: new Map(
        allOwners
          .filter((row) => touched.has(row.id))
          .map((row) => [row.id, row]),
      ),
      accounts: new Map(
        allAccounts
          .filter((row) => touched.has(row.ownerId))
          .map((row) => [row.id, row]),
      ),
    },
  };
}

function snapshot(value: unknown): string {
  return JSON.stringify(value, (_key, row: unknown) =>
    row instanceof Map ? [...row] : row,
  );
}

function rejectedWithoutMutation(
  f: ReturnType<typeof fixture>,
  error: RegExp,
): void {
  const before = snapshot(f);
  expect(() => projectCashJournal(f.input, f.context)).toThrow(error);
  expect(snapshot(f)).toBe(before);
}

function outsideFixture(amount = 400) {
  const f = fixture([
    { id: "fixture:outside-paid", accountId: residualB, deltaMinor: -amount },
    { id: "fixture:inside-received", accountId: residualA, deltaMinor: amount },
  ]);
  f.context.owners = new Map(
    [...f.context.owners].map(([id, row]) => [
      id,
      id === ownerB
        ? {
            ...row,
            liquidMinor: P.zero,
            outsideNetMinor: P.zero,
          }
        : row,
    ]),
  );
  f.context.accounts = new Map(
    [...f.context.accounts].map(([id, row]) => [
      id,
      id === residualB
        ? {
            ...row,
            outsideFlow: true as const,
          }
        : row,
    ]),
  );
  const obligation = {
    kind: "fixture:due-award",
    id: "fixture:current-award-obligation",
  };
  f.context.resolvedSource.requiredRelatedRefs = [
    ...f.context.resolvedSource.requiredRelatedRefs,
    obligation,
  ];
  f.context.resolvedSource.relatedRecords = [
    ...f.context.resolvedSource.relatedRecords,
    { ...obligation, date, source },
  ];
  f.context.resolvedSource.externalFlowAuthorizations = [
    { accountId: residualB, obligation },
  ];
  return f;
}

describe("source-qualified outside payments with zero opening stock", () => {
  it("balances incoming local cash against an external flow debit without preloading any cash", () => {
    const f = outsideFixture(),
      before = snapshot(f);
    const result = projectCashJournal(f.input, f.context);
    expect(result.owners.get(ownerA)!.afterMinor).toBe(1400);
    expect(result.owners.get(ownerB)).toEqual({
      ownerId: ownerB,
      beforeMinor: P.zero,
      afterMinor: P.zero,
    });
    expect(result.externalFlows.get(ownerB)).toEqual({
      ownerId: ownerB,
      beforeNetMinor: P.zero,
      afterNetMinor: -400,
      outgoingMinor: 400,
      incomingMinor: P.zero,
    });
    expect(
      result.owners.get(ownerA)!.afterMinor +
        result.externalFlows.get(ownerB)!.afterNetMinor,
    ).toBe(1000);
    expect(result.accounts.get(fundA)!.afterMinor).toBe(300);
    expect(result.grossCreditMinor).toBe(result.grossDebitMinor);
    expect(snapshot(f)).toBe(before);
  });

  it("rejects an outside flag without one resolved required current obligation", () => {
    for (const form of [
      "absent",
      "duplicate",
      "unrequired",
      "old",
      "different-account",
    ] as const) {
      const f = outsideFixture(),
        authority = f.context.resolvedSource.externalFlowAuthorizations![0]!;
      if (form === "absent")
        f.context.resolvedSource.externalFlowAuthorizations = [];
      if (form === "duplicate")
        f.context.resolvedSource.externalFlowAuthorizations = [
          authority,
          authority,
        ];
      if (form === "unrequired")
        f.context.resolvedSource.requiredRelatedRefs =
          f.context.resolvedSource.requiredRelatedRefs.filter(
            (row) => row.id !== authority.obligation.id,
          );
      if (form === "old")
        f.context.resolvedSource.relatedRecords =
          f.context.resolvedSource.relatedRecords.map((row) =>
            row.id === authority.obligation.id
              ? { ...row, date: earlier, source: { ...source, asOf: earlier } }
              : row,
          );
      if (form === "different-account")
        f.context.resolvedSource.externalFlowAuthorizations = [
          { ...authority, accountId: residualA },
        ];
      rejectedWithoutMutation(f, /Outside payment|Outside flow requires/);
    }
  });

  it("rejects prepaid outside stock, outside partitions and ordinary cash declared external", () => {
    const stock = outsideFixture();
    stock.context.owners = new Map(
      [...stock.context.owners].map(([id, row]) => [
        id,
        id === ownerB ? { ...row, liquidMinor: 100 } : row,
      ]),
    );
    rejectedWithoutMutation(stock, /zero opening stock/);
    const partition = outsideFixture();
    partition.context.accounts = new Map(
      [...partition.context.accounts].map(([id, row]) => [
        id,
        id === residualB ? { ...row, allocatedMinor: P.zero } : row,
      ]),
    );
    rejectedWithoutMutation(partition, /metadata is inconsistent/);
    const ordinary = fixture();
    ordinary.context.accounts = new Map(
      [...ordinary.context.accounts].map(([id, row]) => [
        id,
        id === residualB ? { ...row, outsideFlow: true as const } : row,
      ]),
    );
    rejectedWithoutMutation(ordinary, /Ordinary cash/);
  });

  it("rejects signed flow overflow while ordinary receiving cash remains within range", () => {
    const f = outsideFixture(P.one);
    f.context.owners = new Map(
      [...f.context.owners].map(([id, row]) => [
        id,
        id === ownerB
          ? { ...row, outsideNetMinor: -Number.MAX_SAFE_INTEGER }
          : row,
      ]),
    );
    rejectedWithoutMutation(f, /signed flow overflows/);
  });
});

describe("pure balanced cash journal admission", () => {
  it("projects actual paid cash and preserves total authoritative owner stock without mutation", () => {
    const f = fixture(),
      before = snapshot(f);
    const result = projectCashJournal(f.input, f.context);
    expect(result.owners.get(ownerA)!.afterMinor).toBe(600);
    expect(result.owners.get(ownerB)!.afterMinor).toBe(600);
    expect(
      [...result.owners.values()].reduce(
        (sum, row) => sum + row.afterMinor,
        P.zero,
      ),
    ).toBe(1200);
    expect(result.accounts.get(fundA)!.allocatedAfterMinor).toBe(300);
    expect(result.accounts.get(residualA)!.afterMinor).toBe(300);
    expect(result.grossCreditMinor).toBe(400);
    expect(result.grossDebitMinor).toBe(400);
    expect(result.nextSequence).toBe(P.one);
    expect(snapshot(f)).toBe(before);
  });

  it("allocates a named fund by partitioning existing cash without creating another stock", () => {
    const f = fixture([
      { id: "fixture:partition-out", accountId: residualA, deltaMinor: -200 },
      { id: "fixture:partition-in", accountId: fundA, deltaMinor: 200 },
    ]);
    const result = projectCashJournal(f.input, f.context);
    expect(result.owners.get(ownerA)!.afterMinor).toBe(1000);
    expect(result.accounts.get(fundA)!.afterMinor).toBe(500);
    expect(result.accounts.get(residualA)!.afterMinor).toBe(500);
    expect(
      result.accounts.get(fundA)!.afterMinor +
        result.accounts.get(residualA)!.afterMinor,
    ).toBe(result.owners.get(ownerA)!.afterMinor);
  });

  it("spends a fund's actual allocation and changes owner cash exactly once", () => {
    const f = fixture([
      { id: "fixture:fund-out", accountId: fundA, deltaMinor: -100 },
      { id: "fixture:fund-in", accountId: residualB, deltaMinor: 100 },
    ]);
    const result = projectCashJournal(f.input, f.context);
    expect(result.owners.get(ownerA)!.afterMinor).toBe(900);
    expect(result.accounts.get(fundA)!.afterMinor).toBe(200);
    expect(result.accounts.get(residualA)!.afterMinor).toBe(700);
    expect(result.owners.get(ownerB)!.afterMinor).toBe(300);
    const insufficient = fixture([
      { id: "fixture:fund-out", accountId: fundA, deltaMinor: -400 },
      { id: "fixture:fund-in", accountId: residualB, deltaMinor: 400 },
    ]);
    rejectedWithoutMutation(insufficient, /fund after/);
  });

  it("prevents unrestricted spending from consuming a different named fund", () => {
    rejectedWithoutMutation(fixture(payment(800)), /residual after/);
    const overAllocated = fixture();
    overAllocated.context.accounts = new Map(
      [...overAllocated.context.accounts].map(([id, row]) => [
        id,
        id === fundA ? { ...row, allocatedMinor: 1100 } : row,
      ]),
    );
    rejectedWithoutMutation(overAllocated, /residual before/);
  });

  it("rejects duplicate identities and stale canonical sequence without a historical ID set", () => {
    const stale = fixture();
    stale.input.expectedSequence = P.one;
    rejectedWithoutMutation(stale, /stale|Duplicate/);
    const wrongId = fixture();
    wrongId.input.id = "fixture:caller-chosen-id";
    rejectedWithoutMutation(wrongId, /canonical current sequence/);
    const duplicate = fixture();
    duplicate.input.postings = duplicate.input.postings.map((row) => ({
      ...row,
      id: "fixture:same-line",
    }));
    duplicate.context.resolvedSource.expectedPostings =
      duplicate.input.postings;
    rejectedWithoutMutation(duplicate, /Duplicate/);
  });

  it("rejects already-posted, unresolved and future source records before a commit plan", () => {
    const posted = fixture();
    posted.context.resolvedSource.postedJournalSequence = P.zero;
    rejectedWithoutMutation(posted, /unposted/);
    const unresolved = fixture();
    unresolved.input.sourceRef.id = "fixture:missing-receipt";
    rejectedWithoutMutation(unresolved, /canonical source/);
    const futureCause = fixture();
    futureCause.context.resolvedSource.date = future;
    rejectedWithoutMutation(futureCause, /canonical source/);
    const futureCitation = fixture();
    futureCitation.context.resolvedSource.source = { ...source, asOf: future };
    rejectedWithoutMutation(futureCitation, /future/);
  });

  it("requires the exact current posting date while allowing already available source evidence", () => {
    const wrongDate = fixture();
    wrongDate.input.date = earlier;
    rejectedWithoutMutation(wrongDate, /current date/);
    const f = fixture();
    f.context.resolvedSource.source = { ...source, asOf: earlier };
    expect(projectCashJournal(f.input, f.context).date).toBe(date);
  });

  it("rejects unknown accounts and incomplete fund indexes instead of inferring opening cash", () => {
    const unknown = fixture([
      { id: "fixture:out", accountId: "fixture:unknown", deltaMinor: -100 },
      { id: "fixture:in", accountId: residualB, deltaMinor: 100 },
    ]);
    rejectedWithoutMutation(unknown, /not registered/);
    const hidden = fixture();
    hidden.context.owners = new Map(
      [...hidden.context.owners].map(([id, row]) => [
        id,
        id === ownerA ? { ...row, accountIds: [residualA] } : row,
      ]),
    );
    rejectedWithoutMutation(hidden, /complete owner index/);
  });

  it("rejects two residual accounts or a fund whose registered owner is missing", () => {
    const two = fixture();
    two.context.accounts = new Map(
      [...two.context.accounts].map(([id, row]) => [
        id,
        id === fundA ? { ...row, allocatedMinor: undefined } : row,
      ]),
    );
    rejectedWithoutMutation(two, /exactly one residual/);
    const absent = fixture();
    absent.context.owners = new Map(
      [...absent.context.owners].filter(([id]) => id !== ownerA),
    );
    rejectedWithoutMutation(absent, /owner index|owner is absent/);
  });

  it("rejects imbalance, fractional amounts and receiving overflow without partial output", () => {
    const unbalanced = fixture([
      { id: "fixture:out", accountId: residualA, deltaMinor: -400 },
      { id: "fixture:in", accountId: residualB, deltaMinor: 399 },
    ]);
    rejectedWithoutMutation(unbalanced, /balance exactly/);
    rejectedWithoutMutation(fixture(payment(0.5)), /integer actual amounts/);
    const overflow = fixture(payment(100));
    overflow.context.owners = new Map(
      [...overflow.context.owners].map(([id, row]) => [
        id,
        id === ownerB ? { ...row, liquidMinor: Number.MAX_SAFE_INTEGER } : row,
      ]),
    );
    rejectedWithoutMutation(overflow, /integer journal amount|overflows/);
  });

  it("posts only the canonical actual paid amount, never requested or unfilled budget money", () => {
    const requested = fixture(payment(1000));
    requested.context.resolvedSource.expectedPostings = payment(400);
    rejectedWithoutMutation(requested, /resolved actual source/);
    rejectedWithoutMutation(fixture([]), /unfilled budget/);
    const omitted = fixture();
    omitted.input.postings = [omitted.input.postings[P.zero]!];
    rejectedWithoutMutation(omitted, /omitted/);
  });

  it("requires distinct resolved related records and rejects future act/work provenance", () => {
    const missingAct = fixture();
    missingAct.context.resolvedSource.relatedRecords = [];
    rejectedWithoutMutation(missingAct, /was not resolved/);
    const duplicate = fixture();
    duplicate.context.resolvedSource.relatedRecords = [
      ...duplicate.context.resolvedSource.relatedRecords,
      duplicate.context.resolvedSource.relatedRecords[P.zero]!,
    ];
    rejectedWithoutMutation(duplicate, /Duplicate related/);
    const futureAct = fixture();
    futureAct.context.resolvedSource.relatedRecords =
      futureAct.context.resolvedSource.relatedRecords.map((row) => ({
        ...row,
        date: future,
      }));
    rejectedWithoutMutation(futureAct, /source is in the future/);
  });

  it("keeps the balanced result independent of posting order and detached from caller arrays", () => {
    const first = fixture(),
      second = fixture([...payment()].reverse());
    const left = projectCashJournal(first.input, first.context),
      right = projectCashJournal(second.input, second.context);
    expect([...left.owners].sort()).toEqual([...right.owners].sort());
    expect([...left.accounts].sort()).toEqual([...right.accounts].sort());
    expect(left.grossDebitMinor).toBe(right.grossDebitMinor);
    const before = snapshot(first);
    left.postings[P.zero]!.deltaMinor = -999;
    expect(snapshot(first)).toBe(before);
  });
});
