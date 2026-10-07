import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { makeIsoDate } from "../dates";
import { lifePlaceStateIdentities } from "../life-places";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { seatedChamberForPack } from "./chamber-votes";

import type { SeatedBody } from "../legislation-scenarios";
import type { EntityId } from "../types";
import {
  committeeRoster,
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
      personId: (index === size - 1
        ? "person-last"
        : `person-${index}`) as EntityId,
      tenureStartedAt: makeIsoDate(
        index === size - 1 ? "2025-01-01" : "2026-01-05",
      ),
      seatingEventId: `event-${index}` as EntityId,
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
    // The same recorded members keep their seniority across caller seed keys.
    const senate = committeeRoster(
      { ...body, chamberKey: "senate" },
      COMMITTEES,
      "judiciary",
      "pack:senate",
    );
    expect(senate.map((member) => member.memberKey)).toEqual(
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

describe("A94 recorded committee seniority", () => {
  it("uses actual seating dates and stable identity, independent of input and seed order", () => {
    const body = chamber(4);
    const all = [{ committeeKey: "whole", appointedMembers: 4 }];
    const keys = (b: SeatedBody, seed: string) =>
      committeeRoster(b, all, "whole", seed).map((member) => member.memberKey);
    expect(keys(body, "one")).toEqual([
      "member-3",
      "member-0",
      "member-1",
      "member-2",
    ]);
    expect(
      keys({ ...body, members: [...body.members].reverse() }, "two"),
    ).toEqual(keys(body, "one"));
    expect(body.members.map((member) => member.memberKey)).toEqual([
      "member-0",
      "member-1",
      "member-2",
      "member-3",
    ]);
  });

  it("refuses missing or ambiguous seating evidence without inventing committee members", () => {
    const body = chamber(4);
    for (const missing of [
      { personId: null },
      { tenureStartedAt: null },
      { seatingEventId: null },
    ]) {
      const incomplete = {
        ...body,
        members: [
          { ...body.members[0]!, ...missing },
          ...body.members.slice(1),
        ],
      };
      expect(
        committeeRoster(incomplete, COMMITTEES, "judiciary", "pack"),
      ).toEqual([]);
    }
    const duplicate = {
      ...body,
      members: [body.members[0]!, body.members[0]!],
    };
    expect(committeeRoster(duplicate, COMMITTEES, "judiciary", "pack")).toEqual(
      [],
    );
  });

  it("opens a random place and uses its actual state and Congress seats through canonical Continue", () => {
    const seed = "a94-recorded-committee-order";
    const place = pickDistinct(
      new SeededRng(seed),
      lifePlaceStateIdentities(),
      1,
    )[0]!;
    const opened = smallWorld({
      place: place.jurisdictionKey,
      seed,
      offices: ["congress", "state-legislature"],
    });
    const world = opened.world;
    const statePack = legislativePackForJurisdiction(
      opened.stateJurisdictionId,
    );
    expect(statePack).toBeDefined();
    const saved = serializeWorld(world);
    const loaded = deserializeWorld(saved);
    let assigned = 0;
    const evidence: unknown[] = [];
    for (const pack of [statePack!, US_CONGRESS_RULE_PACK]) {
      for (const rule of pack.chambers) {
        const seated = seatedChamberForPack(
          world,
          pack.packId,
          rule.chamberKey,
          rule.name,
        );
        expect(seated).not.toBeNull();
        const body = seated!.body;
        expect(body.members.length).toBeGreaterThan(0);
        for (const member of body.members) {
          expect(
            member.personId && world.people[member.personId],
          ).toBeDefined();
          expect(member.seatingEventId).toBeTruthy();
          const event = world.history.events.find(
            (row) => row.id === member.seatingEventId,
          )!;
          expect(event).toBeDefined();
          expect(member.tenureStartedAt).toBe(event.occurredAt);
        }
        const once = committeeRosters(body, rule.committees, pack.packId);
        expect(committeeRosters(body, rule.committees, "another seed")).toEqual(
          once,
        );
        const reloaded = seatedChamberForPack(
          loaded,
          pack.packId,
          rule.chamberKey,
          rule.name,
        )!;
        expect(
          committeeRosters(reloaded.body, rule.committees, pack.packId),
        ).toEqual(once);
        for (const [committee, members] of once) {
          const count = rule.committees.find(
            (row) => row.committeeKey === committee,
          )!.appointedMembers;
          expect(members).toHaveLength(Math.min(count, body.members.length));
          for (const member of members)
            expect(body.members).toContainEqual(member);
          assigned += members.length;
        }
        const first = [...once.values()].flat()[0];
        if (first) {
          evidence.push({
            seed,
            place: place.jurisdictionKey,
            pack: pack.packId,
            chamber: rule.chamberKey,
            member: first.name,
            personId: first.personId,
            seatingEventId: first.seatingEventId,
            tenureStartedAt: first.tenureStartedAt,
          });
          console.info(
            "A94 recorded committee",
            JSON.stringify({
              seed,
              place: place.jurisdictionKey,
              pack: pack.packId,
              chamber: rule.chamberKey,
              member: first.name,
              personId: first.personId,
              seatingEventId: first.seatingEventId,
              tenureStartedAt: first.tenureStartedAt,
            }),
          );
        }
      }
    }
    expect(assigned).toBeGreaterThan(0);
    writeFileSync(
      "/tmp/team2-a94-opening-evidence.json",
      JSON.stringify(
        { seed, place: place.jurisdictionKey, assigned, evidence },
        null,
        2,
      ),
    );
    expect(serializeWorld(world)).toBe(saved);
  });
});
