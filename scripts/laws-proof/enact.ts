import {
  introduceAutomaticLawMeasure,
  type AutomaticLawGovernmentLevel,
} from "../../src/simulation/governing/automatic-legislation";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import { addDays, daysBetween } from "../../src/simulation/dates";
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
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
} from "../../src/simulation/legislation";
import { legislativeRulePackForWorld } from "../../src/simulation/legislative-procedure-world";
import {
  committeeMembers,
  dispositionsFromCounts,
  seatBodyForPack,
} from "../../src/simulation/legislation-scenarios";
import { advanceWorld } from "../../src/simulation/world";
import type {
  EntityId,
  PolicyBillTerms,
  World,
} from "../../src/simulation/types";

/** A controlled enactment intervention, using the real procedure writers and explicit test votes. */
export function prepareLawPair(
  world: World,
  input: {
    jurisdictionId: EntityId;
    rulePackId: string;
    propositionId: EntityId;
    policyTerms?: readonly PolicyBillTerms[];
    sponsorPersonId: EntityId | null;
    advance?: (world: World, days: number) => World;
    compiledLevel?: AutomaticLawGovernmentLevel;
    answer?: "yes" | "no";
  },
) {
  const pack = legislativeRulePackForWorld(world, input.rulePackId);
  const key = `laws-proof:${world.policyCatalog.propositions[input.propositionId]!.stableKey}:${input.answer ?? "yes"}:${world.history.nextSequence}`;
  const compiled =
    input.compiledLevel && input.sponsorPersonId
      ? introduceAutomaticLawMeasure(world, {
          jurisdictionId: input.jurisdictionId,
          governmentLevel: input.compiledLevel,
          propositionId: input.propositionId,
          answer: input.answer ?? "yes",
          intakeKey: key,
          stableKey: key,
          designation: "Proof Act",
          sponsorPersonId: input.sponsorPersonId,
          originChamberKey: pack.chambers[0]!.chamberKey,
          principleRecordIds: [],
          principleScore: 0,
        })
      : null;
  let next =
    compiled?.world ??
    introduceMeasure(world, {
      ...input,
      stableKey: key,
      designation: "Proof Act",
      shortTitle: "Controlled law intervention",
      summary:
        "A development intervention to measure this law's world effects.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: pack.chambers[0]!.chamberKey,
      propositionIds: [input.propositionId],
      propositionAnswers: [
        { propositionId: input.propositionId, answer: input.answer ?? "yes" },
      ],
    });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  const provenance = {
    method: "authored-fixture" as const,
    note: "Controlled treatment: affirmative enactment votes. These are not measurements of autonomous member preferences.",
    sourceEntityIds: [],
  };
  const registry = createCampaignElectionTransitionRegistry();
  const advance =
    input.advance ??
    ((base: World, days: number) => advanceWorld(base, days, registry));
  for (const [index, chamber] of pack.chambers.entries()) {
    if (index > 0)
      next = transmitMeasure(next, {
        stableKey: `${key}:transmit:${index}`,
        measureId,
      });
    const committee = chamber.committees[0]!;
    const seats =
      chamber.seats.kind === "known"
        ? chamber.seats.value
        : Math.max(committee.appointedMembers, 100);
    const body = seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seats,
      [],
      false,
    );
    next = referMeasure(next, {
      stableKey: `${key}:refer:${index}`,
      measureId,
      committeeKey: committee.committeeKey,
    });
    if (
      chamber.referral.everyMeasureMustBeHeard.kind === "known" &&
      chamber.referral.everyMeasureMustBeHeard.value
    ) {
      const hearingDate = addDays(next.currentDate, 7);
      next = scheduleCommitteeHearing(next, {
        stableKey: `${key}:hearing:${index}`,
        measureId,
        hearingDate,
      });
      next = advance(next, 7);
    }
    next = recordCommitteeDisposition(next, {
      stableKey: `${key}:committee:${index}`,
      measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers },
      ),
      rationale: "Controlled affirmative vote for the intervention.",
      provenance,
    });
    next = placeMeasureOnCalendar(next, {
      stableKey: `${key}:calendar:${index}`,
      measureId,
    });
    for (const stage of chamber.floorStages) {
      const until = measurePosition(next, measureId).earliestNextFloorDate;
      if (until && until > next.currentDate)
        next = advance(next, daysBetween(next.currentDate, until));
      next = takeFloorVote(next, {
        stableKey: `${key}:vote:${index}:${stage.stageKey}`,
        measureId,
        dispositions: dispositionsFromCounts(body.members, { yea: seats }),
        presentMembers: seats,
        electedMembers: seats,
        provenance,
      });
    }
  }
  next = enrollMeasure(next, { stableKey: `${key}:enroll`, measureId });
  next = presentMeasureToExecutive(next, {
    stableKey: `${key}:present`,
    measureId,
  });
  next = recordExecutiveAction(next, {
    stableKey: `${key}:sign`,
    measureId,
    action: "signed",
    rationale: "Controlled enactment for effect measurement.",
  });
  // The control follows the same ordinary preparation clock without filing the intervention.
  // Leaving a signed bill awaiting enactment would let an autonomous agenda enact it later.
  const preparationDays = daysBetween(world.currentDate, next.currentDate);
  const control = preparationDays > 0 ? advance(world, preparationDays) : world;
  const treated = recordEnactment(next, {
    stableKey: `${key}:enact`,
    measureId,
    effectiveAt: control.currentDate,
  });
  return { control, treated, measureId };
}
