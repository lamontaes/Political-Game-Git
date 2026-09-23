import { describe, expect, it } from "vitest";

import {
  ELECTION_CONTEST_TRANSITION_KEY,
  campaignElectionTransitionHandler,
  createFutureTransitionHandlerRegistry,
  decideGoverningMatter,
  electionContestResult,
  governingMatters,
  governingOfficeForPerson,
  measurePosition,
  resolveCampaignElectionFromRecordedInput,
  searchLifePlaces,
} from "../simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation";
import { createOrganization } from "../simulation/life";
import {
  programAppropriations,
  programCommitments,
  programInstallments,
  programPosition,
} from "../simulation/governing/public-program";
import { currentMeasureProvisions } from "../simulation/legislative-politics";
import { resourcePositionAt } from "../simulation/resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  makeCurrencyCode,
  money,
  recordResourceTransferOutcome,
} from "../simulation/resources";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import { deserializeWorld, serializeWorld } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { establishOpeningOfficeholders } from "./opening-officeholders";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
} from "./nationwide-candidacy";

const FIXTURE_NOTE =
  "GOVERNING D1 route fixture: receipts supplied as a test input, not modeled collection.";

function passTo(world: World, until: string): World {
  let next = world;
  for (let step = 0; step < 200 && next.currentDate < until; step += 1) {
    const days = Math.round(
      (Date.parse(until) - Date.parse(next.currentDate)) / 86_400_000,
    );
    next = passOrdinaryDays(next, Math.max(1, Math.min(30, days)));
  }
  return next;
}

function suppliedWin(personId: EntityId): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [
      ELECTION_CONTEST_TRANSITION_KEY,
      (atDate, due) => {
        const contest = (atDate.history.electionContests ?? []).find((c) =>
          due.entityIds.includes(c.id),
        );
        if (!contest || !contest.candidatePersonIds.includes(personId))
          return campaignElectionTransitionHandler(atDate, due);
        const resolved = resolveCampaignElectionFromRecordedInput(atDate, {
          contestId: contest.id,
          winnerPersonId: personId,
          tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
            candidatePersonId,
            votes: candidatePersonId === personId ? 2 : 1,
            voteShare: candidatePersonId === personId ? 2 / 3 : 1 / 3,
          })),
          provenance: {
            method: "authored",
            sourceEntityIds: [],
            note: "Supplied fictional test result; not a forecast.",
          },
        });
        return {
          world: resolved,
          status: "resolved",
          reasonKey: null,
          context: "Supplied recorded-result fixture.",
          outcomeEventId: electionContestResult(resolved, contest.id)!
            .outcomeEventId,
        };
      },
    ],
  ]);
}

