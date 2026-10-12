/** Controlled source-only admission fixtures. Runtime attendance/pay is root-owned. */
import { describe, expect, it } from "vitest";
import type { EntityId } from "../simulation/types";
import {
  prepareOpeningPublicPayAuthorities,
  type OpeningPublicEmployerIdentity,
} from "./opening-public-pay";
import { parameter as p } from "./parameters";
import type { CoreInput, Source } from "./types";

const at = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: at,
  citation:
    "Controlled actual-employer/identity admission fixture; not observed historical authority or appropriation.",
  estimatedFrom:
    "Fixed source fixture terms. Actual attendance, dated wage due and payment are separate root-owned writers.",
};

function fixture() {
  const governmentKey = "actual-recorded-government",
    jurisdictionId = "actual-recorded-jurisdiction" as EntityId;
  const identity = {
    kind: "local-government" as const,
    governmentKey,
    jurisdictionId,
  };
  const ownerId = "actual-county-account",
    employerId = "actual-school-account";
  const organizations = [ownerId, employerId].map((id) => ({
    id,
    placeId: jurisdictionId,
    name: "Same public institution display name",
    kind: "employer",
    liquidMinor: p("zero"),
    source,
    governmentFacts: {
      governmentKind: identity.kind,
      governmentKey,
      governmentJurisdictionId: jurisdictionId,
    },
  }));
  const person = {
    id: "actual-worker",
    givenName: "Morgan",
    familyName: "Bennett",
    birthDate: "1980-01-01",
    placeId: jurisdictionId,
    householdId: "actual-household",
    tier: "weekly",
    traits: {},
    liquidMinor: p("one"),
    livingCostDailyMinor: p("one"),
    familyIds: [],
    knownIds: [],
    jobId: "actual-job",
    source,
  };
  const job = {
    id: person.jobId,
    personId: person.id,
    organizationId: employerId,
    title: "Actual owned public job",
    wageDailyMinor: p("one"),
    hoursDaily: p("one"),
    source,
  };
  const commitment = {
    id: "actual-work-commitment",
    personId: person.id,
    jobId: job.id,
    organizationId: employerId,
    startsAt: at,
    anchorDate: at,
    periodDays: p("daysPerWeek"),
    slots: [
      {
        offsetDays: p("one"),
        startMinute: p("zero"),
        minutes: p("minutesPerHour"),
      },
    ],
    expectedWeeklyMinutes: p("minutesPerHour"),
    hourlyMinor: p("minorPerDollar"),
    scheduleSource: source,
    paySource: source,
  };
  const input: CoreInput = {
    seed: "source-only-public-owner-fixture",
    startedAt: at,
    people: [person],
    jobs: [job],
    organizations,
    households: [
      {
        id: person.householdId,
        placeId: person.placeId,
        memberIds: [person.id],
        source,
      },
    ],
    workCommitments: [commitment],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const identities: OpeningPublicEmployerIdentity[] = organizations.map(
    (row) => ({
      organizationId: row.id,
      identity,
      basisRecordIds: [`actual-profile:${row.id}`],
      source,
    }),
  );
  return {
    input,
    identities,
    governmentKey,
    ownerId,
    employerId,
    person,
    job,
    commitment,
  };
}

describe("opening public pay modeled owner admission", () => {
  it("links only existing actual commitments to one actual zero-stock government owner", () => {
    const {
      input,
      identities,
      governmentKey,
      ownerId,
      employerId,
      commitment,
    } = fixture();
    const before = structuredClone(input);
    const result = prepareOpeningPublicPayAuthorities(input, identities, {
      ownerIdByGovernmentKey: { [governmentKey]: ownerId },
    });
    expect(result.outsideOwnerIds).toEqual([ownerId]);
    expect(result.organizations.map((row) => row.liquidMinor)).toEqual(
      input.organizations.map((row) => row.liquidMinor),
    );
    expect(result.organizations.filter((row) => row.outsideFlow)).toHaveLength(
      p("one"),
    );
    const authority = result.organizations.find(
      (row) => row.id === employerId,
    )!.publicPayAuthority!;
    expect(authority.ownerId).toBe(ownerId);
    expect(authority.workCommitmentIds).toEqual([commitment.id]);
    expect(authority.basisRecordIds).toEqual([`actual-profile:${employerId}`]);
    expect(authority.source.tag).toBe("ESTIMATED");
    expect(authority).not.toHaveProperty("amountMinor");
    expect(authority).not.toHaveProperty("payrollProjectionMinor");
    expect(result.workCommitments[p("zero")]!.publicPayAuthorityId).toBe(
      authority.id,
    );
    expect(result.workCommitments[p("zero")]).toEqual({
      ...commitment,
      publicPayAuthorityId: authority.id,
    });
    expect(input).toEqual(before);
    expect(Object.isFrozen(authority)).toBe(true);
    expect(Object.isFrozen(authority.workCommitmentIds)).toBe(true);
    expect(Object.isFrozen(authority.basisRecordIds)).toBe(true);
    expect(Object.isFrozen(authority.source)).toBe(true);
  });

  it("is idempotent under the same actual identity records without adding a second owner or stock", () => {
    const { input, identities, governmentKey, ownerId } = fixture();
    const options = { ownerIdByGovernmentKey: { [governmentKey]: ownerId } };
    const first = prepareOpeningPublicPayAuthorities(
      input,
      identities,
      options,
    );
    const second = prepareOpeningPublicPayAuthorities(
      {
        ...input,
        organizations: first.organizations,
        workCommitments: first.workCommitments,
      },
      identities,
      options,
    );
    expect(second).toEqual(first);
    expect(second.outsideOwnerIds).toEqual([ownerId]);
    expect(second.organizations).toHaveLength(input.organizations.length);
    expect(
      second.organizations.every((row) => row.liquidMinor === p("zero")),
    ).toBe(true);
  });

  it("does not infer employer identity from equal institution display names", () => {
    const { input, identities, employerId } = fixture();
    expect(() =>
      prepareOpeningPublicPayAuthorities(
        input,
        identities.map((row) =>
          row.organizationId === employerId
            ? {
                ...row,
                identity: {
                  ...row.identity,
                  kind: "local-government",
                  governmentKey: "a-different-recorded-government",
                },
              }
            : row,
        ),
      ),
    ).toThrow("Public pay identity does not match actual employer");
    const unlinked = prepareOpeningPublicPayAuthorities(
      input,
      identities.filter((row) => row.organizationId !== employerId),
    );
    expect(
      unlinked.organizations.find((row) => row.id === employerId)!
        .publicPayAuthority,
    ).toBeUndefined();
    expect(
      unlinked.workCommitments[p("zero")]!.publicPayAuthorityId,
    ).toBeUndefined();
    expect(unlinked.gaps).toContain(
      `opening-public-pay:actual-employer-owner-link-unresolved:${employerId}`,
    );
  });

  it("rejects nonzero public stock without spending, repairing or manufacturing deficit funding", () => {
    const { input, identities, governmentKey, ownerId } = fixture();
    const nonzero: CoreInput = {
      ...input,
      organizations: input.organizations.map((row) =>
        row.id === ownerId ? { ...row, liquidMinor: p("one") } : row,
      ),
    };
    const before = structuredClone(nonzero);
    expect(() =>
      prepareOpeningPublicPayAuthorities(nonzero, identities, {
        ownerIdByGovernmentKey: { [governmentKey]: ownerId },
      }),
    ).toThrow("Public outside owner must already have zero stock");
    expect(nonzero).toEqual(before);
  });

  it("rejects an unowned work/job/person relation and an unmatched canonical owner designation", () => {
    const { input, identities, governmentKey, commitment } = fixture();
    expect(() =>
      prepareOpeningPublicPayAuthorities(
        {
          ...input,
          workCommitments: [{ ...commitment, personId: "another-person" }],
        },
        identities,
      ),
    ).toThrow("Public pay commitment lacks actual employer/job/person");
    expect(() =>
      prepareOpeningPublicPayAuthorities(input, identities, {
        ownerIdByGovernmentKey: { [governmentKey]: "name-only-invented-owner" },
      }),
    ).toThrow("Public pay owner designation does not match actual government");
  });
});
