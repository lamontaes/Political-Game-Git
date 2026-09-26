import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, daysBetween } from "../dates";
import { searchLifePlaces, stateJurisdictionForKey } from "../life-places";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "../nationwide-world/state-executives";
import { resourcePositionAt } from "../resource-queries";
import { money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import { advanceWorld } from "../world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import {
  programAlternativesFor,
  programOperatorOrganization,
} from "./program-governing";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programCommitments,
  programInstallments,
  recordProgramAppropriation,
} from "./public-program";
import {
  GOVERNING_MATTER_DECIDED,
  GOVERNING_NPC_DECISION,
  governingMatters,
  openProgramMattersForAllOffices,
} from "./state-governing";

describe("an existing governor commitment consumes its pending program matter", () => {
  it("keeps the first Lincoln payment and skips a later NPC no-action after Save/Continue", () => {
    const place = searchLifePlaces("Lincoln", 1, {
      stateJurisdictionKey: "US-NE",
      scope: "locality",
    })[0]!;
    expect(place).toBeDefined();
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "cash-route-ne-1",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    });
    const jurisdictionId = stateJurisdictionForKey("US-NE")!.id;
    let world = ensureWorldStartingConditions(game.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    });
    world = ensureStateExecutiveIncumbent(world, game.playerPersonId, "NE");
    world = ensureTaxPublicAccount(world, jurisdictionId);
    const governor = currentStateExecutiveHolders(world).find(
      (holder) => holder.stateUsps === "NE",
    );
    expect(governor?.personId).toBeDefined();
    expect(governor?.personId).not.toBe(game.playerPersonId);
    const account = publicTaxAccountForJurisdiction(world, jurisdictionId)!;
    const cash = (at: typeof world) =>
      resourcePositionAt(
        at,
        { kind: "organization", organizationId: account.organizationId },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits ?? 0;
    expect(worldOpeningRecord(world)?.publicCashOpening).toBeDefined();
    const openingCash = cash(world);
    expect(openingCash).toBeGreaterThan(10_000_00);

    const programKey = "transit:ne";
    const basis = {
      kind: "game-profile" as const,
      note: "Fictional Nebraska capacity and appropriation for the commitment lifecycle regression.",
    };
    world = declareProgramCapacity(world, {
      edition: "cash-route-ne-1:capacity",
      programKey,
      jurisdictionId,
      serviceLabel: "modeled state rural-transit service",
      unitLabel: "transit service unit",
      unitsTotal: 1,
      unitsOperational: 0,
      monthlyOperatingNeed: money(1_000_00, "USD"),
      completedPermille: null,
      restorationCostPerUnit: money(10_000_00, "USD"),
      basis,
    }).world;
    const adopted = recordProgramAppropriation(world, {
      edition: "cash-route-ne-1:LB-450",
      programKey,
      jurisdictionId,
      accountOrganizationId: account.organizationId,
      amount: money(20_000_00, "USD"),
      availableFrom: world.currentDate,
      availableThrough: addDays(world.currentDate, 365),
      basis,
    });
    world = openProgramMattersForAllOffices(
      adopted.world,
      new Set([adopted.id]),
    );
    const matter = governingMatters(world).find(
      (entry) => entry.appropriationId === adopted.id,
    );
    expect(matter?.status).toBe("open");
    const due = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === GOVERNING_NPC_DECISION &&
        item.entityIds.includes(matter!.id),
    );
    expect(due).toBeDefined();
    const appropriation = world.history.publicProgramRecords!.find(
      (record) => record.kind === "appropriation" && record.id === adopted.id,
    );
    if (!appropriation || appropriation.kind !== "appropriation")
      throw new Error("Expected the recorded Nebraska appropriation.");
    const restore = programAlternativesFor(world, appropriation).find(
      (alternative) => alternative.key === "restore-units",
    );
    expect(restore?.installments[0]?.amount.minorUnits).toBe(10_000_00);
    const operator = programOperatorOrganization(
      world,
      programKey,
      jurisdictionId,
    );
    const committed = commitPublicProgram(operator.world, {
      appropriationId: adopted.id,
      alternative: restore!,
      personId: governor!.personId,
      office: { kind: "state-executive" },
      recipientOrganizationId: operator.organizationId,
    });
    expect(committed.ok).toBe(true);
    if (!committed.ok) throw new Error(committed.reason);
    world = committed.world;
    expect(cash(world)).toBe(openingCash - 10_000_00);
    expect(
      programInstallments(world, programKey).filter(
        (installment) => installment.commitmentId === committed.recordId,
      ),
    ).toMatchObject([{ status: "posted" }]);
    expect(
      governingMatters(world).find((entry) => entry.id === matter!.id)?.status,
    ).toBe("decided");

    const saved = deserializeWorld(serializeWorld(world));
    const elapsed = daysBetween(saved.currentDate, due!.dueAt);
    const after = advanceWorld(
      saved,
      elapsed,
      createCampaignElectionTransitionRegistry(),
    );
    const commitments = programCommitments(after, programKey).filter(
      (entry) => entry.appropriationId === adopted.id,
    );
    expect(commitments).toHaveLength(1);
    expect(commitments[0]?.alternativeKey).toBe("restore-units");
    expect(cash(after)).toBe(openingCash - 10_000_00);
    expect(
      after.history.events.filter(
        (event) =>
          event.type === GOVERNING_MATTER_DECIDED &&
          event.tags.includes(`matter:${matter!.id}`),
      ),
    ).toHaveLength(0);
    expect(
      governingMatters(after).find((entry) => entry.id === matter!.id)?.status,
    ).toBe("decided");
  }, 120_000);
});
