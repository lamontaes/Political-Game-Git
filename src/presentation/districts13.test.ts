import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../districts/catalog";
import {
  bindingFromIdentity,
  districtIdentityByRecordId,
} from "../districts/query";
import { openFiscalAuthorityWork } from "./fiscal-authority-work";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";
import {
  offeredDistricts,
  recordPlayerDistrictResidence,
} from "./district-selection";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  bindOfficeToDistrict,
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
      note: "Explicit establishment event. Not inferred from birthplace or state residence.",
    },
  });
  if (result.kind === "refused") throw new Error(result.reason);
  return result.world;
}

describe("DISTRICTS13 residence, filing, and fiscal consumer", () => {
  it("lists published identities for Alaska and Kentucky without interior points", () => {
    const alaska = alaskaLife("districts13-catalog-ak");
    const rows = offeredDistricts(
      alaska.world,
      alaska.world.people[alaska.personId]!.homeJurisdictionId,
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

  it("permits a normal Alaska filing after real elapsed residence and carries an earned seat into fiscal Work", () => {
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
    world = spendAnAfternoon(world, life.personId, "fundraising");
    for (let index = 0; index < 3; index += 1) {
      world = passOrdinaryDays(world);
      world = spendAnAfternoon(world, life.personId, "outreach");
    }
    for (
      let day = 0;
      day < 60 && projectCampaign(world, life.personId).phase === "active";
      day += 1
    ) {
      world = passOrdinaryDays(world);
    }
    expect(projectCampaign(world, life.personId).phase).toBe("won");
    expect(resolveActiveMemberSeat(world, life.personId).kind).toBe("seated");
    const opened = openFiscalAuthorityWork(world, [], {
      personId: life.personId,
      stateUsps: "AK",
      level: "MUNICIPALITY",
      instrument: "GENERAL_SALES_TAX",
      asOfDate: world.currentDate,
      action: "propose-authority-change",
    });
    expect(opened.kind).toBe("opened");
    if (opened.kind !== "opened") return;
    expect(opened.notice).toMatch(/does not levy a tax/);
    expect(opened.authority.state).toBe("UNESTABLISHED");
    const reloaded = deserializeWorld(serializeWorld(opened.world));
    expect(
      reloaded.history.workItems.some((item) =>
        item.stableKey.startsWith("fiscal-authority:proposal-analysis:AK:"),
      ),
    ).toBe(true);
  }, 180_000);

  it("records player-selected residence at the current date only", () => {
    const { world, personId } = alaskaLife("districts13-player");
    const next = recordPlayerDistrictResidence(world, personId, akHouse());
    expect(districtResidenceIntervals(next)[0]?.startedOn).toBe(
      world.currentDate,
    );
    expect(districtResidenceIntervals(next)[0]?.provenance.method).toBe(
      "player-selection",
    );
  });
});
