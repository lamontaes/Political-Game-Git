import { randomInt, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { askToSign } from "./candidate-petitions";
import { recallPetitionSignatures } from "./recall";
import { isEligibleVoterIn } from "./issue-record";
import { lifePlaceStateIdentities, searchLifePlaces } from "./index";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import type { EntityId } from "./types";

describe("citizen petition signer decisions", () => {
  it("records an official petition ask in a fresh game at a random place", () => {
    const states = lifePlaceStateIdentities();
    const state = states[randomInt(states.length)]!;
    const places = searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    });
    const place = places[randomInt(places.length)]!;
    const seed = randomUUID();
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
    });
    const signerPersonId = game.playerPersonId;
    const circulatorPersonId = game.world.personOrder.find(
      (personId) => personId !== signerPersonId,
    )!;
    const targetPersonId = game.world.personOrder.find(
      (personId) =>
        personId !== signerPersonId && personId !== circulatorPersonId,
    )!;
    const result = askToSign(game.world, {
      petition: {
        petitionId: "random-place-recall-proof",
        jurisdictionId: game.world.people[signerPersonId]!.homeJurisdictionId,
        subject: { kind: "official", personId: targetPersonId },
      },
      signerPersonId,
      circulatorPersonId,
      at: game.world.currentDate,
    });
    const event = result.world.history.events.find(
      (row) => row.id === result.eventId,
    )!;
    console.info(
      `B18 RANDOM PETITION place=${place.displayName} key=${place.key} seed=${seed} world=${game.world.id} signer=${signerPersonId} target=${targetPersonId} decision=${result.decision} event=${event.id}`,
    );
    if (process.env.OCD_CITIZEN_PETITION_RECEIPT) {
      writeFileSync(
        process.env.OCD_CITIZEN_PETITION_RECEIPT,
        JSON.stringify(
          {
            place: place.displayName,
            placeKey: place.key,
            state: state.jurisdictionKey,
            seed,
            worldId: game.world.id,
            signerPersonId,
            petitionSubjectPersonId: targetPersonId,
            decision: result.decision,
            eventId: event.id,
            tags: event.tags,
          },
          null,
          2,
        ) + "\n",
      );
    }
    expect(event.tags).toContain("civic:petition-ask");
    expect(event.tags).toContain("petition:random-place-recall-proof");
  }, 120_000);

  it("records one signer decision for an official petition through askToSign", () => {
    const world = createDemoWorld("petition-official-subject");
    const signerPersonId = world.personOrder[0]!;
    const circulatorPersonId = world.personOrder[1]!;
    const targetPersonId = world.personOrder[2]!;
    const jurisdictionId = world.people[signerPersonId]!.homeJurisdictionId;

    const result = askToSign(world, {
      petition: {
        petitionId: "recall:test",
        jurisdictionId,
        subject: { kind: "official", personId: targetPersonId },
      },
      signerPersonId,
      circulatorPersonId,
      at: world.currentDate,
    });

    const event = result.world.history.events.find(
      (record) => record.id === result.eventId,
    );
    expect(result.decision).toMatch(/^(sign|decline)$/);
    expect(event?.tags).toContain("civic:petition-ask");
    expect(event?.tags).toContain("petition:recall:test");
    expect(event?.tags).toContain(`decision:${result.decision}`);
    expect(event?.involvedEntityIds).toContain(targetPersonId);
  });

  it("decides a proposition signature from the requested stance and saved beliefs", () => {
    const world = createDemoWorld("petition-proposition-subject");
    const signerPersonId = world.personOrder[0]!;
    const circulatorPersonId = world.personOrder[1]!;
    const propositionId = Object.keys(world.policyCatalog.propositions)[0] as
      EntityId | undefined;
    if (!propositionId)
      throw new Error("Demo world has no policy proposition.");

    const result = askToSign(world, {
      petition: {
        petitionId: "initiative:test",
        jurisdictionId: world.people[signerPersonId]!.homeJurisdictionId,
        subject: {
          kind: "proposition",
          propositionId,
          requestedStance: "support",
        },
      },
      signerPersonId,
      circulatorPersonId,
      at: world.currentDate,
    });

    const event = result.world.history.events.find(
      (record) => record.id === result.eventId,
    );
    expect(event?.tags).toContain("petition:initiative:test");
    expect(event?.type).toMatch(/^civic\.petition-(signed|declined)$/);
  });

  it("counts only a recorded signature from an eligible resident", () => {
    const world = createDemoWorld("petition-signature-count");
    const signerPersonId = world.personOrder.find((personId) => {
      const jurisdictionId = world.people[personId]!.homeJurisdictionId;
      return isEligibleVoterIn(
        world,
        personId,
        jurisdictionId,
        world.currentDate,
      );
    });
    if (!signerPersonId) throw new Error("Demo world has no eligible voter.");
    const jurisdictionId = world.people[signerPersonId]!.homeJurisdictionId;
    const targetPersonId = world.personOrder.find(
      (personId) => personId !== signerPersonId,
    )!;
    const petition = {
      stableKey: "recall:fixture",
      jurisdictionId,
      targetPersonId,
      startedAt: world.currentDate,
      closesAt: world.currentDate,
    };
    const asked = askToSign(world, {
      petition: {
        petitionId: petition.stableKey,
        jurisdictionId,
        subject: { kind: "official", personId: targetPersonId },
      },
      signerPersonId,
      circulatorPersonId: targetPersonId,
      at: world.currentDate,
    });
    const count = recallPetitionSignatures(asked.world, petition);
    expect(count.registeredVoters).toBeGreaterThan(0);
    expect(count.signerPersonIds.includes(signerPersonId)).toBe(
      asked.decision === "sign",
    );
  });
});
