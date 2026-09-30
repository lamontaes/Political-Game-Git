import { describe, expect, it } from "vitest";
import { createWorld, recordWorldEvent } from "../../src/simulation/world";
import { createStartingPerson } from "../../src/simulation/people";
import { makeCurrencyCode } from "../../src/simulation/resources";
import { makeIsoDate } from "../../src/simulation/dates";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { introduceMeasure } from "../../src/simulation/legislation";
import { US_CONGRESS_PACK_ID } from "../../src/simulation/congress-rule-pack";
import type {
  EntityId,
  EventType,
  IsoDate,
  World,
} from "../../src/simulation/types";
import type { EnactedLawEffects } from "../../src/simulation/enacted-law-effects";
import {
  collectSystemProof,
  evictionProof,
  filingProof,
  lawProof,
  plainSystemReport,
} from "./systems";

const id = (value: string) => value as EntityId;
const date = makeIsoDate;
const usd = makeCurrencyCode("USD");
const provenance = {
  kind: "authored" as const,
  note: "Explicit report-reader fixture, not observed world evidence.",
};
const period = {
  from: date("2026-01-01"),
  through: date("2026-12-31"),
  openingSequence: 0,
};

function fixture() {
  const input = {
    seed: "governance-proof-reader-fixture",
    currentDate: period.through,
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
    people: [],
  };
  const empty = createWorld(input);
  const person = createStartingPerson({
    worldId: empty.id,
    worldSeed: empty.seed,
    currentDate: empty.currentDate,
    homeJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    age: 35,
    givenName: "Ana",
    familyName: "Fixture",
  });
  return { person, world: createWorld({ ...input, people: [person] }) };
}

