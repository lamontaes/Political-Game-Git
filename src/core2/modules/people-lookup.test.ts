import { describe, expect, it } from "vitest";
import { enrichCivicInputs } from "../civic-inputs";
import { availableActs, createLifeCore } from "../life";
import { buildPopulation } from "../population";
import { coreAPI } from "../state";

// P15 part 4: looking something up serves a cause, not the need for company,
// and stops once the person knows where to go.
describe("looking up where to go", () => {
  const core = createLifeCore(
    enrichCivicInputs(
      buildPopulation({
        seed: "p15-lookup",
        startedAt: "2021-01-01",
        minimumPeople: 300,
      }),
    ),
  );
  const lookups = (id: string) =>
    availableActs(core, id).filter(
      (offer) => offer.definition.effect === "public-lookup",
    );
  const residents = [...core.people.values()].filter(
    (person) => person.alive && person.tier !== "husk",
  );

  it("offers no look-up to people without a cause", () => {
    for (const person of residents.filter((row) => !row.drives.size))
      expect(lookups(person.id)).toHaveLength(0);
  });

  it("offers a person with a cause the offices they do not know, until they know one", () => {
    const api = coreAPI(core);
    // A resident whose town or county has an office with staff.
    const actor = residents.find((person) =>
      [person.placeId, person.countyId].some((placeId) =>
        [...(core.publicOrganizationsByPlace.get(placeId ?? "") ?? [])].some(
          (id) =>
            core.publicOrganizations
              .get(id)
              ?.affordances?.includes("known-office") &&
            core.publicOrganizations.get(id)?.staff?.length,
        ),
      ),
    )!;
    expect(actor).toBeDefined();
    // A cause needs news the person learned: an emitted event about them.
    const event = {
      id: "event:p15-lookup-cause",
      date: core.date,
      kind: "test:service-loss",
      personIds: [actor.id],
      placeId: actor.placeId,
      topic: "test:road-repair",
      desiredChange: "Repair the road",
      moodImpulse: -0.1,
      stressImpulse: 0.1,
      source: { tag: "ESTIMATED" as const, asOf: core.date, citation: "test" },
    };
    api.emit(event);
    const driveId = "test-cause:road-repair";
    api.updateDrive(actor.id, {
      id: driveId,
      kind: "test-cause",
      sourceEventId: event.id,
      topic: event.topic,
      desiredChange: event.desiredChange,
      strength: 1,
    });
    api.updateGoal(actor.id, {
      id: `drive:${driveId}`,
      kind: "change-condition",
      urgency: 1,
      sourceDriveId: driveId,
    });
    const offers = lookups(actor.id);
    const office = offers.find(
      (offer) =>
        core.publicOrganizations
          .get(offer.targetId)
          ?.affordances?.includes("known-office") &&
        core.publicOrganizations.get(offer.targetId)?.staff?.length,
    );
    expect(office).toBeDefined();
    expect(office!.driveId).toBe(driveId);
    api.lookupPublicOrganization(actor.id, office!.targetId);
    expect(
      lookups(actor.id).some((offer) =>
        core.publicOrganizations
          .get(offer.targetId)
          ?.affordances?.includes("known-office"),
      ),
    ).toBe(false);
  });
});
