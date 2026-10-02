import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import { advanceWorld } from "../world";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { macroStartForHistory } from "../macro-economy";
import {
  createMacroMonthlyStepHandler,
  ensureMacroEconomyStarted,
  MACRO_MONTHLY_STEP_KEY,
} from "../macro-economy/producer";
import {
  FDIC_SMALL_BANK_RECORDS,
  FDIC_SMALL_BANK_SHAPES,
} from "./town-bank-shapes.generated";
import { TOWN_WORKPLACES, writeTownEmployer } from "./town-employment";
import {
  medianBankShape,
  stepTownFinances,
  uninsuredDepositShare,
} from "./town-finances";

const seed = "overflow3:a61:recorded-bank:1";
const places = lifePlaceStateIdentities();
const place =
  places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;

function paidBank(usps = place.usps) {
  const fixture = smallWorld({
    place: usps,
    seed,
    date: "2026-01-05",
    people: 3,
  });
  let world = ensureWorldStartingConditions(fixture.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
  });
  world = ensureMacroEconomyStarted(
    world,
    macroStartForHistory(macroStartingConditions(world)),
  );
  world = advanceWorld(
    world,
    27,
    createFutureTransitionHandlerRegistry([
      [MACRO_MONTHLY_STEP_KEY, createMacroMonthlyStepHandler()],
    ]),
  );
  const bank = TOWN_WORKPLACES.find((row) => row.key === "bank")!;
  world = writeTownEmployer(
    world,
    fixture.jurisdictionId,
    bank,
    91,
    world.currentDate,
  );
  const organizationId = world.history.organizations.at(-1)!.id;
  // Authored prior paycheck control through existing canonical resource writers;
  // this test exercises bank opening, not hiring or the payroll producer.
  const provenance = {
    kind: "authored" as const,
    note: "Recorded prior compensation for the A61 bank-opening control.",
  };
  world = createResourceFlow(world, {
    stableKey: "a61:prior-bank-pay",
    source: { kind: "organization", organizationId },
    recipient: { kind: "person", personId: fixture.personId },
    startsAt: world.currentDate,
    amount: money(100_000, "USD"),
    cadenceKind: "schedule:one-time",
    basisKind: "compensation:work",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: fixture.jurisdictionId,
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "a61:prior-bank-pay:completed",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: money(100_000, "USD"),
    transferredAmount: money(100_000, "USD"),
    reasonKind: null,
    note: null,
    provenance,
  });
  return { ...fixture, world, organizationId };
}

