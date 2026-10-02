import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  ensurePublicGovernmentAccount,
  publicOrganizationKey,
} from "../tax-policy";
import type { EntityId, World } from "../types";
import { createWorld } from "../world";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { ensurePublicBudgets, settlePublicBudgets } from "./index";
import { readMonthFlows } from "./month";
import { ensureOpeningGovernmentAccounts } from "./opening-government-accounts";

const seed = "a33-all-place-opening-cash";
const date = makeIsoDate("2026-02-28");
const month = makeIsoDate("2026-02-01");
const identities = lifePlaceStateIdentities();
const selected = [...identities]
  .sort((a, b) =>
    stableHash(`${seed}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${seed}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);

function fixture(): World {
  return ensureWorldStartingConditions(
    createWorld({
      seed,
      currentDate: date,
      jurisdictions: [
        chiefExecutiveJurisdiction(selected[0]!.jurisdictionKey.slice(3))!,
      ],
      people: [],
      lineage: "production",
    }),
    { openingVersion: CRUNCH46_WORLD_OPENING_VERSION },
  );
}

function position(world: World, jurisdictionId: EntityId) {
  const organization = world.history.organizations.find(
    (row) => row.stableKey === publicOrganizationKey(jurisdictionId),
  );
  const positions = world.history.resourcePositions.filter(
    (row) =>
      row.owner.kind === "organization" &&
      row.owner.organizationId === organization?.id &&
      row.openingBalance.currency === "USD",
  );
  expect(positions).toHaveLength(1);
  return positions[0]!;
}

describe("A33 sourced opening cash uses the existing government account", () => {
  it("opens all 56 actual government identities with one sourced estimated position each", () => {
    const before = fixture();
    const world = ensurePublicBudgets(before);
    const store = world.publicBudgets!;
    const governments = store.governments.filter(
      (row) => row.level === "state",
    );
    expect(identities).toHaveLength(56);
    expect(governments).toHaveLength(56);
    expect(world.history.resourceFlows).toEqual(before.history.resourceFlows);
    expect(world.history.resourceTransferOutcomes).toEqual(
      before.history.resourceTransferOutcomes,
    );
    const { flows } = readMonthFlows(world, store);
    for (const government of governments) {
      const jurisdiction = chiefExecutiveJurisdiction(government.key.slice(3));
      expect(jurisdiction, government.key).not.toBeNull();
      expect(government.jurisdictionId, government.key).toBe(jurisdiction!.id);
      expect(
        world.jurisdictions[jurisdiction!.id],
        government.key,
      ).toBeDefined();
      const saved = position(world, jurisdiction!.id);
      const opening = before.history.worldConditions!.find(
        (row) => row.kind === "world-opening",
      )!;
      const profileAmount =
        opening.kind === "world-opening"
          ? opening.publicCashOpening?.stateByJurisdictionId[jurisdiction!.id]
          : undefined;
      expect(saved.openingBalance.minorUnits, government.key).toBe(
        profileAmount ??
          Math.round((government.balance + government.reserve) * 100),
      );
      expect(saved.provenance).toMatchObject({
        kind: "authored",
        note: expect.stringContaining(
          profileAmount !== undefined
            ? "ESTIMATED FROM SAVED WORLD"
            : "ESTIMATED FROM RESEARCH",
        ),
      });
      if (profileAmount === undefined)
        expect(saved.provenance).toMatchObject({
          note: expect.stringContaining("public-budget-bases.json"),
        });
      expect(flows.cash?.get(government.key)?.positionId, government.key).toBe(
        saved.id,
      );
    }
  });

  it("settles actual zero-activity books for all56 without creating forecast receipts", () => {
    const world = ensurePublicBudgets(fixture());
    const next = settlePublicBudgets(world, month);
    for (const government of next.publicBudgets!.governments.filter(
      (row) => row.level === "state",
    )) {
      expect(government.months, government.key).toHaveLength(1);
      const row = government.months[0]!;
      expect(row.revenue, government.key).toEqual(row.revenue.map(() => 0));
      expect(row.spending, government.key).toEqual(row.spending.map(() => 0));
      expect(row.cashSettlement?.positionId, government.key).toBe(
        position(world, government.jurisdictionId).id,
      );
      expect(row.cashSettlement?.sourceRecordIds, government.key).toEqual([]);
    }
    expect(next.history.resourceFlows).toEqual(world.history.resourceFlows);
    expect(next.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    expect(next.history.resourcePositions).toEqual(
      world.history.resourcePositions,
    );
  });

  it("preserves every opening position through replay and canonical Continue", () => {
    const world = ensurePublicBudgets(fixture());
    const bytes = serializeWorld(world);
    expect(ensurePublicBudgets(world)).toBe(world);
    expect(ensureOpeningGovernmentAccounts(world)).toBe(world);
    const continued = deserializeWorld(bytes);
    expect(serializeWorld(ensureOpeningGovernmentAccounts(continued))).toBe(
      bytes,
    );
    expect(serializeWorld(ensurePublicBudgets(continued))).toBe(bytes);
  });

  it.each(selected)(
    "preserves an already saved account in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      let world = ensureStateJurisdictionForKey(fixture(), jurisdictionKey);
      const jurisdiction = chiefExecutiveJurisdiction(
        jurisdictionKey.slice(3),
      )!;
      world = ensurePublicGovernmentAccount(
        world,
        { kind: "jurisdiction", jurisdictionId: jurisdiction.id },
        {
          amountMinorUnits: 27123,
          sourceNote:
            "Explicit saved account control; not an estimate or tax receipt.",
        },
      );
      const existing = position(world, jurisdiction.id);
      const next = ensurePublicBudgets(world);
      expect(position(next, jurisdiction.id)).toEqual(existing);
      expect(next.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      expect(ensureOpeningGovernmentAccounts(next)).toBe(next);
    },
  );

  it.each([1, 41723])(
    "the saved world's opening cash %i wins over a research fallback",
    (amountMinorUnits) => {
      const key = selected[0]!.jurisdictionKey;
      let world = ensureStateJurisdictionForKey(fixture(), key);
      const jurisdictionId = chiefExecutiveJurisdiction(key.slice(3))!.id;
      world = {
        ...world,
        history: {
          ...world.history,
          worldConditions: world.history.worldConditions!.map((row) =>
            row.kind === "world-opening" && row.publicCashOpening
              ? {
                  ...row,
                  publicCashOpening: {
                    ...row.publicCashOpening,
                    stateByJurisdictionId: {
                      ...row.publicCashOpening.stateByJurisdictionId,
                      [jurisdictionId]: amountMinorUnits,
                    },
                  },
                }
              : row,
          ),
        },
      };
      const next = ensurePublicGovernmentAccount(
        world,
        { kind: "jurisdiction", jurisdictionId },
        {
          amountMinorUnits: 987654,
          sourceNote: "ESTIMATED FROM RESEARCH: fallback fixture.",
        },
      );
      expect(position(next, jurisdictionId).openingBalance.minorUnits).toBe(
        amountMinorUnits,
      );
      expect(position(next, jurisdictionId).provenance).toMatchObject({
        note: expect.stringContaining("ESTIMATED FROM SAVED WORLD"),
      });
      expect(
        ensurePublicGovernmentAccount(
          next,
          { kind: "jurisdiction", jurisdictionId },
          {
            amountMinorUnits: 123,
            sourceNote: "Later estimate cannot replace saved cash.",
          },
        ),
      ).toBe(next);
    },
  );

  it("uses the research fallback only when the saved profile does not cover that government", () => {
    const before = fixture();
    const opening = before.history.worldConditions!.find(
      (row) => row.kind === "world-opening",
    )!;
    if (opening.kind !== "world-opening" || !opening.publicCashOpening)
      throw new Error("Missing saved profile fixture.");
    const uncovered = identities.find(({ jurisdictionKey }) => {
      const jurisdictionId = chiefExecutiveJurisdiction(
        jurisdictionKey.slice(3),
      )!.id;
      return (
        opening.publicCashOpening!.stateByJurisdictionId[jurisdictionId] ===
        undefined
      );
    })!;
    expect(uncovered).toBeDefined();
    const world = ensureStateJurisdictionForKey(
      before,
      uncovered.jurisdictionKey,
    );
    const jurisdictionId = chiefExecutiveJurisdiction(
      uncovered.jurisdictionKey.slice(3),
    )!.id;
    const next = ensurePublicGovernmentAccount(
      world,
      { kind: "jurisdiction", jurisdictionId },
      {
        amountMinorUnits: 27123,
        sourceNote: "ESTIMATED FROM RESEARCH: uncovered government fixture.",
      },
    );
    expect(position(next, jurisdictionId).openingBalance.minorUnits).toBe(
      27123,
    );
    expect(position(next, jurisdictionId).provenance).toMatchObject({
      note: expect.stringContaining("ESTIMATED FROM RESEARCH"),
    });
  });

  it("refuses invalid opening estimates without writing accounts", () => {
    const key = selected[0]!.jurisdictionKey;
    const world = ensureStateJurisdictionForKey(fixture(), key);
    const identity = {
      kind: "jurisdiction" as const,
      jurisdictionId: chiefExecutiveJurisdiction(key.slice(3))!.id,
    };
    const bytes = serializeWorld(world);
    for (const amountMinorUnits of [
      -1,
      1.5,
      Number.NaN,
      Number.MAX_SAFE_INTEGER + 1,
    ])
      expect(() =>
        ensurePublicGovernmentAccount(world, identity, {
          amountMinorUnits,
          sourceNote: "source",
        }),
      ).toThrow("opening estimate");
    expect(() =>
      ensurePublicGovernmentAccount(world, identity, {
        amountMinorUnits: 1,
        sourceNote: " ",
      }),
    ).toThrow("opening estimate");
    expect(serializeWorld(world)).toBe(bytes);
  });
});
