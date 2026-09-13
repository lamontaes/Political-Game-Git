import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../districts/catalog";
import {
  DISTRICT_HOME_JOIN_UNKNOWN,
  bindingFromIdentity,
  districtIdentityByRecordId,
  districtMembershipFromCanonicalHome,
} from "../districts/query";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import {
  currentDesiredDistrict,
  offeredDistricts,
  recordDesiredDistrict,
} from "./district-selection";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  bindOfficeToDistrict,
  candidacyEligibility,
  candidacyPackForJurisdiction,
  deserializeWorld,
  districtResidenceIntervals,
  districtResidenceSince,
  establishDistrictResidence,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";

function alaskaLife(seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "alaska",
    questionnaire: "skipped",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

function akHouse() {
  const identity = districtIdentityByRecordId(
    districtIdentityCatalog(),
    "state-lower:02001",
  );
  if (!identity) throw new Error("Missing Alaska House District 1 identity.");
  return bindingFromIdentity(identity);
}

function akHouseTwo() {
  const identity = districtIdentityByRecordId(
    districtIdentityCatalog(),
    "state-lower:02002",
  );
  if (!identity) throw new Error("Missing Alaska House District 2 identity.");
  return bindingFromIdentity(identity);
}

function kyHouse() {
  const identity = districtIdentityByRecordId(
    districtIdentityCatalog(),
    "state-lower:21001",
  );
  if (!identity) throw new Error("Missing Kentucky House District 1 identity.");
  return bindingFromIdentity(identity);
}

function establish(world: World, personId: EntityId, binding = akHouse()) {
  const result = establishDistrictResidence(world, {
    personId,
    binding,
    startedOn: world.currentDate,
    provenance: {
      method: "authored",
      sourceEventId: null,
      note: "Explicit World establishment. Not inferred from birthplace, state residence, or a picker.",
    },
  });
  if (result.kind === "refused") throw new Error(result.reason);
  return result.world;
}

function akHouseThirtySeven() {
  const identity = districtIdentityByRecordId(
    districtIdentityCatalog(),
    "state-lower:02037",
  );
  if (!identity) throw new Error("Missing Alaska House District 37 identity.");
  return bindingFromIdentity(identity);
}

function adakLife(seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "0200065",
    questionnaire: "skipped",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

describe("DISTRICTS13 residence, filing, and fiscal consumer", () => {
  it("lists published identities for Alaska and Kentucky without interior points", () => {
    const alaska = alaskaLife("districts13-catalog-ak");
    const rows = offeredDistricts(
      alaska.world,
      alaska.world.people[alaska.personId]!.homeJurisdictionId,
      "us-ak-legislature-v1:house",
    );
    expect(rows.length).toBe(40);
    expect(rows.every((row) => row.stateUsps === "AK")).toBe(true);
    expect(rows.every((row) => row.chamber === "state-lower")).toBe(true);
    expect(rows.some((row) => row.isUnassignedResidual)).toBe(false);
    const ky = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "districts13-catalog-ky",
      startAge: 34,
      placeKey: "lexington-fayette",
      questionnaire: "skipped",
    });
    const kyRows = offeredDistricts(
      ky.world,
      ky.world.people[ky.playerPersonId]!.homeJurisdictionId,
      "us-ky-general-assembly-v1:house",
    );
    expect(kyRows.length).toBeGreaterThan(1);
    expect(kyRows.every((row) => row.stateUsps === "KY")).toBe(true);
  });

  it("refuses the wrong state or chamber and does not treat missing binding as state residence", () => {
    const { world, personId } = alaskaLife("districts13-refuse");
    const option = candidacyPackForJurisdiction(
      world.people[personId]!.homeJurisdictionId,
    )?.offices[0];
    if (!option) throw new Error("Missing Alaska house office.");
    expect(bindOfficeToDistrict(option, kyHouse(), "AK").kind).toBe("refused");
    const senate = bindingFromIdentity(
      districtIdentityByRecordId(
        districtIdentityCatalog(),
        "state-upper:0200A",
      )!,
    );
    expect(bindOfficeToDistrict(option, senate, "AK").kind).toBe("refused");
    expect(
      districtResidenceSince(world, personId, akHouse(), world.currentDate),
    ).toBeNull();
    expect(
      districtMembershipFromCanonicalHome({
        homeJurisdictionId: world.people[personId]!.homeJurisdictionId,
        catalog: districtIdentityCatalog(),
      }),
    ).toEqual({
      kind: "unknown",
      reason: DISTRICT_HOME_JOIN_UNKNOWN,
    });
  });

  it("keeps old-save district history UNKNOWN and does not resample", () => {
    const { world, personId } = alaskaLife("districts13-old-save");
    expect(world.history.districtResidenceIntervals).toBeUndefined();
    const snapshot = serializeWorld(world);
    expect(snapshot.includes("districtResidenceIntervals")).toBe(false);
    const loaded = deserializeWorld(snapshot);
    expect(
      districtResidenceSince(loaded, personId, akHouse(), loaded.currentDate),
    ).toBeNull();
    let next = establish(world, personId);
    const startedOn = next.currentDate;
    next = passOrdinaryDays(next, 2);
    expect(districtResidenceIntervals(next)[0]?.startedOn).toBe(startedOn);
    expect(
      districtResidenceIntervals(deserializeWorld(serializeWorld(next))),
    ).toEqual(districtResidenceIntervals(next));
  });

  it("resets elapsed residence after a move across districts", () => {
    const life = alaskaLife("districts13-move");
    let world = establish(life.world, life.personId, akHouse());
    const firstStart = world.currentDate;
    world = passOrdinaryDays(world, 8);
    world = establish(world, life.personId, akHouseTwo());
    expect(
      districtResidenceSince(
        world,
        life.personId,
        akHouse(),
        world.currentDate,
      ),
    ).toBeNull();
    world = passOrdinaryDays(world, 4);
    world = establish(world, life.personId, akHouse());
    expect(
      districtResidenceSince(
        world,
        life.personId,
        akHouse(),
        world.currentDate,
      ),
    ).not.toBe(firstStart);
  });

  it("lets qualification read a World-established interval, not a picker", () => {
    const life = alaskaLife("districts13-file");
    let world = establish(life.world, life.personId, akHouse());
    world = passOrdinaryDays(world, 1200);
    expect(() => fileForOffice(world, life.personId)).toThrow(
      /district-residence/,
    );
    world = fileForOffice(world, life.personId, akHouse());
    const contest = world.history.electionContests?.at(-1);
    expect(contest?.office.districtBinding?.recordId).toBe("state-lower:02001");
    expect(contest?.office.seatKey).toBeNull();
  }, 180_000);

  it("does not treat selecting an unsupported same-state district as later geographic proof", () => {
    const { world, personId } = alaskaLife("districts13-picker");
    const chosen = recordDesiredDistrict(world, personId, akHouseTwo());
    expect(districtResidenceIntervals(chosen)).toEqual([]);
    expect(currentDesiredDistrict(chosen, personId)?.recordId).toBe(
      "state-lower:02002",
    );
    expect(
      districtResidenceSince(
        chosen,
        personId,
        akHouseTwo(),
        chosen.currentDate,
      ),
    ).toBeNull();
    const later = passOrdinaryDays(chosen, 270);
    expect(later.currentDate >= "2026-09-06").toBe(true);
    expect(districtResidenceIntervals(later)).toEqual([]);
    const option = candidacyPackForJurisdiction(
      later.people[personId]!.homeJurisdictionId,
    )?.offices[0];
    if (!option) throw new Error("Missing Alaska house office.");
    const eligibility = candidacyEligibility(later, {
      personId,
      jurisdictionId: later.people[personId]!.homeJurisdictionId,
      officeKey: option.officeKey,
      alreadyACandidate: false,
      districtBinding: akHouseTwo(),
    });
    expect(
      eligibility.blocks.some(
        (block) =>
          block.kind === "unproved-district-residence" &&
          /no proved start date for that residence interval/.test(block.reason),
      ),
    ).toBe(true);
    expect(() => fileForOffice(later, personId, akHouseTwo())).toThrow();
    expect(
      establishDistrictResidence(later, {
        personId,
        binding: akHouseTwo(),
        startedOn: later.currentDate,
        provenance: {
          method: "canonical-home-join",
          sourceEventId: null,
          note: "Must not invent membership from the recorded Alaska home.",
        },
      }).kind,
    ).toBe("refused");
  }, 60_000);

  it("does not invent membership for a split city or a statewide Alaska home", () => {
    const ky = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "districts13-lexington-split",
      startAge: 34,
      placeKey: "lexington-fayette",
      questionnaire: "skipped",
    });
    expect(districtResidenceIntervals(ky.world)).toEqual([]);
    const { world, personId } = alaskaLife("districts13-state-home");
    expect(districtResidenceIntervals(world)).toEqual([]);
    expect(
      districtMembershipFromCanonicalHome({
        homeJurisdictionId: world.people[personId]!.homeJurisdictionId,
        catalog: districtIdentityCatalog(),
        chamber: "state-lower",
      }),
    ).toEqual({
      kind: "unknown",
      reason: DISTRICT_HOME_JOIN_UNKNOWN,
    });
  });

  it("establishes whole-place Adak membership, then files and runs the ordinary campaign without forcing a win", () => {
    const { world, personId } = adakLife("districts13-adak-join");
    const house = akHouseThirtySeven();
    const intervals = districtResidenceIntervals(world);
    expect(
      intervals.some(
        (interval) =>
          interval.personId === personId &&
          interval.binding.recordId === "state-lower:02037" &&
          interval.provenance.method === "canonical-home-join" &&
          interval.provenance.sourceEventId !== null,
      ),
    ).toBe(true);
    expect(
      intervals.some(
        (interval) => interval.binding.recordId === "state-upper:0200S",
      ),
    ).toBe(true);
    const chosen = recordDesiredDistrict(world, personId, akHouseTwo());
    expect(
      districtResidenceSince(
        chosen,
        personId,
        akHouseTwo(),
        chosen.currentDate,
      ),
    ).toBeNull();
    const waited = passOrdinaryDays(chosen, 1200);
    expect(() => fileForOffice(waited, personId, akHouseTwo())).toThrow(
      /district-residence/,
    );
    let next = fileForOffice(waited, personId, house);
    expect(
      next.history.electionContests?.at(-1)?.office.districtBinding?.recordId,
    ).toBe("state-lower:02037");
    next = spendAnAfternoon(next, personId, "fundraising");
    for (
      let day = 0;
      day < 60 && projectCampaign(next, personId).phase === "active";
      day += 1
    ) {
      next = passOrdinaryDays(next);
    }
    const phase = projectCampaign(next, personId).phase;
    expect(["won", "lost"]).toContain(phase);
    const seat = resolveActiveMemberSeat(next, personId);
    if (phase === "won") {
      expect(seat.kind).toBe("seated");
    } else {
      expect(seat.kind).toBe("unseated");
    }
  }, 180_000);
});
