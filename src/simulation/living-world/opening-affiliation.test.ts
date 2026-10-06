import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../life";
import { recordWorldEvent } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { projectCongress } from "./congress";
import { PARTY_AFFILIATION_KIND } from "./opening";

let world: World;
beforeAll(() => {
  world = smallWorld({
    place: drawRandomPlace("session2-affiliation-edges").key,
    seed: "session2-affiliation-edges",
    offices: ["congress"],
  }).world;
}, 120_000);
const independents = (at: World) =>
  projectCongress(at)!.senate.seats.filter(
    (seat) =>
      seat.occupant.kind === "member" &&
      seat.occupant.member.declaredAffiliation === "independent",
  );
const oldRoll = (at: World): World => ({
  ...at,
  history: {
    ...at.history,
    events: at.history.events.map((event) => ({
      ...event,
      tags: event.tags.map((tag) =>
        tag === "party:independent" ? "party:none" : tag,
      ),
    })),
  },
});

describe("declared opening affiliation", () => {
  it("preserves Independent without inventing a party organization through save/reload", () => {
    const seats = independents(world);
    expect(seats).toHaveLength(2);
    for (const seat of seats) {
      if (seat.occupant.kind !== "member") throw new Error("Expected member");
      expect(seat.occupant.member.partyOrganizationId).toBeNull();
      const termId = seat.occupant.member.termId;
      expect(
        world.history.events.find((event) => event.id === termId)!.tags,
      ).toContain("party:independent");
    }
    const payload = serializeWorld(world);
    const loaded = deserializeWorld(payload);
    expect(independents(loaded)).toEqual(seats);
    expect(serializeWorld(loaded)).toBe(payload);
  });
  it("reads the saved starting condition in older rolls without rewriting history", () => {
    const old = oldRoll(world);
    const payload = serializeWorld(old);
    expect(independents(old)).toHaveLength(2);
    expect(serializeWorld(old)).toBe(payload);
    expect(independents(deserializeWorld(payload))).toHaveLength(2);
  });
  it("leaves genuinely unrecorded affiliations alone", () => {
    const old = oldRoll(world);
    const unrecorded: World = {
      ...old,
      history: {
        ...old.history,
        worldConditions: old.history.worldConditions?.filter(
          (record) => record.kind !== "political-starting-conditions",
        ),
      },
    };
    expect(independents(unrecorded)).toHaveLength(0);
    expect(
      projectCongress(unrecorded)!.senate.totals.byParty.find(
        (entry) => entry.partyOrganizationId === null,
      )!.members,
    ).toBe(2);
  });
  it("lets a later recorded affiliation supersede the initial declaration", () => {
    const seat = independents(world)[0]!;
    if (seat.occupant.kind !== "member") throw new Error("Expected member");
    const party = projectCongress(world)!.senate.totals.byParty.find(
      (entry) => entry.partyOrganizationId !== null,
    )!.partyOrganizationId!;
    const changed = createOrganizationParticipation(world, {
      stableKey: "controlled:later-party-affiliation",
      personId: seat.occupant.member.personId,
      organizationId: party,
      startedAt: world.currentDate,
      kind: PARTY_AFFILIATION_KIND,
      roleKind: "member:public-affiliation",
      context: "Controlled later affiliation, not an ordinary generated event",
      provenance: { kind: "authored", note: "Controlled precedence case" },
    });
    expect(independents(changed)).toHaveLength(1);
    const member = projectCongress(changed)!.senate.seats.find(
      (candidate) => candidate.seatKey === seat.seatKey,
    )!.occupant;
    if (member.kind !== "member") throw new Error("Expected member");
    expect(member.member.partyOrganizationId).toBe(party);
    const participation = changed.history.organizationParticipations.at(-1)!;
    const previous = changed.history.organizationParticipationStates.find(
      (state) => state.participationId === participation.id,
    )!;
    const ended = recordOrganizationParticipationState(changed, {
      stableKey: "controlled:ended-party-affiliation",
      participationId: participation.id,
      effectiveAt: changed.currentDate,
      status: "ended",
      roleKind: null,
      context: "Controlled ended affiliation",
      provenance: { kind: "authored", note: "Controlled precedence case" },
      supersedesStateId: previous.id,
    });
    const endedMember = projectCongress(ended)!.senate.seats.find(
      (candidate) => candidate.seatKey === seat.seatKey,
    )!.occupant;
    if (endedMember.kind !== "member") throw new Error("Expected member");
    expect(endedMember.member.partyOrganizationId).toBeNull();
    expect(endedMember.member.declaredAffiliation).toBeUndefined();
    expect(independents(ended)).toHaveLength(1);
  });
  it("does not apply the opening affiliation to a later unaffiliated tenure", () => {
    const seat = independents(world)[0]!;
    if (seat.occupant.kind !== "member") throw new Error("Expected member");
    const termId = seat.occupant.member.termId;
    const initial = world.history.events.find((event) => event.id === termId)!;
    const successor = recordWorldEvent(world, {
      ...initial,
      stableKey: "controlled:successor-unaffiliated-tenure",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      tags: initial.tags
        .filter(
          (tag) =>
            !tag.startsWith("party:") &&
            tag !== "provenance:fictional-initial-tenure",
        )
        .concat("party:none"),
      summary: "Controlled later tenure, not an ordinary generated succession.",
    });
    const current = projectCongress(successor)!.senate.seats.find(
      (candidate) => candidate.seatKey === seat.seatKey,
    )!.occupant;
    if (current.kind !== "member") throw new Error("Expected member");
    expect(current.member.termId).not.toBe(termId);
    expect(current.member.partyOrganizationId).toBeNull();
    expect(current.member.declaredAffiliation).toBeUndefined();
  });
});
