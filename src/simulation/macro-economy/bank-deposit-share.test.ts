import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  writeTownEmployer,
  TOWN_WORKPLACES,
} from "../living-world/town-employment";
import {
  drawBankShape,
  stepTownFinances,
  TOWN_FINANCES_VERSION,
} from "../living-world/town-finances";
import {
  BANK_FAILED_EVENT,
  type TownBankBooks,
} from "../living-world/town-finance-types";
import { drawMacroStartingConditions } from "../world-setup/conditions";
import { serializeWorld, deserializeWorld } from "../serialization";
import { MACRO_POLICY_VERSION } from "./policy";
import { ensureMacroEconomyStarted } from "./producer";
import { TOWN_FINANCE_ORIGIN_READER } from "./sources";
import type { World, EntityId } from "../types";
import { addDays } from "../dates";
import { advanceWorld } from "../world";

const seed = "team4-a64-bank-deposits-20261001";
const place = drawRandomPlace(seed);

function bankFailure() {
  const small = smallWorld({ place: place.key, seed, date: "2026-12-01" });
  const town = small.place.context.jurisdiction.id;
  const draft = drawMacroStartingConditions(small.world, "near-reference");
  let world = ensureMacroEconomyStarted(small.world, {
    contractVersion: draft.contractVersion,
    policyVersion: MACRO_POLICY_VERSION,
    regime: draft.regime,
    volatilityScale: draft.volatilityScale,
    latents: draft.latents,
    initial: draft.initial,
    effectiveDate: small.world.currentDate,
  });
  world = advanceWorld(world, 32);
  const workplace = TOWN_WORKPLACES.find((row) => row.key === "bank")!;
  for (const outlet of [0, 1])
    world = writeTownEmployer(
      world,
      town,
      workplace,
      outlet,
      world.currentDate,
    );
  const banks = world.history.organizations.filter((record) =>
    record.stableKey.includes(`${town}:employer:bank:`),
  );
  expect(banks).toHaveLength(2);
  const shape = drawBankShape(
    small.place.stateJurisdictionKey?.replace(/^US-/, "") ?? null,
    0,
  );
  const books = (
    organizationId: EntityId,
    deposits: number,
    capital: number,
  ): TownBankBooks => ({
    organizationId,
    openedAt: world.currentDate,
    shape,
    deposits,
    liquid: deposits,
    loans: 0,
    capital,
    businessLoans: 0,
    lastQuarterLosses: 0,
    runAt: null,
    failed: null,
    lastRound: "controlled-bank-opening",
  });
  // Controlled balance-sheet inputs; the existing quarter producer decides failure.
  world = {
    ...world,
    townFinances: {
      version: TOWN_FINANCES_VERSION,
      businesses: {},
      markets: {},
      banks: {
        [banks[0]!.id]: books(banks[0]!.id, 100, -1000),
        [banks[1]!.id]: books(banks[1]!.id, 300, 1000),
      },
    },
  };
  const failed = stepTownFinances(
    world,
    town,
    [],
    new Set(),
    "controlled-bank-failure",
  ).world;
  const event = failed.history.events.find(
    (record) => record.type === BANK_FAILED_EVENT,
  )!;
  expect(event).toBeDefined();
  return { failed, event, bankId: banks[0]!.id, survivorId: banks[1]!.id };
}

const reading = (world: World) =>
  TOWN_FINANCE_ORIGIN_READER.origins(world, world.currentDate).filter(
    (origin) => origin.kind === "credit-tightening",
  );

describe(`A64 bank failure in ${place.displayName}, seed ${seed}`, () => {
  it("uses the recorded failed-bank share and preserves it through later books, reload and repeated reads", () => {
    const { failed, event, bankId, survivorId } = bankFailure();
    const numerator = Math.round(
      failed.townFinances!.banks[bankId]!.deposits * 100,
    );
    const denominator =
      numerator +
      Math.round(failed.townFinances!.banks[survivorId]!.deposits * 100);
    expect(event.tags).toContain(`bank-deposits-minor:${numerator}`);
    expect(event.tags).toContain(`town-deposits-minor:${denominator}`);
    const origins = reading(failed);
    expect(origins).toHaveLength(1);
    expect(origins[0]!.intensity).toBe(numerator / denominator);
    expect(origins[0]!.intensity).toBeGreaterThan(0);
    expect(origins[0]!.intensity).toBeLessThan(1);
    expect(origins[0]!.originEventId).toBe(event.id);
    expect(origins[0]!.causalParents).toEqual([event.id]);
    const saved = serializeWorld(failed);
    expect(reading(deserializeWorld(saved))).toEqual(origins);
    expect(reading(failed)).toEqual(origins);
    expect(serializeWorld(failed)).toBe(saved);
    const later: World = {
      ...failed,
      townFinances: {
        ...failed.townFinances!,
        banks: {
          ...failed.townFinances!.banks,
          [survivorId]: {
            ...failed.townFinances!.banks[survivorId]!,
            deposits: 1_000_000,
          },
        },
      },
    };
    expect(reading(later)).toEqual(origins);
    expect(
      TOWN_FINANCE_ORIGIN_READER.origins(
        failed,
        addDays(failed.currentDate, -1),
      ),
    ).toEqual([]);
  });

  it.each([
    ["historical amounts absent", []],
    [
      "zero denominator",
      [
        "deposit-currency:USD",
        "bank-deposits-minor:10",
        "town-deposits-minor:0",
      ],
    ],
    [
      "bank exceeds town",
      [
        "deposit-currency:USD",
        "bank-deposits-minor:20",
        "town-deposits-minor:10",
      ],
    ],
    [
      "incompatible currency",
      [
        "deposit-currency:EUR",
        "bank-deposits-minor:10",
        "town-deposits-minor:20",
      ],
    ],
  ])("supplies no invented share when %s", (_label, tags) => {
    const { failed, event } = bankFailure();
    const unsupported: World = {
      ...failed,
      history: {
        ...failed.history,
        events: failed.history.events.map((record) =>
          record.id === event.id ? { ...record, tags } : record,
        ),
      },
    };
    expect(reading(unsupported)).toEqual([]);
  });
});
