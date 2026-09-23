import { describe, expect, it } from "vitest";
import {
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";

import { districtIdentityCatalog } from "../districts/catalog";
import { districtMembershipFromCanonicalHome } from "../districts/query";
import { placeDistrictJoin } from "../districts/place-membership";
import { inspectRegion, playerGeography } from "../maps/political-map-model";
import { districtResidenceIntervals } from "../simulation";
import type { EntityId, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectLivingSceneOpening } from "./living-scene-facts";
import { projectGovernmentBrowser } from "./politics-government";
import {
  congressCandidacyForPerson,
  congressSeatStatus,
  fileForCongressSeat,
} from "./congress-candidacy";

/*
 * The U.S. House district of a home, from the Census 119th Congress–2020 place
 * relationship file. A place the file lists with exactly one district is in
 * it; a place it lists with several stays unresolved, its candidates only the
 * districts it touches. Never Kentucky: these are the playtest's places and
 * the two single-district towns the technical director named.
 */

const ELKO = "3222500";
const LEWISTON = "2338740";
const PEORIA = "1759000";
const SAN_ANTONIO = "4865000";
const SAN_ANTONIO_DISTRICTS = ["4820", "4821", "4823", "4828", "4835"];

/** The New Game route a player takes, so Congress and the opening exist. */
function lifeAt(
  placeKey: string,
  seed: string,
  setup: Partial<NewGameSetup> = {},
): { world: World; personId: EntityId } {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey,
      questionnaire: "skipped",
      ...setup,
    }),
  ).game!;
  return { world: game.world, personId: game.playerPersonId };
}

function congressionalIntervals(world: World, personId: EntityId) {
  return districtResidenceIntervals(world).filter(
    (interval) =>
      interval.personId === personId &&
      interval.binding.chamber === "congressional",
  );
}

function homeJoin(world: World, personId: EntityId, placeGeoid: string) {
  return districtMembershipFromCanonicalHome({
    homeJurisdictionId: world.people[personId]!.homeJurisdictionId,
    catalog: districtIdentityCatalog(),
    placeGeoid,
    chamber: "congressional",
  });
}

