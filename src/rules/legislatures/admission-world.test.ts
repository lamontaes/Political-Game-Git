import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import germaneness from "../../../data/research/legislative-procedure/germaneness.json";
import singleSubject from "../../../data/research/legislative-procedure/single-subject.json";
import * as native from "../../simulation/governing/chamber-procedure";
import * as rules from "./amendment-rules";
import { legislatureForState } from "../../simulation/legislature-game-profile";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import { introduceMeasure } from "../../simulation/legislation";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import { seatedLeaders as nativeLeaders } from "../../simulation/governing/leaders-adjourn";
import { seatedLeaders } from "./chamber-seating";
import { constitutionalPolicyProvisions as nativePolicy } from "../../simulation/policy-provisions";
import {
  constitutionalPolicyProvisions,
  stateDecidedPropositions,
} from "./constitutional-policy";
import { stateDecidedPropositions as nativePropositions } from "../../simulation/policy-provisions";
import {
  monthlyPay as nativePay,
  lawExposureFeltSize as nativeFelt,
  rightsOrEligibilityLoss as nativeRights,
} from "../../simulation/law-exposure";
import {
  monthlyPay,
  lawExposureFeltSize,
  rightsOrEligibilityLoss,
  type OfficialFactorFacts,
} from "./official-factors";
import {
  KENTUCKY_CONTEXT,
  NEBRASKA_CONTEXT,
  ALASKA_CONTEXT,
} from "../../simulation/legislation-scenarios";
import { scenarioInitialMoment } from "./scenario-moment";
import { formatMinorUnits as nativeAmount } from "../../simulation/legislation-content-contracts";
import { formatMinorUnits } from "./money-display";
import type { LawExposureRecord } from "../../simulation/types";
describe("legislatures: admission and reflection dependencies from native worlds", () => {
  it.each(Object.keys(STATES))(
    "matches amendment admission, caucus leadership, policy replay and income scale in %s",
    (place) => {
      let world = ensureNationalElectionJurisdiction(
        smallWorld({
          place: `US-${place}`,
          seed: `rules2-leg-admission:${place}`,
          offices: ["congress", "state-legislature"],
        }).world,
      );
      const body = seatedCongressChamber(world, "house")!.body,
        sponsor = body.members.find((row) => row.personId)!.personId!;
      world = { ...world, control: { kind: "person", personId: sponsor } };
      const propositionId = world.policyCatalog.propositionOrder[0]!;
      world = introduceMeasure(world, {
        stableKey: `rules2:${place}:admission`,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: US_CONGRESS_RULE_PACK.packId,
        designation: "H.R. 1",
        shortTitle: "Amendment admission edge",
        summary: "Authored measure for rule equivalence.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: sponsor,
        originChamberKey: "house",
        propositionIds: [propositionId],
        propositionAnswers: [{ propositionId, answer: "yes" }],
      });
      const measure = world.history.legislativeMeasures!.at(-1)!;
      for (const context of [
        KENTUCKY_CONTEXT,
        NEBRASKA_CONTEXT,
        ALASKA_CONTEXT,
      ])
        expect(
          scenarioInitialMoment(
            context.initialMoment.timeZone,
            context.initialMoment.utcOffsetMinutes,
          ),
        ).toEqual(context.initialMoment);
      for (const amount of [0, 1, 99, 100, 101, 1000000])
        expect(formatMinorUnits(amount, "USD")).toEqual(
          nativeAmount(amount, "USD"),
        );
      for (const [amount, currency] of [
        [-1, "USD"],
        [1.5, "USD"],
        [100, "EUR"],
      ] as const) {
        const result = (call: () => string) => {
          try {
            return { value: call() };
          } catch (error) {
            return {
              name: (error as Error).name,
              message: (error as Error).message,
            };
          }
        };
        expect(result(() => formatMinorUnits(amount, currency))).toEqual(
          result(() => nativeAmount(amount, currency)),
        );
      }
      const facts: rules.AmendmentRuleFacts = {
        germanenessRows: germaneness.rows,
        singleSubjectRows: singleSubject,
        changes: world.history.chamberRuleChanges ?? [],
        policyCatalog: world.policyCatalog,
        answers: measure.propositionAnswers ?? [],
      };
      for (const pack of [
        US_CONGRESS_RULE_PACK,
        ...(legislatureForState(`US-${place}`)
          ? [legislatureForState(`US-${place}`)!]
          : []),
      ]) {
        expect(rules.singleSubjectRule(facts, pack)).toEqual(
          native.singleSubjectRule(pack),
        );
        for (const chamber of pack.chambers) {
          expect(
            rules.startingGermaneness(facts, pack, chamber.chamberKey),
          ).toEqual(native.startingGermaneness(pack, chamber.chamberKey));
          expect(
            rules.germanenessRule(facts, pack, chamber.chamberKey),
          ).toEqual(native.germanenessRule(world, pack, chamber.chamberKey));
          expect(
            rules.amendmentAccessRule(facts, pack, chamber.chamberKey),
          ).toEqual(
            native.amendmentAccessRule(world, pack, chamber.chamberKey),
          );
          for (const propositionId of world.policyCatalog.propositionOrder.slice(
            0,
            15,
          ))
            expect(
              rules.amendmentAdmissible(
                facts,
                pack,
                chamber.chamberKey,
                measure,
                { propositionId, answer: "yes" },
              ),
            ).toEqual(
              native.amendmentAdmissible(
                world,
                pack,
                chamber.chamberKey,
                measure,
                { propositionId, answer: "yes" },
              ),
            );
        }
      }
      expect(rules.billDomains(facts, measure)).toEqual(
        native.billDomains(world, measure),
      );
      expect(
        seatedLeaders(
          {
            seated: new Map(
              US_CONGRESS_RULE_PACK.chambers.map((row) => [
                row.chamberKey,
                seatedCongressChamber(world, row.chamberKey),
              ]),
            ),
          },
          US_CONGRESS_RULE_PACK,
        ),
      ).toEqual(nativeLeaders(world, US_CONGRESS_RULE_PACK));
      const policy = {
        onDate: world.currentDate,
        policyCatalog: world.policyCatalog,
        measures: world.history.constitutionalMeasures ?? [],
        positions: new Map(),
      };
      expect(stateDecidedPropositions(policy)).toEqual(
        nativePropositions(world),
      );
      expect(constitutionalPolicyProvisions(policy, place)).toEqual(
        nativePolicy(world, place),
      );
      const payFacts = {
        onDate: world.currentDate,
        resourcePositions: world.history.resourcePositions,
        resourceFlows: world.history.resourceFlows,
        transferOutcomes: world.history.resourceTransferOutcomes,
      } as unknown as OfficialFactorFacts;
      for (const id of world.personOrder.slice(0, 10))
        expect(monthlyPay(payFacts, id, world.currentDate)).toEqual(
          nativePay(world, id, world.currentDate),
        );
      for (const direction of ["none", "cost", "benefit"] as const)
        for (const amount of [
          null,
          { minorUnits: 100, currency: "USD" as const },
        ])
          for (const pay of [0, 100, 10000]) {
            const exposure = { direction, amount } as Pick<
              LawExposureRecord,
              "direction" | "amount"
            >;
            expect(rightsOrEligibilityLoss(exposure)).toEqual(
              nativeRights(exposure),
            );
            expect(lawExposureFeltSize(exposure, pay)).toEqual(
              nativeFelt(exposure, pay),
            );
          }
    },
    30000,
  );
});
