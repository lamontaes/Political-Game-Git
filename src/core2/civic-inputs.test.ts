import { beforeAll, describe, expect, it } from "vitest";
import directoryJson from "../../data/research/places/local-institutions.json" with { type: "json" };
import {
  lifePlaceByJurisdictionId,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import { SeededRng } from "../simulation/rng";
import type { EntityId } from "../simulation/types";
import {
  DEFAULT_CIVIC_INPUTS_DATA,
  enrichCivicInputs,
  type CivicDirectory,
} from "./civic-inputs";
import { parameter as p } from "./parameters";
import { realLocalities } from "./places";
import { buildPopulation } from "./population";
import { coreAPI, createCore } from "./state";
import type { CoreInput, PublicOrganization } from "./types";

const seed = "p8-recorded-civic-targets";
const startedAt = "2021-01-01";
const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
const candidates = realLocalities().filter(
  (row) =>
    row.scope === "locality" &&
    row.stateJurisdictionKey === state.jurisdictionKey &&
    row.sourceGeoid,
);
const indexedCandidates = candidates.filter((row) => {
  const entries = directoryJson.places[row.sourceGeoid!];
  return (
    entries &&
    (entries.highSchools.length ||
      entries.districts.length ||
      entries.colleges.length)
  );
});
const place = new SeededRng(`${seed}:recorded-place`).pick(
  indexedCandidates.length ? indexedCandidates : candidates,
);
let opening: CoreInput;

beforeAll(() => {
  opening = buildPopulation({
    seed,
    startedAt,
    placeKey: place.key,
    minimumPeople: p("populationTestMinimum"),
  });
});

function emptyDirectory(): CivicDirectory {
  return { asOf: startedAt, places: {}, counties: {} };
}

describe(`civic inputs, ${place.displayName}, ${state.name}, seed ${seed}`, () => {
  it("uses actual place-addressed directory names and retains the later source vintage", () => {
    const after = enrichCivicInputs(opening);
    const targets = after.publicOrganizations!.filter(
      (row) => row.facts?.sourceKey,
    );
    if (indexedCandidates.length)
      expect(targets.length).toBeGreaterThan(p("zero"));
    for (const target of targets) {
      const targetPlace = lifePlaceByJurisdictionId(
        target.placeId as EntityId,
      )!;
      const local = directoryJson.places[targetPlace.sourceGeoid!];
      const county = directoryJson.counties[targetPlace.sourceGeoid!];
      const rows =
        targetPlace.scope === "county"
          ? [...(county?.colleges ?? []), ...(county?.largeEmployers ?? [])]
          : [
              ...(local?.highSchools ?? []),
              ...(local?.districts ?? []),
              ...(local?.colleges ?? []),
            ];
      const sourceRow = rows.find(
        (row) =>
          row.sourceId === target.facts!.sourceId &&
          row.sourceKey === target.facts!.sourceKey,
      )!;
      expect(sourceRow).toBeDefined();
      expect(target.name).toBe(sourceRow.name);
      expect(target.source.asOf).toBe(sourceRow.asOf);
      expect(target.source.tag).toBe("ESTIMATED");
      if (startedAt < sourceRow.asOf)
        expect(target.source.estimatedFrom).toMatch(
          /historical name and existence are not verified/,
        );
      expect(target.facts!.placeName).toBe(targetPlace.displayName);
      expect(target.facts!.identityStatus).toBe(
        startedAt < sourceRow.asOf
          ? "opening-identity-proxy"
          : "directory-identity",
      );
      expect(target.facts!.stopgapId).toBe("SG-P8-civic-inputs");
      expect("liquidMinor" in target).toBe(false);
      if (target.affordances?.includes("public-meeting-place")) {
        expect(target.facts!.meetingAccess).toBe("permission-not-established");
        expect(target.facts!.meetingSchedule).toBe("not-established");
      }
    }
  });

  it("preserves the generated people, kinship, jobs, employers and money exactly", () => {
    const after = enrichCivicInputs(opening);
    expect(after.people).toBe(opening.people);
    expect(after.households).toBe(opening.households);
    expect(after.familyLinks).toBe(opening.familyLinks);
    expect(after.jobs).toBe(opening.jobs);
    expect(after.organizations).toBe(opening.organizations);
    expect(after.placeMetadata).toBe(opening.placeMetadata);
    const jobs = new Map(opening.jobs.map((row) => [row.id, row]));
    const employers = new Map(
      opening.organizations.map((row) => [row.id, row]),
    );
    const publicEmployers = new Map(
      after.publicOrganizations!.map((row) => [row.id, row]),
    );
    for (const job of opening.jobs) {
      if (
        job.occupationClassification !== "profession:municipal-clerk" &&
        job.occupationClassification !== "profession:county-clerk"
      )
        continue;
      const employer = employers.get(job.organizationId)!;
      if (
        !employer.governmentFacts?.governmentKind ||
        !employer.governmentFacts.governmentJurisdictionId
      )
        continue;
      expect(
        publicEmployers
          .get(job.organizationId)
          ?.staff?.find((row) => row.jobId === job.id),
      ).toMatchObject({
        personId: job.personId,
        title: job.title,
        source: job.source,
      });
    }
    for (const target of after.publicOrganizations!) {
      const employer = employers.get(target.id);
      if (employer) {
        expect(target.name).toBe(employer.name);
        expect(target.placeId).toBe(employer.placeId);
        expect(target.facts!.classification).toBe(employer.classification);
        for (const [key, value] of Object.entries(
          employer.governmentFacts ?? {},
        ))
          expect(target.facts![key]).toBe(value);
      }
      for (const staff of target.staff ?? []) {
        const job = jobs.get(staff.jobId)!;
        expect(job.organizationId).toBe(target.id);
        expect(staff.personId).toBe(job.personId);
        expect(staff.title).toBe(job.title);
        expect(staff.source).toBe(job.source);
        expect(
          opening.people.some((person) => person.id === staff.personId),
        ).toBe(true);
      }
    }
    expect(enrichCivicInputs(opening)).toEqual(after);
    expect(enrichCivicInputs(after)).toEqual(after);
  });

  it("reveals public target facts only through requested lookup, without creating acquaintance or outcomes", () => {
    const after = enrichCivicInputs(opening);
    expect(after.publicOrganizations!.length).toBeGreaterThan(p("zero"));
    const target = after.publicOrganizations![p("zero")]!;
    const viewer = after.people.find(
      (person) =>
        !after.jobs.some(
          (job) =>
            job.personId === person.id && job.organizationId === target.id,
        ),
    )!;
    const core = createCore(after);
    const api = coreAPI(core);
    const key = `organization:${target.id}:public`;
    const relationships = [...core.relationships];
    const knownIds = [...core.people.get(viewer.id)!.knownIds];
    const funds = [...core.people.values()].map((person) => [
      person.id,
      person.liquidMinor,
    ]);
    expect(api.knows(viewer.id, key)).toBeUndefined();
    api.lookupPublicOrganization(viewer.id, target.id);
    expect(api.knows(viewer.id, key)).toMatchObject({
      value: target.name,
      sourceId: target.id,
      access: "public",
      learnedAt: startedAt,
    });
    for (const [field, value] of Object.entries(target.facts ?? {}))
      expect(
        api.knows(viewer.id, `organization:${target.id}:${field}`)!.value,
      ).toBe(value);
    expect([...core.people.get(viewer.id)!.knownIds]).toEqual(knownIds);
    expect([...core.relationships]).toEqual(relationships);
    expect(core.memberships.size).toBe(p("zero"));
    expect(core.pendingCallbacks.size).toBe(p("zero"));
    expect(core.durableLog.size).toBe(p("zero"));
    expect(core.date).toBe(startedAt);
    expect(
      [...core.people.values()].map((person) => [
        person.id,
        person.liquidMinor,
      ]),
    ).toEqual(funds);
  });

  it("reports missing real targets and preserves supplied public records instead of making substitutes", () => {
    const withoutTargets = { ...opening, jobs: [], organizations: [] };
    const empty = enrichCivicInputs(withoutTargets, {
      directory: emptyDirectory(),
    });
    expect(empty.publicOrganizations).toEqual([]);
    for (const requirement of DEFAULT_CIVIC_INPUTS_DATA.requiredAffordances)
      expect(empty.gaps.some((gap) => gap.includes(requirement.gap))).toBe(
        true,
      );
    expect(empty.people).toBe(withoutTargets.people);
    expect(enrichCivicInputs(empty, { directory: emptyDirectory() })).toEqual(
      empty,
    );
    const established =
      enrichCivicInputs(opening).publicOrganizations![p("zero")]!;
    const withPublic = enrichCivicInputs(
      { ...withoutTargets, publicOrganizations: [established] },
      { directory: emptyDirectory() },
    );
    expect(withPublic.publicOrganizations![p("zero")]).toBe(established);
  });

  it("does not turn an office title or an incomplete employer identity into a government office", () => {
    const job = opening.jobs[p("zero")]!;
    const employer = opening.organizations.find(
      (row) => row.id === job.organizationId,
    )!;
    const ordinary = {
      ...employer,
      classification: "enterprise:ordinary-business",
      governmentFacts: undefined,
    };
    const clerk = {
      ...job,
      title: "County clerk",
      occupationClassification: "profession:county-clerk",
    };
    const titleOnly = enrichCivicInputs(
      { ...opening, organizations: [ordinary], jobs: [clerk] },
      { directory: emptyDirectory() },
    );
    expect(titleOnly.publicOrganizations).toEqual([]);
    const missingIdentity = enrichCivicInputs(
      {
        ...opening,
        organizations: [
          { ...ordinary, classification: "sector:local-government-office" },
        ],
        jobs: [clerk],
      },
      { directory: emptyDirectory() },
    );
    expect(missingIdentity.publicOrganizations).toEqual([]);
    expect(
      missingIdentity.gaps.some((gap) =>
        gap.includes("lacks recorded government facts"),
      ),
    ).toBe(true);
  });

  it("supports another association and contact occupation through data alone", () => {
    const job = opening.jobs[p("zero")]!;
    const employer = opening.organizations.find(
      (row) => row.id === job.organizationId,
    )!;
    const classification = "custom:recorded-neighborhood-circle";
    const kind = "custom:neighborhood-association";
    const occupation = "custom:association-contact";
    const after = enrichCivicInputs(
      {
        ...opening,
        organizations: [{ ...employer, classification }],
        jobs: [{ ...job, occupationClassification: occupation }],
      },
      {
        directory: emptyDirectory(),
        data: {
          ...DEFAULT_CIVIC_INPUTS_DATA,
          organizationRules: [
            ...DEFAULT_CIVIC_INPUTS_DATA.organizationRules,
            {
              id: "fixture-neighborhood",
              classifications: [classification],
              classificationPrefixes: [],
              kind,
              affordances: ["known-group"],
              requiredGovernmentFacts: [],
              facts: { membershipAdmission: "not-established" },
            },
          ],
          staffRules: [
            ...DEFAULT_CIVIC_INPUTS_DATA.staffRules,
            {
              id: "fixture-contact",
              targetKinds: [kind],
              occupations: [occupation],
              titles: [],
              source:
                "Authored open-registry admission fixture; existing actor/job retained.",
            },
          ],
        },
      },
    );
    const target = after.publicOrganizations!.find(
      (row) => row.id === employer.id,
    )!;
    expect(target.name).toBe(employer.name);
    expect(target.kind).toBe(kind);
    expect(target.staff).toMatchObject([
      { personId: job.personId, jobId: job.id },
    ]);
    expect(target.facts!.membershipAdmission).toBe("not-established");
    expect(after.people).toBe(opening.people);
  });

  it("reads only addressed directory records and refuses duplicate or malformed public identities", () => {
    const directory: CivicDirectory = {
      asOf: directoryJson.asOf,
      places: new Proxy(directoryJson.places, {
        ownKeys() {
          throw new Error("Entire place directory was scanned.");
        },
      }),
      counties: new Proxy(directoryJson.counties, {
        ownKeys() {
          throw new Error("Entire county directory was scanned.");
        },
      }),
    };
    expect(enrichCivicInputs(opening, { directory })).toEqual(
      enrichCivicInputs(opening),
    );
    const target: PublicOrganization =
      enrichCivicInputs(opening).publicOrganizations![p("zero")]!;
    expect(() =>
      enrichCivicInputs({ ...opening, publicOrganizations: [target, target] }),
    ).toThrow(/Duplicate supplied public organization/);
    const employer = opening.organizations[p("zero")]!;
    const conflicting: PublicOrganization = {
      id: employer.id,
      placeId: employer.placeId,
      name: `${employer.name} conflicting identity`,
      kind: "office",
      source: employer.source,
    };
    expect(() =>
      enrichCivicInputs({ ...opening, publicOrganizations: [conflicting] }),
    ).toThrow(/Public identity contradicts/);
    expect(() =>
      enrichCivicInputs(opening, {
        directory: {
          asOf: startedAt,
          places: {
            [place.sourceGeoid!]: {
              highSchools: [{ name: "Missing source identity" }],
            },
          },
          counties: {},
        },
      }),
    ).toThrow(/Malformed civic directory identity/);
  });
});
