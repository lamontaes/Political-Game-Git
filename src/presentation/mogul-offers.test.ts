import { beforeAll, describe, expect, it } from "vitest";

import {
  addDays,
  campaignForCandidate,
  ensureCampaignOpponents,
  ensureStateJurisdiction,
  fileCampaign,
  deserializeWorld,
  makeCurrencyCode,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  answerMogulOffer,
  deliverMogulStance,
  mogulOffers,
  openMogulOffersFor,
  produceMogulOffers,
  recordMogulInterest,
  UNRESEARCHED_MOGUL_OFFERS,
} from "../simulation/moguls";
import { pressRecordsOfKind } from "../simulation/press";
import { stateOfJurisdiction } from "../simulation/press/outlets";
import { publicPositionAtDate } from "../simulation/queries";
import { resourcePositionAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectMogulOffers } from "./mogul-offers-view";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

const USD = makeCurrencyCode("USD");
const LONG = 900_000;
const FORTUNE = 2_000_000_000_00; // two billion dollars, in cents

/**
 * An Oregon candidate for governor and one very rich Oregonian who wants the
 * state to stay out of consumer-loan rates. Wealth is seeded by hand here: the
 * lane that decides who is rich has not landed, and this test is about what a
 * rich person with an interest does, not how they got rich.
 */
function oregonRace(seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 45,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const world = openOrdinaryLife(game.world, personId);
  const identity = stateExecutiveIdentity("OR")!;
  const jurisdictionId = stateJurisdictionForKey("US-OR")!.id;
  const opponents = ensureCampaignOpponents(
    ensureStateJurisdiction(world, "OR"),
    {
      stableKey: "mogul-offers",
      jurisdictionId,
      count: 1,
      excludePersonIds: [personId],
    },
  );
  const filed = fileCampaign(opponents.world, {
    stableKey: "mogul-offers",
    candidatePersonId: personId,
    jurisdictionId,
    officeKey: identity.officeKey,
    districtBinding: null,
    electionDate: addDays(world.currentDate, 480),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "Committee for the Oregon fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds: [],
    treasuryCurrency: USD,
  });
  let next = filed.world;
  const home = stateOfJurisdiction(next, jurisdictionId);
  const mogulId = next.personOrder.find((id) => {
    const person = next.people[id]!;
    return (
      id !== personId &&
      !opponents.personIds.includes(id) &&
      person.birthDate < "1980-01-01" &&
      stateOfJurisdiction(next, person.homeJurisdictionId) === home
    );
  })!;
  next = createResourcePosition(next, {
    stableKey: `mogul-offers:fortune:${mogulId}`,
    owner: { kind: "person", personId: mogulId },
    openedAt: next.currentDate,
    openingBalance: money(FORTUNE, USD),
    provenance: { kind: "authored", note: "Test fixture: a fortune." },
  });
  const loanRates = Object.values(next.policyCatalog.propositions).find((row) =>
    row.stableKey.endsWith("cap-consumer-loan-rates"),
  )!;
  next = recordMogulInterest(next, {
    personId: mogulId,
    propositionId: loanRates.id,
    wants: "oppose",
    because: "Their lending business would earn less under a rate cap.",
  });
  return {
    world: next,
    personId,
    rivalId: opponents.personIds[0]!,
    mogulId,
    propositionId: loanRates.id,
  };
}

function balance(world: World, personId: EntityId): number {
  return (
    resourcePositionAt(world, { kind: "person", personId }, USD)?.liquidBalance
      .minorUnits ?? 0
  );
}

/** Weekly passes until the mogul has made an offer to the player. */
function untilOfferToPlayer(world: World, personId: EntityId): World {
  let next = world;
  for (let week = 0; week < 60; week += 1) {
    if (openMogulOffersFor(next, personId).length > 0) return next;
    next = passOrdinaryDays(next, 7);
  }
  return next;
}

