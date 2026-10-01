/// <reference types="node" />
import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../future-transitions";
import { lifePlaceByKey } from "../life-places";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { personName } from "../people";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { withWorldIntegrityDeferred } from "../world";
import type { EntityId, World } from "../types";
import {
  hudRentRowFor,
  renewTownLeases,
  startTownLeases,
  townLeases,
} from "./town-rent";

const SEED = "team4-a56-recorded-bedroom-20261001";
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.TEAM4_RECORD_A56 === "1")
    writeFileSync(
      "/tmp/team4-a56-saved-leases.json",
      JSON.stringify(receipts, null, 2),
    );
});
const largest = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, population] = pair.split(":") as [string, string];
  const place = lifePlaceByKey(key);
  if (
    !place?.stateJurisdictionKey ||
    !hudRentRowFor(place.context.jurisdiction.id)
  )
    continue;
  if ((largest.get(place.stateJurisdictionKey)?.[1] ?? -1) < Number(population))
    largest.set(place.stateJurisdictionKey, [key, Number(population)]);
}
const available = [...largest.values()].map(([key]) => key);
const rng = new SeededRng(SEED);
const places = Array.from(
  { length: 5 },
  () => available.splice(rng.integer(0, available.length), 1)[0]!,
);

function primaryLivingMembers(world: World, householdId: EntityId): number {
  const latest = new Map(
    world.history.householdMembershipStates
      .filter((record) => record.effectiveAt <= world.currentDate)
      .map((record) => [record.membershipId, record]),
  );
  const dead = new Set(
    world.history.personDeaths
      .filter((record) => record.diedAt <= world.currentDate)
      .map((record) => record.personId),
  );
  return world.history.householdMemberships.filter((record) => {
    const state = latest.get(record.id);
    return (
      record.householdId === householdId &&
      state?.status !== "ended" &&
      state?.residenceRole === "primary" &&
      !!world.people[record.personId] &&
      !dead.has(record.personId)
    );
  }).length;
}

describe("A56 first leases record household-sized bedrooms", () => {
  it.each(places)(
    "keeps recorded unit and landlord identities through renewal/reload in %s",
    (placeKey) => {
      const game = withWorldIntegrityDeferred(
        () =>
          generateOpeningLife(
            prepareOpeningLife({
              ...DEFAULT_NEW_GAME_SETUP,
              placeKey,
              seed: `${SEED}:${placeKey}`,
              startAge: 24,
              questionnaire: "skipped",
            }),
          ).game!,
      );
      const world = withWorldIntegrityDeferred(() =>
        startTownLeases(game.world, game.world.currentDate),
      );
      const leases = townLeases(world).filter((lease) => !lease.ended);
      expect(leases.length).toBeGreaterThan(0);
      for (const lease of leases) {
        const count = primaryLivingMembers(world, lease.householdId);
        expect(count).toBeGreaterThan(0);
        // Independent occupancy expectation, not a call to the new helper.
        expect(
          lease.bedrooms,
          personName(world.people[lease.leaseholderId]!),
        ).toBe(count === 1 ? 0 : Math.min(4, Math.ceil(count / 2)));
      }
      const before = serializeWorld(world);
      expect(serializeWorld(startTownLeases(world, world.currentDate))).toBe(
        before,
      );
      const restored = deserializeWorld(before);
      expect(
        serializeWorld(startTownLeases(restored, restored.currentDate)),
      ).toBe(before);

      const sample = leases[0]!;
      // Controlled anniversary writer fixture; no year or due-clock advance.
      const due = makeIsoDate(
        `${Number(sample.flow.startsAt.slice(0, 4)) + 1}${sample.flow.startsAt.slice(4)}`,
      );
      // This isolated writer fixture cancels earlier scheduled activities
      // through their canonical writer. It does not pretend a year occurred.
      let isolated = restored;
      for (const item of restored.history.futureDueItems ?? []) {
        if (
          item.dueAt >= due ||
          futureDueItemStateAt(isolated, item.id, {
            asOfDate: isolated.currentDate,
            historySequenceExclusive: isolated.history.nextSequence,
          })?.status !== "scheduled"
        )
          continue;
        isolated = withWorldIntegrityDeferred(() =>
          cancelFutureDueItem(isolated, {
            stableKey: `fixture:a56:cancel:${item.id}`,
            dueItemId: item.id,
            effectiveAt: restored.currentDate,
            reasonKey: "fixture:isolated-anniversary-writer",
            context:
              "Controlled lease writer fixture; scheduled activity not simulated.",
          }),
        );
      }
      const dated = {
        ...isolated,
        currentDate: due,
        currentMoment: simulationMomentOnLocalDate(restored.currentMoment, due),
      };
      const renewed = withWorldIntegrityDeferred(() =>
        renewTownLeases(dated, due),
      );
      const after = townLeases(renewed, due);
      for (const original of leases) {
        const lease = after.find(
          (entry) => entry.flow.id === original.flow.id,
        )!;
        expect(lease.bedrooms).toBe(original.bedrooms);
        expect(lease.flow.recipient).toEqual(original.flow.recipient);
        expect(lease.obligationId).toBe(original.obligationId);
      }
      expect(renewed.history.resourceTransferOutcomes).toEqual(
        dated.history.resourceTransferOutcomes,
      );
      const renewedSave = serializeWorld(renewed);
      expect(serializeWorld(renewTownLeases(renewed, due))).toBe(renewedSave);
      expect(
        serializeWorld(renewTownLeases(deserializeWorld(renewedSave), due)),
      ).toBe(renewedSave);
      receipts.push({
        seed: `${SEED}:${placeKey}`,
        person: personName(world.people[sample.leaseholderId]!),
        personId: sample.leaseholderId,
        leaseFlowId: sample.flow.id,
        obligationId: sample.obligationId,
        bedrooms: sample.bedrooms,
        landlord: sample.flow.recipient,
        leaseCount: leases.length,
      });
    },
  );
});
