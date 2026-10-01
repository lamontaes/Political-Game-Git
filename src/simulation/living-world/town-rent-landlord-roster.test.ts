/// <reference types="node" />
import { afterAll, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { ageOnDate } from "../dates";
import { lifePlaceByKey } from "../life-places";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { organizationProfileAt } from "../life-queries";
import { personName } from "../people";
import { createHousingTenure } from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { ensureTownHomes } from "./town-homes";
import { ensureTownResidents } from "./town-residents";
import { hudRentRowFor, startTownLeases, townLeases } from "./town-rent";

const SEED = "team4-a56-landlord-roster-20261001";
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
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.TEAM4_A56_ROSTER_RECEIPT)
    writeFileSync(
      process.env.TEAM4_A56_ROSTER_RECEIPT,
      JSON.stringify(receipts, null, 2) + "\n",
    );
});

describe("A56 first landlords come from actual owners or the saved home roster", () => {
  it.each(places)(
    "keeps the same actual homes' landlords without a seed outcome in %s",
    (placeKey) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        seed: `${SEED}:${placeKey}`,
        startAge: 30,
        household: "lives-alone",
        questionnaire: "skipped",
      });
      const town = game.world.people[game.playerPersonId]!.homeJurisdictionId;
      const residents = ensureTownResidents(game.world, game.playerPersonId);
      const source = ensureTownHomes(residents, town);
      expect(townLeases(source)).toHaveLength(0);
      const leased = startTownLeases(source, source.currentDate);
      const leases = townLeases(leased).filter((lease) => !lease.ended);
      expect(leases.length).toBeGreaterThan(0);
      const identities = (world: typeof source) =>
        townLeases(world).map((lease) => ({
          tenureId: lease.tenureId,
          dwellingId: lease.dwellingId,
          landlord: lease.flow.recipient,
          flowId: lease.flow.id,
          obligationId: lease.obligationId,
          bedrooms: lease.bedrooms,
        }));
      // Hold the actual seed/ID, actors, homes and dates fixed. Only the former
      // landlord fork's output is controlled; other seeded identity stays real.
      const nativeFork = SeededRng.prototype.fork;
      let landlordForks = 0;
      for (const value of [0, 0.5, 0.999999]) {
        const fork = vi
          .spyOn(SeededRng.prototype, "fork")
          .mockImplementation(function (this: SeededRng, label: string) {
            const child = nativeFork.call(this, label);
            if (label.startsWith("landlord")) {
              landlordForks += 1;
              vi.spyOn(child, "next").mockReturnValue(value);
            }
            return child;
          });
        try {
          expect(
            identities(startTownLeases(source, source.currentDate)),
          ).toEqual(identities(leased));
        } finally {
          fork.mockRestore();
        }
      }
      expect(landlordForks).toBe(0);
      const save = serializeWorld(leased);
      expect(startTownLeases(leased, leased.currentDate)).toBe(leased);
      const restored = deserializeWorld(save);
      expect(startTownLeases(restored, restored.currentDate)).toBe(restored);
      expect(serializeWorld(restored)).toBe(save);
      expect(leased.history.resourceTransferOutcomes).toBe(
        source.history.resourceTransferOutcomes,
      );

      const sample = leases[0]!;
      const members = new Set(
        source.history.householdMemberships
          .filter((row) => row.householdId === sample.householdId)
          .map((row) => row.personId),
      );
      const ownerId = source.personOrder.find(
        (id) =>
          !members.has(id) &&
          ageOnDate(source.people[id]!.birthDate, source.currentDate) >= 18 &&
          !source.history.personDeaths.some(
            (row) => row.personId === id && row.diedAt <= source.currentDate,
          ),
      )!;
      expect(ownerId).toBeDefined();
      const owned = createHousingTenure(source, {
        stableKey: "fixture:a56-person-owner",
        holder: { kind: "person", personId: ownerId },
        dwellingId: sample.dwellingId,
        startedAt: source.currentDate,
        kind: "ownership:owned",
        context:
          "Controlled recorded legal owner, not inferred from wealth or residence.",
        provenance: {
          kind: "authored",
          note: "A56 actual-owner contract fixture.",
        },
      });
      const ownedLease = townLeases(
        startTownLeases(owned, owned.currentDate),
      ).find((row) => row.tenureId === sample.tenureId)!;
      expect(ownedLease.flow.recipient).toEqual({
        kind: "person",
        personId: ownerId,
      });

      const organization = source.history.organizations.find((row) => {
        const profile = organizationProfileAt(source, row.id);
        return profile && !profile.closed && row.formedAt <= source.currentDate;
      })!;
      expect(organization).toBeDefined();
      const corporate = createHousingTenure(source, {
        stableKey: "fixture:a56-organization-owner",
        holder: { kind: "organization", organizationId: organization.id },
        dwellingId: sample.dwellingId,
        startedAt: source.currentDate,
        kind: "ownership:owned",
        context: "Controlled actual organization title.",
        provenance: {
          kind: "authored",
          note: "A56 actual-owner contract fixture.",
        },
      });
      expect(
        townLeases(startTownLeases(corporate, corporate.currentDate)).find(
          (row) => row.tenureId === sample.tenureId,
        )!.flow.recipient,
      ).toEqual({ kind: "organization", organizationId: organization.id });

      const householdOwner = source.history.households.find(
        (row) => row.id !== sample.householdId,
      )!;
      const unsupported = createHousingTenure(source, {
        stableKey: "fixture:a56-household-owner",
        holder: { kind: "household", householdId: householdOwner.id },
        dwellingId: sample.dwellingId,
        startedAt: source.currentDate,
        kind: "ownership:owned",
        context: "Known household owner; recipient adapter unsupported.",
        provenance: {
          kind: "authored",
          note: "A56 unsupported-owner contract fixture.",
        },
      });
      expect(
        townLeases(startTownLeases(unsupported, unsupported.currentDate)).find(
          (row) => row.tenureId === sample.tenureId,
        ),
      ).toBeUndefined();
      receipts.push({
        placeKey,
        seed: `${SEED}:${placeKey}`,
        tenant: personName(source.people[sample.leaseholderId]!),
        personId: sample.leaseholderId,
        dwellingId: sample.dwellingId,
        tenureId: sample.tenureId,
        flowId: sample.flow.id,
        obligationId: sample.obligationId,
        landlord: sample.flow.recipient,
        leaseCount: leases.length,
        recordedOwner: personName(source.people[ownerId]!),
        recordedOwnerId: ownerId,
        recordedOrganizationId: organization.id,
      });
    },
  );
});
