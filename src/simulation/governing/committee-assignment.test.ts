import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../life-places";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { seatedChamberForPack } from "./chamber-votes";
import { SeededRng } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { personName } from "../people";
import type { World } from "../types";
import { describe, expect, it } from "vitest";

import type { SeatedBody } from "../legislation-scenarios";
import type { EntityId } from "../types";
import {
  committeeRoster,
  recordedCommitteeService,
  committeeRosters,
  committeesForMember,
  committeesForPerson,
  type AssignableCommittee,
} from "./committee-assignment";

function chamber(size: number): SeatedBody {
  return {
    chamberKey: "house",
    chamberName: "House",
    members: Array.from({ length: size }, (_, index) => ({
      memberKey: `member-${index}`,
      name: `Member ${index}`,
      personId: index === size - 1 ? ("person-last" as EntityId) : null,
      caucusLabel: index % 2 === 0 ? "Blue" : "Green",
    })),
  };
}

const COMMITTEES: readonly AssignableCommittee[] = [
  { committeeKey: "ways-and-means", appointedMembers: 7 },
  { committeeKey: "judiciary", appointedMembers: 5 },
  { committeeKey: "education", appointedMembers: 5 },
];

describe("GOVERNING D1: committees have rosters, not the first names on the list", () => {
  it("seats everybody once before it seats anybody twice", () => {
    const body = chamber(20);
    const rosters = committeeRosters(body, COMMITTEES, "pack:house");
    const seated = [...rosters.values()].flat();
    expect(seated).toHaveLength(17); // 7 + 5 + 5, none of them doubled
    expect(new Set(seated.map((member) => member.memberKey)).size).toBe(17);
    // No committee seats the same member twice.
    for (const roster of rosters.values())
      expect(new Set(roster.map((member) => member.memberKey)).size).toBe(
        roster.length,
      );
  });

  it("seats a member the old slice could never reach", () => {
    // The shortcut this replaces took body.members.slice(0, size), so a member
    // added at the end of a chamber — which is where a player joining one is
    // put — was on no committee however many committees there were.
    const body = chamber(20);
    const last = body.members[body.members.length - 1]!;
    expect(body.members.slice(0, 7)).not.toContainEqual(last);

    // With seats for everybody, everybody sits somewhere, the last member
    // included. Seventeen seats across three committees cannot seat twenty
    // members, so this asks for a fourth rather than asserting the
    // impossible.
    const seatsForAll = [
      ...COMMITTEES,
      { committeeKey: "rules", appointedMembers: 5 },
    ];
    expect(
      seatsForAll.reduce((total, row) => total + row.appointedMembers, 0),
    ).toBeGreaterThanOrEqual(body.members.length);
    for (const member of body.members)
      expect(
        committeesForMember(body, seatsForAll, member.memberKey, "pack:house"),
      ).not.toHaveLength(0);

    // With fewer seats than members somebody must miss out, but who misses
    // out is not simply everybody past the cut-off the slice used.
    const seated = new Set(
      [...committeeRosters(body, COMMITTEES, "pack:house").values()]
        .flat()
        .map((member) => member.memberKey),
    );
    const slice = new Set(
      body.members.slice(0, seated.size).map((member) => member.memberKey),
    );
    expect([...seated].sort()).not.toEqual([...slice].sort());
    // And the same seat is reachable by the person who holds it.
    expect(
      committeesForPerson(
        body,
        seatsForAll,
        "person-last" as EntityId,
        "pack:house",
      ),
    ).toEqual(
      committeesForMember(body, seatsForAll, last.memberKey, "pack:house"),
    );
    expect(
      committeesForPerson(
        body,
        COMMITTEES,
        "nobody-here" as EntityId,
        "pack:house",
      ),
    ).toEqual([]);
  });

  it("gives the same roster every time it is asked", () => {
    const body = chamber(20);
    const once = committeeRoster(body, COMMITTEES, "judiciary", "pack:house");
    const twice = committeeRoster(body, COMMITTEES, "judiciary", "pack:house");
    expect(twice.map((member) => member.memberKey)).toEqual(
      once.map((member) => member.memberKey),
    );
    // A different chamber of the same legislature gets its own roster.
    const senate = committeeRoster(
      { ...body, chamberKey: "senate" },
      COMMITTEES,
      "judiciary",
      "pack:senate",
    );
    expect(senate.map((member) => member.memberKey)).not.toEqual(
      once.map((member) => member.memberKey),
    );
  });

  it("seats a small chamber once rather than seating anybody twice", () => {
    const body = chamber(4);
    const roster = committeeRoster(
      body,
      [{ committeeKey: "whole", appointedMembers: 9 }],
      "whole",
      "pack:house",
    );
    expect(roster).toHaveLength(4);
    expect(new Set(roster.map((member) => member.memberKey)).size).toBe(4);
  });

  it("answers an empty chamber and an uncompiled committee without inventing", () => {
    const empty: SeatedBody = {
      chamberKey: "house",
      chamberName: "House",
      members: [],
    };
    expect(
      committeeRoster(empty, COMMITTEES, "judiciary", "pack:house"),
    ).toEqual([]);
    expect(
      committeeRoster(chamber(20), COMMITTEES, "not-a-committee", "pack:house"),
    ).toEqual([]);
  });
});

