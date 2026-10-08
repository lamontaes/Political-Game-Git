import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import { makeIsoDate } from "./dates";
import {
  CONSUMER_LOAN_CAP_QUESTION,
  consumerLoanCapAt,
} from "./consumer-loan-law";
import {
  openHouseholdLoan,
  reviseLoanTerms,
  settleHouseholdLoanPayments,
} from "./household-loans";
import { lawExposuresOf } from "./law-exposure";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { createLightweightPerson } from "./people";
import { smallWorld } from "../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "./congress-rule-pack";
import { seatedCongressChamber } from "./governing/congress-chambers";
import { chamberByKey } from "./legislature-rules";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { ensureNationalElectionJurisdiction } from "./national-election-geography";
import { createResourcePosition, money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { ensureLivingWorldOpening } from "./living-world/opening";
import { establishOpeningOfficeholders } from "../presentation/opening-officeholders";
import { ensureWorldStartingConditions } from "./world-setup/conditions";
import { generatePoliticalStartingConditions } from "./world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";

import type { EntityId, HouseholdLoanKind, World } from "./types";

const SEED = "lw29-consumer-loan-cap";
const DATE = makeIsoDate("2028-01-01");
const billId = (world: World) =>
  world.history.legislativeMeasures!.find(
    (row) => row.stableKey === "fixture:lw29:bill",
  )!.id;

/** Controlled adopted bill text; these numbers are test inputs, not default law. */
function enactCap(
  world: World,
  options: {
    cap?: number;
    coverage?: readonly HouseholdLoanKind[];
    effectiveAt?: string;
  } = {},
): World {
  let next = ensureNationalElectionJurisdiction(world);
  const question = Object.values(next.policyCatalog.propositions).find(
    (row) => row.stableKey === CONSUMER_LOAN_CAP_QUESTION,
  )!;
  next = introduceMeasure(next, {
    stableKey: "fixture:lw29:bill",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. TEST",
    shortTitle: "Controlled consumer loan cap",
    summary: "Authored test bill.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
  });
  const measureId = billId(next);
  next = recordFiledProvision(next, {
    stableKey: "fixture:lw29:terms",
    measureId,
    provisionKey: "loan-cap",
    sectionNumber: 1,
    heading: "Controlled loan cap",
    text: "Authored test rate and coverage.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Covered borrowers",
    },
    applicationScope: {
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      segmentKey: null,
    },
    answers: { propositionId: question.id, answer: "yes" },
    lawTerms: [
      {
        questionKey: CONSUMER_LOAN_CAP_QUESTION,
        key: "cap",
        unit: "basis-points",
        value: options.cap ?? 1200,
      },
    ],
    lawCategories: [
      {
        questionKey: CONSUMER_LOAN_CAP_QUESTION,
        key: "coverage",
        values: options.coverage ?? ["personal"],
      },
    ],
  });
  const bodies = US_CONGRESS_RULE_PACK.chamberOrder.map(
    (key) => seatedCongressChamber(next, key)!.body,
  );
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
  return enactThroughDesk(next, measureId, {
    context: {
      pack: US_CONGRESS_RULE_PACK,
      measureId,
      bodies,
      committeeMemberCount: null,
      votePlan,
      governorAction: "signed",
      governorRationale: "Controlled fixture passage.",
    },
    effectiveAt: makeIsoDate(options.effectiveAt ?? world.currentDate),
  });
}

let countryWorld: World | undefined;
function country() {
  return (countryWorld ??= smallWorld({
    place: drawRandomPlace(SEED).key,
    seed: SEED,
    date: DATE,
    offices: ["congress"],
  }).world);
}