describe("a very rich person with an interest makes offers", () => {
  it(
    "approaches running candidates in their own state, unprompted",
    () => {
      const race = oregonRace("mogul-offers-approach");
      let world = race.world;
      for (let week = 0; week < 40; week += 1) {
        world = passOrdinaryDays(world, 7);
      }
      const offers = mogulOffers(world, { mogulPersonId: race.mogulId });
      expect(offers.length).toBeGreaterThan(0);
      for (const offer of offers) {
        expect([race.personId, race.rivalId]).toContain(offer.toPersonId);
        expect(offer.propositionId).toBe(race.propositionId);
        expect(offer.wants).toBe("oppose");
        expect(offer.amount.minorUnits).toBeGreaterThanOrEqual(
          UNRESEARCHED_MOGUL_OFFERS.minimumOfferMinorUnits,
        );
        expect(offer.amount.minorUnits).toBeLessThanOrEqual(
          UNRESEARCHED_MOGUL_OFFERS.maximumOfferMinorUnits,
        );
      }
      // Each approach is the mogul's own recorded decision, not a draw.
      expect(
        world.history.decisionTraces.filter(
          (trace) =>
            trace.context.decisionType === "mogul.approach" &&
            trace.context.actorPersonId === race.mogulId,
        ).length,
      ).toBeGreaterThan(0);
    },
    LONG,
  );

  it(
    "approaches an opponent too, who answers for themselves",
    () => {
      const race = oregonRace("mogul-offers-opponent");
      let world = race.world;
      const toRival = (w: World) =>
        mogulOffers(w, {
          mogulPersonId: race.mogulId,
          toPersonId: race.rivalId,
        });
      for (let week = 0; week < 60 && toRival(world).length === 0; week += 1) {
        world = passOrdinaryDays(world, 7);
      }
      const offer = toRival(world)[0]!;
      expect(offer).toBeDefined();
      // Nobody waits on an opponent's answer: they give it themselves.
      expect(offer.state).not.toBe("open");
      expect(
        world.history.decisionTraces.some(
          (trace) =>
            trace.context.decisionType === "mogul.answer" &&
            trace.context.actorPersonId === race.rivalId,
        ),
      ).toBe(true);
      if (offer.state === "delivered") {
        expect(
          publicPositionAtDate(
            world,
            race.rivalId,
            race.propositionId,
            world.currentDate,
          )?.stance,
        ).toBe("oppose");
      }
    },
    LONG,
  );

  it(
    "makes no offers without an interest, however rich",
    () => {
      const race = oregonRace("mogul-offers-no-interest");
      const withoutInterest: World = {
        ...race.world,
        history: {
          ...race.world.history,
          goalStates: race.world.history.goalStates.filter(
            (goal) => goal.personId !== race.mogulId,
          ),
        },
      };
      expect(produceMogulOffers(withoutInterest)).toBe(withoutInterest);
    },
    LONG,
  );
});

