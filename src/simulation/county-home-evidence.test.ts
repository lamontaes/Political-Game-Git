import {
  createDwelling,
  startDwellingOccupancy,
  recordDwellingOccupancyState,
} from "./resources";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as countyCatalog from "../districts/county-seat-catalog";
import type {
  CountySeatBinding,
  CountySeatIdentity,
} from "../districts/county-seat-types";
import { countyGovernmentUnit } from "./government-units";
import { makeIsoDate } from "./dates";
import { lifePlaceByKey } from "./life-places";
import { createStartingPerson, factsForPerson } from "./people";
import { createWorld, createWorldId } from "./world";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  districtResidenceSince,
  establishDistrictResidence,
} from "./district-residence";
import {
  assertCountyHomeDistrictEvidenceIntegrity,
  countyHomeDistrictEvidenceAt,
  recordCountyHomeDistrictEvidence,
} from "./county-home-evidence";
import type { CountyHomeDistrictEvidenceInput } from "./county-home-evidence";
/** Controlled adopted packet for writer tests; no production county profile. */
function packet(countyGeoid = "21227") {
  const unit = countyGovernmentUnit(countyGeoid)!;
  const source = {
    version: "controlled-source",
    url: "https://example.invalid/controlled",
    documentId: "controlled-document",
    readOn: "2026-10-01",
    effectiveFrom: "2026-09-01",
    effectiveUntil: null,
    status: "adopted",
  } as const;
  const seat: CountySeatIdentity = {
    recordId: `controlled-seat:${countyGeoid}`,
    governmentUnitId: unit.id,
    countyGeoid,
    stateUsps: unit.stateUsps,
    officeKey: `local-government-${unit.publisherId}-governing-body`,
    seatKey: "controlled-a",
    source,
    electorate: { kind: "countywide", countyGeoid },
    domicile: { kind: "county", countyGeoid },
    homeMembership: { source, wholePlaceGeoids: ["2108902"] },
  };
  const binding: CountySeatBinding = {
    vintage: "county-seat-source-v1",
    compilerVersion: "county-seat-binding-v1",
    chamber: "county-governing-body",
    geoid: countyGeoid,
    recordId: seat.recordId,
    stateUsps: unit.stateUsps,
    governmentUnitId: unit.id,
    officeKey: seat.officeKey,
    seatKey: seat.seatKey,
    sourceVersion: source.version,
  };
  return { seat, binding };
}

function fixture() {
  const seed = "controlled-county-residence";
  const place = lifePlaceByKey("2108902")!;
  const currentDate = makeIsoDate("2026-10-01");
  const person = createStartingPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    currentDate,
    initialResidenceDate: makeIsoDate("2025-01-01"),
    homeJurisdictionId: place.context.jurisdiction.id,
    age: 35,
  });
  const world = createWorld({
    seed,
    currentDate,
    jurisdictions: [place.context.jurisdiction],
    people: [person],
  });
  const residence = factsForPerson(person).find(
    (fact) => fact.kind === "residence",
  )!;
  return { world, person, residence };
}

