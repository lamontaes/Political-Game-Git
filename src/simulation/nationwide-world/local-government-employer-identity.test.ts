import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { observerSetup } from "../../presentation/observer-world";
import { allGovernmentUnits } from "../government-units";
import { organizationProfileAt } from "../life-queries";
import { assertPublicGovernmentIdentity } from "../public-government-identity";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  ensureLocalGovernmentOrganization,
  localGovernmentJurisdiction,
  localGovernmentOrganizationKey,
} from "./local-governments";

const units = ["county", "municipality", "township"].map((kind) => {
  const unit = allGovernmentUnits().find(
    (row) =>
      row.unitType === kind &&
      row.functionalActive &&
      localGovernmentJurisdiction(row),
  );
  if (!unit) throw new Error(`Missing compiled active ${kind} government`);
  return unit;
});

describe("source government organizations record their own employer identity", () => {
  it.each(units)(
    "binds the recorded $unitType government $id without opening cash",
    (unit) => {
      const world = smallWorld({
        place: unit.stateUsps,
        seed: `a50-owner:${unit.id}`,
        date: "2026-01-05",
      }).world;
      const positions = world.history.resourcePositions;
      const next = ensureLocalGovernmentOrganization(world, unit);
      const organization = next.history.organizations.find(
        (row) => row.stableKey === localGovernmentOrganizationKey(unit),
      )!;
      const profile = organizationProfileAt(next, organization.id)!;
      expect(profile.provenance.kind).toBe("source-record");
      expect(profile.publicGovernmentIdentity).toEqual({
        kind: "local-government",
        governmentKey: unit.id,
        jurisdictionId: localGovernmentJurisdiction(unit)!.id,
      });
      expect(() =>
        assertPublicGovernmentIdentity(next, profile.publicGovernmentIdentity!),
      ).not.toThrow();
      expect(next.history.resourcePositions).toEqual(positions);
      expect(ensureLocalGovernmentOrganization(next, unit)).toBe(next);
      const reopened = deserializeWorld(serializeWorld(next));
      expect(
        organizationProfileAt(reopened, organization.id)!
          .publicGovernmentIdentity,
      ).toEqual(profile.publicGovernmentIdentity);
    },
  );

  it.each([
    "a50-owner-opening-one",
    "a50-owner-opening-two",
    "a50-owner-opening-three",
  ])(
    "opens an actual new game in the randomly selected place for %s",
    (seed) => {
      const setup = observerSetup(seed);
      const opened = generateOpeningLife(
        prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
      );
      expect(opened.game).not.toBeNull();
      const game = opened.game!;
      expect(game.world.people[game.playerPersonId]).toBeDefined();
      expect(game.world.history.workRelationships.length).toBeGreaterThan(0);
      for (const organization of game.world.history.organizations.filter(
        (row) => row.stableKey.startsWith("local-government:"),
      )) {
        const profile = organizationProfileAt(game.world, organization.id);
        if (profile?.publicGovernmentIdentity)
          expect(() =>
            assertPublicGovernmentIdentity(
              game.world,
              profile.publicGovernmentIdentity!,
            ),
          ).not.toThrow();
      }
      process.stdout.write(
        JSON.stringify({
          receipt: "A50 producer prerequisite opening",
          seed,
          placeKey: setup.placeKey,
          date: game.world.currentDate,
          playerPersonId: game.playerPersonId,
        }) + "\n",
      );
    },
  );
});