describe("the player takes a deal and never delivers", () => {
  function takeDeal(seed: string) {
    const race = oregonRace(seed);
    let world = untilOfferToPlayer(race.world, race.personId);
    let offer = openMogulOffersFor(world, race.personId)[0];
    // A donation is not what this test is about; decline it and wait again.
    for (
      let tries = 0;
      offer && offer.kind !== "deal" && tries < 8;
      tries += 1
    ) {
      world = answerMogulOffer(world, {
        offerEventId: offer.eventId,
        answer: "decline",
      }).world;
      world = untilOfferToPlayer(
        passOrdinaryDays(world, UNRESEARCHED_MOGUL_OFFERS.reconsiderDays),
        race.personId,
      );
      offer = openMogulOffersFor(world, race.personId)[0];
    }
    return { race, world, offer };
  }

  let race: ReturnType<typeof oregonRace>;
  let world: World;
  let offer: ReturnType<typeof openMogulOffersFor>[number] | undefined;
  let accepted: ReturnType<typeof answerMogulOffer>;
  beforeAll(() => {
    ({ race, world, offer } = takeDeal("mogul-offers-deal"));
    accepted = answerMogulOffer(world, {
      offerEventId: offer!.eventId,
      answer: "accept",
    });
  }, LONG);

  it(
    "is offered a deal naming the stance and the money",
    () => {
      expect(offer?.kind).toBe("deal");
      const event = world.history.events.find(
        (row) => row.id === offer!.eventId,
      )!;
      expect(event.visibility).toBe("private");
      expect(event.summary).toContain("publicly oppose");
      expect(
        world.history.knowledge.some(
          (row) => row.personId === race.personId && row.eventId === event.id,
        ),
      ).toBe(true);
    },
    LONG,
  );

  it(
    "shows the player who offered, how much and what for",
    () => {
      const view = projectMogulOffers(world, race.personId)[0]!;
      expect(view.offer).toMatch(/offers your campaign \$[\d,]+\.$/);
      expect(view.ask).toBe(
        "In return, they want you to say in public that you oppose this: " +
          `${world.policyCatalog.propositions[race.propositionId]!.name}.`,
      );
      expect(view.canAnswer).toBe(true);
      const after = projectMogulOffers(accepted.world, race.personId)[0]!;
      expect(after.canAnswer).toBe(false);
      expect(after.canDeliver).toBe(true);
      expect(after.deliverLabel).toBe("Say in public that you oppose it");
    },
    LONG,
  );

  it(
    "moves the money into the committee and writes an M4 occurrence",
    () => {
      const campaign = campaignForCandidate(accepted.world, race.personId)!;
      const committee = (w: World) =>
        resourcePositionAt(
          w,
          { kind: "organization", organizationId: campaign.organizationId },
          USD,
        )!.liquidBalance.minorUnits;
      expect(committee(accepted.world) - committee(world)).toBe(
        offer!.amount.minorUnits,
      );
      expect(
        balance(world, race.mogulId) - balance(accepted.world, race.mogulId),
      ).toBe(offer!.amount.minorUnits);
      const occurrence = pressRecordsOfKind(
        accepted.world,
        "financial-occurrence",
      ).find((row) => row.id === accepted.offer.occurrenceId)!;
      expect(occurrence.family).toBe("M4");
      expect(occurrence.actorPersonIds).toContain(race.personId);
      expect(occurrence.recordEvidenceArtifactIds).toHaveLength(2);
      expect(accepted.offer.state).toBe("accepted");
    },
    LONG,
  );

  it(
    "is found out through the state's body when the stance never comes",
    () => {
      let after = accepted.world;
      const finding = (w: World) =>
        pressRecordsOfKind(w, "matter").find(
          (matter) =>
            matter.family === "M4" &&
            matter.occurrenceId === accepted.offer.occurrenceId,
        );
      // The mogul's own choice decides whether they go public, so a single seed
      // may let it go. Either end is recorded; neither is silent.
      for (
        let days = 0;
        days < UNRESEARCHED_MOGUL_OFFERS.deliveryWindowDays + 60;
        days += 7
      ) {
        after = passOrdinaryDays(after, 7);
      }
      const state = mogulOffers(after).find(
        (row) => row.eventId === offer!.eventId,
      )!.state;
      // This seed's mogul goes public; a mogul who lets it go is the other
      // recorded end, and writes no matter at all.
      expect(state).toBe("exposed");
      const matter = finding(after)!;
      expect(matter.subjectPersonIds).toEqual([race.personId]);
      const outcome = (w: World) =>
        pressRecordsOfKind(w, "proceeding-step").find(
          (step) =>
            step.outcome === "finding" &&
            pressRecordsOfKind(w, "matter-proceeding").some(
              (row) =>
                row.id === step.proceedingId && row.matterId === matter.id,
            ),
        );
      for (let days = 0; days < 420 && !outcome(after); days += 14) {
        after = passOrdinaryDays(after, 14);
      }
      // The state's body holds the mogul's message and the ledger entry, so
      // the inquiry reaches a finding against the candidate.
      expect(outcome(after)).toBeDefined();
      // The deal survives a save and reload.
      const reloaded = deserializeWorld(serializeWorld(after));
      expect(
        mogulOffers(reloaded).find((row) => row.eventId === offer!.eventId)!
          .state,
      ).toBe(state);
    },
    LONG,
  );

  it(
    "is never exposed once the stance is delivered",
    () => {
      let after = deliverMogulStance(accepted.world, offer!.eventId);
      expect(
        publicPositionAtDate(
          after,
          race.personId,
          race.propositionId,
          after.currentDate,
        )?.stance,
      ).toBe("oppose");
      for (
        let days = 0;
        days < UNRESEARCHED_MOGUL_OFFERS.deliveryWindowDays + 30;
        days += 7
      ) {
        after = passOrdinaryDays(after, 7);
      }
      expect(
        mogulOffers(after).find((row) => row.eventId === offer!.eventId)!.state,
      ).toBe("delivered");
      expect(
        pressRecordsOfKind(after, "matter").some(
          (matter) => matter.occurrenceId === accepted.offer.occurrenceId,
        ),
      ).toBe(false);
    },
    LONG,
  );
});
