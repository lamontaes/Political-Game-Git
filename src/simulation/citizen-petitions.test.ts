import { describe, expect, it } from "vitest";
import { createDemoWorld, assertWorldIntegrity } from "./index";
import {
  circulateCitizenPetition,
  citizenPetitionClosesHandler,
  citizenPetitions,
  startCitizenPetition,
} from "./citizen-petitions";
import { isEligibleVoterIn } from "./issue-record";
import {
  installMunicipalGovernment,
  municipalGovernmentJurisdictionId,
} from "./municipal-public-work";
import type { EntityId } from "./types";

function petitionWorld(seed: string) {
  const initial = createDemoWorld(seed);
  const governmentKey = "us-ky-lexington-fayette-ucg";
  const world = installMunicipalGovernment(initial, {
    governmentKey,
    jurisdictionId: initial.jurisdictionOrder[0]!,
    formedAt: initial.currentDate,
  });
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    governmentKey,
  )!;
  const petitionerPersonId = world.personOrder.find((personId) =>
    isEligibleVoterIn(world, personId, jurisdictionId, world.currentDate),
  );
  if (!petitionerPersonId)
    throw new Error("Fixture has no eligible town resident.");
  const propositionId = Object.keys(world.policyCatalog.propositions)[0] as
    EntityId | undefined;
  if (!propositionId) throw new Error("Fixture has no policy proposition.");
  return { world, governmentKey, petitionerPersonId, propositionId };
}

describe("municipal citizen petition lifecycle", () => {
  it("uses field reach to ask eligible neighbors through the shared signer writer", () => {
    const fixture = petitionWorld("petition-field-reach");
    const world = startCitizenPetition(fixture.world, {
      kind: "local-initiative",
      governmentKey: fixture.governmentKey,
      petitionerPersonId: fixture.petitionerPersonId,
      propositionId: fixture.propositionId,
      requestedStance: "support",
    });
    const petition = citizenPetitions(world)[0]!;
    const fieldwork = circulateCitizenPetition(world, {
      petitionKey: petition.stableKey,
      circulatorPersonId: fixture.petitionerPersonId,
      form: "door-canvass",
      minutes: 90,
    });
    const asks = fieldwork.world.history.events.filter(
      (event) =>
        event.tags.includes("civic:petition-ask") &&
        event.tags.includes(`petition:${petition.stableKey}`),
    );

    expect(petition).toMatchObject({
      kind: "local-initiative",
      phase: "circulating",
      thresholdBasis: "estimated",
      circulationBasis: "estimated",
    });
    expect(fieldwork.fieldReach?.estimatedCompletedConversations).toMatchObject(
      {
        min: 4,
        max: 12,
      },
    );
    expect(fieldwork.reachedPersonIds).toHaveLength(fieldwork.decisions.length);
    expect(asks).toHaveLength(fieldwork.decisions.length);
    expect(
      asks.every((event) =>
        event.participants.some(
          (participant) => participant.role === "agency:signer",
        ),
      ),
    ).toBe(true);
    expect(fieldwork.world.history.events.at(-1)?.type).toBe(
      "civic.citizen-petition-fieldwork",
    );
    expect(() => assertWorldIntegrity(fieldwork.world)).not.toThrow();

    const due = fieldwork.world.history.futureDueItems.find(
      (item) => item.transitionKey === "civic:citizen-petition-closes",
    )!;
    const closed = citizenPetitionClosesHandler(fieldwork.world, due);
    expect(closed.status).toBe("resolved");
    expect(citizenPetitions(closed.world)[0]?.phase).toMatch(
      /^(qualified|failed)$/,
    );
    expect(closed.world.history.events.at(-1)?.tags).toContain(
      "signature-base-source:registered-voters",
    );
    expect(() => assertWorldIntegrity(closed.world)).not.toThrow();
  });
});