afterEach(() => vi.restoreAllMocks());
function setup() {
  const data = fixture();
  const { seat, binding } = packet();
  vi.spyOn(countyCatalog, "countySeatCatalog").mockReturnValue([
    { ...seat, homeMembership: undefined },
  ]);
  const input: CountyHomeDistrictEvidenceInput = {
    stableKey: "controlled-home",
    personId: data.person.id,
    home: { kind: "residence", residenceFactId: data.residence.id },
    occupiedFrom: data.residence.occurredAt,
    occupiedUntil: null,
    binding,
    districtRecordId: null,
    addressEvidence: {
      address: "Controlled fixture address",
      sourceRecordId: "controlled-address",
      sourceUrl: "https://example.invalid/address",
    },
    determination: { kind: "actual-map", source: seat.source },
  };
  return { ...data, seat, binding, input };
}
describe("saved county home evidence", () => {
  it("records an actual residence reference, preserves same-day cutoff and roundtrip, and leaves registration absent", () => {
    const { world, person, binding, input } = setup();
    const written = recordCountyHomeDistrictEvidence(world, input);
    expect(written.kind).toBe("recorded");
    if (written.kind !== "recorded") throw new Error(written.reason);
    expect(
      countyHomeDistrictEvidenceAt(written.world, person.id, binding, {
        asOfDate: world.currentDate,
        historySequenceExclusive: written.record.sequence,
      }).kind,
    ).toBe("unknown");
    expect(
      countyHomeDistrictEvidenceAt(written.world, person.id, binding).kind,
    ).toBe("known");
    assertCountyHomeDistrictEvidenceIntegrity(written.world);
    const reopened = deserializeWorld(serializeWorld(written.world));
    expect(reopened.history.countyHomeDistrictEvidence).toEqual([
      written.record,
    ]);
    assertCountyHomeDistrictEvidenceIntegrity(reopened);
    expect(factsForPerson(reopened.people[person.id]!)).toEqual(
      factsForPerson(person),
    );
    const joined = establishDistrictResidence(reopened, {
      personId: person.id,
      binding,
      startedOn: world.currentDate,
      provenance: {
        method: "county-home-join",
        sourceEventId: written.record.id,
        note: "Controlled actual map.",
      },
    });
    expect(joined.kind).toBe("recorded");
    if (joined.kind !== "recorded") throw new Error(joined.reason);
    expect(
      districtResidenceSince(
        joined.world,
        person.id,
        binding,
        world.currentDate,
      ),
    ).toBe(world.currentDate);
  });
  it("refuses unsupported dwelling/seat/address evidence without mutation", () => {
    const { world, input } = setup();
    for (const bad of [
      { ...input, addressEvidence: { ...input.addressEvidence, address: "" } },
      { ...input, districtRecordId: "invented-district" },
      { ...input, occupiedFrom: makeIsoDate("2027-01-01") },
      {
        ...input,
        home: {
          kind: "residence" as const,
          residenceFactId: createWorldId("missing"),
        },
      },
      {
        ...input,
        determination: {
          ...input.determination,
          source: {
            ...input.determination.source,
            status: "proposed" as const,
          },
        },
      },
    ]) {
      const result = recordCountyHomeDistrictEvidence(world, bad);
      expect(result.kind).toBe("refused");
      expect(result.world).toBe(world);
    }
  });
  it("retains actual dwelling occupancy intervals without claiming future occupancy", () => {
    const { world, person, input, binding } = setup();
    const provenance = {
      kind: "authored",
      note: "Controlled dwelling fixture.",
    } as const;
    let housed = createDwelling(world, {
      stableKey: "controlled-dwelling",
      establishedAt: "2026-09-01",
      jurisdictionId: person.homeJurisdictionId,
      locationLabel: "Controlled fixture home",
      classification: "residential:ordinary-home",
      provenance,
    });
    const dwelling = housed.history.dwellings.at(-1)!;
    housed = startDwellingOccupancy(housed, {
      stableKey: "controlled-occupancy",
      dwellingId: dwelling.id,
      occupant: { kind: "person", personId: person.id },
      startedAt: "2026-09-01",
      residenceRole: "primary",
      kind: "residence:primary",
      provenance,
    });
    const occupancy = housed.history.dwellingOccupancies.at(-1)!;
    const occupancyState = housed.history.dwellingOccupancyStates.at(-1)!;
    const actual: CountyHomeDistrictEvidenceInput = {
      ...input,
      home: {
        kind: "dwelling-occupancy",
        dwellingId: dwelling.id,
        dwellingOccupancyId: occupancy.id,
      },
      occupiedFrom: makeIsoDate("2026-09-01"),
    };
    const active = recordCountyHomeDistrictEvidence(housed, actual);
    expect(active.kind).toBe("recorded");
    if (active.kind !== "recorded") throw new Error(active.reason);
    expect(
      countyHomeDistrictEvidenceAt(active.world, person.id, binding).kind,
    ).toBe("known");
    assertCountyHomeDistrictEvidenceIntegrity(active.world);
    expect(
      recordCountyHomeDistrictEvidence(housed, {
        ...actual,
        occupiedFrom: makeIsoDate("2026-08-01"),
      }).kind,
    ).toBe("refused");
    expect(
      recordCountyHomeDistrictEvidence(housed, {
        ...actual,
        occupiedUntil: makeIsoDate("2027-01-01"),
      }).kind,
    ).toBe("refused");
    const ended = recordDwellingOccupancyState(housed, {
      stableKey: "controlled-occupancy:end",
      dwellingOccupancyId: occupancy.id,
      effectiveAt: "2026-09-20",
      status: "ended",
      residenceRole: "primary",
      kind: "residence:primary",
      reason: "Controlled fixture departure.",
      provenance,
      supersedesStateId: occupancyState.id,
    });
    const closed = recordCountyHomeDistrictEvidence(ended, {
      ...actual,
      occupiedUntil: makeIsoDate("2026-09-20"),
    });
    expect(closed.kind).toBe("recorded");
    if (closed.kind !== "recorded") throw new Error(closed.reason);
    assertCountyHomeDistrictEvidenceIntegrity(closed.world);
    expect(
      countyHomeDistrictEvidenceAt(closed.world, person.id, binding).kind,
    ).toBe("unknown");
    expect(
      recordCountyHomeDistrictEvidence(ended, {
        ...actual,
        occupiedUntil: makeIsoDate("2026-09-21"),
      }).kind,
    ).toBe("refused");
  });
  it("rejects forged or expired seat bindings in the home reader", () => {
    const { world, person, binding, input, seat } = setup();
    const result = recordCountyHomeDistrictEvidence(world, input);
    if (result.kind !== "recorded") throw new Error(result.reason);
    expect(
      countyHomeDistrictEvidenceAt(result.world, person.id, {
        ...binding,
        stateUsps: "TN",
      }).kind,
    ).toBe("unknown");
    vi.mocked(countyCatalog.countySeatCatalog).mockReturnValue([
      { ...seat, source: { ...seat.source, effectiveUntil: "2026-10-02" } },
    ]);
    expect(
      countyHomeDistrictEvidenceAt(
        { ...result.world, currentDate: makeIsoDate("2026-10-02") },
        person.id,
        binding,
      ).kind,
    ).toBe("unknown");
  });
  it("keeps unknown old saves and contradictory records unresolved", () => {
    const { world, person, binding, input } = setup();
    expect(countyHomeDistrictEvidenceAt(world, person.id, binding).kind).toBe(
      "unknown",
    );
    const first = recordCountyHomeDistrictEvidence(world, input);
    if (first.kind !== "recorded") throw new Error(first.reason);
    const second = recordCountyHomeDistrictEvidence(first.world, {
      ...input,
      stableKey: "second-home",
      addressEvidence: {
        ...input.addressEvidence,
        address: "Other controlled address",
      },
    });
    if (second.kind !== "recorded") throw new Error(second.reason);
    expect(
      countyHomeDistrictEvidenceAt(second.world, person.id, binding).kind,
    ).toBe("ambiguous");
    expect(
      establishDistrictResidence(second.world, {
        personId: person.id,
        binding,
        startedOn: world.currentDate,
        provenance: {
          method: "county-home-join",
          sourceEventId: first.record.id,
          note: "controlled",
        },
      }).kind,
    ).toBe("refused");
    expect(recordCountyHomeDistrictEvidence(first.world, input).kind).toBe(
      "refused",
    );
  });
  it("stops using expired map evidence and rejects future/out-of-range cutoffs", () => {
    const { world, person, binding, input } = setup();
    const result = recordCountyHomeDistrictEvidence(world, {
      ...input,
      determination: {
        ...input.determination,
        source: { ...input.determination.source, effectiveUntil: "2026-10-02" },
      },
    });
    if (result.kind !== "recorded") throw new Error(result.reason);
    expect(
      countyHomeDistrictEvidenceAt(
        { ...result.world, currentDate: makeIsoDate("2026-10-02") },
        person.id,
        binding,
      ).kind,
    ).toBe("unknown");
    expect(() =>
      countyHomeDistrictEvidenceAt(result.world, person.id, binding, {
        asOfDate: makeIsoDate("2027-01-01"),
        historySequenceExclusive: 0,
      }),
    ).toThrow();
    expect(() =>
      countyHomeDistrictEvidenceAt(result.world, person.id, binding, {
        asOfDate: world.currentDate,
        historySequenceExclusive: result.world.history.nextSequence + 1,
      }),
    ).toThrow();
  });
  it("labels estimated joins and requires one method for the saved geographic cohort", () => {
    const { world, person, binding, input, seat } = setup();
    const estimated: CountyHomeDistrictEvidenceInput = {
      ...input,
      determination: {
        kind: "estimated-map-unavailable",
        source: seat.source,
        method: "controlled cohort method",
        cohortJurisdictionId: person.homeJurisdictionId,
      },
    };
    const first = recordCountyHomeDistrictEvidence(world, estimated);
    if (first.kind !== "recorded") throw new Error(first.reason);
    const conflict = recordCountyHomeDistrictEvidence(first.world, {
      ...estimated,
      stableKey: "different-method",
      determination: {
        ...estimated.determination,
        kind: "estimated-map-unavailable",
        source: seat.source,
        method: "individual override",
        cohortJurisdictionId: person.homeJurisdictionId,
      },
    });
    expect(conflict.kind).toBe("refused");
    const join = {
      personId: person.id,
      binding,
      startedOn: world.currentDate,
      provenance: {
        method: "county-home-join" as const,
        sourceEventId: first.record.id,
        note: "unlabeled",
      },
    };
    expect(establishDistrictResidence(first.world, join).kind).toBe("refused");
    expect(
      establishDistrictResidence(first.world, {
        ...join,
        provenance: {
          ...join.provenance,
          note: "ESTIMATED: controlled cohort method",
        },
      }).kind,
    ).toBe("recorded");
  });
});
