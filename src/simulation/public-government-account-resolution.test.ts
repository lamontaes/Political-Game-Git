import { createWorld } from "./world";
import { lifePlaceByKey } from "./life-places";
import { municipalGovernmentForLifePlace } from "./municipal-government";
import { makeIsoDate } from "./dates";
import { describe, expect, it } from "vitest";
import {
  city,
  cash,
  FIXTURE,
} from "../../tests/fixtures/public-program-fixture";
import { currentLifeCutoff } from "./life-queries";
import { createOrganization } from "./life";
import { createResourcePosition, money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  ensureLocalPublicAccount,
  publicTaxAccountForIdentity,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import { recordProgramAppropriation } from "./governing/public-program";
import { budgetCandidates } from "./public-budgets/opening";
import { selectLocalOpeningAccount } from "./public-budgets/opening-government-accounts";

const identityOf = (g: ReturnType<typeof city>) => ({
  kind: "local-government" as const,
  jurisdictionId: g.jurisdictionId,
  governmentKey: g.governmentKey,
});

describe("one compiled government resolves one saved treasury", () => {
  it("finds the already funded city account through both producers and admits its appropriation", () => {
    const g = city("canonical-city-treasury", 1_000_000_00);
    const identity = identityOf(g);
    const old = publicTaxAccountForJurisdiction(g.world, g.jurisdictionId)!;
    const balance = cash(g.world, old.organizationId);
    const positions = g.world.history.resourcePositions;
    const outcomes = g.world.history.resourceTransferOutcomes;
    const ensured = ensureLocalPublicAccount(g.world, identity);
    expect(ensured.history.organizations).toEqual(
      g.world.history.organizations,
    );
    expect(ensured.history.resourcePositions).toEqual(positions);
    expect(ensured.history.resourceTransferOutcomes).toEqual(outcomes);
    expect(publicTaxAccountForIdentity(ensured, identity)).toEqual(old);
    const candidate = budgetCandidates(ensured).candidates.find(
      (row) => row.level === "city" && row.jurisdictionId === g.jurisdictionId,
    )!;
    expect(candidate).toBeDefined();
    const selected = selectLocalOpeningAccount(ensured, candidate);
    expect(selected.status).toBe("saved");
    if (selected.status !== "saved")
      throw new Error("Expected existing treasury.");
    expect(publicTaxAccountForIdentity(ensured, selected.identity)).toEqual(
      old,
    );
    const adopted = recordProgramAppropriation(ensured, {
      programKey: "parks:canonical-account-proof",
      edition: "one",
      jurisdictionId: g.jurisdictionId,
      publicGovernmentIdentity: identity,
      accountOrganizationId: old.organizationId,
      amount: money(120_000_00, "USD"),
      availableFrom: ensured.currentDate,
      availableThrough: ensured.currentDate,
      basis: FIXTURE,
    });
    expect(
      adopted.world.history
        .publicProgramRecords!.filter((row) => row.kind === "appropriation")
        .find((row) => row.id === adopted.id)?.accountOrganizationId,
    ).toBe(old.organizationId);
    expect(cash(adopted.world, old.organizationId)).toBe(balance);
    const loaded = deserializeWorld(serializeWorld(adopted.world));
    expect(publicTaxAccountForIdentity(loaded, identity)).toEqual(old);
    expect(publicTaxAccountForJurisdiction(loaded, g.jurisdictionId)).toEqual(
      old,
    );
    expect(cash(loaded, old.organizationId)).toBe(balance);
    expect(
      publicTaxAccountForIdentity(loaded, identity, {
        ...currentLifeCutoff(loaded),
        historySequenceExclusive: 0,
      }),
    ).toBeNull();
  });

  it("migrates a funded legacy stable-key lookup without rewriting its account or payments", () => {
    const place = lifePlaceByKey("3209700")!;
    const identity = {
      kind: "local-government" as const,
      jurisdictionId: place.context.jurisdiction.id,
      governmentKey: municipalGovernmentForLifePlace(place)!.key,
    };
    let world = createWorld({
      seed: "legacy-city-treasury",
      currentDate: makeIsoDate("2026-01-05"),
      jurisdictions: [place.context.jurisdiction],
      people: [],
    });
    world = createOrganization(world, {
      stableKey: `public-government:${identity.jurisdictionId}`,
      formedAt: world.currentDate,
      provenance: {
        kind: "authored",
        note: "Controlled saved legacy treasury.",
      },
      initialProfile: {
        name: "Funded legacy city treasury",
        classification: "sector:government",
        locationJurisdictionId: identity.jurisdictionId,
      },
    });
    const account = world.history.organizations.at(-1)!;
    world = createResourcePosition(world, {
      stableKey: "legacy-city-cash",
      owner: { kind: "organization", organizationId: account.id },
      openedAt: world.currentDate,
      openingBalance: money(100_000_00, "USD"),
      provenance: {
        kind: "authored",
        note: "Controlled saved balance, not measured public cash.",
      },
    });
    const before = serializeWorld(world);
    expect(publicTaxAccountForIdentity(world, identity)).toEqual({
      organizationId: account.id,
    });
    expect(
      publicTaxAccountForJurisdiction(world, identity.jurisdictionId),
    ).toEqual({ organizationId: account.id });
    const ensured = ensureLocalPublicAccount(world, identity);
    expect(serializeWorld(ensured)).toBe(before);
    expect(cash(ensured, account.id)).toBe(100_000_00);
    const adopted = recordProgramAppropriation(ensured, {
      programKey: "parks:legacy-account",
      edition: "one",
      jurisdictionId: identity.jurisdictionId,
      publicGovernmentIdentity: identity,
      accountOrganizationId: account.id,
      amount: money(10_000_00, "USD"),
      availableFrom: world.currentDate,
      availableThrough: world.currentDate,
      basis: FIXTURE,
    });
    const loaded = deserializeWorld(serializeWorld(adopted.world));
    expect(loaded.history.organizations).toEqual(world.history.organizations);
    expect(loaded.history.resourcePositions).toEqual(
      world.history.resourcePositions,
    );
    expect(loaded.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    expect(publicTaxAccountForIdentity(loaded, identity)).toEqual({
      organizationId: account.id,
    });
  });

  it("rejects two saved aliases instead of choosing or funding a second treasury", () => {
    const g = city("canonical-city-duplicate", 1_000_000_00);
    const identity = identityOf(g);
    const duplicate = createOrganization(g.world, {
      stableKey: `public-government:local:${encodeURIComponent(g.governmentKey)}`,
      formedAt: g.world.currentDate,
      provenance: {
        kind: "authored",
        note: "Controlled preexisting legacy account collision.",
      },
      initialProfile: {
        name: "Legacy treasury",
        classification: "sector:government",
        locationJurisdictionId: g.jurisdictionId,
      },
    });
    expect(publicTaxAccountForIdentity(duplicate, identity)).toBeNull();
    expect(() => ensureLocalPublicAccount(duplicate, identity)).toThrow(
      /Multiple saved public accounts/,
    );
    expect(duplicate.history.resourcePositions).toEqual(
      g.world.history.resourcePositions,
    );
  });
});
