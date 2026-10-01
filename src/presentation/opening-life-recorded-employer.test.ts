/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import {
  activeWorkRelationshipsAt,
  workRoleAt,
} from "../simulation/life-queries";
import { lifePlaceByKey } from "../simulation/life-places";
import { townBusinesses } from "../simulation/living-world/town-businesses";
import { personName } from "../simulation/people";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { assertWorldIntegrity } from "../simulation/world";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
  restoreOpeningLife,
} from "./opening-life";

const places = ["5553000", "1304000", "4159000", "0820000", "1921000"];
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.TEAM4_RECORD_A58_OPENING === "1")
    writeFileSync(
      "/tmp/team4-a58-natural-opening.json",
      JSON.stringify(receipts, null, 2),
    );
});

// Prepared for the released production caller order. No hiring, employer seating,
// integrity deferral or substitute records are invoked by this proof.
describe("A58 ordinary opening saves work at an actual town employer", () => {
  it.each(places)(
    "opens with a recorded employer and weekly pay in %s",
    (placeKey) => {
      const generated = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `team4-a58-natural-opening-20261001:${placeKey}`,
          placeKey,
          startAge: 24,
          questionnaire: "skipped",
        }),
      );
      expect(generated.game).not.toBeNull();
      const { world, playerPersonId } = generated.game!;
      const town = lifePlaceByKey(placeKey)!.context.jurisdiction.id;
      assertWorldIntegrity(world);
      const jobs = activeWorkRelationshipsAt(world, playerPersonId).filter(
        (entry) =>
          entry.relationship.stableKey ===
          `adult-start-work-v1:${playerPersonId}`,
      );
      expect(jobs).toHaveLength(1);
      const work = jobs[0]!.relationship;
      expect(work.compensation).toBe("paid");
      expect(work.startedAt <= world.currentDate).toBe(true);
      const role = workRoleAt(world, work.id)!;
      expect(role.locationJurisdictionId).toBe(town);
      const employer = townBusinesses(world, town).find(
        (business) => business.organizationId === work.organizationId,
      );
      expect(employer).toBeDefined();
      // The source role belongs to another recorded staff member, not a role
      // manufactured by assigning the player's own job.
      expect(
        employer!.jobs.some((job) => {
          if (job.personId === playerPersonId || job.directsOthers)
            return false;
          const staff = world.history.workRelationships.find(
            (record) => record.id === job.relationshipId,
          );
          const staffRole = workRoleAt(world, job.relationshipId);
          return (
            staff?.compensation === "paid" &&
            staff.startedAt <= world.currentDate &&
            staffRole?.title === role.title &&
            staffRole.occupationClassification ===
              role.occupationClassification &&
            staffRole.locationJurisdictionId === town
          );
        }),
      ).toBe(true);
      const pay = world.history.resourceFlows.filter(
        (flow) =>
          flow.basisKind === "compensation:work" &&
          flow.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === work.id,
      );
      expect(pay).toHaveLength(1);
      const flow = pay[0]!;
      expect(flow.source).toEqual({
        kind: "organization",
        organizationId: work.organizationId,
      });
      expect(flow.recipient).toEqual({
        kind: "person",
        personId: playerPersonId,
      });
      expect(flow.startsAt).toBe(world.currentDate);
      const terms = resourceFlowTermsAt(world, flow.id)!;
      expect(terms.status).toBe("active");
      expect(terms.cadenceKind).toBe("schedule:weekly");
      expect(terms.amount.currency).toBe("USD");
      expect(terms.amount.minorUnits).toBeGreaterThan(0);
      const saved = serializeWorld(world);
      const reloaded = deserializeWorld(saved);
      assertWorldIntegrity(reloaded);
      expect(serializeWorld(reloaded)).toBe(saved);
      expect(generateOpeningLife(generated)).toBe(generated);
      expect(serializeWorld(generateOpeningLife(generated).game!.world)).toBe(
        saved,
      );
      const restored = restoreOpeningLife(generated, reloaded);
      expect(serializeWorld(generateOpeningLife(restored).game!.world)).toBe(
        saved,
      );
      receipts.push({
        seed: world.seed,
        placeKey,
        personId: playerPersonId,
        person: personName(world.people[playerPersonId]!),
        employerId: employer!.organizationId,
        employerName: employer!.name,
        workId: work.id,
        roleId: role.id,
        payFlowId: flow.id,
        payTermsId: terms.id,
        weeklyMinor: terms.amount.minorUnits,
        currency: terms.amount.currency,
        openingDate: world.currentDate,
        paymentReceiptClaimed: false,
        caller: "generateOpeningLife",
        canonicalReloadAndRepeat: true,
      });
    },
  );
});