function event(
  world: World,
  personId: EntityId,
  type: EventType,
  when: IsoDate,
  key: string,
  lease = "lease-a",
) {
  return recordWorldEvent(world, {
    stableKey: key,
    type,
    occurredAt: when,
    recordedAt: when,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Explicit report fixture" },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [`town-rent/v1:lease:${lease}`],
    summary: `${key}: unpaid rent is debt, not court cost.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("canonical watched-system report evidence", () => {
  it("retains a none-case and does not invent a named worked example", () => {
    const { world } = fixture();
    const proof = collectSystemProof(world, period, "all", () => []);
    expect(proof.evictions).toEqual([]);
    expect(proof.laws).toEqual([]);
    expect(proof.filing).toEqual([]);
    const report = plainSystemReport(proof, {
      seed: world.seed,
      place: "Fixture place",
      placeKey: "fixture",
      sourceHead: "source",
      collectorHead: "collector",
      sourceDirty: false,
      status: "incomplete",
      days: 0,
      save: null,
      problem: "Stopped before first day",
    });
    expect(report).toContain("No eviction filings or resolutions");
    expect(report).toContain("No laws enacted");
    expect(report).toContain("No bills introduced");
    expect(report).toContain("A year was not completed");
  });
  it("keeps serial filings distinct and does not turn an open case into eviction", () => {
    const { person, world: base } = fixture();
    let world = event(
      base,
      person.id,
      "housing.eviction-filed",
      date("2026-02-01"),
      "first",
    );
    world = event(
      world,
      person.id,
      "housing.eviction-settled",
      date("2026-03-01"),
      "settled",
    );
    world = event(
      world,
      person.id,
      "housing.eviction-filed",
      date("2026-06-01"),
      "second",
    );
    const before = JSON.stringify(world);
    const rows = evictionProof(world, period);
    expect(rows.map((r) => r.outcome)).toEqual([
      "housing.eviction-settled",
      "open",
    ]);
    expect(rows[1]!.resolutionId).toBeNull();
    expect(rows.every((r) => r.costs === null)).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
  });
  it("includes a pre-period filing resolved during observation but excludes old resolved cases", () => {
    const { person, world: base } = fixture();
    let world = event(
      base,
      person.id,
      "housing.eviction-filed",
      date("2025-12-01"),
      "old-open",
    );
    const openingSequence = world.history.nextSequence;
    world = event(
      world,
      person.id,
      "housing.evicted",
      date("2026-02-01"),
      "order",
    );
    expect(evictionProof(world, { ...period, openingSequence })).toHaveLength(
      1,
    );
    expect(
      evictionProof(world, {
        ...period,
        openingSequence: world.history.nextSequence,
      }),
    ).toEqual([]);
  });
  it("does not use later rehousing as an immediate destination", () => {
    const { person, world: base } = fixture();
    let world = event(
      base,
      person.id,
      "housing.eviction-filed",
      date("2026-02-01"),
      "file",
    );
    world = event(
      world,
      person.id,
      "housing.evicted",
      date("2026-03-01"),
      "order",
    );
    world = {
      ...world,
      history: {
        ...world.history,
        dwellings: [
          {
            id: id("home"),
            stableKey: "home",
            sequence: 8,
            establishedAt: period.from,
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
            locationLabel: "Later recorded home",
            classification: "residential:house",
            provenance,
          },
        ],
        dwellingOccupancies: [
          {
            id: id("occupancy"),
            stableKey: "occupancy",
            sequence: 9,
            occupant: { kind: "person", personId: person.id },
            dwellingId: id("home"),
            startedAt: date("2026-04-01"),
            provenance,
          },
        ],
        dwellingOccupancyStates: [
          {
            id: id("state"),
            stableKey: "state",
            sequence: 10,
            dwellingOccupancyId: id("occupancy"),
            effectiveAt: date("2026-04-01"),
            status: "active",
            residenceRole: "primary",
            kind: "residence:home",
            reason: null,
            provenance,
            supersedesStateId: null,
          },
        ],
      },
    };
    const row = evictionProof(world, period)[0]!;
    expect(row.immediateDestination).toEqual([]);
    expect(row.laterDestination?.[0]?.location).toBe("Later recorded home");
    expect(row.costs).toBeNull();
  });
  it("does not reconstruct a sponsor motive from the current world", () => {
    const { person, world: base } = fixture();
    const world = introduceMeasure(base, {
      stableKey: "bill",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_PACK_ID,
      designation: "H.R. 1",
      shortTitle: "Fixture bill",
      summary: "Explicit fixture",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: person.id,
      originChamberKey: "house",
    });
    const rows = filingProof(world, period);
    expect(rows[0]!.sponsor).toBe("Ana Fixture");
    expect(rows[0]!.savedReasons).toEqual([]);
    expect(rows[0]!.missingReason).toContain("No separately recorded");
    expect(
      filingProof(world, {
        ...period,
        openingSequence: world.history.nextSequence,
      }),
    ).toEqual([]);
  });
  it("separates authorized money from actual transfers and retains blocked transfers", () => {
    const { world: base } = fixture();
    const measureId = id("law");
    const world: World = {
      ...base,
      history: {
        ...base.history,
        legislativeEnactments: [
          {
            id: id("enacted"),
            stableKey: "enacted",
            sequence: 1,
            measureId,
            resolvedAt: date("2026-02-01"),
            outcome: "enacted",
            actDesignation: "Fixture Act",
            effectiveAt: date("2026-02-01"),
            outcomeEventId: id("event"),
          },
        ],
        publicProgramRecords: [
          {
            id: id("appropriation"),
            stableKey: "appropriation",
            sequence: 2,
            programKey: "fixture:program",
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
            recordedAt: date("2026-02-01"),
            eventId: id("event"),
            kind: "appropriation",
            accountOrganizationId: id("treasury"),
            amount: { minorUnits: 10000, currency: usd },
            availableFrom: period.from,
            availableThrough: period.through,
            sourceMeasureId: measureId,
            basis: { kind: "authored-fixture", note: "Explicit fixture" },
          },
          {
            id: id("commitment"),
            stableKey: "commitment",
            sequence: 3,
            programKey: "fixture:program",
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
            recordedAt: date("2026-02-01"),
            eventId: id("event"),
            kind: "commitment",
            appropriationId: id("appropriation"),
            alternativeKey: "fixture",
            alternativeTitle: "Fixture",
            decidedByPersonId: id("decider"),
            authority: "Fixture only",
            recipientOrganizationId: id("recipient"),
            installments: [
              {
                dueAt: date("2026-03-01"),
                amount: { minorUnits: 10000, currency: usd },
                purpose: "grant",
              },
            ],
            deliveryLeadDays: null,
          },
        ],
        resourceFlows: [
          {
            id: id("flow"),
            stableKey: "flow",
            sequence: 4,
            source: { kind: "organization", organizationId: id("treasury") },
            recipient: {
              kind: "organization",
              organizationId: id("recipient"),
            },
            recordedAt: period.from,
            startsAt: period.from,
            basisKind: "custom:program",
            basisReference: {
              kind: "public-program",
              commitmentId: id("commitment"),
              installmentIndex: 0,
            },
            restrictionKind: null,
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
            provenance,
          },
        ],
        resourceTransferOutcomes: [
          {
            id: id("payment"),
            stableKey: "payment",
            sequence: 5,
            resourceFlowId: id("flow"),
            periodStartsAt: date("2026-03-01"),
            periodEndsAt: date("2026-03-01"),
            occurredAt: date("2026-03-01"),
            status: "blocked",
            attemptedAmount: { minorUnits: 10000, currency: usd },
            transferredAmount: { minorUnits: 0, currency: usd },
            reasonKind: "capacity:insufficient-funds",
            note: null,
            provenance,
          },
        ],
      },
    };
    const law: EnactedLawEffects = {
      version: "enacted-law-effects/v1",
      measureId,
      designation: "H.R. 1",
      shortTitle: "Fixture Act",
      level: "federal",
      enactedOn: date("2026-02-01"),
      effectiveAt: date("2026-02-01"),
      hasTypedOperativeEffect: true,
      operativeEffectOutcomes: [],
      lines: [
        {
          kind: "authorization",
          heading: "Ceiling",
          ceilingMinorUnits: 10000,
          annual: false,
          appropriatedAgainstMinorUnits: 10000,
        },
      ],
    };
    const rows = lawProof(world, period, () => [law]);
    expect(rows[0]!.payments[0]!.status).toBe("blocked");
    expect(rows[0]!.payments[0]!.amount.minorUnits).toBe(0);
    expect(rows[0]!.lines[0]!.kind).toBe("authorization");
    expect(
      lawProof(world, { ...period, openingSequence: 10 }, () => [law]),
    ).toEqual([]);
  });
});
