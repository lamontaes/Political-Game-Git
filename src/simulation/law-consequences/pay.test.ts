import { afterEach, describe, expect, it, vi } from "vitest";
import minimumWages from "../../../data/research/money/minimum-wage-2026.json" with { type: "json" };
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { addDays, simulationMomentOnLocalDate } from "../dates";
import { cancelFutureDueItem } from "../future-transitions";
import { lawInForce } from "../governing/law-in-force";
import { lifePlaceByKey } from "../life-places";
import { resourceFlowTermsAt, resourcePositionAt } from "../resource-queries";
import {
  createWorkCompensation,
  createResourcePosition,
  money,
} from "../resources";
import { SeededRng } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { personName } from "../people";
import { withWorldIntegrityDeferred } from "../world";
import { applyLawConsequences } from "../enacted-law-effects";
import * as lawEffects from "../enacted-law-effects";
import { LAW_CONSEQUENCE_REGISTRATIONS } from "../law-consequence-registry";
import { STATE_MINIMUM_WAGE_QUESTION_KEY } from "../minimum-wage";
import { TOWN_EMPLOYMENT_VERSION } from "../living-world/town-employment";
import { settleTownCompensations } from "../living-world/town-pay";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../territory-places";
import {
  MINIMUM_WAGE_PAY_ROWS,
  PAY_REGISTRATION,
  resolvePayConsequences,
} from "./pay";

