import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "./life-places";
import { currentStateExecutiveHolders } from "./nationwide-world/state-executives";
import { recordCivicMessage } from "./living-world/civic-actions";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  OFFICE_CASE_OPENED_EVENT,
  openConstituentCaseForContact,
} from "./constituent-cases";
import type { EntityId, World } from "./types";

function message(world: World, senderId: EntityId, officialId: EntityId) {
  const propositionId = world.policyCatalog.propositionOrder[0]!;
  expect(propositionId).toBeDefined();
  return recordCivicMessage(world, {
    stableKey: "case-test:explicit-message",
    jurisdictionId: world.people[senderId]!.homeJurisdictionId,
    senderId,
    officialId,
    propositionId,
    stance: "no",
    channel: "email",
  });
}

describe("one constituent case writer for saved civic contacts", () => {
  it("opens a source-linked substantive message case for a current holder in all 56 jurisdictions", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const built = smallWorld({
        place: state.usps,
        seed: `b06-cases:${state.usps}`,
        people: 3,
        offices: ["governor"],
      });
      const governor = currentStateExecutiveHolders(built.world).find(
        (holder) => holder.stateUsps === state.usps,
      );
      expect(governor, state.name).toBeDefined();
      const world = message(built.world, built.personId, governor!.personId);
      const contact = world.history.events.find(
        (event) => event.stableKey === "case-test:explicit-message",
      )!;
      const cases = world.history.events.filter(
        (event) => event.type === OFFICE_CASE_OPENED_EVENT,
      );
      expect(cases, state.name).toHaveLength(1);
      const opened = cases[0]!;
      expect(opened.tags, state.name).toContain(`contact:${contact.id}`);
      expect(opened.involvedEntityIds, state.name).toEqual(
        contact.involvedEntityIds,
      );
      expect(opened.occurredAt, state.name).toBe(contact.occurredAt);
      expect(opened.context, state.name).toEqual(contact.context);
      for (const tag of contact.tags.filter((tag) =>
        tag.startsWith("message-"),
      ))
        expect(opened.tags, state.name).toContain(tag);
      expect(openConstituentCaseForContact(world, contact), state.name).toBe(
        world,
      );
    }
  }, 120_000);

  it("retains the case/source chain after reload and does not duplicate it", () => {
    const built = smallWorld({
      place: "UT",
      seed: "b06-case-reload",
      offices: ["governor"],
    });
    const governor = currentStateExecutiveHolders(built.world).find(
      (holder) => holder.stateUsps === "UT",
    )!;
    const world = message(built.world, built.personId, governor.personId);
    const restored = deserializeWorld(serializeWorld(world));
    const contact = restored.history.events.find(
      (event) => event.stableKey === "case-test:explicit-message",
    )!;
    expect(openConstituentCaseForContact(restored, contact)).toBe(restored);
    expect(
      restored.history.events.filter(
        (event) => event.type === OFFICE_CASE_OPENED_EVENT,
      ),
    ).toEqual(
      world.history.events.filter(
        (event) => event.type === OFFICE_CASE_OPENED_EVENT,
      ),
    );
  });

  it("does not give a private citizen an office case or accept an invented source event", () => {
    const built = smallWorld({
      place: "UT",
      seed: "b06-case-quiet",
      people: 3,
    });
    const citizenId = built.world.personOrder.find(
      (id) => id !== built.personId,
    )!;
    const world = message(built.world, built.personId, citizenId);
    expect(
      world.history.events.filter(
        (event) => event.type === OFFICE_CASE_OPENED_EVENT,
      ),
    ).toEqual([]);
    const contact = world.history.events.find(
      (event) => event.stableKey === "case-test:explicit-message",
    )!;
    expect(
      openConstituentCaseForContact(world, {
        ...contact,
        id: "event:invented" as EntityId,
      }),
    ).toBe(world);
    expect(
      openConstituentCaseForContact(world, {
        ...contact,
        occurredAt: "2099-01-01" as typeof contact.occurredAt,
      }),
    ).toBe(world);
  });
});
