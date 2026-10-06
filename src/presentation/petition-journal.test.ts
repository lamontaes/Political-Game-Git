import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import { isEligibleVoterIn } from "../simulation/issue-record";
import {
  recordPrivateBelief,
  createFormationContext,
} from "../simulation/politics";
import { simulationMomentOnLocalDate } from "../simulation/dates";
import {
  deserializeWorld,
  serializeWorldPayload,
} from "../simulation/serialization";
import type { World } from "../simulation/types";
import {
  municipalRecallRule,
  startRecallPetition,
  recallPetitions,
  citizenPetitions,
  startCitizenPetition,
  petitionRule,
  recallPetitionClosesHandler,
  askToSign,
} from "../simulation/recall";
import { projectWorld39Journal } from "./world39-journal";

const seed = "b01-p3-petition-journal-20261006";
const place = drawRandomPlace(seed, (row) => {
  const government = municipalGovernmentForLifePlace(row);
  if (!government) return false;
  const rule = municipalRecallRule(government.key);
  return (
    rule.available &&
    rule.threshold !== null &&
    petitionRule("local-initiative", government.state, {
      governmentKey: government.key,
    }).available
  );
});
function setup(playerSigner = false) {
  const fixture = smallWorld({
    place: place.key,
    seed,
    people: 12,
    household: true,
  });
  const government = municipalGovernmentForLifePlace(place)!;
  let world = installMunicipalGovernment(fixture.world, {
    governmentKey: government.key,
    jurisdictionId: fixture.jurisdictionId,
    formedAt: fixture.world.currentDate,
  });
  const adults = world.personOrder.filter((id) =>
    isEligibleVoterIn(world, id, fixture.jurisdictionId, world.currentDate),
  );
  const circulatorPersonId = adults[0]!;
  const targetPersonId = adults[1]!;
  const signerPersonId = adults[2]!;
  world = seatMunicipalMember(world, {
    governmentKey: government.key,
    personId: targetPersonId,
    startedAt: world.currentDate,
    role: "member",
    seatLabel: "Seat1",
  });
  world = {
    ...world,
    control: {
      kind: "person",
      personId: playerSigner ? signerPersonId : circulatorPersonId,
    },
  };
  for (const personId of adults.filter((id) => id !== targetPersonId))
    world = recordPrivateBelief(world, {
      stableKey: `petition-view:${personId}`,
      personId,
      propositionId: null,
      subject: { kind: "official", personId: targetPersonId },
      formedAt: world.currentDate,
      position: "oppose",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale:
        "The resident wants the official removed for the recorded issue.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
  world = startRecallPetition(world, {
    governmentKey: government.key,
    petitionerPersonId: circulatorPersonId,
    targetPersonId,
  });
  return {
    world,
    adults,
    circulatorPersonId,
    signerPersonId,
    petition: recallPetitions(world)[0]!,
  };
}
function closeAt(world: World, stableKey: string, closesAt: string) {
  const due = world.history.futureDueItems.find(
    (row) => row.stableKey === `${stableKey}:closes`,
  )!;
  const atClose = {
    ...world,
    currentDate: closesAt,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, closesAt),
  } as World;
  return recallPetitionClosesHandler(atClose, due).world;
}

describe(`a petition's closing in the petitioner's Journal (${place.key}, ${seed})`, () => {
  it("says a recall that fell short had no valid signatures, in the filer's words, and keeps it after reload", () => {
    const input = setup();
    const closed = closeAt(
      input.world,
      input.petition.stableKey,
      input.petition.closesAt,
    );
    const closing = closed.history.events.at(-1)!;
    expect(closing.tags).toContain("outcome:failed");
    const journal = projectWorld39Journal(closed, input.circulatorPersonId);
    const line = journal.entries.find((entry) => entry.sourceId === closing.id);
    expect(line?.text).toMatch(
      /^My petition did not qualify: it had no valid signatures and needed \d+\.$/,
    );
    const reopened = deserializeWorld(serializeWorldPayload(closed));
    expect(
      projectWorld39Journal(reopened, input.circulatorPersonId).entries.find(
        (entry) => entry.sourceId === closing.id,
      )?.text,
    ).toBe(line!.text);
    // Somebody who had nothing to do with it has no such entry.
    const bystander = input.adults.find(
      (id) => id !== input.circulatorPersonId,
    )!;
    expect(
      projectWorld39Journal(closed, bystander).entries.some(
        (entry) => entry.sourceId === closing.id,
      ),
    ).toBe(false);
  });

  it("says a proposition petition that qualified, with the count from its asked and decided signatures", () => {
    const input = setup();
    const government = municipalGovernmentForLifePlace(place)!;
    const propositionId = Object.values(
      input.world.policyCatalog.propositions,
    )[0]!.id;
    let world = startCitizenPetition(input.world, {
      kind: "local-initiative",
      petitionerPersonId: input.circulatorPersonId,
      jurisdictionId: input.petition.jurisdictionId,
      stateUsps: government.state,
      governmentKey: government.key,
      propositionId,
    });
    const petition = citizenPetitions(world).find(
      (row) => row.kind === "local-initiative",
    )!;
    for (const signerPersonId of input.adults.filter(
      (id) => id !== input.circulatorPersonId,
    )) {
      world = recordPrivateBelief(world, {
        stableKey: `proposition-view:${signerPersonId}`,
        personId: signerPersonId,
        propositionId,
        formedAt: world.currentDate,
        position: "support",
        conviction: "strong",
        salience: "central",
        flexibility: "firm",
        rationale:
          "The resident supports this petition's recorded proposition.",
        formation: createFormationContext("reflection:initial"),
        supersedesBeliefId: null,
      });
      world = askToSign(world, {
        petition,
        signerPersonId,
        circulatorPersonId: input.circulatorPersonId,
      });
    }
    const closed = closeAt(world, petition.stableKey, petition.closesAt);
    const closing = closed.history.events.at(-1)!;
    expect(closing.tags).toContain("outcome:qualified");
    const signatures = input.adults.length - 1;
    const line = projectWorld39Journal(
      closed,
      input.circulatorPersonId,
    ).entries.find((entry) => entry.sourceId === closing.id);
    expect(line?.text).toBe(
      `My petition qualified, with ${signatures} valid signatures counted.`,
    );
  });
});