const serviceSeed = "A94-recorded-service-seniority";
const servicePool = [...lifePlaceStateIdentities()];
const serviceRng = new SeededRng(serviceSeed);
const servicePlaces = Array.from(
  { length: 5 },
  () => servicePool.splice(serviceRng.integer(0, servicePool.length), 1)[0]!,
);

describe("A94 committee seniority reads saved service, not an invented term date", () => {
  it.each(servicePlaces)(
    "retains actual work identity and provenance in $jurisdictionKey",
    (place) => {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        seed: serviceSeed,
        offices: ["state-legislature"],
      });
      const world = fixture.world;
      const pack = legislativePackForJurisdiction(fixture.stateJurisdictionId);
      if (!pack)
        throw Error("The fixture needs its own admitted pack, not a proxy.");
      const chamber = pack.chambers[0]!;
      const seated = seatedChamberForPack(
        world,
        pack.packId,
        chamber.chamberKey,
        chamber.name,
      );
      if (!seated) {
        expect(
          recordedCommitteeService(
            world,
            pack.packId,
            fixture.stateJurisdictionId,
            {
              chamberKey: chamber.chamberKey,
              chamberName: chamber.name,
              members: [],
            },
          ),
        ).toBeNull();
        console.info(
          "A94 actual service",
          JSON.stringify({
            seed: serviceSeed,
            place: place.jurisdictionKey,
            unsupported: "No actual recorded state chamber.",
          }),
        );
        return;
      }
      const evidence = recordedCommitteeService(
        world,
        pack.packId,
        fixture.stateJurisdictionId,
        seated.body,
      );
      expect(evidence).not.toBeNull();
      expect(evidence!.size).toBe(
        seated.body.members.filter((member) => member.personId).length,
      );
      for (const member of seated.body.members) {
        if (!member.personId) continue;
        const row = evidence!.get(member.memberKey)!;
        const work = world.history.workRelationships.find(
          (work) => work.id === row.workRelationshipId,
        )!;
        expect(work.personId).toBe(member.personId);
        expect(row.startedAt).toBe(work.startedAt);
        expect(row.provenance).toEqual(work.provenance);
      }
      expect([
        ...recordedCommitteeService(
          world,
          pack.packId,
          fixture.stateJurisdictionId,
          seated.body,
        )!,
      ]).toEqual([...evidence!]);
      const loaded = deserializeWorld(serializeWorld(world));
      expect([
        ...recordedCommitteeService(
          loaded,
          pack.packId,
          fixture.stateJurisdictionId,
          seated.body,
        )!,
      ]).toEqual([...evidence!]);
      const oldest = [...evidence!].sort(
        ([a, x], [b, y]) =>
          x.startedAt.localeCompare(y.startedAt) || a.localeCompare(b),
      )[0]!;
      const member = seated.body.members.find(
        (member) => member.memberKey === oldest[0],
      )!;
      console.info(
        "A94 actual service",
        JSON.stringify({
          seed: serviceSeed,
          place: place.jurisdictionKey,
          members: evidence!.size,
          person: personName(world.people[member.personId!]!),
          workId: oldest[1].workRelationshipId,
          serviceSince: oldest[1].startedAt,
          provenance: oldest[1].provenance,
          assignment: "NOT ACTIVATED: caller release pending",
        }),
      );
      const incomplete: World = {
        ...world,
        history: {
          ...world.history,
          workRelationships: world.history.workRelationships.filter(
            (work) => work.id !== oldest[1].workRelationshipId,
          ),
        },
      };
      expect(
        recordedCommitteeService(
          incomplete,
          pack.packId,
          fixture.stateJurisdictionId,
          seated.body,
        ),
      ).toBeNull();
      const future: World = {
        ...world,
        history: {
          ...world.history,
          workRelationships: world.history.workRelationships.map((work) =>
            work.id === oldest[1].workRelationshipId
              ? { ...work, recordedAt: "2099-01-01" as typeof work.recordedAt }
              : work,
          ),
        },
      };
      expect(
        recordedCommitteeService(
          future,
          pack.packId,
          fixture.stateJurisdictionId,
          seated.body,
        ),
      ).toBeNull();
    },
  );
});
