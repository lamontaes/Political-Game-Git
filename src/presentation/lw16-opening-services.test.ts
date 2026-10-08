import { expect, it } from "vitest";
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "./observer-world";
import { enactLawFixture } from "./enact-law-fixture";
import { fundedServiceFixture } from "../../tests/fixtures/funded-service-fixture";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { requestPublicService } from "../simulation/public-service-requests";
import { addSimulationMinutes } from "../simulation/dates";
import { performScheduledActivity } from "../simulation/time-work";
import { lawExposuresOf } from "../simulation/law-exposure";
import { personName } from "../simulation/people";
import { lawInForce } from "../simulation/governing/law-in-force";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import housingFirstService from "../../data/research/health/housing-first-service.json";

const seed = "lw16-opening-service-p2342";
const place = observerPlace(seed);

it(`a new game's named resident receives housing assistance in ${place.displayName} (${place.stateJurisdictionKey}, seed ${seed})`, () => {
  const opened = openObserverWorld(observerSetup(seed, place.key));
  const jurisdiction = stateJurisdictionForKey(place.stateJurisdictionKey)!;
  const enacted = enactLawFixture(
    opened.world,
    jurisdiction.id,
    null,
    housingFirstService.questionKey,
    "yes",
  );
  // The new game's people and institutions are generated normally. Supplied
  // legislative votes and the funded operating contract isolate delivery;
  // this is not a claim that an NPC independently sponsored the law.
  const funded = fundedServiceFixture(
    place.stateJurisdictionKey,
    housingFirstService.questionKey,
    {
      world: enacted,
      personId: opened.anchorPersonId,
    },
  );
  const proposition = Object.values(
    funded.world.policyCatalog.propositions,
  ).find((p) => p.stableKey === housingFirstService.questionKey)!;
  expect(
    lawInForce(funded.world, jurisdiction.id, proposition.id),
  ).toMatchObject({
    answer: "yes",
    measureId: funded.measureId,
  });
  const start = addSimulationMinutes(funded.world.currentMoment, 30);
  const requested = requestPublicService(funded.world, {
    personId: opened.anchorPersonId,
    commitmentId: funded.commitmentId,
    start,
    end: addSimulationMinutes(start, housingFirstService.visit.minutes),
  });
  if (requested.kind !== "scheduled") throw new Error(requested.reason);
  const completed = performScheduledActivity(
    requested.world,
    requested.activityId,
  );
  const receipt = completed.history.events.find(
    (event) =>
      event.type === "service.delivery-recorded" &&
      event.involvedEntityIds.includes(requested.activityId),
  );
  expect(receipt).toBeDefined();
  expect(receipt!.lawEffectStamps![0]).toMatchObject({
    questionKey: housingFirstService.questionKey,
    effectKind: "service-delivered",
  });
  const own = lawExposuresOf(completed, opened.anchorPersonId).filter(
    (entry) => entry.measureId === funded.measureId,
  );
  expect(own.length).toBeGreaterThan(0);
  expect(
    lawExposuresOf(
      deserializeWorld(serializeWorld(completed)),
      opened.anchorPersonId,
    ),
  ).toEqual(lawExposuresOf(completed, opened.anchorPersonId));
  console.info(
    JSON.stringify({
      seed,
      world: completed.id,
      place: place.displayName,
      jurisdiction: place.stateJurisdictionKey,
      date: completed.currentDate,
      law: funded.measureId,
      effect: receipt!.id,
      person: opened.anchorPersonId,
      name: personName(completed.people[opened.anchorPersonId]!),
      exposure: own[0]!.id,
    }),
  );
}, 120_000);
