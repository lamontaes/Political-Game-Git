import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import { stableHash } from "../simulation/ids";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { addSimulationMinutes } from "../simulation/dates";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  residentTransitServiceFixture,
  RESIDENT_TRANSIT_QUESTION as QUESTION,
} from "../../tests/fixtures/resident-transit-service";
import {
  requestPublicServiceFromLife,
  residentTransitOffers,
  residentTransitAccess,
  residentTransitRecords,
} from "./public-service-work";
import { money } from "../simulation/resources";
import { settleProgramInstallment } from "../simulation/governing/public-program";
import {
  performScheduledActivity,
  scheduledActivityState,
} from "../simulation/time-work";
import { applyLawConsequences } from "../simulation/enacted-law-effects";
import { resourcePositionAt } from "../simulation/resource-queries";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import { personName } from "../simulation/people";
import { politicsIssueAccess } from "./politics-issues";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicServiceRequestPanel } from "../player/PublicServiceRequestPanel";

const SEED = "public-money-service-controlled-resident";
const places = lifePlaceStateIdentities();
const PLACE =
  places[parseInt(stableHash(SEED).slice(0, 8), 16) % places.length]!
    .jurisdictionKey;
const SERVICE_PLACES = [...places]
  .sort((a, b) =>
    stableHash(`${SEED}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${SEED}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5)
  .map((place) => ({
    place: place.jurisdictionKey,
    seed: `${SEED}:${place.jurisdictionKey}`,
  }));

describe(`public service requests use the saved controlled character (${PLACE}, seed ${SEED})`, () => {
  it.each(SERVICE_PLACES)(
    "reads an actual paid operator, requests a named rider's trip and preserves completion through Continue ($place, seed $seed)",
    ({ place, seed }) => {
      const admission = smallWorld({ place, people: 3, seed });
      if (!legislativePackForJurisdiction(admission.stateJurisdictionId)) {
        expect(residentTransitOffers(admission.world)).toEqual([]);
        const start = addSimulationMinutes(admission.world.currentMoment, 30);
        const refused = requestPublicServiceFromLife(admission.world, {
          commitmentId: admission.personId,
          start,
          end: addSimulationMinutes(start, 45),
        });
        expect(refused.kind).toBe("unsupported");
        expect(refused.world).toBe(admission.world);
        console.info(
          JSON.stringify({
            place,
            seed,
            result:
              "unsupported legislative procedure; no fabricated law, commitment or trip",
          }),
        );
        return;
      }
      const f = residentTransitServiceFixture(place, seed);
      expect(residentTransitOffers(f.beforeCommitment)).toEqual([]);
      const paid = settleProgramInstallment(f.world, f.commitmentId, 0);
      expect(paid.installment.status).toBe("posted");
      let world = deserializeWorld(serializeWorld(paid.world));
      const beforeProjection = serializeWorld(world);
      expect(residentTransitAccess(world, f.personId)).toBe(true);
      expect(politicsIssueAccess(world, f.personId)).toEqual({
        transit: false,
        tax: false,
      });
      expect(residentTransitOffers(world)).toMatchObject([
        { commitmentId: f.commitmentId, operatorId: f.operator },
      ]);
      expect(serializeWorld(world)).toBe(beforeProjection);
      const transfers = world.history.resourceTransferOutcomes;
      const operatorCash = resourcePositionAt(
        world,
        { kind: "organization", organizationId: f.operator },
        money(0, "USD").currency,
      )!.liquidBalance;
      expect(operatorCash).toEqual(money(20000, "USD"));
      const start = addSimulationMinutes(world.currentMoment, 30);
      const input = {
        commitmentId: f.commitmentId,
        start,
        end: addSimulationMinutes(start, 45),
      };
      const asked = requestPublicServiceFromLife(world, input);
      if (asked.kind !== "scheduled") throw new Error(asked.reason);
      expect(
        asked.world.history.events.find((e) => e.id === asked.requestEventId)
          ?.participants[0]?.personId,
      ).toBe(f.personId);
      expect(
        asked.world.history.events.filter(
          (e) => e.type === "service.delivery-recorded",
        ),
      ).toEqual([]);
      const requestedMarkup = renderToStaticMarkup(
        createElement(PublicServiceRequestPanel, {
          world: asked.world,
          onWorldChange: () => {
            throw new Error("A read-only render wrote the world.");
          },
        }),
      );
      expect(requestedMarkup).toContain("Your requested trips");
      expect(requestedMarkup).toContain("No completed service receipt yet.");
      expect(requestPublicServiceFromLife(asked.world, input).kind).toBe(
        "unsupported",
      );
      world = performScheduledActivity(
        deserializeWorld(serializeWorld(asked.world)),
        asked.activityId,
      );
      expect(scheduledActivityState(world, asked.activityId).status).toBe(
        "completed",
      );
      const deliveries = world.history.events.filter(
        (e) => e.type === "service.delivery-recorded",
      );
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0]!.participants[0]!.personId).toBe(f.personId);
      expect(deliveries[0]!.lawEffectStamps?.[0]).toMatchObject({
        questionKey: QUESTION,
        effectKind: "service-delivered",
        jurisdictionId: f.stateJurisdictionId,
      });
      expect(deliveries[0]!.lawEffectStamps?.[0]?.sourceRecordIds).toEqual(
        expect.arrayContaining([
          asked.activityId,
          asked.participationId,
          f.commitmentId,
          f.personId,
        ]),
      );
      const restored = deserializeWorld(serializeWorld(world));
      expect(
        residentTransitRecords(restored, f.personId).map(
          (activity) => activity.id,
        ),
      ).toEqual([asked.activityId]);
      expect(residentTransitAccess(restored, f.personId)).toBe(true);
      const completedMarkup = renderToStaticMarkup(
        createElement(PublicServiceRequestPanel, {
          world: restored,
          onWorldChange: () => {
            throw new Error("A read-only render wrote the world.");
          },
        }),
      );
      expect(completedMarkup).toContain("Service receipt recorded.");
      expect(completedMarkup).toContain("completed");
      expect(completedMarkup).not.toContain("File transit appropriation");
      const repeated = applyLawConsequences(restored, {
        activity: "service",
        activityId: asked.activityId,
        subjectIds: [f.personId],
        onDate: restored.currentDate,
      });
      expect(repeated).toBe(restored);
      expect(repeated.history.resourceTransferOutcomes).toEqual(transfers);
      stdout.write(
        JSON.stringify({
          place,
          seed,
          person: personName(world.people[f.personId]!),
          personId: f.personId,
          commitmentId: f.commitmentId,
          activityId: asked.activityId,
          deliveryId: deliveries[0]!.id,
          sourceRecordIds: deliveries[0]!.lawEffectStamps?.[0]?.sourceRecordIds,
          actualOperatorPaymentMinorUnits: operatorCash.minorUnits,
        }) + "\n",
      );
    },
  );
  it("an actual maintenance payment does not offer an operating trip", () => {
    const f = residentTransitServiceFixture(PLACE, SEED, "maintenance");
    expect(
      f.world.history.resourceTransferOutcomes.at(-1)?.transferredAmount,
    ).toEqual(money(20000, "USD"));
    expect(residentTransitOffers(f.world)).toEqual([]);
    const start = addSimulationMinutes(f.world.currentMoment, 30);
    const result = requestPublicServiceFromLife(f.world, {
      commitmentId: f.commitmentId,
      start,
      end: addSimulationMinutes(start, 45),
    });
    expect(result.kind).toBe("unsupported");
    if (result.kind !== "unsupported")
      throw new Error("Maintenance became operating service.");
    expect(result.reason).toBe(
      "The operator has not been paid for operating service yet.",
    );
    expect(result.world).toBe(f.world);
  });

  it("a resident cannot request from an absent operator or create money or a delivered trip", () => {
    const f = smallWorld({ place: PLACE, people: 3, seed: SEED });
    const world = deserializeWorld(serializeWorld(f.world));
    const before = serializeWorld(world);
    const start = addSimulationMinutes(world.currentMoment, 30);
    const result = requestPublicServiceFromLife(world, {
      commitmentId: f.personId,
      start,
      end: addSimulationMinutes(start, 45),
    });
    expect(result.kind).toBe("unsupported");
    if (result.kind !== "unsupported")
      throw new Error("Missing commitment was accepted.");
    expect(result.reason).toBe("No such program commitment is recorded.");
    expect(serializeWorld(result.world)).toBe(before);
    expect(result.world.history.scheduledActivities).toEqual(
      world.history.scheduledActivities,
    );
    expect(
      result.world.history.events.filter(
        (e) => e.type === "service.delivery-recorded",
      ),
    ).toEqual([]);
  });

  it("observer control does not request a service on behalf of any saved resident", () => {
    const f = smallWorld({ place: PLACE, people: 3, seed: SEED });
    const world = { ...f.world, control: { kind: "observer" as const } };
    const start = addSimulationMinutes(world.currentMoment, 30);
    const result = requestPublicServiceFromLife(world, {
      commitmentId: f.personId,
      start,
      end: addSimulationMinutes(start, 45),
    });
    expect(result.kind).toBe("unsupported");
    if (result.kind !== "unsupported")
      throw new Error("Observer request was accepted.");
    expect(result.reason).toBe(
      "Choose a character before requesting this service.",
    );
    expect(result.world).toBe(world);
  });
});
