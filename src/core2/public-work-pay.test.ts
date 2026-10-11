import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { DEFAULT_DATA } from "./data";
import { ensureFinanceCashModule } from "./finance-cash";
import { chooseAct } from "./life";
import {
  discretionaryHours,
  plannedWorkMinutesOnDate,
  WORK_MODULE,
} from "./modules/work";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import { ensureWorkCashModule, settleWorkResultJournal } from "./work-cash";
import type { CoreAPI, CoreInput, CoreState, Source } from "./types";
import { summarizeWorkObservables } from "./tooling/work-observables";
import {
  registerControlledPersonV1,
  retireControlledPersonV1,
} from "./player-control-state-v1";

const startedAt = "2021-01-01",
  nextDay = "2021-01-02",
  personId = "fixture-public-worker",
  employerId = "fixture-public-employer",
  separateOwnerId = "fixture-public-paying-account",
  jobId = "fixture-public-job",
  commitmentId = "fixture-public-commitment",
  authorityId = "fixture-public-pay-authority";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation:
    "Controlled public-pay records; no ordinary-world or observed appropriation claim.",
  estimatedFrom:
    "A recorded government employer and worker-owned scheduled job for writer verification.",
};

function input(separateOwner = false): CoreInput {
  const ownerId = separateOwner ? separateOwnerId : employerId,
    governmentFacts = {
      governmentKind: "local-government",
      governmentKey: "fixture-government-id",
      governmentJurisdictionId: "fixture-county-id",
    };
  return {
    seed: "controlled-public-pay",
    startedAt,
    people: [
      {
        id: personId,
        givenName: "Fixture",
        familyName: "Worker",
        birthDate: "1980-01-01",
        placeId: "fixture-place",
        householdId: "fixture-household",
        tier: "weekly",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("minorPerDollar"),
        familyIds: [],
        knownIds: [],
        jobId,
        source,
      },
    ],
    households: [
      {
        id: "fixture-household",
        placeId: "fixture-place",
        memberIds: [personId],
        source,
      },
    ],
    jobs: [
      {
        id: jobId,
        personId,
        organizationId: employerId,
        title: "Controlled recorded public worker",
        hoursDaily: p("one"),
        hourlyMinor: p("minorPerDollar"),
        wageDailyMinor: p("minorPerDollar"),
        source,
      },
    ],
    organizations: [
      {
        id: employerId,
        placeId: "fixture-place",
        name: "Controlled public employer",
        kind: "employer",
        liquidMinor: p("zero"),
        governmentFacts,
        ...(separateOwner ? {} : { outsideFlow: source }),
        publicPayAuthority: {
          id: authorityId,
          ownerId,
          governmentKey: governmentFacts.governmentKey,
          jurisdictionId: governmentFacts.governmentJurisdictionId,
          workCommitmentIds: [commitmentId],
          basisRecordIds: ["fixture-recorded-employer-government-profile"],
          source,
        },
        source,
      },
      ...(separateOwner
        ? [
            {
              id: separateOwnerId,
              placeId: "fixture-place",
              name: "Controlled actual government paying account",
              kind: "institution",
              liquidMinor: p("zero"),
              governmentFacts: { ...governmentFacts },
              outsideFlow: source,
              source,
            },
          ]
        : []),
    ],
    workCommitments: [
      {
        id: commitmentId,
        publicPayAuthorityId: authorityId,
        jobId,
        personId,
        organizationId: employerId,
        startsAt: startedAt,
        anchorDate: startedAt,
        periodDays: p("one"),
        expectedWeeklyMinutes: p("daysPerWeek") * p("minutesPerHour"),
        hourlyMinor: p("minorPerDollar"),
        slots: [
          {
            offsetDays: p("zero"),
            startMinute: p("zero"),
            minutes: p("minutesPerHour"),
          },
        ],
        scheduleSource: source,
        paySource: source,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

function ready(separateOwner = false): CoreState {
  const core = createCore(input(separateOwner), { modules: [WORK_MODULE] });
  ensureWorkCashModule(core);
  ensureFinanceCashModule(core);
  advanceDate(core, nextDay);
  return core;
}

/** Existing un-enrolled per-shift cash writer guard fixtures, not normal payday scheduling. */
function work(core: CoreState, api = coreAPI(core), absent = false): void {
  const row = core.work.commitments.get(commitmentId)!;
  if (core.work.lastResultByJob.get(jobId)?.date === core.date) return;
  const planned = plannedWorkMinutesOnDate(api, row),
    hours = planned / api.parameter("minutesPerHour"),
    available = discretionaryHours(api, personId);
  const offers = [
    {
      definition: core.data.work!.attendanceAction,
      targetId: row.id,
      availableHours: available,
      effortHours: hours,
    },
    {
      definition: core.data.work!.absenceAction,
      targetId: row.id,
      availableHours: available,
      effortHours: api.parameter("zero"),
    },
  ];
  const decision = chooseAct(core, personId, absent ? [offers[1]!] : offers),
    attended =
      decision.selected!.definition.effect ===
      core.data.work!.attendanceAction.effect
        ? planned
        : api.parameter("zero");
  const previous = core.work.lastResultByJob.get(jobId),
    exact =
      (previous?.payRemainderMinor ?? api.parameter("zero")) +
      (row.hourlyMinor * attended) / api.parameter("minutesPerHour"),
    requested = Math.floor(exact);
  api.settleWorkResult({
    id: `work-result:${core.date}:${row.id}`,
    commitmentId: row.id,
    jobId: row.jobId,
    personId: row.personId,
    organizationId: row.organizationId,
    date: core.date,
    plannedMinutes: planned,
    attendedMinutes: attended,
    absentMinutes: planned - attended,
    requestedMinor: requested,
    payRemainderMinor: exact - requested,
    reasonKey: decision.reasonKey,
    decision,
    source: { ...source, asOf: core.date },
  });
}

function snapshot(core: CoreState): string {
  return JSON.stringify(core, (key, value: unknown) => {
    if (["data", "modules", "stopgapHits", "gaps"].includes(key))
      return undefined;
    if (value instanceof Map) return [...value];
    if (value instanceof Set) return [...value];
    return value;
  });
}

describe("retained canonical un-enrolled public cash-writer guards", () => {
  it.each([false, true])(
    "pays only current attended work from zero outside stock (separate owner: %s)",
    (separateOwner) => {
      const core = ready(separateOwner),
        ownerId = separateOwner ? separateOwnerId : employerId;
      expect(
        core.cashJournal.externalFlowsByOwner.get(ownerId)!.outgoingMinor,
      ).toBe(p("zero"));
      expect(core.people.get(personId)!.liquidMinor).toBe(p("zero"));
      work(core);
      const result = core.work.lastResultByJob.get(jobId)!;
      expect(result.attendedMinutes).toBe(p("minutesPerHour"));
      expect(result.paidMinor).toBe(result.requestedMinor);
      expect(result.shortfallMinor).toBe(p("zero"));
      expect(result.publicPayDue).toMatchObject({
        date: nextDay,
        authorityId,
        ownerId,
        organizationId: employerId,
        personId,
        jobId,
        commitmentId,
        amountMinor: result.requestedMinor,
      });
      expect(result.publicPayDue!.source.tag).toBe("ESTIMATED");
      expect(core.organizations.get(ownerId)!.liquidMinor).toBe(p("zero"));
      expect(core.organizations.get(employerId)!.liquidMinor).toBe(p("zero"));
      expect(core.people.get(personId)!.liquidMinor).toBe(result.paidMinor);
      const flow = core.cashJournal.externalFlowsByOwner.get(ownerId)!;
      expect(flow.outgoingMinor).toBe(result.paidMinor);
      expect(flow.netMinor).toBe(-result.paidMinor);
      const observed = summarizeWorkObservables(input(separateOwner), core);
      expect(observed.money.cashAndExternalFlowsConserved).toBe(true);
      expect(observed.money.externalFlows.outgoingMinor).toBe(result.paidMinor);
      expect(observed.money.latestCashReceiptFailures).toBe(p("zero"));
      expect(core.cashJournal.nextSequence).toBe(p("one"));
      const provider = core.cashJournal.sourceProviders.get(
        DEFAULT_DATA.work!.journalSourceKinds.result,
      )!;
      const canonical = provider({
        kind: DEFAULT_DATA.work!.journalSourceKinds.result,
        id: result.id,
      })!.resolved;
      expect(canonical.requiredRelatedRefs).toContainEqual({
        kind: result.publicPayDue!.kind,
        id: result.publicPayDue!.id,
      });
      expect(canonical.requiredRelatedRefs).toContainEqual({
        kind: DEFAULT_DATA.work!.journalSourceKinds.publicPayAuthority,
        id: authorityId,
      });
      expect(canonical.expectedPostings).toHaveLength(
        separateOwner ? p("two") * p("two") : p("two"),
      );
      const beforeReplay = snapshot(core);
      work(core);
      expect(snapshot(core)).toBe(beforeReplay);
      expect(() =>
        coreAPI(core).postJournal({
          id: `journal:${core.date}:${core.cashJournal.nextSequence}`,
          date: core.date,
          expectedSequence: core.cashJournal.nextSequence,
          sourceRef: { kind: canonical.kind, id: canonical.id },
          postings: canonical.expectedPostings,
        }),
      ).toThrow();
      expect(snapshot(core)).toBe(beforeReplay);
    },
  );

  it.each([false, true])(
    "records an actual absence without paying outside money (separate owner: %s)",
    (separateOwner) => {
      const core = ready(separateOwner);
      work(core, coreAPI(core), true);
      const result = core.work.lastResultByJob.get(jobId)!;
      expect(result.attendedMinutes).toBe(p("zero"));
      expect(result.absentMinutes).toBe(result.plannedMinutes);
      expect(result.requestedMinor).toBe(p("zero"));
      expect(result.paidMinor).toBe(p("zero"));
      expect(result.publicPayDue!.amountMinor).toBe(p("zero"));
      expect(core.cashJournal.nextSequence).toBe(p("zero"));
      expect(
        core.cashJournal.externalFlowsByOwner.get(
          separateOwner ? separateOwnerId : employerId,
        )!.outgoingMinor,
      ).toBe(p("zero"));
      expect(core.work.cashSources.get(result.id)!.completedAt).toBe(nextDay);
      expect(core.people.get(personId)!.actCount).toBe(p("one"));
    },
  );

  it.each([
    "missing-commitment-link",
    "wrong-government",
    "wrong-jurisdiction",
    "wrong-owner",
    "missing-outside-role",
  ])("rejects %s before cash, work and act records change", (mutation) => {
    const core = ready(true),
      employer = core.organizations.get(employerId)!,
      owner = core.organizations.get(separateOwnerId)!;
    if (mutation === "missing-commitment-link")
      delete core.work.commitments.get(commitmentId)!.publicPayAuthorityId;
    if (mutation === "wrong-government")
      owner.governmentFacts = {
        ...owner.governmentFacts,
        governmentKey: "different-government",
      };
    if (mutation === "wrong-jurisdiction")
      employer.governmentFacts = {
        ...employer.governmentFacts,
        governmentJurisdictionId: "different-county",
      };
    if (mutation === "wrong-owner")
      employer.publicPayAuthority = Object.freeze({
        ...employer.publicPayAuthority!,
        ownerId: "absent-owner",
      });
    if (mutation === "missing-outside-role") delete owner.outsideFlow;
    const before = snapshot(core);
    expect(() => work(core)).toThrow();
    expect(snapshot(core)).toBe(before);
  });

  it("rejects a government identity changed between provider lookups atomically", () => {
    const core = ready(true),
      api = coreAPI(core),
      owner = core.organizations.get(separateOwnerId)!,
      originalFacts = owner.governmentFacts,
      before = snapshot(core);
    let calls = p("zero");
    const guarded: CoreAPI = {
      ...api,
      settleWorkResult(result) {
        return settleWorkResultJournal(core, guarded, result);
      },
      postJournal(journal) {
        const provider = core.cashJournal.sourceProviders.get(
          journal.sourceRef.kind,
        )!;
        core.cashJournal.sourceProviders.set(
          journal.sourceRef.kind,
          (reference) => {
            calls += p("one");
            const slot = provider(reference);
            if (calls === p("one"))
              owner.governmentFacts = {
                ...originalFacts,
                governmentKey: "changed-between-lookups",
              };
            return slot;
          },
        );
        try {
          return api.postJournal(journal);
        } finally {
          owner.governmentFacts = originalFacts;
          core.cashJournal.sourceProviders.set(
            journal.sourceRef.kind,
            provider,
          );
        }
      },
    };
    expect(() => work(core, guarded)).toThrow(
      /matching zero-stock outside owner/,
    );
    expect(calls).toBe(p("two"));
    expect(snapshot(core)).toBe(before);
  });

  it("captures its past authority independently of later source inputs", () => {
    const original = input(true),
      core = createCore(
        { ...original, focusPersonIds: [personId] },
        { modules: [WORK_MODULE] },
      );
    original.organizations[p("zero")]!.publicPayAuthority!.source.citation =
      "Caller changed the opening input";
    original.organizations[p("zero")]!.publicPayAuthority!.workCommitmentIds =
      [];
    advanceDate(core, nextDay);
    work(core);
    const result = core.work.lastResultByJob.get(jobId)!,
      pinned = JSON.stringify(result.publicPayDue);
    expect(result.publicPayDue!.source.citation).not.toContain(
      "Caller changed",
    );
    core.organizations.get(employerId)!.publicPayAuthority = undefined;
    const canonical = core.cashJournal.sourceProviders.get(
      DEFAULT_DATA.work!.journalSourceKinds.result,
    )!({
      kind: DEFAULT_DATA.work!.journalSourceKinds.result,
      id: result.id,
    })!.resolved;
    expect(
      canonical.relatedRecords.some((record) => record.id === authorityId),
    ).toBe(true);
    expect(
      JSON.stringify(core.work.lastResultByJob.get(jobId)!.publicPayDue),
    ).toBe(pinned);
    expect(core.work.detailedResults.has(result.id)).toBe(true);
  });
});

// Additive explicit control retention fixtures. SOURCE ONLY; UNEXECUTED.
describe("explicitly controlled per-shift/legacy work-source retention", () => {
  it("retains an actual un-enrolled public scheduled payment without changing outside authority or cash", () => {
    // Raw supplied per-shift calendar route; no generated payday enrollment is invented.
    const core = createCore(input(true), { modules: [WORK_MODULE] });
    ensureWorkCashModule(core);
    ensureFinanceCashModule(core);
    advanceDate(core, nextDay);
    const token = registerControlledPersonV1(core, personId);
    work(core);
    const result = core.work.lastResultByJob.get(jobId)!,
      row = core.work.cashSources.get(result.id)!;
    expect(core.work.detailedResults.get(result.id)).toEqual(row.result);
    expect(result.decision!.scores?.length).toBeGreaterThan(p("zero"));
    expect(result.paidMinor).toBe(result.requestedMinor);
    expect(result.publicPayDue!.authorityId).toBe(authorityId);
    expect(
      core.cashJournal.externalFlowsByOwner.get(separateOwnerId)!.outgoingMinor,
    ).toBe(result.paidMinor);
    expect(core.organizations.get(separateOwnerId)!.liquidMinor).toBe(
      p("zero"),
    );
    const journalId = core.cashJournal.requiredBySource
      .get(row.kind)!
      .get(row.id)!;
    expect(core.cashJournal.detailedReceipts.get(journalId)!.sourceRef.id).toBe(
      row.id,
    );
    retireControlledPersonV1(core, token);
    expect(
      core.cashJournal.sourceProviders.get(row.kind)!({
        kind: row.kind,
        id: row.id,
      })!.retainFull,
    ).toBe(true);
    expect(core.playerId).toBeUndefined();
    expect(core.focusPersonIds.size).toBe(p("zero"));
  });
  it("keeps earlier controlled legacy payment Sources and journals across later occurrences without changing finite pay", () => {
    const original = input(false),
      supplied = {
        ...original,
        workCommitments: [],
        workPayrollCalendars: [],
        organizations: original.organizations.map((row) => ({
          ...row,
          outsideFlow: undefined,
          publicPayAuthority: undefined,
          governmentFacts: undefined,
          liquidMinor: p("minorPerDollar") * p("two"),
        })),
      },
      core = createCore(supplied, { modules: [WORK_MODULE] }),
      api = coreAPI(core);
    ensureWorkCashModule(core);
    ensureFinanceCashModule(core);
    advanceDate(core, nextDay);
    const token = registerControlledPersonV1(core, personId),
      occurrence = () => {
        const offer = {
            definition: core.data.actions.find(
              (row) => row.id === "work-shift",
            )!,
            targetId: jobId,
            availableHours:
              p("hoursPerDay") - p(core.data.work!.sleepReserveParameter),
            effortHours: p("one"),
          },
          decision = chooseAct(core, personId, [offer]);
        return api.settleLegacyWorkResult({
          personId,
          offer,
          date: core.date,
          days: p("one"),
          decision,
        });
      },
      first = occurrence();
    advanceDate(core, "2021-01-03");
    const second = occurrence();
    expect(first.paidMinor).toBe(p("minorPerDollar"));
    expect(second.paidMinor).toBe(p("minorPerDollar"));
    expect(core.organizations.get(employerId)!.liquidMinor).toBe(p("zero"));
    expect(core.work.cashSources.has(first.id)).toBe(true);
    expect(core.work.cashSources.has(second.id)).toBe(true);
    for (const id of [first.id, second.id]) {
      const row = core.work.cashSources.get(id)!,
        journalId = core.cashJournal.requiredBySource.get(row.kind)!.get(id)!;
      expect(
        core.cashJournal.detailedReceipts.get(journalId)!.sourceRef.id,
      ).toBe(id);
    }
    retireControlledPersonV1(core, token);
    expect(
      core.cashJournal.sourceProviders.get(
        core.data.legacyWorkJournalSourceKind,
      )!({
        kind: core.data.legacyWorkJournalSourceKind,
        id: first.id,
      })!.retainFull,
    ).toBe(true);
    expect(core.playerId).toBeUndefined();
    expect(core.focusPersonIds.size).toBe(p("zero"));
  });
});
