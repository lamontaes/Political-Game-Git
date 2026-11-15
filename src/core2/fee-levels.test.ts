/**
 * A bill sets a fee's level, and the people who use the service pay it (pool
 * item gov-fee-level-by-bill). A pinned place and seed: the same world twice,
 * one left alone and one where the government's own law raises the park fee
 * by half; the charge targets, the services' mix and what the town's
 * households paid for parks move with it, and a world with no fee law reads
 * the schedule its budget assumes.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import {
  serviceChargeShares,
  serviceChargesPaidBy,
  townPayers,
} from "./budgets-service-charges";
import { billValueInForce } from "./laws-bill-values";
import {
  FEE_LEVEL_BASELINE,
  FEE_LEVEL_SERVICES,
  isFeeLevelSeries,
} from "./fee-levels";
import { localInstitutionsFor } from "./reference/local-institutions";
import { FEE_LEVEL_RUNS } from "./fee-levels";
import { billCatalog } from "./bill-catalog";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { budgetsOf, chargedServicesOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";

const SEED = "fee-level-by-bill-pinned-1";
const PARKS = "parks-and-recreation";
const SERIES = "fee-level:parks-and-recreation";

function world() {
  const draw = drawPlace(SEED, "fee-level");
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  return { core, api: coreAPI(core), draw };
}

/** What a household's payer is asked for a government's charges in a month: its uniform share of living cost plus its flat sewer charge. */
function askedOf(
  w: ReturnType<typeof world>,
  governmentId: string,
  payerId: string,
): number {
  const row = serviceChargeShares(w.api).find(
    (r) => r.governmentId === governmentId,
  )!;
  const person = w.core.people.get(payerId)!;
  return Math.round(
    row.share * person.livingCostDailyMinor * 30 + row.sewerPerDwellingMinor,
  );
}

it("a law raising the park fee at each level a bill can reach raises what the town's households are asked, and the charges follow", () => {
  setBookkeeping(false);
  const control = world();
  const where = `${control.draw.key} [${control.draw.state}], seed ${control.draw.seed}`;
  const govs = governments(control.api).filter(
    (g) =>
      g.level !== "federal" &&
      serviceChargeShares(control.api).some(
        (r) =>
          r.governmentId === g.id &&
          r.share > 0 &&
          r.services.some((s) => s.service === PARKS),
      ),
  );
  // The town, its county and its state each charge for parks here.
  expect(
    govs.map((g) => g.level).sort(),
    `${where}: governments charging for parks`,
  ).toEqual(["city", "county", "state"]);
  const before = new Map(
    serviceChargeShares(control.api).map((r) => [r.governmentId, r]),
  );
  const raised = world();
  for (const gov of govs) {
    // With no bill the fee reads as the schedule the budget assumes.
    expect(
      billValueInForce(
        control.api,
        { kind: "law-amount", series: SERIES },
        gov.id,
      ).value,
      `${where} ${gov.name}`,
    ).toBe(FEE_LEVEL_BASELINE);
    enactLaw(raised.api, {
      jurisdiction: gov.id,
      level: gov.level === "city" ? "city" : gov.level,
      series: SERIES,
      value: 150,
      effectiveDate: raised.core.date,
      measureId: `test:fee-level:parks:${gov.level}`,
      citation: "A fee bill in a pinned world.",
    });
  }
  const days = addDays(makeIsoDate(raised.core.date), 75);
  advanceCore(raised.core, days);
  advanceCore(control.core, days);
  const payer = [
    ...townPayers(raised.api, lawChain(raised.api).townPlaceId).people,
  ].sort()[0]!;
  const household: string[] = [];
  for (const gov of govs) {
    const was = before.get(gov.id)!;
    const now = serviceChargeShares(raised.api).find(
      (r) => r.governmentId === gov.id,
    )!;
    const twin = serviceChargeShares(control.api).find(
      (r) => r.governmentId === gov.id,
    )!;
    const parks = (r: typeof now) =>
      r.services.find((s) => s.service === PARKS)!.share;
    const label = `${where} ${gov.name} (${gov.level})`;
    expect(parks(now), `${label}: parks share of its charges`).toBeGreaterThan(
      parks(was),
    );
    // The fee is a larger part of what the government charges than in the twin.
    expect(parks(now), `${label}: against the twin`).toBeGreaterThan(
      parks(twin),
    );
    // What it asks of the town rises, and a household's share of it with it.
    expect(
      now.targetMonthlyMinor,
      `${label}: the charges asked`,
    ).toBeGreaterThan(twin.targetMonthlyMinor);
    const asked = askedOf(raised, gov.id, payer);
    const twinAsked = askedOf(control, gov.id, payer);
    expect(asked, `${label}: household ${payer}`).toBeGreaterThan(twinAsked);
    household.push(`${gov.name}: ${twinAsked} to ${asked}`);
    const paid = (w: ReturnType<typeof world>) =>
      serviceChargesPaidBy(w.api, gov.id).reduce(
        (n, m) => n + (m.byService[PARKS] ?? 0),
        0,
      );
    expect(paid(raised), `${label}: park charges paid`).toBeGreaterThan(
      paid(control),
    );
  }
  process.stderr.write(
    `fee-levels household ${payer}: ${household.join("; ")}\n`,
  );
}, 180_000);

it("a government is offered a fee line only for a service its charges row holds and its own budget shows it runs", () => {
  setBookkeeping(false);
  const { api, draw } = world();
  const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
  for (const gov of governments(api).filter((g) => g.level !== "federal")) {
    const held = new Set(chargedServicesOf(api, gov.id).map((c) => c.service));
    const spending = budgetsOf(api, gov.id)
      .filter((b) => b.startsOn <= api.state.date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0]?.spendingMinor;
    // Runs the thing: its budget spends on it (sewer and trash by its own billing).
    const runs = (service: string) => {
      const lines = FEE_LEVEL_RUNS[service];
      if (lines === null) return true;
      if (!(lines ?? []).some((l) => (spending?.[l] ?? 0) > 0)) return false;
      // A town or county is offered hospital charges only where a hospital stands in its place.
      return !(
        service === "hospitals" &&
        gov.level !== "state" &&
        !localInstitutionsFor(gov.jurisdictionId).hospitals.some(
          (row) => row.kind === "hospital",
        )
      );
    };
    const offered = billCatalog(
      api,
      gov.level === "city" ? "city" : gov.level,
      gov.id,
    )
      .flatMap((m) => m.topics)
      .flatMap((t) => t.policies)
      .filter((p) => p.series && isFeeLevelSeries(p.series));
    expect(
      offered.map((p) => FEE_LEVEL_SERVICES[p.series!]).sort(),
      `${where} ${gov.name} (${gov.level})`,
    ).toEqual(
      Object.values(FEE_LEVEL_SERVICES)
        .filter((service) => held.has(service) && runs(service))
        .sort(),
    );
    // Each offered fee says what the charge brings in a year here.
    for (const p of offered)
      expect(
        p.charge?.yearlyMinor,
        `${where} ${gov.name} ${p.id}`,
      ).toBeGreaterThanOrEqual(0);
  }
}, 120_000);
