import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { addDays, daysBetween } from "../../src/simulation/dates";
import {
  fileRuleChangeProvision,
  officePayLawOfficeKey,
} from "../../src/simulation/enacted-rule-changes";
import type { RuleChangeApplicability } from "../../src/simulation/enacted-rule-changes";
import { letAdultTimePass } from "../../src/presentation/adult-life";
import {
  createOrganization,
  createWorkRelationship,
} from "../../src/simulation/life";
import { statePayFor } from "../../src/simulation/office-pay";
import { resourceFlowTermsHistory } from "../../src/simulation/resource-queries";
import { createFutureTransitionHandlerRegistry } from "../../src/simulation/future-transitions";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  takeFloorVote,
} from "../../src/simulation/legislation";
import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
} from "../../src/simulation/legislation-scenarios";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import { advanceWorld } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this fixture.",
  sourceEntityIds: [] as readonly EntityId[],
};

interface PayBill {
  readonly key: string;
  readonly designation: string;
  readonly annualDollars: number;
  readonly effectiveInDays: number;
  readonly applicability?: RuleChangeApplicability;
}

/**
 * An Omaha game in which Nebraska's Legislature passes a bill setting the
 * governor's salary from its effective date, and the Governor signs it. The
 * Legislature's seats are the Nebraska scenario's, voting by seat without a
 * person in this world behind each one.
 */
function omahaWithGovernorPayLaw(bill: PayBill) {
  const scenario = createLegislativeScenario("nebraska");
  const template = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "office-pay-law-omaha",
      placeKey: "3137000",
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const player = game.playerPersonId;
  const opened = game.world.currentDate;
  const chamber = chamberByKey(scenario.pack, "legislature");
  const committee = chamber.committees[0]!;
  const seated = bodyForChamber(scenario, "legislature");
  const body = {
    ...seated,
    members: seated.members.map((member) => ({ ...member, personId: null })),
  };
  let world: World = game.world;
  const key = `office-pay:${bill.key}`;
  world = introduceMeasure(world, {
    stableKey: `${key}:measure`,
    jurisdictionId: template.jurisdictionId,
    rulePackId: template.rulePackId,
    designation: bill.designation.split(",")[0]!,
    shortTitle: "Governor's salary",
    summary: "Sets the Governor's salary.",
    origin: "member-introduction",
    subjectClass: template.subjectClass,
    sponsorPersonId: player,
  });
  const measureId = world.history.legislativeMeasures!.find(
    (measure) => measure.stableKey === `${key}:measure`,
  )!.id;
  world = fileRuleChangeProvision(world, {
    stableKey: `${key}:pay`,
    measureId,
    officeKey: officePayLawOfficeKey("NE"),
    field: "pay.governor.annualDollars",
    value: bill.annualDollars,
    ...(bill.applicability ? { applicability: bill.applicability } : {}),
  });
  world = referMeasure(world, {
    stableKey: `${key}:referral`,
    measureId,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: `${key}:committee`,
    measureId,
    recommendation: "favorable",
    dispositions: dispositionsFromCounts(
      committeeMembers(body, committee.appointedMembers),
      { yea: committee.appointedMembers, nay: 0 },
    ),
    rationale: "The committee backed the bill.",
    provenance: AUTHORED,
  });
  world = placeMeasureOnCalendar(world, {
    stableKey: `${key}:calendar`,
    measureId,
  });
  for (const stage of chamber.floorStages) {
    const until = measurePosition(world, measureId).earliestNextFloorDate;
    if (until && world.currentDate < until)
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, until),
        createFutureTransitionHandlerRegistry([]),
      );
    world = takeFloorVote(world, {
      stableKey: `${key}:${stage.stageKey}`,
      measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea: body.members.length,
        nay: 0,
      }),
      presentMembers: body.members.length,
      electedMembers: body.members.length,
      provenance: AUTHORED,
    });
  }
  world = enrollMeasure(world, { stableKey: `${key}:enroll`, measureId });
  world = presentMeasureToExecutive(world, {
    stableKey: `${key}:present`,
    measureId,
  });
  world = recordExecutiveAction(world, {
    stableKey: `${key}:governor`,
    measureId,
    action: "signed",
    rationale: "The Governor signed it.",
  });
  world = recordEnactment(world, {
    stableKey: `${key}:enactment`,
    measureId,
    actDesignation: bill.designation,
    effectiveAt: addDays(opened, bill.effectiveInDays),
  });
  return {
    world,
    player,
    opened,
    effectiveAt: addDays(opened, bill.effectiveInDays),
  };
}

