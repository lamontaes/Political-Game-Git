/// <reference types="node" />
import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { hireAtAdultStart } from "./job-market";
import { adultStartEmployer } from "./recorded-adult-employer";
import { lifePlaceByKey } from "./life-places";
import { activeWorkRelationshipsAt, workRoleAt } from "./life-queries";
import { townBusinesses } from "./living-world/town-businesses";
import { personName } from "./people";
import { serializeWorld, deserializeWorld } from "./serialization";
import { withWorldIntegrityDeferred, createWorld, worldLineage } from "./world";

const SEED = "team4-a58-recorded-employer-20261001";
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.TEAM4_RECORD_A58 === "1")
    writeFileSync(
      "/tmp/team4-a58-saved-employers.json",
      JSON.stringify(receipts, null, 2),
    );
});
const places = ["5553000", "1304000", "4159000", "0820000", "1921000"];

describe("A58 adult starting jobs use the town's recorded employers", () => {
  it.each(places)(
    "hires into an existing paid staff role in %s",
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
      const world = game.world;
      const personId =
        world.control.kind === "person"
          ? world.control.personId
          : world.personOrder[0]!;
      const town = lifePlaceByKey(placeKey)!.context.jurisdiction.id;
      const recorded = townBusinesses(world, town);
      expect(recorded.length).toBeGreaterThan(0);
      const before = serializeWorld(world);
      const selected = adultStartEmployer(world, personId, town);
      expect(selected).not.toBeNull();
      const business = recorded.find(
        (entry) => entry.organizationId === selected!.organization.id,
      );
      expect(business).toBeDefined();
      expect(
        business!.jobs.some((entry) => {
          const role = workRoleAt(world, entry.relationshipId);
          return (
            role?.title === selected!.kind.workerTitle &&
            role.occupationClassification === selected!.kind.workerOccupation &&
            !entry.directsOthers
          );
        }),
      ).toBe(true);
      expect(serializeWorld(world)).toBe(before);
      expect(
        adultStartEmployer(deserializeWorld(before), personId, town),
      ).toEqual(selected);

      // Explicit ordinary hiring writer after town records exist, not proof of
      // the earlier production opening callsite's producer/order.
      const hired = withWorldIntegrityDeferred(() =>
        hireAtAdultStart(world, { personId, jurisdictionId: town }),
      );
      const work = activeWorkRelationshipsAt(hired, personId).find(
        (entry) =>
          entry.relationship.stableKey === `adult-start-work-v1:${personId}`,
      );
      expect(work?.relationship.organizationId).toBe(selected!.organization.id);
      expect(hired.history.organizations).toEqual(world.history.organizations);
      expect(hired.history.organizationProfiles).toEqual(
        world.history.organizationProfiles,
      );
      expect(hired.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      const saved = serializeWorld(hired);
      expect(
        serializeWorld(
          hireAtAdultStart(hired, { personId, jurisdictionId: town }),
        ),
      ).toBe(saved);
      expect(
        serializeWorld(
          hireAtAdultStart(deserializeWorld(saved), {
            personId,
            jurisdictionId: town,
          }),
        ),
      ).toBe(saved);

      const sparse = createWorld({
        seed: world.seed,
        lineage: worldLineage(world),
        currentDate: world.currentDate,
        currentMoment: world.currentMoment,
        people: [world.people[personId]!],
        jurisdictions: [world.jurisdictions[town]!],
        policyCatalog: world.policyCatalog,
      });
      const sparseSaved = serializeWorld(sparse);
      expect(adultStartEmployer(sparse, personId, town)).toBeNull();
      expect(
        serializeWorld(
          hireAtAdultStart(sparse, { personId, jurisdictionId: town }),
        ),
      ).toBe(sparseSaved);
      receipts.push({
        seed: world.seed,
        placeKey,
        personId,
        person: personName(world.people[personId]!),
        organizationId: selected!.organization.id,
        organizationName: business!.name,
        role: selected!.kind,
        workId: work!.relationship.id,
        recordedEmployerCount: recorded.length,
        organizationCountUnchanged: true,
        transfersUnchanged: true,
        emptyMarket: "no employer or hire recorded",
      });
    },
  );
});