describe("recorded median bank profile", () => {
  it("selects one actual lower-median asset row without changing saved ratio indexes", () => {
    for (const [state, records] of Object.entries(FDIC_SMALL_BANK_RECORDS)) {
      const selected = medianBankShape(state);
      if (records.length < 5) {
        expect(selected, state).toBeNull();
        continue;
      }
      expect(selected, state).not.toBeNull();
      const ranked = records
        .map(([assets, cert], index) => ({ assets, cert, index }))
        .sort((a, b) => a.assets - b.assets || a.cert - b.cert);
      expect(selected!.index, state).toBe(
        ranked[Math.floor((records.length - 1) / 2)]!.index,
      );
      const cells = FDIC_SMALL_BANK_SHAPES[state]!.split(";");
      const row = cells[selected!.index]!.split(",").map(Number);
      expect(selected!.cushion).toBe(row[0]);
      expect(selected!.otherAssets).toBe(row[1]);
      expect(uninsuredDepositShare(selected!)).toBe(row[2]);
    }
    const national = Object.keys(FDIC_SMALL_BANK_SHAPES)
      .sort()
      .flatMap((state) => FDIC_SMALL_BANK_SHAPES[state]!.split(";"));
    for (const [index, text] of national.entries()) {
      const [cushion, otherAssets, uninsured] = text.split(",").map(Number);
      expect(
        uninsuredDepositShare({
          state: null,
          index,
          cushion: cushion!,
          otherAssets: otherAssets!,
        }),
      ).toBe(uninsured);
    }
  });

  it("opens identical books from the same saved inputs under two seeds and preserves them after reopening", () => {
    expect(places).toHaveLength(56);
    const f = paidBank();
    const first = stepTownFinances(
      f.world,
      f.jurisdictionId,
      [],
      new Set(),
      "a61:opening",
    ).world;
    const second = stepTownFinances(
      { ...f.world, seed: `${seed}:other` },
      f.jurisdictionId,
      [],
      new Set(),
      "a61:opening",
    ).world;
    const books = first.townFinances!.banks[f.organizationId]!;
    expect(books, `${place.usps}; seed ${seed}`).toBeDefined();
    expect(books).toEqual(second.townFinances!.banks[f.organizationId]);
    expect(books.shape).toEqual(
      medianBankShape(
        f.world.jurisdictions[f.jurisdictionId]!.parentName ?? null,
      ),
    );
    expect(books.liquid).toBeCloseTo(books.deposits * books.shape.cushion, 2);
    const reopened = deserializeWorld(serializeWorld(first));
    expect(reopened.townFinances!.banks[f.organizationId]).toEqual(books);
    expect(
      stepTownFinances(reopened, f.jurisdictionId, [], new Set(), "a61:opening")
        .world.townFinances!.banks[f.organizationId],
    ).toEqual(books);
    expect(reopened.history.resourceTransferOutcomes).toEqual(
      first.history.resourceTransferOutcomes,
    );
  });

  it("keeps a legacy non-median profile and its paired uninsured share after reopening", () => {
    const f = paidBank();
    const opened = stepTownFinances(
      f.world,
      f.jurisdictionId,
      [],
      new Set(),
      "a61:opening",
    ).world;
    const books = opened.townFinances!.banks[f.organizationId]!;
    const state = books.shape.state!;
    const index = books.shape.index === 0 ? 1 : 0;
    const cells = FDIC_SMALL_BANK_SHAPES[state]!.split(";");
    const [cushion, otherAssets, uninsured] =
      cells[index]!.split(",").map(Number);
    // Authored legacy book control using an original, deliberately non-median row.
    const original = {
      ...books,
      shape: { state, index, cushion: cushion!, otherAssets: otherAssets! },
    };
    const legacy = {
      ...opened,
      townFinances: {
        ...opened.townFinances!,
        banks: { ...opened.townFinances!.banks, [f.organizationId]: original },
      },
    };
    const reopened = deserializeWorld(serializeWorld(legacy));
    const reviewed = stepTownFinances(
      reopened,
      f.jurisdictionId,
      [],
      new Set(),
      "a61:opening",
    ).world;
    expect(reviewed.townFinances!.banks[f.organizationId]).toEqual(original);
    expect(uninsuredDepositShare(original.shape)).toBe(uninsured);
  });

  it("does not open guessed books when the actual place's observation group is too small", () => {
    const smallPlace = places.find((p) => {
      const rows = FDIC_SMALL_BANK_RECORDS[p.name];
      return rows && rows.length < 5;
    })!;
    expect(smallPlace).toBeDefined();
    const f = paidBank(smallPlace.usps);
    const reviewed = stepTownFinances(
      f.world,
      f.jurisdictionId,
      [],
      new Set(),
      "a61:unread",
    ).world;
    expect(
      reviewed.townFinances!.banks[f.organizationId],
      smallPlace.name,
    ).toBeUndefined();
    expect(reviewed.history.resourceTransferOutcomes).toEqual(
      f.world.history.resourceTransferOutcomes,
    );
  });

  it("leaves a missing or under-five observation group unread without borrowing national ratios", () => {
    expect(medianBankShape(null)).toBeNull();
    expect(medianBankShape("unrecorded source group")).toBeNull();
    const small = Object.entries(FDIC_SMALL_BANK_RECORDS).filter(
      ([, rows]) => rows.length < 5,
    );
    expect(small.length).toBeGreaterThan(0);
    for (const [state] of small) expect(medianBankShape(state)).toBeNull();
  });
});
