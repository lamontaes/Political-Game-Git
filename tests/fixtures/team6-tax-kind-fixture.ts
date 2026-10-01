import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../../src/simulation/congress-rule-pack";
import { seatedCongressChamber } from "../../src/simulation/governing/congress-chambers";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
} from "../../src/simulation/legislation";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../../src/simulation/legislation-scenarios";
import { recordFiledProvision } from "../../src/simulation/legislative-politics";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../src/simulation/national-election-geography";
import { RAISE_TOP_FEDERAL_RATE_QUESTION } from "../../src/simulation/federal-top-income-tax-law";
import { FEDERAL_INCOME_TAX_2026 } from "../../src/simulation/income-tax-withholding";

/** Controlled adopted federal terms, not ordinary passage or tax collection.
 * The threshold is the acquired single-filer annual taxable-income threshold.
 * The authored rate uses the representative 39.6% restoration already sourced
 * in federal-top-income-tax-law.ts. Neither input prices a saved paycheck here.
 */
export function federalTopRateTermsFixture() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "team6-tax-kind-final-federal-terms",
      startAge: 34,
      depth: "summarize-earlier-life",
    }),
  ).game;
  if (!game) throw new Error("Expected an ordinary opening life.");
  let world = ensureNationalElectionJurisdiction(game.world);
  const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === RAISE_TOP_FEDERAL_RATE_QUESTION,
  );
  if (!proposition)
    throw new Error("The declared federal tax question is absent.");
  const rate = 0.396;
  const threshold = FEDERAL_INCOME_TAX_2026.single!.brackets.at(-1)!.overMinor;
  world = introduceMeasure(world, {
    stableKey: "team6-tax-kind:final-terms:measure",
    jurisdictionId,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. TAX FIXTURE",
    shortTitle: "Controlled final federal tax terms",
    summary: "Authored legal-term fixture; no tax collection is inferred.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = recordFiledProvision(world, {
    stableKey: "team6-tax-kind:final-terms:provision",
    measureId,
    provisionKey: "federal-top-income-tax",
    sectionNumber: 1,
    heading: "Top marginal rate and annual taxable-income threshold",
    text: `Controlled fixture: rate ${rate}, annual taxable threshold ${threshold} USD minor units.`,
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "the controlled federal tax fixture",
    },
    applicationScope: { jurisdictionId, segmentKey: null },
    lawTerms: [
      {
        questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        key: "rate",
        value: rate,
        unit: "ratio",
      },
      {
        questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
        key: "threshold",
        value: threshold,
        unit: "minor",
      },
    ],
  });
  const provisionId = world.history.legislativeProvisions!.at(-1)!.id;
  const bodies = US_CONGRESS_RULE_PACK.chamberOrder.map((key) => {
    const seated = seatedCongressChamber(world, key);
    if (!seated) throw new Error("Expected the actual seated Congress.");
    return seated.body;
  });
  const votePlan: Record<string, { yea: number }> = {};
  for (const key of US_CONGRESS_RULE_PACK.chamberOrder) {
    const chamber = chamberByKey(US_CONGRESS_RULE_PACK, key);
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 1,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(key, stage.stageKey)] = {
        yea: bodies.find((body) => body.chamberKey === key)!.members.length,
      };
  }
  const procedure = {
    pack: US_CONGRESS_RULE_PACK,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed" as const,
    governorRationale:
      "Authored favorable decision for the controlled term fixture.",
  };
  for (let stepNumber = 0; stepNumber < 45; stepNumber++) {
    if (measurePosition(world, measureId).phase === "awaiting-enactment") break;
    const step = availableMeasureSteps(world, measureId).find(
      (entry) => entry !== "offer-amendment",
    );
    if (!step) throw new Error("No supported next federal enactment step.");
    world = applyLegislativeStep(procedure, world, step).world;
  }
  world = recordEnactment(world, {
    stableKey: "team6-tax-kind:final-terms:enactment",
    measureId,
    effectiveAt: world.currentDate,
  });
  return {
    world,
    measureId,
    provisionId,
    propositionId: proposition.id,
    rate,
    threshold,
  };
}
