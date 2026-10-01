import { afterEach, describe, expect, it, vi } from "vitest";
import * as countyCatalog from "../districts/county-seat-catalog";
import type {
  CountySeatBinding,
  CountySeatIdentity,
} from "../districts/county-seat-types";
import { bindingFromIdentity } from "../districts/query";
import { districtIdentityCatalog } from "../districts/catalog";
import { candidacyEligibility, districtSeatMustBeNamed } from "./candidacy";
import { countyGovernmentUnit } from "./government-units";
import { makeIsoDate } from "./dates";
import { lifePlaceByKey } from "./life-places";
import { createStartingPerson, factsForPerson } from "./people";
import { createWorld, createWorldId } from "./world";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  districtResidenceSince,
  establishDistrictResidence,
  selectDesiredDistrict,
} from "./district-residence";

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

describe("county residence uses the existing saved writer", () => {
  it("records a dated join without backdating it and preserves Gazetteer history after reload", () => {
    const { seat, binding } = packet();
    vi.spyOn(countyCatalog, "countySeatCatalog").mockReturnValue([seat]);
    const { world, person, residence } = fixture();
    const gazetteer = bindingFromIdentity(
      districtIdentityCatalog().find(
        (row) => row.recordId === "state-lower:21001",
      )!,
    );
    const prior = establishDistrictResidence(world, {
      personId: person.id,
      binding: gazetteer,
      startedOn: world.currentDate,
      provenance: {
        method: "authored",
        sourceEventId: null,
        note: "Controlled regression interval.",
      },
    });
    expect(prior.kind).toBe("recorded");
    if (prior.kind !== "recorded") throw new Error(prior.reason);
    const joined = establishDistrictResidence(prior.world, {
      personId: person.id,
      binding,
      startedOn: world.currentDate,
      provenance: {
        method: "county-home-join",
        sourceEventId: residence.id,
        note: "Controlled dated source join.",
      },
    });
    expect(joined.kind).toBe("recorded");
    if (joined.kind !== "recorded") throw new Error(joined.reason);
    expect(
      joined.world.history.districtResidenceIntervals?.find(
        (row) => row.id === prior.interval.id,
      )?.endedOn,
    ).toBeNull();
    expect(joined.interval.startedOn).toBe("2026-10-01");
    const reloaded = deserializeWorld(serializeWorld(joined.world));
    expect(
      districtResidenceSince(reloaded, person.id, binding, world.currentDate),
    ).toBe("2026-10-01");
    expect(reloaded.history.districtResidenceIntervals).toEqual(
      joined.world.history.districtResidenceIntervals,
    );
    expect(reloaded.currentDate).toBe(world.currentDate);
  });

  it("refuses guessed provenance and a whole-place join in another county without writes", () => {
    const here = packet();
    const elsewhere = packet("21009");
    vi.spyOn(countyCatalog, "countySeatCatalog").mockReturnValue([
      here.seat,
      elsewhere.seat,
    ]);
    const { world, person, residence } = fixture();
    const before = serializeWorld(world);
    for (const input of [
      {
        binding: here.binding,
        provenance: {
          method: "authored" as const,
          sourceEventId: null,
          note: "A seat choice.",
        },
      },
      {
        binding: elsewhere.binding,
        provenance: {
          method: "county-home-join" as const,
          sourceEventId: residence.id,
          note: "Contradicts the canonical county join.",
        },
      },
    ]) {
      const result = establishDistrictResidence(world, {
        personId: person.id,
        startedOn: world.currentDate,
        ...input,
      });
      expect(result.kind).toBe("refused");
      expect(serializeWorld(result.world)).toBe(before);
    }
  });

  it("keeps intents for different county governments separate and does not invent old-save membership", () => {
    const here = packet();
    const elsewhere = packet("21009");
    vi.spyOn(countyCatalog, "countySeatCatalog").mockReturnValue([
      here.seat,
      elsewhere.seat,
    ]);
    const { world, person } = fixture();
    const first = selectDesiredDistrict(world, person.id, here.binding);
    expect(first.kind).toBe("recorded");
    const second = selectDesiredDistrict(
      first.world,
      person.id,
      elsewhere.binding,
    );
    expect(second.kind).toBe("recorded");
    expect(second.world.history.districtSeatIntents).toHaveLength(2);
    expect(
      districtResidenceSince(
        deserializeWorld(serializeWorld(second.world)),
        person.id,
        here.binding,
        world.currentDate,
      ),
    ).toBeNull();
    expect(second.world.currentDate).toBe(world.currentDate);
  });
  it("requires a named county seat and refuses missing voter evidence without changing saved facts", () => {
    const { seat, binding } = packet();
    vi.spyOn(countyCatalog, "countySeatCatalog").mockReturnValue([seat]);
    const { world, person } = fixture();
    const before = serializeWorld(world);
    const input = {
      personId: person.id,
      jurisdictionId: person.homeJurisdictionId,
      officeKey: seat.officeKey,
      alreadyACandidate: false,
    };
    expect(districtSeatMustBeNamed(input.jurisdictionId, input.officeKey)).toBe(
      true,
    );
    const unnamed = candidacyEligibility(world, input);
    expect(unnamed.eligible).toBe(false);
    expect(unnamed.blocks.map((block) => block.kind)).toContain(
      "county-seat-unrecorded",
    );
    const named = candidacyEligibility(world, {
      ...input,
      districtBinding: binding,
    });
    expect(named.eligible).toBe(false);
    expect(named.blocks.map((block) => block.kind)).toContain(
      "county-voter-unrecorded",
    );
    expect(named.blocks.map((block) => block.kind)).not.toContain(
      "county-seat-unrecorded",
    );
    expect(serializeWorld(world)).toBe(before);
  });
});
