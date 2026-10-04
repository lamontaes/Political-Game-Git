import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { observerSetup } from "../../presentation/observer-world";
import { createOrganization, createWorkRelationship } from "../life";
import { lifePlaceStateIdentities } from "../life-places";
import { resourcePositionAt, resourceFlowTermsAt } from "../resource-queries";
import { paymentFromDatedCash } from "../resource-payments";
import {
  createResourcePosition,
  createResourceFlow,
  createWorkCompensation,
  recordResourceTransferOutcome,
  money,
} from "../resources";
import { SeededRng } from "../rng";
import { isTerritoryUsps } from "../state-reference";
import { withHistoryAppendTransaction } from "../history-index";
import { ensureLifePathPersonalPosition } from "../life-paths2-resources";
import { assessPaychecksTaxes } from "../statutory-tax";
import { deserializeWorld, serializeWorld } from "../serialization";
import { aggregateCustomers, OWNER_DRAW_BASIS } from "../local-economy";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../macro-economy/producer";
import {
  ensureTownOpeningBusinessBooks,
  PAYDAYS_A_YEAR,
  TOWN_SALES_RECEIPT_BASIS,
} from "./town-finances";
import type { EntityId } from "../types";
import {
  settleTownCompensations,
  type TownCompensationPeriod,
} from "./town-pay";

const seed = "standby4-a60-recorded-employer-cash";
const places = lifePlaceStateIdentities();
const place = new SeededRng(seed).pick(places).jurisdictionKey;
const provenance = {
  kind: "authored" as const,
  note: "A60 controlled contract and recorded cash; not a natural wage or treasury estimate.",
};

function fixture(cash: number | null, workers = 1, placeKey = place) {
  expect(places).toHaveLength(56);
  const small = smallWorld({ place: placeKey, seed, date: "2026-01-05" });
  let world = createOrganization(small.world, {
    stableKey: "a60:employer",
    formedAt: small.world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled employer",
      classification: "enterprise:retail",
      locationJurisdictionId: small.jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const owner = { kind: "organization" as const, organizationId };
  if (cash !== null)
    world = createResourcePosition(world, {
      stableKey: "a60:cash",
      owner,
      openedAt: world.currentDate,
      openingBalance: money(cash, "USD"),
      provenance,
    });
  const periods: TownCompensationPeriod[] = [];
  const workerIds: EntityId[] = [];
  for (let index = 0; index < workers; index += 1) {
    const personId = world.personOrder[index]!;
    workerIds.push(personId);
    world = createWorkRelationship(world, {
      stableKey: `a60:work:${index}`,
      personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Controlled clerk",
        occupationClassification: "occupation:cashier",
        locationJurisdictionId: small.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 32, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: small.jurisdictionId,
        },
      },
    });
    const workRelationshipId = world.history.workRelationships.at(-1)!.id;
    world = createWorkCompensation(world, {
      stableKey: `a60:pay:${index}`,
      workRelationshipId,
      startsAt: world.currentDate,
      amount: money(100_000, "USD"),
      cadenceKind: "schedule:town-weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    periods.push({
      payFlowId: flow.id,
      activityId: flow.id,
      stableKey: `a60:period:${index}`,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      onDate: world.currentDate,
    });
  }
  return { world, owner, periods, workerIds, town: small.jurisdictionId };
}

