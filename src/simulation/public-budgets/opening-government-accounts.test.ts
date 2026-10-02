import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stableHash } from "../ids";
import {
  governmentUnitJurisdictionId,
  governmentUnitsForState,
  governmentUnitsForPlace,
} from "../government-units";
import { lifePlaceStateIdentities, lifePlaceByKey } from "../life-places";
import { publicGovernmentOrganizationKey } from "../public-government-identity";
import { createOrganization, recordOrganizationProfile } from "../life";
import {
  createResourcePosition,
  createResourceFlow,
  recordResourceTransferOutcome,
  money,
} from "../resources";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  ensurePublicGovernmentAccount,
  publicOrganizationKey,
} from "../tax-policy";
import type { EntityId, World, PublicGovernmentIdentity } from "../types";
import { createWorld } from "../world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { ensurePublicBudgets, settlePublicBudgets } from "./index";
import { readMonthFlows } from "./month";
import {
  ensureOpeningGovernmentAccounts,
  selectLocalOpeningAccount,
  estimateLocalOpeningCash,
} from "./opening-government-accounts";
import { budgetCandidates, type BudgetCandidate } from "./opening";

const localUnits = identitiesForLocalProof();
function identitiesForLocalProof() {
  const units = lifePlaceStateIdentities().flatMap((state) =>
    governmentUnitsForState(state.jurisdictionKey.slice(3)).filter(
      (unit) =>
        unit.functionalActive &&
        unit.unitType === "municipality" &&
        unit.placeGeoid &&
        governmentUnitsForPlace(unit.placeGeoid).filter(
          (row) => row.functionalActive && row.unitType === "municipality",
        ).length === 1 &&
        lifePlaceByKey(unit.placeGeoid)?.context.jurisdiction.id ===
          governmentUnitJurisdictionId(unit),
    ),
  );
  return units
    .sort((a, b) =>
      stableHash(`local-opening:${a.id}`).localeCompare(
        stableHash(`local-opening:${b.id}`),
      ),
    )
    .slice(0, 5);
}
function localFixture(): World {
  return ensureWorldStartingConditions(
    createWorld({
      seed: "a33-local-opening-cash",
      currentDate: date,
      jurisdictions: localUnits.map(
        (unit) => lifePlaceByKey(unit.placeGeoid!)!.context.jurisdiction,
      ),
      people: [],
      lineage: "production",
    }),
    { openingVersion: CRUNCH46_WORLD_OPENING_VERSION },
  );
}
function localCandidate(world: World): BudgetCandidate {
  return budgetCandidates(world).candidates.find(
    (row) => row.key === `place:${localUnits[0]!.placeGeoid}`,
  )!;
}
function accountPosition(world: World, identity: PublicGovernmentIdentity) {
  const organization = world.history.organizations.find(
    (row) => row.stableKey === publicGovernmentOrganizationKey(identity),
  );
  return world.history.resourcePositions.find(
    (row) =>
      row.owner.kind === "organization" &&
      row.owner.organizationId === organization?.id &&
      row.openingBalance.currency === "USD",
  );
}

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
  it("opens an exact sourced county account rather than inferring one from a city", () => {
    const unit = lifePlaceStateIdentities()
      .flatMap((state) =>
        governmentUnitsForState(state.jurisdictionKey.slice(3)),
      )
      .filter(
        (row) =>
          row.functionalActive &&
          row.unitType === "county" &&
          row.countyGeoid &&
          lifePlaceByKey(`county:${row.countyGeoid}`)?.context.jurisdiction
            .id === governmentUnitJurisdictionId(row),
      )
      .sort((a, b) =>
        stableHash(`county-opening:${a.id}`).localeCompare(
          stableHash(`county-opening:${b.id}`),
        ),
      )[0]!;
    expect(unit).toBeDefined();
    const place = lifePlaceByKey(`county:${unit.countyGeoid}`)!;
    const before = ensureWorldStartingConditions(
      createWorld({
        seed: "county-opening",
        currentDate: date,
        jurisdictions: [place.context.jurisdiction],
        people: [],
        lineage: "production",
      }),
      { openingVersion: CRUNCH46_WORLD_OPENING_VERSION },
    );
    const candidate = budgetCandidates(before).candidates.find(
      (row) => row.key === `county:${unit.countyGeoid}`,
    )!;
    expect(selectLocalOpeningAccount(before, candidate)).toMatchObject({
      status: "unique-compiled",
      identity: {
        kind: "local-government",
        governmentKey: unit.id,
        jurisdictionId: place.context.jurisdiction.id,
      },
    });
    const world = ensurePublicBudgets(before);
    const selection = selectLocalOpeningAccount(world, candidate);
    expect(selection.status).toBe("saved");
    if (selection.status !== "saved")
      throw new Error("Expected saved county account.");
    expect(
      readMonthFlows(world, world.publicBudgets!).flows.cash?.get(candidate.key)
        ?.positionId,
    ).toBe(accountPosition(world, selection.identity)!.id);
  });

  it("opens five actual local identities from saved cash and uses the common settlement through Continue", () => {
    expect(localUnits).toHaveLength(5);
    const before = localFixture();
    const cash = worldOpeningRecord(before)!.publicCashOpening!;
    const world = ensurePublicBudgets(before);
    const store = world.publicBudgets!;
    const flows = readMonthFlows(world, store).flows;
    const settled = settlePublicBudgets(world, month);
    for (const unit of localUnits) {
      const candidate = budgetCandidates(world).candidates.find(
        (row) => row.key === `place:${unit.placeGeoid}`,
      )!;
      const selection = selectLocalOpeningAccount(world, candidate);
      expect(selection.status).toBe("saved");
      if (selection.status !== "saved")
        throw new Error("Expected saved local account.");
      expect(selection.identity).toEqual({
        kind: "local-government",
        governmentKey: unit.id,
        jurisdictionId: candidate.jurisdictionId,
      });
      expect(selection.sourceRecordIds).toHaveLength(2);
      const position = accountPosition(world, selection.identity)!;
      expect(position.openingBalance.minorUnits).toBe(cash.localMinorUnits);
      expect(flows.cash?.get(candidate.key)?.positionId).toBe(position.id);
      const government = settled.publicBudgets!.governments.find(
        (row) => row.key === candidate.key,
      )!;
      expect(government.months).toHaveLength(1);
      expect(government.months[0]!.cashSettlement?.positionId).toBe(
        position.id,
      );
      expect(
        government.months[0]!.balance + government.months[0]!.reserve,
      ).toBe(cash.localMinorUnits / 100);
    }
    expect(settled.history.resourceFlows).toEqual(before.history.resourceFlows);
    expect(settled.history.resourceTransferOutcomes).toEqual(
      before.history.resourceTransferOutcomes,
    );
    const bytes = serializeWorld(settled);
    expect(
      serializeWorld(ensureOpeningGovernmentAccounts(deserializeWorld(bytes))),
    ).toBe(bytes);
  });

  it("preserves a sole saved jurisdiction account instead of relabeling it as a named government", () => {
    const before = localFixture();
    const candidate = localCandidate(before);
    const identity: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId: candidate.jurisdictionId,
    };
    const world = ensurePublicGovernmentAccount(before, identity, {
      amountMinorUnits: 7123,
      sourceNote: "Existing account control.",
    });
    expect(selectLocalOpeningAccount(world, candidate)).toMatchObject({
      status: "saved",
      identity,
    });
    const next = ensureOpeningGovernmentAccounts(world);
    expect(accountPosition(next, identity)).toEqual(
      accountPosition(world, identity),
    );
    expect(
      next.history.organizations.filter((row) =>
        row.stableKey.startsWith("public-government:local:"),
      ),
    ).toHaveLength(4);
    expect(
      readMonthFlows(
        ensurePublicBudgets(next),
        ensurePublicBudgets(next).publicBudgets!,
      ).flows.cash?.get(candidate.key)?.balanceMinorUnits,
    ).toBe(7123);
  });

  it("refuses two actual saved accounts without consolidation or replacement", () => {
    const before = localFixture();
    const candidate = localCandidate(before);
    const named = selectLocalOpeningAccount(before, candidate);
    expect(named.status).toBe("unique-compiled");
    if (named.status !== "unique-compiled")
      throw new Error("Expected unique compiled unit.");
    let world = ensurePublicGovernmentAccount(before, named.identity);
    expect(() =>
      ensurePublicGovernmentAccount(world, {
        kind: "jurisdiction",
        jurisdictionId: candidate.jurisdictionId,
      }),
    ).not.toThrow();
    // Preserve an explicit legacy duplicate as input; the current account writer no longer creates one.
    world = createOrganization(world, {
      stableKey: publicOrganizationKey(candidate.jurisdictionId),
      formedAt: world.currentDate,
      provenance: {
        kind: "authored",
        note: "Explicit existing legacy duplicate control, not an opening writer.",
      },
      initialProfile: {
        name: "Legacy jurisdiction account",
        classification: "sector:government",
        locationJurisdictionId: candidate.jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: "legacy-duplicate:cash",
      owner: { kind: "organization", organizationId },
      openedAt: world.currentDate,
      openingBalance: money(7123, "USD"),
      provenance: {
        kind: "authored",
        note: "Explicit preserved duplicate cash control.",
      },
    });
    expect(selectLocalOpeningAccount(world, candidate).status).toBe(
      "ambiguous",
    );
    const next = ensureOpeningGovernmentAccounts(world);
    expect(
      next.history.resourcePositions.filter(
        (row) =>
          row.owner.kind === "organization" &&
          world.history.resourcePositions.some((saved) => saved.id === row.id),
      ),
    ).toEqual(world.history.resourcePositions);
    const opened = ensurePublicBudgets(next);
    expect(
      readMonthFlows(opened, opened.publicBudgets!).flows.cash?.has(
        candidate.key,
      ),
    ).toBe(false);
  });

  it("does not replace a matching account with unusable saved ownership evidence", () => {
    const before = localFixture();
    const candidate = localCandidate(before);
    const identity: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId: candidate.jurisdictionId,
    };
    const saved = ensurePublicGovernmentAccount(before, identity);
    const organization = saved.history.organizations.find(
      (row) => row.stableKey === publicGovernmentOrganizationKey(identity),
    )!;
    const profile = saved.history.organizationProfiles.find(
      (row) => row.organizationId === organization.id,
    )!;
    const world = recordOrganizationProfile(saved, {
      stableKey: "local-opening:unsupported-profile",
      organizationId: organization.id,
      effectiveAt: saved.currentDate,
      name: profile.name,
      classification: "sector:business",
      locationJurisdictionId: profile.locationJurisdictionId,
      supersedesProfileId: profile.id,
      provenance: {
        kind: "authored",
        note: "Changed account classification control; no ownership assumption.",
      },
    });
    expect(selectLocalOpeningAccount(world, candidate).status).toBe(
      "unsupported",
    );
    const next = ensureOpeningGovernmentAccounts(world);
    expect(
      next.history.organizations.some(
        (row) =>
          row.stableKey ===
          publicGovernmentOrganizationKey({
            kind: "local-government",
            governmentKey: localUnits[0]!.id,
            jurisdictionId: candidate.jurisdictionId,
          }),
      ),
    ).toBe(false);
  });

  it("refuses replacement when the saved account is outside the requested sequence cutoff", () => {
    const before = localFixture();
    const candidate = localCandidate(before);
    const identity: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId: candidate.jurisdictionId,
    };
    const saved = ensurePublicGovernmentAccount(before, identity);
    expect(
      selectLocalOpeningAccount(saved, candidate, {
        asOfDate: before.currentDate,
        historySequenceExclusive: before.history.nextSequence,
      }).status,
    ).toBe("unsupported");
  });

  it("reports absent and unsupported joins and refuses local opening without the saved cash profile", () => {
    const before = localFixture();
    const candidate = localCandidate(before);
    expect(
      selectLocalOpeningAccount(before, {
        ...candidate,
        key: "place:absent",
        geoid: "absent",
      }).status,
    ).toBe("absent");
    expect(
      selectLocalOpeningAccount(before, {
        ...candidate,
        key: "town:unsupported",
      }).status,
    ).toBe("unsupported");
    const world: World = {
      ...before,
      history: {
        ...before.history,
        worldConditions: before.history.worldConditions!.map((record) => {
          if (record.kind !== "world-opening") return record;
          const legacy = { ...record };
          delete legacy.publicCashOpening;
          return legacy;
        }),
      },
    };
    const next = ensureOpeningGovernmentAccounts(world);
    expect(
      next.history.organizations.some((row) =>
        row.stableKey.startsWith("public-government:local:"),
      ),
    ).toBe(false);
  });
  it("materializes the saved federal opening and settles the common account without new receipts", () => {
    const before = fixture();
    const profile = worldOpeningRecord(before)?.publicCashOpening;
    expect(profile).toBeDefined();
    const world = ensurePublicBudgets(before);
    const government = world.publicBudgets!.federalGovernment;
    expect(government?.jurisdictionId).toBe(NATIONAL_ELECTION_JURISDICTION.id);
    const saved = position(world, NATIONAL_ELECTION_JURISDICTION.id);
    expect(saved.openingBalance.minorUnits).toBe(profile!.federalMinorUnits);
    expect(saved.provenance).toMatchObject({
      note: expect.stringContaining(profile!.contractVersion),
    });
    const settled = settlePublicBudgets(world, month);
    const row = settled.publicBudgets!.federalGovernment!.months[0]!;
    expect(row.cashSettlement?.positionId).toBe(saved.id);
    expect(row.balance).toBe(profile!.federalMinorUnits / 100);
    expect(row.revenue).toEqual(row.revenue.map(() => 0));
    expect(row.spending).toEqual(row.spending.map(() => 0));
    expect(row.cashSettlement?.sourceRecordIds).toEqual([]);
    expect(settled.history.resourceFlows).toEqual(before.history.resourceFlows);
    expect(settled.history.resourceTransferOutcomes).toEqual(
      before.history.resourceTransferOutcomes,
    );
    expect(settled.history.resourcePositions).toEqual(
      world.history.resourcePositions,
    );
    const bytes = serializeWorld(settled);
    expect(
      serializeWorld(ensureOpeningGovernmentAccounts(deserializeWorld(bytes))),
    ).toBe(bytes);
    expect(
      settlePublicBudgets(settled, month).publicBudgets!.federalGovernment!
        .months,
    ).toHaveLength(1);
  });

  it("does not substitute zero federal opening cash when the saved profile is absent", () => {
    const before = ensureNationalElectionJurisdiction(fixture());
    const world: World = {
      ...before,
      history: {
        ...before.history,
        worldConditions: before.history.worldConditions!.map((record) => {
          if (record.kind !== "world-opening") return record;
          const legacy = { ...record };
          delete legacy.publicCashOpening;
          return legacy;
        }),
      },
    };
    const next = ensureOpeningGovernmentAccounts(world);
    expect(
      next.history.organizations.some(
        (record) =>
          record.stableKey ===
          publicOrganizationKey(NATIONAL_ELECTION_JURISDICTION.id),
      ),
    ).toBe(false);
    expect(next.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
  });

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

describe("current-game local cash estimates", () => {
  function withoutCashProfile(): World {
    const world = localFixture();
    return {
      ...world,
      history: {
        ...world.history,
        worldConditions: world.history.worldConditions!.map((record) => {
          if (record.kind !== "world-opening") return record;
          const legacy = { ...record };
          delete legacy.publicCashOpening;
          return legacy;
        }),
      },
    };
  }

  it("opens five local accounts without an opening profile from identified current-game cash peers", () => {
    const before = withoutCashProfile();
    const statesOnly = ensureOpeningGovernmentAccounts(before);
    const world = ensurePublicBudgets(before);
    const peerWorld: World = {
      ...statesOnly,
      publicBudgets: world.publicBudgets,
    };
    for (const unit of localUnits) {
      const candidate = budgetCandidates(world).candidates.find(
        (row) => row.key === `place:${unit.placeGeoid}`,
      )!;
      const expected = estimateLocalOpeningCash(peerWorld, candidate)!;
      expect(expected.peerGovernmentKeys.length).toBeGreaterThan(0);
      expect(expected.peerRecordIds.length).toBe(
        expected.peerGovernmentKeys.length * 2,
      );
      const selection = selectLocalOpeningAccount(world, candidate);
      expect(selection.status).toBe("saved");
      if (selection.status !== "saved")
        throw new Error("Missing saved peer-estimated account.");
      const saved = accountPosition(world, selection.identity)!;
      expect(saved.openingBalance.minorUnits).toBe(expected.amountMinorUnits);
      expect(saved.openingBalance.minorUnits).toBeGreaterThan(0);
      expect(saved.provenance.kind).toBe("authored");
      if (saved.provenance.kind !== "authored")
        throw new Error("Expected saved opening estimate provenance.");
      expect(saved.provenance.note).toContain(
        "averaged from this game's similar government accounts now",
      );
      for (const id of expected.peerRecordIds)
        expect(saved.provenance.note).toContain(id);
      const cash = readMonthFlows(world, world.publicBudgets!).flows.cash!.get(
        candidate.key,
      )!;
      expect(cash.positionId).toBe(saved.id);
    }
    expect(world.history.resourceFlows).toEqual(before.history.resourceFlows);
    expect(world.history.resourceTransferOutcomes).toEqual(
      before.history.resourceTransferOutcomes,
    );
    const bytes = serializeWorld(world);
    expect(
      serializeWorld(ensureOpeningGovernmentAccounts(deserializeWorld(bytes))),
    ).toBe(bytes);
  });

  it("uses current paid cash rather than static openings, and reports the donors' current spread", () => {
    let world = ensurePublicBudgets(localFixture());
    const candidate = localCandidate(world);
    const before = estimateLocalOpeningCash(world, candidate)!;
    expect(before.peerGovernmentKeys.length).toBeGreaterThan(0);
    const donorKey = before.peerGovernmentKeys[0]!;
    const cash = readMonthFlows(world, world.publicBudgets!).flows.cash!.get(
      donorKey,
    )!;
    world = createOrganization(world, {
      stableKey: "fixture:cash-estimate-recipient",
      formedAt: world.currentDate,
      provenance: {
        kind: "authored",
        note: "Actual test payment recipient, not a government donor.",
      },
      initialProfile: {
        name: "Test payee",
        classification: "sector:business",
        locationJurisdictionId: candidate.jurisdictionId,
      },
    });
    const recipientId = world.history.organizations.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: "fixture:cash-estimate-recipient:USD",
      owner: { kind: "organization", organizationId: recipientId },
      openedAt: world.currentDate,
      openingBalance: money(0, "USD"),
      provenance: { kind: "authored", note: "Test recipient cash." },
    });
    const amount = Math.min(100, cash.balanceMinorUnits);
    expect(amount).toBeGreaterThan(0);
    world = createResourceFlow(world, {
      stableKey: "fixture:cash-estimate-paid",
      source: { kind: "organization", organizationId: cash.organizationId },
      recipient: { kind: "organization", organizationId: recipientId },
      startsAt: world.currentDate,
      amount: money(amount, "USD"),
      cadenceKind: "custom:fixture-cash",
      basisKind: "custom:fixture-cash",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:public-general-receipts",
      jurisdictionId: candidate.jurisdictionId,
      provenance: {
        kind: "authored",
        note: "Actual saved payment for peer cash test.",
      },
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "fixture:cash-estimate-outcome",
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      attemptedAmount: money(amount, "USD"),
      transferredAmount: money(amount, "USD"),
      status: "completed",
      reasonKind: null,
      note: "Actual completed test payment.",
      provenance: {
        kind: "authored",
        note: "Saved payment, not a cash forecast.",
      },
    });
    const after = estimateLocalOpeningCash(world, candidate)!;
    expect(after.peerRecordIds).toEqual(before.peerRecordIds);
    const donor = world.publicBudgets!.governments.find(
      (row) => row.key === donorKey,
    )!;
    const target = world.publicBudgets!.governments.find(
      (row) => row.key === candidate.key,
    )!;
    const expectedDecrease =
      ((amount / donor.population) * target.population) /
      before.peerGovernmentKeys.length;
    expect(after.amountMinorUnits).toBe(
      Math.round(before.amountMinorUnits - expectedDecrease),
    );
    expect(after.sourceNote).toContain(
      `spendableCash=${cash.balanceMinorUnits - amount}`,
    );
    const actualCash = readMonthFlows(world, world.publicBudgets!).flows.cash!;
    const scaled = after.peerGovernmentKeys.map((key) => {
      const g = world.publicBudgets!.governments.find(
        (row) => row.key === key,
      )!;
      return (
        (actualCash.get(key)!.balanceMinorUnits / g.population) *
        target.population
      );
    });
    const mean = scaled.reduce((sum, value) => sum + value, 0) / scaled.length;
    const spread = Math.sqrt(
      scaled.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        scaled.length,
    );
    expect(after.amountMinorUnits).toBe(Math.round(mean));
    expect(after.spreadMinorUnits).toBe(spread);
    expect(
      estimateLocalOpeningCash(
        deserializeWorld(serializeWorld(world)),
        candidate,
      ),
    ).toEqual(after);
  });
});
