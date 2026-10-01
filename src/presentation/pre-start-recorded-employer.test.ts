import { describe, expect, it } from "vitest";
import { addDays } from "../simulation/dates";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import { lifePlaceByKey } from "../simulation/life-places";
import { townBusinesses } from "../simulation/living-world/town-businesses";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld, assertWorldIntegrity } from "../simulation/world";
import {
  buildPreStartBackgroundWorld,
  finalizePreStartPlayer,
} from "./production-world";

// Calendar advance only: this is the factory/admission contract, not a natural
// background year. No person, employer, payroll or payment is added by the test.
describe("A58 pre-start admission uses a recorded canonical background employer", () => {
  it.each(["5553000", "1304000", "4159000", "0820000", "1921000"])(
    "preserves employer/work/pay identity without historical payments in %s",
    (placeKey) => {
      const place = lifePlaceByKey(placeKey)!;
      const target = place.context.initialMoment.date;
      const prior = addDays(target, -365);
      const input = {
        seed: `team4-a58-background-employer-20261001:${placeKey}`,
        place,
        age: 35,
        givenName: null,
        familyName: null,
        startingLife: "ordinary-life" as const,
        depth: "summarize-earlier-life" as const,
        household: "lives-alone" as const,
        preStartYear: {
          version: "pre-start-world-year-v1" as const,
          targetStartDate: target,
          priorYearStartDate: prior,
        },
      };
      const background = buildPreStartBackgroundWorld(input);
      assertWorldIntegrity(background);
      expect(background.currentDate).toBe(prior);
      expect(background.control.kind).toBe("observer");
      const employers = townBusinesses(
        background,
        place.context.jurisdiction.id,
      );
      expect(employers.length).toBeGreaterThan(0);
      const atBegin = advanceWorld(background, 365);
      const opened = finalizePreStartPlayer(atBegin, input);
      const { world, playerPersonId } = opened;
      expect(background.people[playerPersonId]).toBeUndefined();
      const work = activeWorkRelationshipsAt(world, playerPersonId).find(
        (entry) => entry.relationship.compensation === "paid",
      )!.relationship;
      expect(
        employers.some(
          (employer) => employer.organizationId === work.organizationId,
        ),
      ).toBe(true);
      const employer = background.history.organizations.find(
        (record) => record.id === work.organizationId,
      )!;
      expect(
        world.history.organizations.find((record) => record.id === employer.id),
      ).toEqual(employer);
      expect(work.startedAt >= employer.formedAt).toBe(true);
      const flows = world.history.resourceFlows.filter(
        (flow) =>
          flow.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === work.id,
      );
      expect(flows).toHaveLength(1);
      const flow = flows[0]!;
      expect(flow.startsAt).toBe(target);
      expect(flow.source).toEqual({
        kind: "organization",
        organizationId: employer.id,
      });
      expect(flow.recipient).toEqual({
        kind: "person",
        personId: playerPersonId,
      });
      const terms = resourceFlowTermsAt(world, flow.id)!;
      expect(terms.status).toBe("active");
      expect(terms.cadenceKind).toBe("schedule:monthly");
      expect(terms.amount.minorUnits).toBeGreaterThan(0);
      expect(
        world.history.resourceTransferOutcomes.filter(
          (outcome) => outcome.resourceFlowId === flow.id,
        ),
      ).toHaveLength(0);
      assertWorldIntegrity(world);
      const saved = serializeWorld(world);
      const reloaded = deserializeWorld(saved);
      assertWorldIntegrity(reloaded);
      expect(serializeWorld(reloaded)).toBe(saved);
      const reopened = finalizePreStartPlayer(
        deserializeWorld(serializeWorld(atBegin)),
        input,
      );
      expect(reopened.playerPersonId).toBe(playerPersonId);
      expect(serializeWorld(reopened.world)).toBe(saved);
    },
  );
});
