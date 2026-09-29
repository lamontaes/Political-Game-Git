import { describe, expect, it } from "vitest";

import { chooseAdultOption } from "../../src/presentation/adult-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { offerDeadlines } from "../../src/presentation/offer-deadlines";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { adultLifeSituations } from "../../src/simulation/adult-situations";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { ensureLifePathPersonalPosition } from "../../src/simulation/life-paths2-resources";
import {
  collectTownRent,
  decideEvictionCase,
  EVICTION,
  type EvictionCaseFacts,
  EVICTION_CASE_TAG,
  nextRentDay,
  openEvictionCase,
  RENT_EVENTS,
  rentOwedByLeaseholder,
  townLeases,
} from "../../src/simulation/living-world/town-rent";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../../src/simulation/resources";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { EntityId, IsoDate, World } from "../../src/simulation";

const CASE = "adult.eviction-case" as const;
const USD = money(0, "USD").currency;

function onDay(world: World, day: IsoDate): World {
  return {
    ...world,
    currentDate: day,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
  };
}

/** Steps day by day to `until`, collecting rent on each first of the month. */
function stepTo(world: World, until: IsoDate): World {
  let next = world;
  withWorldIntegrityDeferred(() => {
    let day = next.currentDate;
    while (day < until) {
      day = addDays(day, 1);
      next = onDay(next, day);
      if (day.endsWith("-01")) next = collectTownRent(next, day);
    }
  });
  return next;
}

/**
 * A Chicago life whose player holds a lease, has no pay coming in and is
 * taken to court once two months' rent is owed. Seeds are tried in order
 * until one opens with the player as a leaseholder.
 */
function filedAgainstPlayer(): {
  readonly world: World;
  readonly player: EntityId;
} {
  for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `eviction-case-${seed}`,
        placeKey: "1714000",
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    const player = game.playerPersonId;
    let world = withWorldIntegrityDeferred(() =>
      ensureLifePathPersonalPosition(game.world, player, USD),
    );
    for (let month = 0; month < 6; month += 1) {
      world = stepTo(world, nextRentDay(world.currentDate));
      const held = townLeases(world).some(
        (lease) => !lease.ended && lease.leaseholderId === player,
      );
      if (!held) break;
      if (openEvictionCase(world, player)) return { world, player };
    }
  }
  throw new Error("No opening put the player behind on a lease.");
}

let cached: ReturnType<typeof filedAgainstPlayer> | null = null;
function filed() {
  cached ??= filedAgainstPlayer();
  return cached;
}

function giveMoney(world: World, to: EntityId, minor: number): World {
  const from = Object.keys(world.people).find((id) => id !== to)!;
  return withWorldIntegrityDeferred(() => {
    let next = createResourceFlow(world, {
      stableKey: "eviction-case-test:gift",
      source: { kind: "person", personId: from },
      recipient: { kind: "person", personId: to },
      startsAt: world.currentDate,
      amount: money(minor, "USD"),
      cadenceKind: "custom:test-transfer",
      basisKind: "custom:test-transfer",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance: { kind: "authored", note: "Test-only gift." },
    });
    next = recordResourceTransferOutcome(next, {
      stableKey: "eviction-case-test:gift:outcome",
      resourceFlowId: next.history.resourceFlows.at(-1)!.id,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      attemptedAmount: money(minor, "USD"),
      transferredAmount: money(minor, "USD"),
      status: "completed",
      reasonKind: null,
      note: null,
      provenance: { kind: "authored", note: "Test-only gift." },
    });
    return next;
  });
}

function optionKeys(world: World, player: EntityId): readonly string[] {
  return (
    adultLifeSituations(world, {
      personId: player,
      asOfDate: world.currentDate,
    })
      .find((situation) => situation.key === CASE)
      ?.options.map((option) => option.key) ?? []
  );
}

function choose(world: World, player: EntityId, optionKey: string): World {
  return withWorldIntegrityDeferred(() =>
    chooseAdultOption(world, {
      personId: player,
      situationKey: CASE,
      optionKey,
    }),
  );
}

function decided(world: World, filedOn: IsoDate) {
  return world.history.events.filter(
    (event) =>
      event.occurredAt > filedOn &&
      (event.type === RENT_EVENTS.evicted ||
        event.type === RENT_EVENTS.settled ||
        event.type === RENT_EVENTS.dismissed ||
        event.type === RENT_EVENTS.movedOut),
  );
}