const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  if ((places.get(key.slice(0, 2))?.[1] ?? -1) < Number(count))
    places.set(key.slice(0, 2), [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);
expect(places.size).toBe(56);
const pool = [...places.values()].map(([key]) => key);
const rng = new SeededRng("pay-kind-five-places");
const sampled = Array.from(
  { length: 5 },
  () => pool.splice(rng.integer(0, pool.length - 1), 1)[0]!,
);
const registrations = [...LAW_CONSEQUENCE_REGISTRATIONS, PAY_REGISTRATION];
const canonicalDispatch = applyLawConsequences;
afterEach(() => vi.restoreAllMocks());

describe.each(sampled)("pay kind in %s", (placeKey) => {
  it("uses the approved starting state source on a named worker's actual contract, paycheck and stamped payment, with NPC/player and Save/Continue parity", () => {
    const seed = `pay-kind:${placeKey}`;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    let world = game.world;
    const work = world.history.workRelationships.find(
      (entry) =>
        entry.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) &&
        entry.compensation === "paid" &&
        entry.organizationId,
    )!;
    expect(work).toBeDefined();
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (entry) => entry.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
    )!;
    const row = MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!;
    world = {
      ...world,
      policyCatalog: {
        ...world.policyCatalog,
        propositions: {
          ...world.policyCatalog.propositions,
          [proposition.id]: { ...proposition, consequences: [row] },
        },
      },
    };
    world = createWorkCompensation(world, {
      stableKey: `fixture:pay-kind:${work.id}`,
      workRelationshipId: work.id,
      startsAt: world.currentDate,
      amount: money(100, "USD"),
      cadenceKind: "schedule:town-weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Explicit below-floor contract control, not a population wage estimate.",
      },
    });
    const flow = world.history.resourceFlows.at(-1)!;
    const since = world.currentDate;
    const context = {
      onDate: since,
      activity: "payroll" as const,
      activityId: flow.id,
      subjectIds: [work.personId],
    };
    const place = lifePlaceByKey(placeKey)!;
    const source = minimumWages.places as Record<
      string,
      { basicHourly: number | null }
    >;
    const hourly = source[place.stateJurisdictionKey!]!.basicHourly;
    const governing = lawInForce(
      world,
      place.context.jurisdiction.id,
      proposition.id,
    );
    if (!governing) {
      expect(resolvePayConsequences(world, row, context)).toEqual([]);
      return;
    }
    if (hourly === null) {
      expect(() => resolvePayConsequences(world, row, context)).toThrow(
        "Missing sourced starting pay floor",
      );
      return;
    }
    const input = resolvePayConsequences(world, row, context)[0]!;
    expect(input.law.origin).toBe("in-force-at-start");
    expect(input.value).toMatchObject({
      value: Math.round(hourly * 100),
      unit: "minor/hour",
    });
    const raised = applyLawConsequences(world, context, registrations);
    const terms = resourceFlowTermsAt(raised, flow.id)!;
    expect(terms.amount.minorUnits).toBeGreaterThan(100);
    expect(terms.lawEffectStamps).toHaveLength(1);
    expect(terms.lawEffectStamps![0]!.governingLawKey).toBe(
      governing.measureId,
    );
    expect(applyLawConsequences(raised, context, registrations)).toBe(raised);
    expect(
      serializeWorld(
        applyLawConsequences(
          deserializeWorld(serializeWorld(world)),
          context,
          registrations,
        ),
      ),
    ).toBe(serializeWorld(raised));
    const employer = {
      kind: "organization" as const,
      organizationId: work.organizationId!,
    };
    let before = raised;
    if (!resourcePositionAt(before, employer, terms.amount.currency))
      before = createResourcePosition(before, {
        stableKey: `fixture:pay-kind-cash:${work.organizationId}`,
        owner: employer,
        openedAt: since,
        openingBalance: money(10_000_000, "USD"),
        provenance: {
          kind: "authored",
          note: "Explicit employer funding control, not generated ordinary-business wealth.",
        },
      });
    const payday = addDays(since, 6);
    before = withWorldIntegrityDeferred(() => {
      let next = before;
      for (const due of before.history.futureDueItems) {
        const state = before.history.futureDueItemStates
          .filter((entry) => entry.dueItemId === due.id)
          .at(-1);
        if (state?.status === "scheduled" && due.dueAt < payday)
          next = cancelFutureDueItem(next, {
            stableKey: `fixture:pay-kind-clock:${due.id}`,
            dueItemId: due.id,
            effectiveAt: since,
            reasonKey: "fixture:focused-payroll",
            context: "Explicit period context, not an ordinary-clock proof.",
          });
      }
      return {
        ...next,
        currentDate: payday,
        currentMoment: simulationMomentOnLocalDate(next.currentMoment, payday),
      };
    });
    const period = {
      payFlowId: flow.id,
      activityId: flow.id,
      stableKey: `fixture:pay-kind-period:${flow.id}`,
      periodStartsAt: since,
      periodEndsAt: payday,
      onDate: payday,
    };
    // Compose the real dispatcher with this export before coordinator admission.
    // The law response and final terms remain actual, not mocked outcomes.
    vi.spyOn(lawEffects, "applyLawConsequences").mockImplementation(
      (next, activity) => canonicalDispatch(next, activity, registrations),
    );
    const npc = settleTownCompensations(before, [period]);
    const player = settleTownCompensations(
      { ...before, control: { kind: "person", personId: work.personId } },
      [period],
    );
    expect(player.history).toEqual(npc.history);
    const payment = npc.history.resourceTransferOutcomes.find(
      (entry) => entry.resourceFlowId === flow.id,
    )!;
    expect(payment.transferredAmount).toEqual(terms.amount);
    expect(payment.lawEffectStamps![0]!.governingLawKey).toBe(
      governing.measureId,
    );
    expect(payment.lawEffectStamps![0]!.sourceRecordIds).toContain(terms.id);
    expect(
      npc.history.statutoryTaxLiabilities!.some(
        (entry) => entry.sourceOutcomeId === payment.id,
      ),
    ).toBe(true);
    expect(
      resourcePositionAt(before, employer, terms.amount.currency)!.liquidBalance
        .minorUnits -
        resourcePositionAt(npc, employer, terms.amount.currency)!.liquidBalance
          .minorUnits,
    ).toBe(terms.amount.minorUnits);
    expect(settleTownCompensations(npc, [period])).toBe(npc);
    expect(
      serializeWorld(
        settleTownCompensations(deserializeWorld(serializeWorld(before)), [
          period,
        ]),
      ),
    ).toBe(serializeWorld(npc));
    console.info(
      JSON.stringify({
        seed,
        placeKey,
        name: personName(npc.people[work.personId]!),
        startingLaw: governing.measureId,
        grossMinor: payment.transferredAmount.minorUnits,
      }),
    );
  }, 120_000);
});
