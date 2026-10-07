import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { municipalGovernmentForLifePlace } from "./municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "./municipal-public-work";
import { isEligibleVoterIn } from "./issue-record";
import { recordPrivateBelief, createFormationContext } from "./politics";
import { resolveLifeSituation } from "./character-history";
import { simulationMomentOnLocalDate } from "./dates";
import { deserializeWorld, serializeWorldPayload } from "./serialization";
import { modelCampaignFieldReach } from "./campaign-contact-calibration";
import { recordWorldEvent } from "./world";
import type { HistoricalEvent, World } from "./types";
import {
  municipalRecallRule,
  startRecallPetition,
  recallPetitions,
  citizenPetitions,
  startCitizenPetition,
  petitionRule,
  recallPetitionClosesHandler,
  askToSign,
  circulatePetition,
  recordedPetitionSignatures,
  openPetitionAsksFor,
  PETITION_ASKED,
  PETITION_SIGNED,
  PETITION_SIGNATURE_REVIEWED,
} from "./recall";

const seed = "session-110-asked-signatures";
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
function close(world: World, input: ReturnType<typeof setup>) {
  const due = world.history.futureDueItems.find(
    (row) => row.stableKey === `${input.petition.stableKey}:closes`,
  )!;
  const atClose = {
    ...world,
    currentDate: input.petition.closesAt,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      input.petition.closesAt,
    ),
  };
  return recallPetitionClosesHandler(atClose, due).world;
}
function duplicate(world: World, signed: HistoricalEvent) {
  return recordWorldEvent(world, {
    stableKey: `${signed.stableKey}:duplicate`,
    type: signed.type,
    occurredAt: signed.occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: signed.jurisdictionId,
    involvedEntityIds: signed.involvedEntityIds,
    participants: signed.participants,
    personFactConstraints: [],
    visibility: signed.visibility,
    tags: signed.tags,
    summary: "A duplicate signature record was submitted.",
    context: signed.context,
  });
}
describe("petitions close on asked, decided signatures", () => {
  it("uses the same asked signer records to close a proposition petition", () => {
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
    expect(petition.kind).toBe("local-initiative");
    if (petition.kind === "recall")
      throw new Error("Expected a proposition petition");
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
    const due = world.history.futureDueItems.find(
      (row) => row.stableKey === `${petition.stableKey}:closes`,
    )!;
    world = {
      ...world,
      currentDate: petition.closesAt,
      currentMoment: simulationMomentOnLocalDate(
        world.currentMoment,
        petition.closesAt,
      ),
    };
    const result = recallPetitionClosesHandler(world, due);
    expect(result.status).toBe("resolved");
    expect(
      citizenPetitions(result.world).find(
        (row) => row.stableKey === petition.stableKey,
      )!.phase,
    ).toBe("awaiting-election");
    const count = recordedPetitionSignatures(result.world, petition);
    expect(count.yes).toBe(input.adults.length - 1);
    expect(result.world.history.events.at(-1)!.tags).toContain(
      `signatures:${count.yes}`,
    );
    expect(
      citizenPetitions(deserializeWorld(serializeWorldPayload(result.world))),
    ).toEqual(citizenPetitions(result.world));
  });
  it("does not count favorable views from anyone who was never asked", () => {
    const input = setup();
    expect(input.world.history.privateBeliefs.length).toBeGreaterThan(0);
    expect(recordedPetitionSignatures(input.world, input.petition).yes).toBe(0);
    const closed = close(input.world, input);
    expect(recallPetitions(closed)[0]!.phase).toBe("failed-to-qualify");
    expect(closed.history.events.at(-1)!.tags).toContain("signatures:0");
  });
  it("records NPC signers only after their own asked decision and rejects duplicates", () => {
    const input = setup();
    const world = askToSign(input.world, {
      petition: input.petition,
      signerPersonId: input.signerPersonId,
      circulatorPersonId: input.circulatorPersonId,
    });
    const signed = world.history.events.find(
      (row) => row.type === PETITION_SIGNED,
    )!;
    expect(signed).toBeDefined();
    const counted = recordedPetitionSignatures(
      duplicate(world, signed),
      input.petition,
    );
    expect(counted.yes).toBe(1);
    expect(counted.invalid).toEqual([
      expect.objectContaining({
        reason: "A prior signed record already counts for this signer.",
      }),
    ]);
    expect(world.history.decisionTraces.at(-1)).toMatchObject({
      context: { actorPersonId: input.signerPersonId, randomness: "none" },
      selectedOptionKey: "sign",
    });
  });
  it("rejects an unregistered signature when the clerk's actual record says so", () => {
    const input = setup();
    let world = askToSign(input.world, {
      petition: input.petition,
      signerPersonId: input.signerPersonId,
      circulatorPersonId: input.circulatorPersonId,
    });
    const signed = world.history.events.find(
      (row) => row.type === PETITION_SIGNED,
    )!;
    world = recordWorldEvent(world, {
      stableKey: `${signed.stableKey}:clerk-review`,
      type: PETITION_SIGNATURE_REVIEWED,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: input.petition.jurisdictionId,
      involvedEntityIds: [input.signerPersonId],
      participants: [
        {
          personId: input.signerPersonId,
          role: "focus:signer",
          detail: "Registration review subject",
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [`signature:${signed.id}`, "validity:invalid"],
      summary: "The clerk recorded this signer as unregistered.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: "This signer is unregistered in the clerk's record.",
        immediateReaction: null,
      },
    });
    const counted = recordedPetitionSignatures(world, input.petition);
    expect(counted.yes).toBe(0);
    expect(counted.invalid[0]!.reason).toContain("unregistered");
  });
  it("rejects a signed record that has no preceding ask and an ineligible resident", () => {
    const input = setup();
    const world = askToSign(input.world, {
      petition: input.petition,
      signerPersonId: input.signerPersonId,
      circulatorPersonId: input.circulatorPersonId,
    });
    const signed = world.history.events.find(
      (row) => row.type === PETITION_SIGNED,
    )!;
    const withoutAsk = duplicate(input.world, signed);
    expect(
      recordedPetitionSignatures(withoutAsk, input.petition).invalid[0]!.reason,
    ).toContain("No preceding request");
    const person = world.people[input.signerPersonId]!;
    const underage = {
      ...world,
      people: {
        ...world.people,
        [person.id]: { ...person, birthDate: world.currentDate },
      },
    };
    expect(recordedPetitionSignatures(underage, input.petition).yes).toBe(0);
    expect(
      recordedPetitionSignatures(underage, input.petition).invalid[0]!.reason,
    ).toContain("eligibility");
  });
  it("caps reached residents by the shared field estimate and never converts all views into signatures", () => {
    const input = setup();
    const world = circulatePetition(input.world, {
      petitionKey: input.petition.stableKey,
      circulatorPersonId: input.circulatorPersonId,
      minutes: 60,
    });
    const reach = modelCampaignFieldReach(
      "door-canvass",
      60,
    )!.estimatedCompletedConversations!;
    const asks = world.history.events.filter(
      (row) => row.type === PETITION_ASKED,
    );
    expect(asks).toHaveLength(reach.min);
    const counted = recordedPetitionSignatures(world, input.petition);
    expect(counted.yes).toBeLessThan(input.world.history.privateBeliefs.length);
    expect(
      counted.valid.every((row) =>
        asks.some((ask) => ask.id === row.askEventId),
      ),
    ).toBe(true);
  });
  it("leaves an ignored human request unsigned even after save/reload and a control change", () => {
    const input = setup(true);
    let world = askToSign(input.world, {
      petition: input.petition,
      signerPersonId: input.signerPersonId,
      circulatorPersonId: input.circulatorPersonId,
    });
    expect(openPetitionAsksFor(world, input.signerPersonId)).toHaveLength(1);
    expect(world.history.decisionTraces).toHaveLength(
      input.world.history.decisionTraces.length,
    );
    world = deserializeWorld(serializeWorldPayload(world));
    world = {
      ...world,
      control: { kind: "person", personId: input.circulatorPersonId },
    };
    world = close(world, input);
    expect(
      world.history.events.filter((row) => row.type === PETITION_SIGNED),
    ).toEqual([]);
    expect(recordedPetitionSignatures(world, input.petition).yes).toBe(0);
    expect(world.history.decisionTraces).toHaveLength(
      input.world.history.decisionTraces.length,
    );
  });
  it("does not treat a generated life answer as a human selection", () => {
    const input = setup(true);
    let world = askToSign(input.world, {
      petition: input.petition,
      signerPersonId: input.signerPersonId,
      circulatorPersonId: input.circulatorPersonId,
    });
    world = {
      ...world,
      control: { kind: "person", personId: input.circulatorPersonId },
    };
    const action = resolveLifeSituation(world, {
      stableKey: "petition-generated-answer",
      mode: "quick-generated",
      personId: input.signerPersonId,
      situationKey: "adult.petition-ask",
      optionKey: "sign",
      occurredAt: world.currentDate,
      jurisdictionId: input.petition.jurisdictionId,
    });
    if (action.status !== "resolved")
      throw new Error("Expected generated action fixture");
    expect(
      action.world.history.appraisals.find(
        (row) => row.eventId === action.eventId,
      )!.provenance.kind,
    ).toBe("reflection");
    world = deserializeWorld(serializeWorldPayload(action.world));
    world = close(world, input);
    expect(recordedPetitionSignatures(world, input.petition).yes).toBe(0);
    expect(
      world.history.events.filter((row) => row.type === PETITION_SIGNED),
    ).toEqual([]);
  });
  it.each(["sign", "refuse"] as const)(
    "traces the actual played %s action through reload and deadline follow-through",
    (optionKey) => {
      const input = setup(true);
      let world = askToSign(input.world, {
        petition: input.petition,
        signerPersonId: input.signerPersonId,
        circulatorPersonId: input.circulatorPersonId,
      });
      const action = resolveLifeSituation(world, {
        stableKey: `petition-played:${optionKey}`,
        mode: "played",
        personId: input.signerPersonId,
        situationKey: "adult.petition-ask",
        optionKey,
        occurredAt: world.currentDate,
        jurisdictionId: input.petition.jurisdictionId,
      });
      expect(action.status).toBe("resolved");
      if (action.status !== "resolved")
        throw new Error("Expected the canonical played action.");
      const actionId = action.eventId;
      world = deserializeWorld(serializeWorldPayload(action.world));
      world = {
        ...world,
        control: { kind: "person", personId: input.circulatorPersonId },
      };
      world = close(world, input);
      const counted = recordedPetitionSignatures(world, input.petition);
      expect(counted.yes).toBe(optionKey === "sign" ? 1 : 0);
      const answered = world.history.events.find((row) =>
        row.tags.includes(`player-choice:${actionId}`),
      )!;
      expect(answered.context.choice).toBe(optionKey);
      const appraisal = world.history.appraisals.find(
        (row) =>
          row.eventId === actionId && row.provenance.kind === "player-choice",
      )!;
      expect(answered.tags).toContain(
        `player-choice-appraisal:${appraisal.id}`,
      );
      const trace = world.history.decisionTraces.find((row) =>
        answered.tags.includes(`signer-decision:${row.id}`),
      )!;
      expect(trace.context.actorPersonId).toBe(input.signerPersonId);
      expect(trace.selectedOptionKey).toBe(optionKey);
      expect(
        trace.context.considerations.some((row) =>
          row.sourceRefs.some(
            (ref) =>
              ref.kind === "historical-event" && ref.eventId === actionId,
          ),
        ),
      ).toBe(true);
    },
  );
});
