import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { currentPresidentOf } from "../crisis/offices";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import { addDays, daysBetween } from "../dates";
import { createOrganization } from "../life";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createResourcePosition, money } from "../resources";
import {
  ensureLocalPublicAccount,
  publicTaxAccountForIdentity,
} from "../tax-policy";
import type { PublicGovernmentIdentity, World } from "../types";
import { advanceWorld } from "../world";
import { recordAdoptedAppropriation } from "./program-governing";
import {
  programCommitments,
  programInstallments,
  recordProgramAppropriation,
  PUBLIC_PROGRAM_HANDLERS,
} from "./public-program";
import {
  GOVERNING_NPC_DECISION,
  GOVERNING_PROGRAM_AVAILABLE,
  governingMatters,
  openProgramMattersForAllOffices,
  stateGoverningHandlers,
} from "./state-governing";
import {
  FIXTURE,
  cash,
  city,
  pay,
} from "../../../tests/fixtures/public-program-fixture";

const PROGRAM = "parks:local-office-clock-fixture";
const FEDERAL_PROGRAM = "passenger-rail:us";

describe("ordinary local officeholder program matter", () => {
  it("waits for a future availability date before opening the manager's matter", () => {
    const g = city("local-program-matter-future", 1_000_000_00);
    const identity: PublicGovernmentIdentity = {
      kind: "local-government",
      jurisdictionId: g.jurisdictionId,
      governmentKey: g.governmentKey,
    };
    let world: World = {
      ...g.world,
      control: { kind: "person" as const, personId: g.mayor },
    };
    world = ensureLocalPublicAccount(world, identity);
    const account = publicTaxAccountForIdentity(world, identity)!;
    const availableFrom = addDays(world.currentDate, 3);
    const adopted = recordProgramAppropriation(world, {
      edition: "future-office-clock-fixture",
      programKey: PROGRAM,
      jurisdictionId: g.jurisdictionId,
      publicGovernmentIdentity: identity,
      accountOrganizationId: account.organizationId,
      amount: money(120_000_00, "USD"),
      availableFrom,
      availableThrough: addDays(world.currentDate, 365),
      basis: FIXTURE,
    });
    world = openProgramMattersForAllOffices(adopted.world);
    const appropriation = world.history.publicProgramRecords!.find(
      (record) => record.id === adopted.id,
    )!;
    const mattersFor = (candidate: World) =>
      governingMatters(candidate).filter(
        (matter) => matter.appropriationId === adopted.id,
      );
    expect(mattersFor(world)).toHaveLength(0);
    const availability = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === GOVERNING_PROGRAM_AVAILABLE &&
        item.entityIds.includes(appropriation.eventId),
    );
    expect(availability?.dueAt).toBe(availableFrom);
    expect(
      openProgramMattersForAllOffices(world).history.futureDueItems.filter(
        (item) => item.transitionKey === GOVERNING_PROGRAM_AVAILABLE,
      ),
    ).toHaveLength(1);

    const handlers = createFutureTransitionHandlerRegistry([
      ...stateGoverningHandlers(),
    ]);
    const before = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      2,
      handlers,
    );
    expect(mattersFor(before)).toHaveLength(0);
    const available = advanceWorld(before, 1, handlers);
    expect(available.currentDate).toBe(availableFrom);
    expect(
      available.history.futureDueItemStates
        .filter((state) => state.dueItemId === availability?.id)
        .at(-1)?.status,
    ).toBe("resolved");
    expect(mattersFor(available)).toMatchObject([
      { family: "program", holderPersonId: g.manager, status: "open" },
    ]);
    expect(mattersFor(openProgramMattersForAllOffices(available))).toHaveLength(
      1,
    );
  }, 120_000);

  it("uses the saved office, NPC decision, installment clock, and local account once", () => {
    const g = city("local-program-matter-npc", 1_000_000_00);
    const identity: PublicGovernmentIdentity = {
      kind: "local-government",
      jurisdictionId: g.jurisdictionId,
      governmentKey: g.governmentKey,
    };
    // The seated manager administers this government's budget. Control a
    // different person so the decision follows the ordinary NPC due item.
    let world: World = {
      ...g.world,
      control: { kind: "person" as const, personId: g.mayor },
    };
    world = ensureLocalPublicAccount(world, identity);
    const account = publicTaxAccountForIdentity(world, identity)!;
    world = pay(
      world,
      "local-program-matter-npc:local-receipt",
      g.payer,
      account.organizationId,
      120_000_00,
    );
    const adopted = recordProgramAppropriation(world, {
      edition: "office-clock-fixture",
      programKey: PROGRAM,
      jurisdictionId: g.jurisdictionId,
      publicGovernmentIdentity: identity,
      accountOrganizationId: account.organizationId,
      amount: money(120_000_00, "USD"),
      availableFrom: world.currentDate,
      availableThrough: addDays(world.currentDate, 365),
      basis: FIXTURE,
    });
    world = adopted.world;

    world = openProgramMattersForAllOffices(world);
    const matter = governingMatters(world).find(
      (entry) => entry.appropriationId === adopted.id,
    );
    expect(matter).toMatchObject({
      family: "program",
      holderPersonId: g.manager,
      status: "open",
      workItemId: null,
    });
    expect(matter?.options.map((option) => option.key)).toContain(
      "program:operate-three-months",
    );
    const due = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === GOVERNING_NPC_DECISION &&
        item.entityIds.includes(matter!.id),
    );
    expect(due).toBeDefined();
    expect(
      governingMatters(openProgramMattersForAllOffices(world)).filter(
        (entry) => entry.appropriationId === adopted.id,
      ),
    ).toHaveLength(1);

    const handlers = createFutureTransitionHandlerRegistry([
      ...stateGoverningHandlers(),
      ...PUBLIC_PROGRAM_HANDLERS,
    ]);
    // The NPC's program deadline is at most 45 days; any immediate and
    // thirty-day installments owed by then use the same canonical clock.
    const decided = advanceWorld(world, 45, handlers);
    const saved = deserializeWorld(serializeWorld(decided));
    const resolvedMatter = governingMatters(saved).find(
      (entry) => entry.id === matter!.id,
    );
    expect(resolvedMatter?.status).toBe("decided");
    expect(resolvedMatter?.decision?.tags).toContain("decided-by:officeholder");
    expect(resolvedMatter?.decision?.tags).toContain(
      "choice:program:operate-three-months",
    );
    const commitment = programCommitments(saved, PROGRAM, identity);
    expect(commitment).toHaveLength(1);
    expect(commitment[0]?.appropriationId).toBe(adopted.id);
    expect(commitment[0]?.decidedByPersonId).toBe(g.manager);
    expect(commitment[0]?.recipientOrganizationId).not.toBeNull();
    const installments = programInstallments(saved, PROGRAM, identity);
    expect(installments.length).toBeGreaterThan(0);
    expect(installments.every((item) => item.status === "posted")).toBe(true);
    expect(cash(saved, account.organizationId)).toBeLessThan(120_000_00);
    expect(
      cash(saved, commitment[0]!.recipientOrganizationId!),
    ).toBeGreaterThan(0);

    const reopened = openProgramMattersForAllOffices(saved);
    expect(
      governingMatters(reopened).filter(
        (entry) => entry.appropriationId === adopted.id,
      ),
    ).toHaveLength(1);
    expect(programCommitments(reopened, PROGRAM, identity)).toEqual(commitment);
    expect(programInstallments(reopened, PROGRAM, identity)).toEqual(
      installments,
    );
  }, 120_000);
});