describe(`town payroll uses saved employer cash in ${place}, seed ${seed}`, () => {
  it.each([150_000, 35_000, 0, null])(
    "records opening book sales before payroll, preserving customer cash and replay (customer cash %s)",
    (customerCash) => {
      const base = fixture(0);
      let world = ensureWorldStartingConditions(base.world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      });
      world = ensureMacroEconomyStarted(
        world,
        macroStartForHistory(macroStartingConditions(world)),
      );
      const customers = aggregateCustomers(world, base.town);
      world = customers.world;
      const customerOwner = {
        kind: "organization" as const,
        organizationId: customers.organizationId,
      };
      if (customerCash !== null)
        world = createResourcePosition(world, {
          stableKey: "a60:customer-cash",
          owner: customerOwner,
          openedAt: world.currentDate,
          openingBalance: money(customerCash, "USD"),
          provenance,
        });
      world = createResourceFlow(world, {
        stableKey: "a60:legacy-draw",
        source: base.owner,
        recipient: customerOwner,
        startsAt: world.currentDate,
        amount: money(50_000, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: OWNER_DRAW_BASIS,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
      const drawFlowId = world.history.resourceFlows.at(-1)!.id;
      const period = base.periods[0]!;
      const terms = resourceFlowTermsAt(world, period.payFlowId)!;
      const cadence = /^schedule:town-([a-z]+)/.exec(terms.cadenceKind)![1]!;
      const quarterPay = new Map([
        [
          base.owner.organizationId,
          (terms.amount.minorUnits * PAYDAYS_A_YEAR[cadence]!) / 400,
        ],
      ]);
      const opened = ensureTownOpeningBusinessBooks(world, quarterPay);
      const books = opened.townFinances!.businesses[base.owner.organizationId]!;
      const saleFlows = opened.history.resourceFlows.filter(
        (flow) =>
          flow.basisKind === TOWN_SALES_RECEIPT_BASIS &&
          flow.recipient.kind === "organization" &&
          flow.recipient.organizationId === base.owner.organizationId,
      );
      expect(saleFlows).toHaveLength(1);
      const saleFlow = saleFlows[0]!;
      expect(saleFlow.source).toEqual(customerOwner);
      const sale = opened.history.resourceTransferOutcomes.find(
        (outcome) => outcome.resourceFlowId === saleFlow.id,
      )!;
      expect(sale.provenance.kind).toBe("authored");
      if (sale.provenance.kind !== "authored")
        throw new Error(
          "Recorded book sale must preserve authored source provenance.",
        );
      const savedSource = JSON.parse(sale.provenance.note);
      expect(savedSource.annualRevenueConstantDollars).toBe(
        books.annualRevenue,
      );
      expect(savedSource.basePriceIndex).toBe(
        opened.townFinances!.basePriceIndex,
      );
      const gross = Math.round(
        (books.annualRevenue / 4) * savedSource.nominalPriceLevel * 100,
      );
      const receiptMinor =
        customerCash === null ? gross : Math.min(customerCash, gross);
      expect(sale.attemptedAmount).toEqual(money(gross, "USD"));
      expect(sale.transferredAmount).toEqual(money(receiptMinor, "USD"));
      expect(sale.periodStartsAt).toBe(world.currentDate);
      expect(sale.periodEndsAt).toBe(world.currentDate);
      expect(sale.occurredAt).toBe(world.currentDate);
      expect(
        resourcePositionAt(opened, base.owner, terms.amount.currency)!
          .liquidBalance.minorUnits,
      ).toBe(receiptMinor);
      if (customerCash === null) {
        // Approved book receipts do not fabricate an aggregate cash account.
        expect(
          resourcePositionAt(opened, customerOwner, terms.amount.currency),
        ).toBeUndefined();
        expect(sale.status).toBe("completed");
      } else {
        expect(
          resourcePositionAt(opened, customerOwner, terms.amount.currency)!
            .liquidBalance.minorUnits,
        ).toBe(customerCash - receiptMinor);
        expect(sale.status).toBe(
          receiptMinor === gross
            ? "completed"
            : receiptMinor > 0
              ? "partial"
              : "missed",
        );
      }
      const paid = settleTownCompensations(opened, [period]);
      const wage = paid.history.resourceTransferOutcomes.find(
        (outcome) => outcome.stableKey === period.stableKey,
      )!;
      const wageMinor = Math.min(receiptMinor, terms.amount.minorUnits);
      expect(wage.transferredAmount.minorUnits).toBe(wageMinor);
      expect(
        resourcePositionAt(paid, base.owner, terms.amount.currency)!
          .liquidBalance.minorUnits,
      ).toBe(receiptMinor - wageMinor);
      expect(
        paid.history.resourceTransferOutcomes.some(
          (outcome) => outcome.resourceFlowId === drawFlowId,
        ),
      ).toBe(false);
      expect(
        paid.history.organizations.filter(
          (row) => row.stableKey === `local-customers:${base.town}`,
        ),
      ).toHaveLength(1);
      const replay = deserializeWorld(serializeWorld(paid));
      expect(ensureTownOpeningBusinessBooks(replay, quarterPay)).toEqual(
        replay,
      );
      expect(settleTownCompensations(replay, [period])).toEqual(replay);
    },
  );
  it("refuses an actual payment from unknown customer cash without creating a balance or transfer", () => {
    const base = fixture(0);
    const customers = aggregateCustomers(base.world, base.town);
    const owner = {
      kind: "organization" as const,
      organizationId: customers.organizationId,
    };
    const world = customers.world;
    const amount = resourceFlowTermsAt(
      world,
      base.periods[0]!.payFlowId,
    )!.amount;
    const before = serializeWorld(world);
    expect(
      paymentFromDatedCash(world, owner, amount, world.currentDate),
    ).toEqual({
      availableMinor: null,
      status: "blocked",
      transferredAmount: money(0, amount.currency),
      reasonKind: "capacity:money-unknown",
    });
    expect(resourcePositionAt(world, owner, amount.currency)).toBeUndefined();
    expect(serializeWorld(world)).toBe(before);
    const replay = deserializeWorld(before);
    expect(
      paymentFromDatedCash(replay, owner, amount, replay.currentDate),
    ).toEqual(paymentFromDatedCash(world, owner, amount, world.currentDate));
  });
  it("opens a new game in a random place with the current payroll code", () => {
    const openingSeed = "standby4-a60-current-main-new-game-20261002";
    const setup = observerSetup(openingSeed);
    const opened = generateOpeningLife(
      prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
    );
    expect(opened.game).not.toBeNull();
    const game = opened.game!;
    expect(game.world.people[game.playerPersonId]).toBeDefined();
    expect(game.world.history.workRelationships.length).toBeGreaterThan(0);
    expect(
      game.world.history.resourceFlows.some(
        (flow) => flow.basisKind === "compensation:work",
      ),
    ).toBe(true);
    process.stdout.write(
      JSON.stringify({
        receipt: "A60 new game",
        seed: openingSeed,
        placeKey: setup.placeKey,
        playerPersonId: game.playerPersonId,
        date: game.world.currentDate,
        workRelationships: game.world.history.workRelationships.length,
      }) + "\n",
    );
  });
  it("blocks unknown employer cash without opening an invented employer position", () => {
    const { world, owner, periods } = fixture(null);
    const paid = settleTownCompensations(world, periods);
    const outcome = paid.history.resourceTransferOutcomes.find(
      (row) => row.stableKey === periods[0]!.stableKey,
    )!;
    expect(outcome.status).toBe("blocked");
    expect(outcome.attemptedAmount.minorUnits).toBe(100_000);
    expect(outcome.transferredAmount.minorUnits).toBe(0);
    expect(outcome.reasonKind).toBe("capacity:unrecorded-employer-cash");
    expect(
      resourcePositionAt(paid, owner, money(0, "USD").currency),
    ).toBeUndefined();
  });

  it.each([0, 35_000])(
    "records the actual shortfall when saved employer cash is %i",
    (cash) => {
      const { world, owner, periods } = fixture(cash);
      const paid = settleTownCompensations(world, periods);
      const outcome = paid.history.resourceTransferOutcomes.find(
        (row) => row.stableKey === periods[0]!.stableKey,
      )!;
      expect(outcome.status).toBe(cash === 0 ? "missed" : "partial");
      expect(outcome.attemptedAmount.minorUnits).toBe(100_000);
      expect(outcome.transferredAmount.minorUnits).toBe(cash);
      expect(outcome.reasonKind).toBe("capacity:insufficient-employer-cash");
      expect(
        resourcePositionAt(paid, owner, money(0, "USD").currency)!.liquidBalance
          .minorUnits,
      ).toBe(0);
    },
  );

  it("shares one balance across workers without spending it twice and survives reload", () => {
    const { world, owner, periods } = fixture(150_000, 2);
    const paid = settleTownCompensations(world, [...periods, periods[0]!]);
    const outcomes = paid.history.resourceTransferOutcomes.filter((row) =>
      periods.some((period) => row.stableKey === period.stableKey),
    );
    expect(
      outcomes.map((row) => [row.status, row.transferredAmount.minorUnits]),
    ).toEqual([
      ["completed", 100_000],
      ["partial", 50_000],
    ]);
    expect(outcomes.map((row) => row.attemptedAmount.minorUnits)).toEqual([
      100_000, 100_000,
    ]);
    expect(
      resourcePositionAt(paid, owner, money(0, "USD").currency)!.liquidBalance
        .minorUnits,
    ).toBe(0);
    const reopened = deserializeWorld(serializeWorld(paid));
    expect(settleTownCompensations(reopened, periods)).toBe(reopened);
  });

  it("pays the full recorded contract when employer cash covers it", () => {
    const { world, owner, periods } = fixture(200_000);
    const paid = settleTownCompensations(world, periods);
    const outcome = paid.history.resourceTransferOutcomes.find(
      (row) => row.stableKey === periods[0]!.stableKey,
    )!;
    expect(outcome.status).toBe("completed");
    expect(outcome.transferredAmount.minorUnits).toBe(100_000);
    expect(outcome.reasonKind).toBeNull();
    expect(
      resourcePositionAt(paid, owner, money(0, "USD").currency)!.liquidBalance
        .minorUnits,
    ).toBe(100_000);
  });
});

it.each(
  places
    .filter((row) => !isTerritoryUsps(row.jurisdictionKey.slice(3)))
    .slice(0, 2),
)(
  "streams withholding terms without changing completed/partial joins, snapshots or Continue in $jurisdictionKey",
  ({ jurisdictionKey }) => {
    const control = fixture(150_000, 2, jurisdictionKey);
    let gross = control.world;
    const ids: EntityId[] = [];
    for (const [index, period] of control.periods.entries()) {
      gross = ensureLifePathPersonalPosition(
        gross,
        control.workerIds[index]!,
        money(0, "USD").currency,
      );
      gross = recordResourceTransferOutcome(gross, {
        stableKey: period.stableKey,
        resourceFlowId: period.payFlowId,
        periodStartsAt: period.periodStartsAt,
        periodEndsAt: period.periodEndsAt,
        occurredAt: period.onDate,
        attemptedAmount: money(100_000, "USD"),
        transferredAmount: money(index === 0 ? 100_000 : 50_000, "USD"),
        status: index === 0 ? "completed" : "partial",
        reasonKind: index === 0 ? null : "capacity:insufficient-employer-cash",
        note: null,
        provenance,
      });
      ids.push(gross.history.resourceTransferOutcomes.at(-1)!.id);
    }
    const snapshot = serializeWorld(gross);
    const reference = withHistoryAppendTransaction(
      gross,
      ["resourceFlows", "resourceTransferOutcomes"],
      (world) => assessPaychecksTaxes(world, ids),
    );
    const candidate = withHistoryAppendTransaction(
      gross,
      ["resourceFlows", "resourceFlowTerms", "resourceTransferOutcomes"],
      (world) => assessPaychecksTaxes(world, ids),
    );
    expect(serializeWorld(gross)).toBe(snapshot);
    expect(serializeWorld(candidate)).toBe(serializeWorld(reference));
    expect(Array.isArray(candidate.history.resourceFlows)).toBe(true);
    expect(Array.isArray(candidate.history.resourceFlowTerms)).toBe(true);
    expect(Array.isArray(candidate.history.resourceTransferOutcomes)).toBe(
      true,
    );
    for (const id of ids) {
      const withholding = candidate.history.resourceFlows.filter(
        (flow) =>
          flow.stableKey === `statutory-tax:withholding:${id}` ||
          flow.stableKey.startsWith(`statutory-tax:withholding:${id}:`),
      );
      expect(withholding.length).toBeGreaterThan(0);
      for (const flow of withholding) {
        expect(
          candidate.history.resourceFlowTerms.filter(
            (terms) => terms.resourceFlowId === flow.id,
          ),
        ).toHaveLength(1);
        expect(
          candidate.history.resourceTransferOutcomes.filter(
            (outcome) => outcome.resourceFlowId === flow.id,
          ),
        ).toHaveLength(1);
      }
    }
    const continued = deserializeWorld(serializeWorld(candidate));
    expect(serializeWorld(continued)).toBe(serializeWorld(candidate));
    expect(assessPaychecksTaxes(continued, ids)).toBe(continued);
  },
);