describe("the player's own eviction case", { timeout: 900_000 }, () => {
  it("puts the filing to the played leaseholder with the choices the world allows", () => {
    const { world, player } = filed();
    const open = openEvictionCase(world, player)!;
    expect(open.decidedOn).toBe(nextRentDay(open.filedOn));
    expect(open.owedMinor).toBeGreaterThan(0);
    const notice = world.history.events.find(
      (event) =>
        event.tags.includes(EVICTION_CASE_TAG) &&
        event.involvedEntityIds.includes(player),
    )!;
    expect(notice.visibility).toBe("private");
    expect(notice.summary).toMatch(/gone to court to evict you/);
    expect(notice.summary).toMatch(/will be decided on/);
    // No money to pay, and Chicago began with no right-to-counsel law.
    expect(open.counselLaw).toBeNull();
    expect(optionKeys(world, player)).toEqual([
      "offer-a-payment-plan",
      "move-out-first",
    ]);
    // A skip stops the day before the case is decided.
    expect(
      offerDeadlines(world, player).find((deadline) =>
        deadline.key.startsWith("eviction-case:"),
      )?.replyBy,
    ).toBe(addDays(open.decidedOn, -1));
  });

  it("decides an unanswered case on the next rent day against a tenant who did not answer", () => {
    const { world, player } = filed();
    const open = openEvictionCase(world, player)!;
    const after = stepTo(world, open.decidedOn);
    const outcome = decided(after, open.filedOn);
    expect(outcome).toHaveLength(1);
    // Only a landlord who does not follow through spares a tenant who did
    // not answer.
    if (outcome[0]!.type === RENT_EVENTS.evicted)
      expect(outcome[0]!.summary).toMatch(/did not answer the case/);
    else expect(outcome[0]!.summary).toMatch(/agreed to wait/);
    expect(outcome[0]!.summary).not.toMatch(/lawyer/);
    expect(openEvictionCase(after, player)).toBeNull();
  });

  it("offers a payment plan, which the next rent day reads", () => {
    const { world, player } = filed();
    const open = openEvictionCase(world, player)!;
    const answered = choose(world, player, "offer-a-payment-plan");
    expect(openEvictionCase(answered, player)?.answer).toBe(
      "offer-a-payment-plan",
    );
    // Answered, the case is no longer put to the player or held as a deadline.
    expect(optionKeys(answered, player)).toEqual([]);
    expect(
      offerDeadlines(answered, player).some((deadline) =>
        deadline.key.startsWith("eviction-case:"),
      ),
    ).toBe(false);
    const after = stepTo(answered, open.decidedOn);
    const outcome = decided(after, open.filedOn);
    expect(outcome).toHaveLength(1);
    // With no pay coming in, the plan is one the court cannot accept.
    expect(outcome[0]!.summary).toMatch(
      /could not carry the plan|agreed to wait|gave them time/,
    );
  });

  it("moves out before the hearing: the tenancy ends and the case is dropped", () => {
    const { world, player } = filed();
    const open = openEvictionCase(world, player)!;
    const moved = choose(world, player, "move-out-first");
    expect(openEvictionCase(moved, player)).toBeNull();
    const outcome = decided(moved, addDays(open.filedOn, -1)).filter(
      (event) => event.type === RENT_EVENTS.movedOut,
    );
    expect(outcome).toHaveLength(1);
    expect(outcome[0]!.summary).toMatch(/still owed/);
    const endedAs = moved.history.housingTenureStates
      .filter((state) => state.status === "ended")
      .map((state) => state.context);
    expect(endedAs).toContain("moved-out");
    // Nothing is left to decide on the rent day.
    const after = stepTo(moved, open.decidedOn);
    expect(
      decided(after, open.filedOn).filter(
        (event) => event.type !== RENT_EVENTS.movedOut,
      ),
    ).toHaveLength(0);
  });

  it("pays everything owed when the money is there, and the landlord drops the case that day", () => {
    const { world, player } = filed();
    const open = openEvictionCase(world, player)!;
    // Exactly what is owed: nothing is left for the coming month's rent.
    const funded = giveMoney(world, player, open.owedMinor);
    expect(optionKeys(funded, player)).toContain("pay-what-is-owed");
    const paid = choose(funded, player, "pay-what-is-owed");
    expect(rentOwedByLeaseholder(paid, player)).toBe(0);
    expect(openEvictionCase(paid, player)).toBeNull();
    expect(
      decided(paid, addDays(open.filedOn, -1)).map((event) => event.type),
    ).toEqual([RENT_EVENTS.dismissed]);
    // Missing the next month's rent does not revive the case.
    const after = stepTo(paid, open.decidedOn);
    expect(
      decided(after, open.filedOn).filter(
        (event) => event.type !== RENT_EVENTS.dismissed,
      ),
    ).toHaveLength(0);
  });
});

describe("how an eviction case is decided, with no roll", () => {
  const base: EvictionCaseFacts = {
    monthsBehind: 2,
    landlordPursues: true,
    tenantAnswers: true,
    lawyer: null,
    planCarried: null,
    judgeLean: 0,
    court: "Judge Ana Ruiz",
  };
  const outcome = (facts: Partial<EvictionCaseFacts>) =>
    decideEvictionCase({ ...base, ...facts }).outcome;

  it("reads each fact of the case", () => {
    // A landlord who does not follow through: the tenant stays.
    expect(outcome({ landlordPursues: false, tenantAnswers: false })).toBe(
      "settled",
    );
    // A tenant who does not answer loses by default.
    expect(outcome({ tenantAnswers: false, judgeLean: -1 })).toBe("evicted");
    // A lawyer keeps the home until the tenant is far behind; further
    // behind, only on a plan their pay can carry, before any judge.
    expect(outcome({ lawyer: "Bill 12" })).toBe("settled");
    const far = EVICTION.lawyerKeepsHomeUpTo + 1;
    expect(outcome({ lawyer: "Bill 12", monthsBehind: far })).toBe("evicted");
    expect(
      outcome({ lawyer: "Bill 12", monthsBehind: far, judgeLean: -1 }),
    ).toBe("evicted");
    expect(
      outcome({ lawyer: "Bill 12", monthsBehind: far, planCarried: true }),
    ).toBe("settled");
    // A plan the household's pay can carry is accepted; one it cannot is not.
    expect(outcome({ planCarried: true, judgeLean: 1 })).toBe("settled");
    expect(outcome({ planCarried: false })).toBe("evicted");
    // Answering alone: a conciliatory judge gives time to a tenant not far
    // behind, and no one else does.
    expect(outcome({ judgeLean: -1 })).toBe("settled");
    expect(outcome({ judgeLean: -1, monthsBehind: 3 })).toBe("evicted");
    expect(outcome({ judgeLean: null })).toBe("evicted");
  });

  it("names the court that ruled", () => {
    const decision = decideEvictionCase({ ...base, tenantAnswers: false });
    expect(decision.reason(base.court)).toBe(
      "the tenant did not answer the case, and Judge Ana Ruiz ruled for the landlord",
    );
  });
});