describe("congressional home join from the 119th CD–place file", () => {
  it("joins a single-district place and lists only the intersecting districts of a split one", () => {
    expect(placeDistrictJoin(ELKO, "congressional")).toEqual({
      kind: "whole-place",
      districtGeoid: "3202",
    });
    expect(placeDistrictJoin(LEWISTON, "congressional")).toEqual({
      kind: "whole-place",
      districtGeoid: "2302",
    });
    expect(placeDistrictJoin(PEORIA, "congressional")).toEqual({
      kind: "split",
      candidateDistrictGeoids: ["1716", "1717"],
    });
    const sanAntonio = placeDistrictJoin(SAN_ANTONIO, "congressional");
    expect(sanAntonio).toEqual({
      kind: "split",
      candidateDistrictGeoids: SAN_ANTONIO_DISTRICTS,
    });
  });

  it.each([
    ["Elko, NV", ELKO, "congressional:3202", "NV"],
    ["Lewiston, ME", LEWISTON, "congressional:2302", "ME"],
  ])(
    "%s: a new life records its House district by canonical home join",
    (_, place, recordId, usps) => {
      const { world, personId } = lifeAt(place, `cd-join-${place}`);
      const intervals = congressionalIntervals(world, personId);
      expect(intervals).toHaveLength(1);
      const [interval] = intervals;
      expect(interval!.binding.recordId).toBe(recordId);
      expect(interval!.binding.stateUsps).toBe(usps);
      expect(interval!.endedOn).toBeNull();
      expect(interval!.provenance.method).toBe("canonical-home-join");
      expect(interval!.provenance.sourceEventId).not.toBeNull();
      expect(interval!.provenance.note).toContain(
        "census-rel-2020-cd119-place20",
      );
      expect(interval!.provenance.note).toContain(place);
      const house = projectGovernmentBrowser(
        world,
        personId,
      ).representedBy?.find((row) => row.key === "us-house");
      expect(house?.district).toMatch(/, district 2$/);
      expect(house?.holders).toHaveLength(1);
      const houseActors = (
        projectLivingSceneOpening(world, personId).chapters.find(
          (chapter) => chapter.key === "congress",
        )?.actors ?? []
      ).filter((actor) => actor.slotKey.startsWith("congress:us-house:"));
      expect(houseActors.map((actor) => actor.slotKey)).toEqual([
        `congress:us-house:${usps}-02`,
      ]);
    },
    120_000,
  );

  it("Peoria, IL: candidates IL-16 and IL-17, and no district assigned", () => {
    const { world, personId } = lifeAt(PEORIA, "cd-join-peoria");
    expect(congressionalIntervals(world, personId)).toEqual([]);
    const join = homeJoin(world, personId, PEORIA);
    expect(join.kind).toBe("conflicting");
    expect(join.kind === "conflicting" && join.candidateGeoids).toEqual([
      "1716",
      "1717",
    ]);
    const geography = playerGeography(world, personId);
    expect(geography.homeDistricts.congressional).toMatchObject({
      kind: "candidates",
      geoids: ["1716", "1717"],
    });
    // The map's "may be" appears on the two districts Peoria touches and on
    // no other Illinois district.
    const mayBe = ["1701", "1715", "1716", "1717", "1718"].filter((geoid) =>
      inspectRegion(world, personId, {
        layer: "congressional",
        geoid,
        stateUsps: "IL",
      }).relations.some((line) => /may be in this district/.test(line)),
    );
    expect(mayBe).toEqual(["1716", "1717"]);
    const house = projectGovernmentBrowser(world, personId).representedBy?.find(
      (row) => row.key === "us-house",
    );
    expect(house?.district).toBeNull();
    expect(house?.note).toBe(
      "Your home place is split between Illinois, district 16 and Illinois, district 17, and the save does not record which one your home is in.",
    );
  }, 120_000);

  it("a Peoria member's held House seat does not become their unrecorded home district", () => {
    const { world, personId } = lifeAt(PEORIA, "cd-join-peoria-member");
    const seat = congressCandidacyForPerson(world, personId)!.seats.find(
      (candidate) => candidate.identity.officeKey === "us-house:IL-16",
    );
    expect(seat?.eligible).toBe(true);
    const filed = fileForCongressSeat(
      world,
      personId,
      seat!.identity.officeKey,
    );
    const decided = runToElection(filed, personId, suppliedWin(personId));
    const status = congressSeatStatus(decided, personId);
    if (status.kind !== "won-awaiting-term")
      throw new Error(`Expected a House win, got ${status.kind}`);
    const seated = passUntil(decided, status.startsAt);
    expect(congressSeatStatus(seated, personId)).toMatchObject({
      kind: "in-office",
      identity: { officeKey: "us-house:IL-16" },
    });
    expect(congressionalIntervals(seated, personId)).toEqual([]);

    const house = projectGovernmentBrowser(
      seated,
      personId,
    ).representedBy?.find((row) => row.key === "us-house");
    expect(house?.district).toBeNull();
    expect(house?.holders).toEqual([]);
    expect(house?.note).toContain(
      "Your home place is split between Illinois, district 16 and Illinois, district 17",
    );
  }, 120_000);

  it("San Antonio, TX: five candidates, no district assigned, and no claim of the 1st district", () => {
    const { world, personId } = lifeAt(SAN_ANTONIO, "cd-join-san-antonio");
    expect(congressionalIntervals(world, personId)).toEqual([]);
    const join = homeJoin(world, personId, SAN_ANTONIO);
    expect(join.kind === "conflicting" && join.candidateGeoids).toEqual(
      SAN_ANTONIO_DISTRICTS,
    );
    expect(
      playerGeography(world, personId).homeDistricts.congressional,
    ).toMatchObject({ kind: "candidates", geoids: SAN_ANTONIO_DISTRICTS });
    const congress = projectLivingSceneOpening(world, personId).chapters.find(
      (chapter) => chapter.key === "congress",
    );
    const houseActors = (congress?.actors ?? []).filter((actor) =>
      actor.slotKey.startsWith("congress:us-house:"),
    );
    expect(houseActors).toEqual([]);
    const shown = JSON.stringify(congress);
    expect(shown).not.toMatch(/Texas's 1st congressional district/);
    expect(shown).not.toContain("us-house:TX-01");
  }, 120_000);

  it("a replay descriptor without the join version keeps its state-chamber-only history", () => {
    const legacy: Partial<NewGameSetup> = { ...DEFAULT_NEW_GAME_SETUP };
    delete (legacy as { districtHomeJoinVersion?: unknown })
      .districtHomeJoinVersion;
    const { world, personId } = lifeAt(ELKO, "cd-join-legacy", legacy);
    expect(congressionalIntervals(world, personId)).toEqual([]);
  }, 120_000);

  it("marks the player's own House district among the candidacy seats, and a split place's candidates as possible", () => {
    const marks = (placeKey: string, seed: string) => {
      const { world, personId } = lifeAt(placeKey, seed);
      return Object.fromEntries(
        (congressCandidacyForPerson(world, personId)?.seats ?? [])
          .filter((seat) => seat.identity.seat.chamberKey === "us-house")
          .map((seat) => [seat.identity.officeKey, seat.homeDistrict]),
      );
    };
    const elko = marks(ELKO, "cd-join-candidacy-elko");
    expect(Object.keys(elko)).toHaveLength(4);
    expect(elko).toEqual({
      "us-house:NV-01": null,
      "us-house:NV-02": "recorded",
      "us-house:NV-03": null,
      "us-house:NV-04": null,
    });
    const peoria = marks(PEORIA, "cd-join-candidacy-peoria");
    expect(Object.keys(peoria)).toHaveLength(17);
    expect(Object.entries(peoria).filter(([, mark]) => mark !== null)).toEqual([
      ["us-house:IL-16", "candidate"],
      ["us-house:IL-17", "candidate"],
    ]);
  }, 120_000);
});
