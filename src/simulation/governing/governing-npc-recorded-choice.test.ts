import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { daysBetween } from "../dates";
import { futureDueItemStateAt } from "../future-transitions";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { lifePlaceStateIdentities } from "../life-places";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { advanceWorld } from "../world";
import {
  GOVERNING_NPC_DECISION,
  chiefOfStaffFor,
  currentGoverningOffices,
  decideGoverningMatter,
  governingMatterById,
  governingMatters,
  governingNpcDecisionHandler,
  openTransitionMatters,
  staffRecommendation,
} from "./state-governing";

const seed = "A92-no-recorded-executive-choice";
const rng = new SeededRng(seed);
const identities = [...lifePlaceStateIdentities()];
const places = Array.from(
  { length: 5 },
  () => identities.splice(rng.integer(0, identities.length), 1)[0]!,
);

function opening(stateKey: string) {
  const fixture = smallWorld({
    place: stateKey,
    seed: `${seed}:${stateKey}`,
    offices: ["governor"],
  });
  const office = currentGoverningOffices(fixture.world).find(
    (row) => row.stateUsps === fixture.stateUsps,
  );
  expect(office, stateKey).toBeDefined();
  expect(office!.organizationId).not.toBeNull();
  expect(chiefOfStaffFor(fixture.world, office!)).toBeNull();
  const world = openTransitionMatters(fixture.world, office!.officeKey);
  return { fixture, office: office!, world };
}

describe("A92 office decisions require a recorded choice", () => {
  it("uses the same pending rule for actual offices in all 56 starting jurisdictions", () => {
    const identities = lifePlaceStateIdentities();
    expect(identities).toHaveLength(56);
    for (const identity of identities) {
      const { office, world } = opening(identity.jurisdictionKey);
      for (const family of ["chief-of-staff", "agenda"] as const) {
        const matter = governingMatters(world).find(
          (row) => row.officeKey === office.officeKey && row.family === family,
        )!;
        expect(matter, identity.jurisdictionKey).toBeDefined();
        const due = world.history.futureDueItems.find(
          (row) =>
            row.transitionKey === GOVERNING_NPC_DECISION &&
            row.entityIds.includes(matter.id),
        )!;
        expect(due, identity.jurisdictionKey).toBeDefined();
        // This 56-place check calls the real saved due handler. The five
        // sampled clock cases below separately prove its ordinary dispatch.
        expect(governingNpcDecisionHandler(world, due).world).toBe(world);
        expect(governingMatterById(world, matter.id)?.status).toBe("open");
        expect(governingMatterById(world, matter.id)?.decision).toBeNull();
      }
    }
    console.info(
      "A92 all starting offices pending",
      JSON.stringify({
        seed,
        offices: identities.length,
        actualDueCallbacks: identities.length * 2,
        newDecisions: 0,
      }),
    );
  });

  for (const family of ["chief-of-staff", "agenda"] as const) {
    it(`leaves the actual ${family} matter open without a recorded basis`, () => {
      for (const place of places) {
        const { fixture, office, world } = opening(place.jurisdictionKey);
        const matter = governingMatters(world).find(
          (row) => row.officeKey === office.officeKey && row.family === family,
        )!;
        expect(matter).toBeDefined();
        expect(matter.options.length).toBeGreaterThan(0);
        expect(staffRecommendation(world, matter)).toBeNull();
        if (family === "chief-of-staff")
          for (const option of matter.options)
            expect(option.assessment?.steadiness).toBeNull();
        const due = world.history.futureDueItems.find(
          (row) =>
            row.transitionKey === GOVERNING_NPC_DECISION &&
            row.entityIds.includes(matter.id),
        )!;
        expect(due).toBeDefined();
        const at = advanceWorld(
          world,
          daysBetween(world.currentDate, due.dueAt),
          createCampaignElectionTransitionRegistry(),
        );
        const stillOpen = governingMatterById(at, matter.id)!;
        expect(
          futureDueItemStateAt(at, due.id, currentHistoricalCutoff(at))?.status,
        ).toBe("resolved");
        expect(stillOpen.status).toBe("open");
        expect(stillOpen.decision).toBeNull();
        expect(chiefOfStaffFor(at, office)).toBeNull();
        expect(at.history.workRelationships).toEqual(
          world.history.workRelationships,
        );
        const saved = serializeWorld(at);
        const repeated = governingNpcDecisionHandler(at, due).world;
        expect(serializeWorld(repeated)).toBe(saved);
        const loaded = deserializeWorld(saved);
        expect(governingMatterById(loaded, matter.id)?.status).toBe("open");
        expect(
          serializeWorld(governingNpcDecisionHandler(loaded, due).world),
        ).toBe(saved);
        console.info(
          "A92 actual office pending",
          JSON.stringify({
            seed: fixture.world.seed,
            place: fixture.place.displayName,
            state: place.jurisdictionKey,
            holder: personName(at.people[office.holderPersonId]!),
            family,
            matterId: matter.id,
            sourceEventId: matter.openedEvent.id,
            dueAt: due.dueAt,
            observedAt: at.currentDate,
            status: stillOpen.status,
            decision: stillOpen.decision,
          }),
        );
      }
    });
  }

  it("keeps an actual officeholder's explicit staff choice available", () => {
    const { fixture, office, world } = opening(places[0]!.jurisdictionKey);
    const matter = governingMatters(world).find(
      (row) =>
        row.officeKey === office.officeKey && row.family === "chief-of-staff",
    )!;
    // Supplied control of the actual saved holder, never a substitute person.
    const controlled: World = {
      ...world,
      control: { kind: "person", personId: office.holderPersonId },
    };
    const chosen = matter.options.find((option) => option.personId)!;
    const decision = decideGoverningMatter(controlled, matter.id, chosen.key);
    expect(decision.ok).toBe(true);
    expect(governingMatterById(decision.world, matter.id)?.status).toBe(
      "decided",
    );
    expect(chiefOfStaffFor(decision.world, office)).toBe(chosen.personId);
    const loaded = deserializeWorld(serializeWorld(decision.world));
    expect(chiefOfStaffFor(loaded, office)).toBe(chosen.personId);
    console.info(
      "A92 actual player choice",
      JSON.stringify({
        seed: fixture.world.seed,
        holder: personName(world.people[office.holderPersonId]!),
        hired: personName(decision.world.people[chosen.personId!]!),
        matterId: matter.id,
        decisionEventId: governingMatterById(decision.world, matter.id)
          ?.decision?.id,
      }),
    );
  });
});
