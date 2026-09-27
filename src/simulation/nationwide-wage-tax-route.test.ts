import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import { searchLifePlaces } from "./life-places";
import {
  enterLifePath,
  performLifePathSession,
  scheduleLifePathSession,
} from "./life-paths2";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { resourcePositionAt } from "./resource-queries";
import { money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { taxAt } from "./statutory-tax";
import {
  publicTaxAccountForJurisdiction,
  stateWageTaxInForce,
} from "./tax-policy";
import {
  stateKeysForTaxServiceProfiles,
  stateTaxServiceProfileForJurisdictionKey,
} from "./world-setup/state-tax-service-profiles";
import { ensureWorldStartingConditions } from "./world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";
import type { EntityId, World } from "./types";

function publicCash(world: World, jurisdictionId: EntityId): number {
  const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
  if (!account) return 0;
  return (
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: account.organizationId },
      money(0, "USD").currency,
    )?.liquidBalance.minorUnits ?? 0
  );
}

/** Payroll kernel matrix; the separate player route uses the visible time command. */
describe("saved wage-tax payroll kernel in the fifty states and DC", () => {
  for (const key of stateKeysForTaxServiceProfiles()) {
    it(`${key}: saved opening, shift pay, withholding, week and reload`, () => {
      const place = searchLifePlaces("", 1, {
        stateJurisdictionKey: key,
        scope: "locality",
      })[0];
      expect(place, `A playable locality is required for ${key}`).toBeDefined();
      const created = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        startAge: 30,
        placeKey: place!.key,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
        priors: [],
        seed: `nationwide-wage-tax:${key}`,
      } as NewGameSetup).world;
      const start = ensureWorldStartingConditions(created, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      });
      const profile = stateTaxServiceProfileForJurisdictionKey(start, key);
      expect(profile, `${key} saved opening law`).not.toBeNull();
      const law = stateWageTaxInForce(start, key, start.currentDate);
      expect(law?.terms).toEqual(profile!.taxTerms);
      const beforeCash = publicCash(start, profile!.jurisdictionId);
      expect(beforeCash).toBe(0);
      const opening = start.history.worldConditions?.find(
        (row) => row.kind === "world-opening",
      );
      const openingCash =
        opening?.kind === "world-opening"
          ? (opening.publicCashOpening?.stateByJurisdictionId[
              profile!.jurisdictionId
            ] ?? 0)
          : 0;
      const entered = enterLifePath(start, "shop-assistant");
      expect(entered.ok, `${key}: ${entered.message}`).toBe(true);
      const workId = entered.world.history.workRelationships.at(-1)!.id;
      const scheduled = scheduleLifePathSession(entered.world, workId);
      expect(scheduled.ok, `${key}: ${scheduled.message}`).toBe(true);
      const activityId = scheduled.world.history.scheduledActivities.at(-1)!.id;
      const worked = performLifePathSession(scheduled.world, activityId);
      expect(worked.ok, `${key}: ${worked.message}`).toBe(true);
      const paid = passOrdinaryDays(worked.world, 1);
      const pay = paid.history.resourceTransferOutcomes.find((row) =>
        row.note?.startsWith("Payment for the completed shift"),
      );
      expect(pay, `${key} actual pay transfer`).toBeDefined();
      const liability = paid.history.statutoryTaxLiabilities?.find(
        (row) =>
          row.sourceOutcomeId === pay!.id &&
          row.taxKey === `${key.toLowerCase()}:wage-income-tax`,
      );
      const expected = taxAt(
        pay!.transferredAmount.minorUnits,
        profile!.taxTerms.rateNumerator,
      );
      expect(liability?.liability?.minorUnits, key).toBe(expected);
      expect(liability?.status, key).toBe(
        expected > 0 ? "assessed" : "not-imposed",
      );
      expect(publicCash(paid, profile!.jurisdictionId), key).toBe(
        expected > 0 ? openingCash + expected : beforeCash,
      );
      const payment = paid.history.statutoryTaxPayments?.find(
        (row) => row.liabilityId === liability!.id,
      );
      if (expected > 0) {
        expect(payment?.amount.minorUnits, `${key} tax receipt`).toBe(expected);
        const transfer = paid.history.resourceTransferOutcomes.find(
          (row) => row.id === payment!.resourceOutcomeId,
        )!;
        expect(transfer.transferredAmount.minorUnits).toBe(expected);
        const flow = paid.history.resourceFlows.find(
          (row) => row.id === transfer.resourceFlowId,
        )!;
        expect(flow.recipient).toEqual({
          kind: "organization",
          organizationId: publicTaxAccountForJurisdiction(
            paid,
            profile!.jurisdictionId,
          )!.organizationId,
        });
      } else expect(payment).toBeUndefined();
      const reopened = deserializeWorld(serializeWorld(paid));
      const afterWeek = passOrdinaryDays(reopened, 6);
      expect(
        afterWeek.history.statutoryTaxLiabilities?.filter(
          (row) =>
            row.sourceOutcomeId === pay!.id && row.taxKey === liability!.taxKey,
        ),
        `${key} does not assess the same pay twice`,
      ).toHaveLength(1);
    });
  }
});