describe("ordinary federal officeholder program matter", () => {
  it("lets the non-player President commit federal money and post its funded installment", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "federal-program-matter-npc-spend",
        startAge: 34,
        depth: "summarize-earlier-life",
      }),
    ).game;
    if (!game) throw new Error("Expected an ordinary opening life.");
    let world = ensureNationalElectionJurisdiction(game.world);
    const president = currentPresidentOf(world);
    if (!president) throw new Error("Expected a sitting President.");
    expect(world.control).not.toEqual({
      kind: "person",
      personId: president.personId,
    });
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    const identity: PublicGovernmentIdentity = {
      kind: "jurisdiction",
      jurisdictionId,
    };
    const adopted = recordAdoptedAppropriation(world, {
      familyKey: "passenger-rail",
      programKey: FEDERAL_PROGRAM,
      jurisdictionId,
      amountMinorUnits: 300_000_00,
      adoptedOn: world.currentDate,
      edition: "federal-office-clock-fixture-funded",
      basisNote:
        "An authored federal office and account fixture, not a real budget.",
    });
    if (!adopted) throw new Error("Expected a federal appropriation.");
    world = adopted.world;
    const account = publicTaxAccountForIdentity(world, identity);
    if (!account) throw new Error("Expected the federal public account.");
    world = createOrganization(world, {
      stableKey: "federal-program-matter-npc:payer",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: FIXTURE.note },
      initialProfile: {
        name: "Fixture federal receipts payer",
        classification: "sector:private",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const payer = world.history.organizations.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: "federal-program-matter-npc:payer:USD",
      owner: { kind: "organization", organizationId: payer },
      openedAt: world.currentDate,
      openingBalance: money(300_000_00, "USD"),
      provenance: { kind: "authored", note: FIXTURE.note },
    });
    world = pay(
      world,
      "federal-program-matter-npc:receipt",
      payer,
      account.organizationId,
      300_000_00,
    );
    expect(cash(world, account.organizationId)).toBe(300_000_00);

    world = openProgramMattersForAllOffices(world);
    const matter = governingMatters(world).find(
      (entry) => entry.appropriationId === adopted.appropriationId,
    );
    expect(matter).toMatchObject({
      family: "program",
      holderPersonId: president.personId,
      status: "open",
      workItemId: null,
    });
    expect(matter?.openedEvent.jurisdictionId).toBe(jurisdictionId);
    const due = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === GOVERNING_NPC_DECISION &&
        item.entityIds.includes(matter!.id),
    );
    expect(due).toBeDefined();
    const settled = advanceWorld(
      world,
      daysBetween(world.currentDate, due!.dueAt),
      createCampaignElectionTransitionRegistry(),
    );
    const saved = deserializeWorld(serializeWorld(settled));
    const decision = governingMatters(saved).find(
      (entry) => entry.id === matter!.id,
    );
    expect(decision?.status).toBe("decided");
    expect(decision?.decision?.tags).toContain("decided-by:officeholder");
    expect(decision?.decision?.tags).toContain(
      "choice:program:operate-three-months",
    );
    const commitment = programCommitments(saved, FEDERAL_PROGRAM, identity);
    expect(commitment).toHaveLength(1);
    expect(commitment[0]).toMatchObject({
      appropriationId: adopted.appropriationId,
      decidedByPersonId: president.personId,
      jurisdictionId,
    });
    const installments = programInstallments(saved, FEDERAL_PROGRAM, identity);
    expect(installments.length).toBeGreaterThan(0);
    expect(installments.every((row) => row.status === "posted")).toBe(true);
    expect(cash(saved, account.organizationId)).toBeLessThan(300_000_00);
    expect(
      cash(saved, commitment[0]!.recipientOrganizationId!),
    ).toBeGreaterThan(0);
    expect(
      governingMatters(openProgramMattersForAllOffices(saved)).filter(
        (entry) => entry.appropriationId === adopted.appropriationId,
      ),
    ).toHaveLength(1);
  }, 120_000);
});