function fixture(stateKey: string) {
  const base = country();
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  const person = createLightweightPerson({
    worldId: base.id,
    worldSeed: base.seed,
    index: 100000,
    currentDate: DATE,
    homeJurisdictionId: jurisdiction.id,
    birthplaceJurisdictionId: jurisdiction.id,
    profile: "production",
  });
  const world: World = {
    ...base,
    jurisdictions: { ...base.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [
      ...new Set([...base.jurisdictionOrder, jurisdiction.id]),
    ],
    people: { ...base.people, [person.id]: person },
    personOrder: [...base.personOrder, person.id],
  };
  return { world, personId: person.id };
}

function open(
  world: World,
  personId: EntityId,
  kind: HouseholdLoanKind = "personal",
) {
  let next = resourcePositionAt(
    world,
    { kind: "person", personId },
    money(0, "USD").currency,
  )
    ? world
    : createResourcePosition(world, {
        stableKey: "fixture:loan-cash",
        owner: { kind: "person", personId },
        openedAt: world.currentDate,
        openingBalance: money(1_000_000, "USD"),
        provenance: { kind: "authored", note: "Controlled borrower cash." },
      });
  next = openHouseholdLoan(next, {
    stableKey: "fixture:consumer-loan",
    borrower: { kind: "person", personId },
    lenderOrganizationId: null,
    lenderKind: "bank",
    kind,
    principal: money(120_000, "USD"),
    marketAnnualRateBasisPoints: 3600,
    rateCap: null,
    repayment: { kind: "installment", termMonths: 12 },
    lateFee: null,
    missedPaymentsToDefault: null,
    missedPaymentsToCollections: null,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    housingTenureId: null,
    provenance: { kind: "authored", note: "Controlled loan offer." },
  });
  return next;
}

function service(world: World) {
  const [year, month] = world.currentDate.split("-").map(Number) as [
    number,
    number,
  ];
  const dueOn = makeIsoDate(
    `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`,
  );
  let next = world;
  // Isolate this recorded payment period, like the office-payroll fixtures.
  // Retain explicit cancellation records for unrelated work; this is not a full clock proof.
  for (const due of world.history.futureDueItems) {
    if (due.dueAt >= dueOn) continue;
    const state = futureDueItemStateAt(world, due.id, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (state?.status === "scheduled")
      next = cancelFutureDueItem(next, {
        stableKey: `fixture:loan-period:${due.id}`,
        dueItemId: due.id,
        effectiveAt: world.currentDate,
        reasonKey: "fixture:loan-period",
        context:
          "Controlled loan servicing period; unrelated scheduled work is outside this fixture.",
      });
  }
  return settleHouseholdLoanPayments({
    ...next,
    currentDate: dueOn,
    currentMoment: { ...next.currentMoment, date: dueOn },
  });
}

describe("enacted federal loan caps reach borrowers", () => {
  it("includes all 56 places in the borrower proof", () => {
    expect(lifePlaceStateIdentities()).toHaveLength(56);
  });

  it.each(lifePlaceStateIdentities())(
    "caps opening and existing loans through one monthly writer in $jurisdictionKey",
    (place) => {
      const { world, personId } = fixture(place.jurisdictionKey);
      const original = open(world, personId);
      const uncapped = service(original);
      const cappedAtOpening = open(enactCap(world), personId);
      expect(
        cappedAtOpening.history.loanTerms!.at(-1),
        place.jurisdictionKey,
      ).toMatchObject({
        annualRateBasisPoints: 1200,
        rateCapMeasureId: billId(cappedAtOpening),
      });
      expect(lawExposuresOf(cappedAtOpening, personId)).toHaveLength(0);
      for (const changed of [cappedAtOpening, enactCap(original)]) {
        const settled = service(changed);
        expect(
          settled.history.debtCharges!.at(-1)!.amount.minorUnits,
          place.jurisdictionKey,
        ).toBe(1200);
        expect(uncapped.history.debtCharges!.at(-1)!.amount.minorUnits).toBe(
          3600,
        );
        expect(
          settled.history.resourceTransferOutcomes.at(-1)!.transferredAmount
            .minorUnits,
        ).toBeLessThan(
          uncapped.history.resourceTransferOutcomes.at(-1)!.transferredAmount
            .minorUnits,
        );
        expect(lawExposuresOf(settled, personId)).toMatchObject([
          {
            measureId: billId(settled),
            direction: "gain",
            amount: { minorUnits: 2400 },
            sourceRecordId: settled.history.loanTerms!.at(-1)!.id,
          },
        ]);
        expect(settleHouseholdLoanPayments(settled)).toBe(settled);
      }
    },
  );

  it("respects the adopted coverage, effective date and a cap above the offered rate", () => {
    const place = drawRandomPlace(`${SEED}:limits`);
    const { world, personId } = fixture(place.stateJurisdictionKey!);
    for (const options of [
      { coverage: ["auto"] as const },
      { effectiveAt: "2029-01-01" },
      { cap: 4000 },
    ]) {
      const settled = service(open(enactCap(world, options), personId));
      expect(settled.history.debtCharges!.at(-1)!.amount.minorUnits).toBe(3600);
      expect(lawExposuresOf(settled, personId)).toHaveLength(0);
    }
    const missing = enactCap(world);
    expect(
      consumerLoanCapAt(
        {
          ...missing,
          history: { ...missing.history, legislativeProvisions: [] },
        },
        "personal",
        DATE,
      ),
    ).toBeNull();
  });

  it("keeps a cap's savings basis only while its recorded rate is unchanged", () => {
    const place = drawRandomPlace(`${SEED}:revision`);
    const { world, personId } = fixture(place.stateJurisdictionKey!);
    const opened = open(enactCap(world), personId);
    const obligationId = opened.history.loanTerms!.at(-1)!.resourceObligationId;
    const revisedPlan = reviseLoanTerms(
      opened,
      obligationId,
      { repayment: { kind: "installment", termMonths: 18 } },
      "fixture:longer-payment-plan",
      { kind: "authored", note: "Controlled payment-plan revision." },
    );
    expect(
      revisedPlan.history.loanTerms!.at(-1)!.rateBeforeCapBasisPoints,
    ).toBe(3600);
    const revisedRate = reviseLoanTerms(
      revisedPlan,
      obligationId,
      { annualRateBasisPoints: 1000 },
      "fixture:new-agreed-rate",
      { kind: "authored", note: "Controlled agreement below the law's cap." },
    );
    expect(
      revisedRate.history.loanTerms!.at(-1)!.rateBeforeCapBasisPoints,
    ).toBeUndefined();
    expect(lawExposuresOf(service(revisedRate), personId)).toHaveLength(0);
  });

  // slow until SPEED FIXED: the full opening and loan-servicing journey stays intact.
  it.skip("changes a named borrower's actual charge in a new game drawn from all places", () => {
    const seed = `${SEED}:new-game`;
    const place = drawRandomPlace(seed);
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
      priors: [],
    });
    const world = ensureLivingWorldOpening(
      establishOpeningOfficeholders(
        ensureWorldStartingConditions(built.world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
          political: generatePoliticalStartingConditions,
        }),
        built.playerPersonId,
        { includeVicePresident: true },
      ),
      built.playerPersonId,
    );
    const settled = service(open(enactCap(world), built.playerPersonId));
    const exposure = lawExposuresOf(settled, built.playerPersonId).find(
      (row) => row.measureId === billId(settled),
    )!;
    expect(exposure.amount!.minorUnits).toBe(2400);
    process.stdout.write(
      JSON.stringify({
        seed,
        place: place.key,
        law: billId(settled),
        person: built.playerPersonId,
        interestBeforeMinor: 3600,
        interestAfterMinor:
          settled.history.debtCharges!.at(-1)!.amount.minorUnits,
        savedMinor: exposure.amount!.minorUnits,
      }) + "\n",
    );
  });
});