/** Receipts the public account really holds, supplied as a test input. */
function fundAccount(
  world: World,
  jurisdictionId: EntityId,
  minorUnits: number,
): World {
  const account = publicTaxAccountForJurisdiction(world, jurisdictionId)!;
  let next = createOrganization(world, {
    stableKey: "d1-route:payer",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: FIXTURE_NOTE },
    initialProfile: {
      name: "Fixture receipts payer",
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const payer = next.history.organizations.at(-1)!.id;
  next = createResourcePosition(next, {
    stableKey: "d1-route:payer:USD",
    owner: { kind: "organization", organizationId: payer },
    openedAt: next.currentDate,
    openingBalance: money(minorUnits, "USD"),
    provenance: { kind: "authored", note: FIXTURE_NOTE },
  });
  next = createResourceFlow(next, {
    stableKey: "d1-route:receipts",
    source: { kind: "organization", organizationId: payer },
    recipient: {
      kind: "organization",
      organizationId: account.organizationId,
    },
    startsAt: next.currentDate,
    amount: money(minorUnits, "USD"),
    cadenceKind: "custom:fixture",
    basisKind: "custom:fixture-transfer",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance: { kind: "authored", note: FIXTURE_NOTE },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  return recordResourceTransferOutcome(next, {
    stableKey: "d1-route:receipts:transfer",
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    attemptedAmount: money(minorUnits, "USD"),
    transferredAmount: money(minorUnits, "USD"),
    status: "completed",
    reasonKind: null,
    note: FIXTURE_NOTE,
    provenance: flow.provenance,
  });
}

const cash = (world: World, organizationId: EntityId) =>
  resourcePositionAt(
    world,
    { kind: "organization", organizationId },
    makeCurrencyCode("USD"),
  )?.liquidBalance.minorUnits ?? 0;

describe("GOVERNING D1: an enacted appropriation becomes a program the office commits", () => {
  it("carries a real bill to the desk, funds a program, and pays only what the account holds", () => {
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: "US-AK",
      scope: "locality",
    })[0]!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "d1-program-route",
        placeKey: place.key,
        startAge: 45,
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    let world = fileForStateExecutiveOffice(
      openOrdinaryLife(game.world, personId),
      personId,
    );
    const handlers = suppliedWin(personId);
    for (let step = 0; step < 20 && world.currentDate < "2026-11-05"; step += 1)
      world = passOrdinaryDays(world, 30, { handlers });
    world = passTo(qualifyForStateExecutiveTerm(world, personId), "2027-01-10");
    const office = governingOfficeForPerson(world, personId)!;
    expect(office.stateUsps).toBe("AK");

    // The legislature files its appropriation bill, which now carries the
    // amount its own clause states.
    // Bill days fall through the spring; wait for an appropriation filed
    // while this governor holds the office, not a predecessor's.
    const filedAppropriation = (w: World) =>
      (w.history.legislativeMeasures ?? []).find(
        (measure) =>
          measure.subjectClass === "appropriation" &&
          measure.introducedAt >= "2027-01-10",
      );
    for (let step = 0; step < 60 && !filedAppropriation(world); step += 1)
      world = passOrdinaryDays(world, 15);
    const appropriationBill = filedAppropriation(world)!;
    expect(appropriationBill).toBeDefined();
    const amount = currentMeasureProvisions(world, appropriationBill.id).find(
      (provision) => provision.provisionKey === "amount-provided",
    )!.fiscalExposureMinorUnits!;
    expect(amount).toBeGreaterThan(0);

    // Carry it to the desk and sign it.
    const desk = (w: World) =>
      governingMatters(w, office.officeKey).find(
        (m) => m.family === "bill" && m.measureId === appropriationBill.id,
      );
    for (let step = 0; step < 12 && !desk(world); step += 1)
      world = passOrdinaryDays(world, 15);
    const billMatter = desk(world);
    expect(
      billMatter,
      measurePosition(world, appropriationBill.id).phase,
    ).toBeDefined();
    const signed = decideGoverningMatter(world, billMatter!.id, "bill:sign");
    expect(signed.ok, signed.ok ? "" : signed.reason).toBe(true);
    world = signed.world;
    world = passOrdinaryDays(world, 10);
    expect(measurePosition(world, appropriationBill.id).phase).toBe("enacted");

    // Enactment wrote spending authority against the state's own account.
    // Other appropriations may be law too: a governor the player did not
    // control signs bills now, and the legislature can override a veto. The
    // one that matters is the one this bill wrote.
    const appropriations = programAppropriations(
      world,
      appropriationKey(world),
    ).filter((entry) => entry.sourceMeasureId === appropriationBill.id);
    expect(appropriations).toHaveLength(1);
    const appropriation = appropriations[0]!;
    expect(appropriation.amount.minorUnits).toBe(amount);

    // The office is asked what to commit it to, before any money moves.
    const programMatter = () =>
      governingMatters(world, office.officeKey).find(
        (m) => m.family === "program" && m.appropriationId === appropriation.id,
      );
    for (let step = 0; step < 6 && !programMatter(); step += 1)
      world = passOrdinaryDays(world, 15);
    const matter = programMatter()!;
    expect(matter.options.map((o) => o.key)).toContain(
      "program:operate-three-months",
    );
    expect(matter.options.map((o) => o.key)).toContain("program:no-action");
    expect(cash(world, appropriation.accountOrganizationId)).toBe(0);

    // The account holds enough for one payment only.
    const third = Math.floor(appropriation.amount.minorUnits / 3);
    world = fundAccount(world, office.jurisdictionId, third);
    world = decideGoverningMatter(
      world,
      matter.id,
      "program:operate-three-months",
    ).world;
    const commitments = programCommitments(
      world,
      appropriation.programKey,
    ).filter((entry) => entry.appropriationId === appropriation.id);
    expect(commitments).toHaveLength(1);
    expect(commitments[0]!.decidedByPersonId).toBe(personId);
    expect(commitments[0]!.authority).toMatch(/Governor/);

    world = passOrdinaryDays(world, 70);
    const settled = programInstallments(world, appropriation.programKey).filter(
      (row) => row.commitmentId === commitments[0]!.id,
    );
    expect(settled.map((row) => row.status)).toEqual([
      "posted",
      "failed",
      "failed",
    ]);
    expect(settled[1]!.reason).toMatch(/not cash/);
    const position = programPosition(
      world,
      appropriation.programKey,
      appropriation.id,
    );
    expect(position.posted.minorUnits).toBe(third);
    expect(position.failedInstallments).toBe(2);
    expect(cash(world, appropriation.accountOrganizationId)).toBe(0);

    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      programPosition(reopened, appropriation.programKey, appropriation.id),
    ).toEqual(position);
  }, 900_000);
});

/** The one program key this world's appropriations were written under. */
function appropriationKey(world: World): string {
  const record = (world.history.publicProgramRecords ?? []).find(
    (row) => row.kind === "appropriation",
  );
  return record?.programKey ?? "";
}

describe("GOVERNING D1: a pre-calendar opening replays exactly", () => {
  it("keeps an undated opening tenure when the caller says it is replaying", () => {
    // Built without the opening officeholders, so each call below is the
    // first one to write the tenure.
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "legacy-replay-governor",
    });
    const dated = establishOpeningOfficeholders(
      game.world,
      game.playerPersonId,
    );
    const legacy = establishOpeningOfficeholders(
      game.world,
      game.playerPersonId,
      { datedTerms: false },
    );
    const tenureKey = (w: World) =>
      w.history.events.find(
        (event) =>
          event.type === "world.office-tenure" &&
          event.stableKey.includes("governor:tenure:"),
      )?.stableKey ?? null;
    // The ordinary new game dates the term from the office's game calendar.
    expect(tenureKey(dated)).toMatch(/governor:tenure:\d{4}-\d{2}-\d{2}$/);
    // A replay of a descriptor written before that calendar existed keeps the
    // key it had, so the same person is drawn.
    expect(tenureKey(legacy)).toMatch(/governor:tenure:recorded-/);
    expect(tenureKey(legacy)).not.toBe(tenureKey(dated));
  }, 600_000);
});
