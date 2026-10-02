import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import {
  FIXTURE,
  cash,
  pay,
} from "../../tests/fixtures/public-program-fixture";
import { addDays, makeIsoDate } from "./dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { stableHash } from "./ids";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { introduceMeasure } from "./legislation";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { currentStateExecutiveHolders } from "./nationwide-world/state-executives";
import { createOrganization } from "./life";
import { createResourcePosition, money } from "./resources";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programInstallments,
  recordProgramAppropriation,
  settleProgramInstallment,
} from "./governing/public-program";
import { advanceWorld } from "./world";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { deserializeWorld, serializeWorld } from "./serialization";
import { publicProgramCostsForMonth } from "./federal-cost-ledger";
import { isLawEffectStamp } from "./law-effect-stamp";
import {
  BUDGET_LAW_KEYS,
  BUDGET_PROGRAMS,
  PUBLIC_BUDGETS_VERSION,
  withOpenedBudgets,
} from "./public-budgets";
import { readMonthFlows } from "./public-budgets/month";
import type { World } from "./types";
import type { PublicBudgetStore } from "./public-budgets/store";
import { drawRandomPlace } from "../../tests/support/random-place";
import { placeReferencePopulation } from "./nationwide-world/place-population";
import {
  observerSetup,
  openObserverWorld,
} from "../presentation/observer-world";