/** Puts the player in the Governor's office of Nebraska, from today. */
function asNebraskaGovernor(world: World, personId: EntityId): World {
  const withOffice = createOrganization(world, {
    stableKey: "test:ne-executive",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: "Test office." },
    initialProfile: {
      name: "Office of the Governor of Nebraska",
      classification: "sector:government",
      locationJurisdictionId: null,
    },
  });
  return createWorkRelationship(withOffice, {
    stableKey: "test:ne-governor",
    personId,
    organizationId: withOffice.history.organizations.at(-1)!.id,
    startedAt: withOffice.currentDate,
    kind: "employment:executive-office",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "Test office." },
    initialRole: {
      title: "Governor",
      occupationClassification: "service:us-ne-governor",
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 60 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: null,
      },
    },
  });
}

/** Each weekly salary paid, in order, with the day its week began. */
function weeklySalaries(
  world: World,
): { readonly startedOn: string; readonly minor: number }[] {
  const flow = world.history.resourceFlows.find((row) =>
    row.stableKey.startsWith("office-salary:"),
  )!;
  return world.history.resourceTransferOutcomes
    .filter((outcome) => outcome.resourceFlowId === flow.id)
    .map((outcome) => ({
      startedOn: outcome.periodStartsAt,
      minor: outcome.transferredAmount.minorUnits,
    }));
}

const OLD_WEEKLY = Math.round(
  (statePayFor("governor", "NE")!.annualDollars * 100) / 52,
);

describe(
  "a state's pay law changes what its officials are paid",
  { timeout: 600_000 },
  () => {
    const LB_301: PayBill = {
      key: "lb-301",
      designation: "LB 301, 2026",
      annualDollars: 160_000,
      effectiveInDays: 120,
    };

    it("pays the published salary until the law is operative, then the law's, naming it", () => {
      const { world, player, effectiveAt } = omahaWithGovernorPayLaw(LB_301);
      expect(world.currentDate < effectiveAt).toBe(true);
      const governor = asNebraskaGovernor(world, player);
      // The first day starts the salary; the rest pays it week by week.
      const later = letAdultTimePass(
        letAdultTimePass(governor, 1),
        daysBetween(governor.currentDate, effectiveAt) + 70,
      );
      const paid = weeklySalaries(later);
      const newWeekly = Math.round((160_000 * 100) / 52);
      expect(OLD_WEEKLY).not.toBe(newWeekly);
      // Every week that began before the law's date was paid at the old salary,
      // and every week that began on or after it at the new one.
      expect(paid.some((week) => week.startedOn < effectiveAt)).toBe(true);
      expect(paid.some((week) => week.startedOn >= effectiveAt)).toBe(true);
      for (const week of paid) {
        expect(week.minor).toBe(
          week.startedOn < effectiveAt ? OLD_WEEKLY : newWeekly,
        );
      }
      const flow = later.history.resourceFlows.find((row) =>
        row.stableKey.startsWith("office-salary:"),
      )!;
      const terms = resourceFlowTermsHistory(later, flow.id);
      expect(terms).toHaveLength(2);
      expect(terms[1]!.reason).toBe(
        "LB 301, 2026 set this office's salary to $160,000 a year.",
      );
    });

    it("does not reach a governor already in office when the law says terms beginning after", () => {
      const { world, player, effectiveAt } = omahaWithGovernorPayLaw({
        ...LB_301,
        key: "lb-302",
        designation: "LB 302, 2026",
        applicability: {
          appliesTo: "terms-beginning-after",
          countsPriorService: null,
        },
      });
      const governor = asNebraskaGovernor(world, player);
      const later = letAdultTimePass(
        letAdultTimePass(governor, 1),
        daysBetween(governor.currentDate, effectiveAt) + 70,
      );
      const paid = weeklySalaries(later);
      expect(paid.some((week) => week.startedOn >= effectiveAt)).toBe(true);
      for (const week of paid) expect(week.minor).toBe(OLD_WEEKLY);
    });

    it("pays a governor whose term begins after the law the law's salary from the start", () => {
      const { world, player, effectiveAt } = omahaWithGovernorPayLaw({
        ...LB_301,
        key: "lb-303",
        designation: "LB 303, 2026",
        applicability: {
          appliesTo: "terms-beginning-after",
          countsPriorService: null,
        },
      });
      const waited = letAdultTimePass(
        world,
        daysBetween(world.currentDate, effectiveAt) + 2,
      );
      const governor = asNebraskaGovernor(waited, player);
      const later = letAdultTimePass(letAdultTimePass(governor, 1), 30);
      const paid = weeklySalaries(later);
      expect(paid.length).toBeGreaterThan(0);
      for (const week of paid)
        expect(week.minor).toBe(Math.round((160_000 * 100) / 52));
    });
  },
);
