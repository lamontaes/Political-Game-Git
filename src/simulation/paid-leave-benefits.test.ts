import { appendFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { addDays } from "./dates";
import { activeWorkRelationshipsAt } from "./life-queries";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { beginHealthEpisode } from "./crisis/health";
import { EPIDEMIC_VERSION, ESTIMATED_EPIDEMIC } from "./crisis/epidemic";
import {
  PAID_LEAVE_BENEFIT_RULES,
  paidLeaveBenefitMinor,
  paidLeaveCoveredDays,
} from "./paid-leave-benefits";
import type { EntityId, World } from "./types";
import { advanceWorld } from "./world";
import {
  isLawEffectStamp,
  type LawEffectStampedRecord,
} from "./law-effect-stamp";
import { PAID_LEAVE_QUESTION } from "./state-paid-leave-law";

const LONG = 900_000;
/** Vernonia, Oregon: Paid Leave Oregon collects premiums in 2026. */
const PROGRAM_TOWN = "4177250";
/** Charlottesville, Virginia: Virginia's program collects from 2028. */
const NO_PROGRAM_TOWN = "5114968";

describe("a state paid leave program pays for a serious illness", () => {
  it("covers a child's serious illness at once, and the worker's own after the waiting period", () => {
    const wait = PAID_LEAVE_BENEFIT_RULES.ownConditionWaitingDays;
    const own = Array.from({ length: 10 }, (_, day) => day);
    expect(
      paidLeaveCoveredDays(
        { seriousOwnDaysSinceOnset: own, seriousCaringDays: 0 },
        10,
      ),
    ).toBe(10 - wait);
    expect(
      paidLeaveCoveredDays(
        { seriousOwnDaysSinceOnset: [], seriousCaringDays: 4 },
        3,
      ),
    ).toBe(3);
  });

  it("replaces its share of the pay lost, up to the weekly maximum", () => {
    // Ten workdays paid $1,000: five covered days lost $500.
    expect(
      paidLeaveBenefitMinor(
        { percent: 90, maxWeeklyMinor: null },
        100_000,
        10,
        5,
      ),
    ).toBe(45_000);
    expect(
      paidLeaveBenefitMinor(
        { percent: 90, maxWeeklyMinor: 30_000 },
        100_000,
        10,
        5,
      ),
    ).toBe(30_000);
  });

  function seriouslyIllPartTimer(placeKey: string, seed: string) {
    const life = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        depth: "summarize-earlier-life",
      }),
    ).game!;
    let world: World = advanceWorld(
      life.world,
      21,
      createCampaignElectionTransitionRegistry(),
    );
    const flow = world.history.resourceFlows.find((row) => {
      if (row.basisReference.kind !== "work") return false;
      const personId = (row.recipient as { personId: EntityId }).personId;
      if (personId === life.playerPersonId) return false;
      const job = activeWorkRelationshipsAt(world, personId).find(
        (work) =>
          work.relationship.id ===
          (row.basisReference as { workRelationshipId: EntityId })
            .workRelationshipId,
      );
      if (!job) return false;
      const { minimumHours, maximumHours } = job.role.timeDemand.expectedWeekly;
      return (
        (minimumHours + maximumHours) / 2 <
        ESTIMATED_EPIDEMIC.fullTimeWeeklyHours
      );
    })!;
    expect(flow).toBeDefined();
    const personId = (flow.recipient as { personId: EntityId }).personId;
    world = beginHealthEpisode(world, {
      stableKey: `test:paid-leave:${personId}`,
      personId,
      severity: "serious",
      initialLimitation: "incapacitated",
      origin: { kind: "authored", note: `${EPIDEMIC_VERSION}:test` },
      causalParentIds: [],
    });
    const onset = world.currentDate;
    world = advanceWorld(world, 49, createCampaignElectionTransitionRegistry());
    const paychecks = world.history.resourceTransferOutcomes.filter(
      (outcome) =>
        outcome.resourceFlowId === flow.id &&
        outcome.periodEndsAt >= onset &&
        outcome.periodStartsAt <= addDays(onset, 29),
    );
    const benefitFlows = new Set(
      world.history.resourceFlows
        .filter(
          (row) =>
            row.stableKey.startsWith("paid-leave-benefit:") &&
            row.recipient.kind === "person" &&
            row.recipient.personId === personId,
        )
        .map((row) => row.id),
    );
    const benefits = world.history.resourceTransferOutcomes.filter((outcome) =>
      benefitFlows.has(outcome.resourceFlowId),
    );
    return { paychecks, benefits };
  }

  it(
    "in a state with a program in force, the lost pay is partly replaced; in one without, it is not",
    () => {
      const withProgram = seriouslyIllPartTimer(PROGRAM_TOWN, "paid-leave-or");
      expect(
        withProgram.paychecks.some(
          (outcome) => outcome.reasonKind === "custom:unpaid-sick-days",
        ),
      ).toBe(true);
      expect(withProgram.benefits.length).toBeGreaterThan(0);
      for (const benefit of withProgram.benefits) {
        expect(benefit.transferredAmount.minorUnits).toBeGreaterThan(0);
        const stamps = (benefit as typeof benefit & LawEffectStampedRecord)
          .lawEffectStamps;
        expect(stamps).toHaveLength(1);
        expect(isLawEffectStamp(stamps?.[0])).toBe(true);
        expect(stamps?.[0]).toMatchObject({
          source: "in-force-at-start",
          effectKind: "paid-leave-benefit",
          questionKey: PAID_LEAVE_QUESTION,
          appliedAt: benefit.occurredAt,
        });
        expect(stamps?.[0]?.sourceRecordIds).toContain(benefit.resourceFlowId);
        expect(benefit.note).toMatch(
          /^State paid leave benefit for \d+ days? out with a serious illness, \d+% of the pay lost\./,
        );
      }
      // Never more than the pay the illness took.
      const lost = withProgram.paychecks.reduce(
        (sum, outcome) =>
          sum +
          outcome.attemptedAmount.minorUnits -
          outcome.transferredAmount.minorUnits,
        0,
      );
      const replaced = withProgram.benefits.reduce(
        (sum, benefit) => sum + benefit.transferredAmount.minorUnits,
        0,
      );
      expect(replaced).toBeLessThan(lost);
      // What the watched world did, for the report: written where
      // WATCHED_RUN_OUT names a file, since passing tests print nothing.
      const watched = process.env.WATCHED_RUN_OUT;
      if (watched)
        appendFileSync(
          watched,
          JSON.stringify({
            place: PROGRAM_TOWN,
            lostCents: lost,
            replacedCents: replaced,
            paychecks: withProgram.paychecks.map((row) => row.note),
            benefits: withProgram.benefits.map((row) => [
              row.occurredAt,
              row.transferredAmount.minorUnits,
              row.status,
              row.note,
            ]),
          }) + "\n",
        );

      const without = seriouslyIllPartTimer(NO_PROGRAM_TOWN, "paid-leave-va");
      expect(
        without.paychecks.some(
          (outcome) => outcome.reasonKind === "custom:unpaid-sick-days",
        ),
      ).toBe(true);
      expect(without.benefits).toEqual([]);
    },
    LONG,
  );
});