const SEED = "a33-state-paid-program-cost-all56";
const PROGRAM = "pensioncontribution:controlled-payment";
const PAYMENT = 25000;
const places = lifePlaceStateIdentities()
  .filter((place) => {
    const state = stateJurisdictionForKey(place.jurisdictionKey);
    return state && legislativePackForJurisdiction(state.id);
  })
  .sort((a, b) =>
    stableHash(`${SEED}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${SEED}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);

/** Controlled program authority, recipient and cash; no real pension eligibility or schedule is asserted. */
function fixture(key: string) {
  const f = smallWorld({
    place: key,
    date: "2027-01-05",
    people: 3,
    seed: `${SEED}:${key}`,
    offices: ["governor"],
    laws: [BUDGET_LAW_KEYS.pensions],
  });
  const pack = legislativePackForJurisdiction(f.stateJurisdictionId)!;
  let world = introduceMeasure(f.world, {
    stableKey: `${SEED}:bill`,
    jurisdictionId: f.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "Controlled program-cost test",
    shortTitle: "Controlled pension-payment lineage",
    summary: FIXTURE.note,
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
    sponsorPersonId: null,
    propositionIds: [f.propositionIds[BUDGET_LAW_KEYS.pensions]!],
    propositionAnswers: [
      {
        propositionId: f.propositionIds[BUDGET_LAW_KEYS.pensions]!,
        answer: "yes",
      },
    ],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const votePlan = Object.fromEntries(
    pack.chambers.flatMap((chamber) => [
      ...chamber.committees.map((committee) => [
        votePlanKeyForCommittee(committee.committeeKey),
        { yea: committee.appointedMembers ?? 1 },
      ]),
      ...chamber.floorStages.map((stage) => [
        votePlanKeyForFloor(chamber.chamberKey, stage.stageKey),
        { yea: authoredScenarioSeatCount(pack, chamber.chamberKey) },
      ]),
    ]),
  );
  world = enactThroughDesk(world, measure.id, {
    context: {
      pack,
      measureId: measure.id,
      bodies: pack.chambers.map((chamber) =>
        seatBodyForPack(
          chamber.chamberKey,
          chamber.name,
          authoredScenarioSeatCount(pack, chamber.chamberKey),
          [],
          false,
        ),
      ),
      committeeMemberCount: null,
      votePlan,
      governorAction: null,
      governorRationale: FIXTURE.note,
    },
  });
  const holder = currentStateExecutiveHolders(world).find(
    (row) => row.stateUsps === f.stateUsps,
  )!;
  // The controlled governor now implements the Act. Keep control with that
  // actual holder while the signing consequence awaits implementation work.
  world = { ...world, control: { kind: "person", personId: holder.personId } };
  world = ensurePublicGovernmentAccount(world, {
    kind: "jurisdiction",
    jurisdictionId: f.stateJurisdictionId,
  });
  const account = publicTaxAccountForJurisdiction(
    world,
    f.stateJurisdictionId,
  )!;
  const baseline = cash(world, account.organizationId);
  const provenance = { kind: "authored" as const, note: FIXTURE.note };
  for (const role of ["payer", "recipient"])
    world = createOrganization(world, {
      stableKey: `${SEED}:${role}`,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: `Fictional controlled ${role}`,
        classification: "sector:private",
        locationJurisdictionId: f.stateJurisdictionId,
      },
    });
  const [payer, recipient] = world.history.organizations.slice(-2);
  world = createResourcePosition(world, {
    stableKey: `${SEED}:funding`,
    owner: { kind: "organization", organizationId: payer!.id },
    openedAt: world.currentDate,
    openingBalance: money(PAYMENT * 2, "USD"),
    provenance,
  });
  world = createResourcePosition(world, {
    stableKey: `${SEED}:recipient-cash`,
    owner: { kind: "organization", organizationId: recipient!.id },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  world = pay(
    world,
    `${SEED}:receipt`,
    payer!.id,
    account.organizationId,
    PAYMENT * 2,
  );
  world = declareProgramCapacity(world, {
    edition: SEED,
    programKey: PROGRAM,
    jurisdictionId: f.stateJurisdictionId,
    serviceLabel: "Controlled payment only",
    unitLabel: "fixture units",
    unitsTotal: 1,
    unitsOperational: 0,
    monthlyOperatingNeed: money(1, "USD"),
    completedPermille: null,
    restorationCostPerUnit: null,
    basis: FIXTURE,
  }).world;
  const appropriation = recordProgramAppropriation(world, {
    edition: SEED,
    programKey: PROGRAM,
    jurisdictionId: f.stateJurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(PAYMENT * 2, "USD"),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 365),
    sourceMeasureId: measure.id,
    basis: FIXTURE,
  });
  const committed = commitPublicProgram(appropriation.world, {
    appropriationId: appropriation.id,
    alternative: {
      key: "controlled-payment",
      title: FIXTURE.note,
      installments: [
        { afterDays: 1, amount: money(PAYMENT, "USD"), purpose: "operating" },
      ],
      deliveryLeadDays: null,
    },
    personId: holder.personId,
    office: { kind: "state-executive" },
    recipientOrganizationId: recipient!.id,
  });
  if (!committed.ok) throw new Error(committed.reason);
  return {
    world: committed.world,
    measure,
    appropriationId: appropriation.id,
    commitmentId: committed.recordId,
    accountId: account.organizationId,
    recipientId: recipient!.id,
    jurisdictionId: f.stateJurisdictionId,
    baseline,
  };
}

describe("A33 saved state public-program payments reach the common cost reader", () => {
  it.each(places)(
    "preserves the actual payment chain in $jurisdictionKey",
    ({ jurisdictionKey }: (typeof places)[number]) => {
      const f = fixture(jurisdictionKey);
      const due = addDays(f.world.currentDate, 1);
      const month = makeIsoDate(`${due.slice(0, 7)}-01`);
      expect(publicProgramCostsForMonth(f.world, month)).toEqual([]);
      const world = advanceWorld(
        f.world,
        1,
        createCampaignElectionTransitionRegistry(),
      );
      const installment = programInstallments(world, PROGRAM).find(
        (row) => row.commitmentId === f.commitmentId,
      )!;
      expect(installment.status).toBe("posted");
      const costs = publicProgramCostsForMonth(world, month);
      expect(costs).toHaveLength(1);
      const cost = costs[0]!;
      expect(cost).toMatchObject({
        jurisdictionId: f.jurisdictionId,
        sourceMeasureId: f.measure.id,
        programKey: PROGRAM,
        paidAt: due,
        amountMinorUnits: PAYMENT,
        questionKey: BUDGET_LAW_KEYS.pensions,
      });
      const outcome = world.history.resourceTransferOutcomes.find(
        (row) => row.resourceFlowId === installment.resourceFlowId,
      )!;
      expect(outcome.status).toBe("completed");
      expect(cost.sourceRecordIds).toEqual(
        expect.arrayContaining([
          f.appropriationId,
          f.commitmentId,
          installment.id,
          installment.resourceFlowId,
          outcome.id,
        ]),
      );
      expect(cost.lawEffectStamps).toHaveLength(1);
      expect(isLawEffectStamp(cost.lawEffectStamps[0])).toBe(true);
      expect(cost.lawEffectStamps[0]).toMatchObject({
        governingLawKey: f.measure.id,
        jurisdictionId: f.jurisdictionId,
        effectKind: "government-program-payment",
      });
      expect(cash(world, f.accountId)).toBe(f.baseline + PAYMENT);
      expect(cash(world, f.recipientId)).toBe(PAYMENT);
      const store: PublicBudgetStore = {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      };
      const budgets = withOpenedBudgets(world, store, month);
      const flows = readMonthFlows(world, budgets).flows;
      const recorded = flows.recorded!.get(jurisdictionKey)!;
      expect(
        recorded.spendingMinorUnits[
          BUDGET_PROGRAMS.indexOf("pensionContribution")
        ],
      ).toBe(PAYMENT);
      expect(recorded.sourceRecordIds).toEqual(
        expect.arrayContaining([...cost.sourceRecordIds]),
      );
      expect(recorded.lawEffectStamps).toEqual(
        expect.arrayContaining([...cost.lawEffectStamps]),
      );
      const saved = deserializeWorld(serializeWorld(world));
      expect(publicProgramCostsForMonth(saved, month)).toEqual(costs);
      expect(settleProgramInstallment(saved, f.commitmentId, 0).world).toBe(
        saved,
      );
      expect(saved.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      expect(
        publicProgramCostsForMonth(world, makeIsoDate("2030-01-01")),
      ).toEqual([]);
      for (const id of [f.appropriationId, f.commitmentId, installment.id]) {
        const broken = {
          ...world,
          history: {
            ...world.history,
            publicProgramRecords: world.history.publicProgramRecords!.filter(
              (row) => row.id !== id,
            ),
          },
        } as World;
        expect(publicProgramCostsForMonth(broken, month)).toEqual([]);
      }
      const unpaid = {
        ...world,
        history: {
          ...world.history,
          resourceTransferOutcomes: world.history.resourceTransferOutcomes.map(
            (row) =>
              row.id === outcome.id
                ? { ...row, status: "missed" as const }
                : row,
          ),
        },
      } as World;
      expect(publicProgramCostsForMonth(unpaid, month)).toEqual([]);
    },
  );
  it("reads a random native Begin without manufacturing payments or service", () => {
    const seed = `${SEED}:native-begin`;
    const place = drawRandomPlace(seed, (candidate) => {
      const population = candidate.sourceGeoid
        ? placeReferencePopulation(candidate.sourceGeoid)?.value
        : null;
      return (
        candidate.context.jurisdiction.kind === "census-place" &&
        population != null &&
        population > 0 &&
        population <= 1000
      );
    });
    const { world } = openObserverWorld(observerSetup(seed, place.key));
    const before = serializeWorld(world);
    const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
    const costs = publicProgramCostsForMonth(world, month);
    expect(publicProgramCostsForMonth(world, month)).toEqual(costs);
    expect(world.publicBudgets).toBeDefined();
    readMonthFlows(world, world.publicBudgets!);
    expect(serializeWorld(world)).toBe(before);
    process.stdout.write(
      JSON.stringify({
        seed,
        place: place.key,
        date: world.currentDate,
        publicProgramCosts: costs.length,
        savedTransferOutcomes: world.history.resourceTransferOutcomes.length,
        scope:
          "Native Begin read only; no pension eligibility or delivery asserted.",
      }) + "\n",
    );
  });
});
