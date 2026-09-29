import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import type { NewGameSetup } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { advanceWorld } from "../world";
import { startValuesFromLatents } from "./kernel";
import { CRUNCH46_PROVISIONAL_POLICY } from "./policy";
import { ensureMacroEconomyStarted } from "./producer";
import {
  CENTRAL_BANK_APPOINTED_EVENT,
  CENTRAL_BANK_PROFILE,
  CENTRAL_BANK_RATE_EVENT,
  RESERVE_BANKS,
  chooseCentralBankRate,
  holdCentralBankMeeting,
  votingReserveBanks,
} from "./central-bank";
import {
  RECESSION_BEGAN_EVENT,
  RECESSION_ENDED_EVENT,
  recordBusinessCycle,
} from "./cycle";
import type { MacroGrowthDrivers } from "./credit";
import { monthKeyOf } from "./store";
import type { MacroMonthRecord } from "./types";

const registry = createCampaignElectionTransitionRegistry();

/** A life whose economy starts from a controlled near-reference record. */
function started(seed: string): World {
  const setup: NewGameSetup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: "nebraska",
    startAge: 34,
    questionnaire: "skipped" as const,
  };
  delete (setup as { worldOpeningVersion?: unknown }).worldOpeningVersion;
  const world = generateOpeningLife(prepareOpeningLife(setup)).game!.world;
  const latents = { cycle: 0, cost: 0, housing: 0, credit: 0 };
  return ensureMacroEconomyStarted(world, {
    contractVersion: "crunch46-macro-start/v1",
    policyVersion: "crunch46-provisional-v1",
    regime: "near-reference",
    volatilityScale:
      CRUNCH46_PROVISIONAL_POLICY.volatilityScale["near-reference"],
    latents,
    initial: startValuesFromLatents("near-reference", latents),
    effectiveDate: world.currentDate,
  });
}

const tagValue = (tags: readonly string[], prefix: string) =>
  tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);

describe("Build 19: the central bank is people", { timeout: 900_000 }, () => {
  const later = advanceWorld(started("b19-central-bank"), 100, registry);
  const bank = later.macroEconomy!.centralBank!;

  it("seats seven governors and a chair, each a person with a recorded view", () => {
    expect(bank.seats).toHaveLength(CENTRAL_BANK_PROFILE.seats);
    const people = bank.seats.map((seat) => seat!.personId);
    expect(new Set(people).size).toBe(CENTRAL_BANK_PROFILE.seats);
    for (const personId of people) expect(later.people[personId]).toBeDefined();
    expect(people).toContain(bank.chair!.personId);
    const appointed = later.history.events.filter(
      (event) => event.type === CENTRAL_BANK_APPOINTED_EVENT,
    );
    // Seven governors, the chair, and the twelve reserve bank presidents.
    expect(appointed).toHaveLength(
      CENTRAL_BANK_PROFILE.seats + 1 + RESERVE_BANKS.length,
    );
    for (const event of appointed)
      expect(tagValue(event.tags, "view:inflation-lean:")).toBeDefined();
    expect(bank.presidents).toHaveLength(RESERVE_BANKS.length);
    expect(bank.presidents!.map((seat) => seat!.bank)).toEqual(
      RESERVE_BANKS.map((row) => row.key),
    );
  });

  it("votes with the twelve: the governors, New York and four presidents in rotation", () => {
    expect(votingReserveBanks(2026)).toEqual([
      "new-york",
      "philadelphia",
      "cleveland",
      "dallas",
      "minneapolis",
    ]);
    expect(votingReserveBanks(2027)).toEqual([
      "new-york",
      "richmond",
      "chicago",
      "atlanta",
      "san-francisco",
    ]);
    const meeting = later.history.events
      .filter((event) => event.type === CENTRAL_BANK_RATE_EVENT)
      .at(-1)!;
    const year = Number(tagValue(meeting.tags, "month:")!.slice(0, 4));
    const voters = new Set([
      ...bank.seats.map((seat) => seat!.personId),
      ...bank
        .presidents!.filter((seat) =>
          votingReserveBanks(year).includes(seat!.bank),
        )
        .map((seat) => seat!.personId),
    ]);
    expect(voters.size).toBe(12);
    expect([...meeting.involvedEntityIds].sort()).toEqual([...voters].sort());
  });

  it("meets in its meeting months and sets the rate from what the members decided", () => {
    const meetings = later.history.events.filter(
      (event) => event.type === CENTRAL_BANK_RATE_EVENT,
    );
    expect(meetings.length).toBeGreaterThan(0);
    for (const meeting of meetings) {
      const month = Number(tagValue(meeting.tags, "month:")!.slice(5, 7));
      expect(CENTRAL_BANK_PROFILE.meetingMonths).toContain(month);
      expect(meeting.participants[0]!.role).toBe("agency:actor");
      expect(meeting.summary).toMatch(/central bank's board/);
    }
    const last = meetings.at(-1)!;
    expect(bank.policyRate.basis).toBe("modeled-decision");
    expect(bank.policyRate.decisionEventId).toBe(last.id);
    const mid = (bank.policyRate.lowerPct + bank.policyRate.upperPct) / 2;
    expect(Number(tagValue(last.tags, "rate-mid:"))).toBeCloseTo(mid, 6);
    // The national month reads the rate the board set.
    const national = later.macroEconomy!.months.filter(
      (month) => month.scope === "national",
    );
    expect(national.at(-1)!.credit).toBeDefined();
    expect(national.at(-1)!.drivers).toBeDefined();
  });

  it("never decides for a player who chairs the board", () => {
    const controlled =
      later.control.kind === "person" ? later.control.personId : null;
    expect(controlled).not.toBeNull();
    expect(() => chooseCentralBankRate(later, "raise-quarter")).toThrow(
      /Only the board's chair/,
    );
    const store = later.macroEconomy!;
    const seats = store.centralBank!.seats.map((seat, index) =>
      index === 0 ? { ...seat!, personId: controlled! } : seat,
    );
    const chaired: World = {
      ...later,
      macroEconomy: {
        ...store,
        centralBank: {
          ...store.centralBank!,
          seats,
          chair: { ...store.centralBank!.chair!, personId: controlled! },
        },
      },
    };
    const untouched = holdCentralBankMeeting(chaired, "2999-01");
    const held = untouched.history.events.at(-1)!;
    expect(held.type).toBe(CENTRAL_BANK_RATE_EVENT);
    expect(held.tags).toContain("proposal:hold");
    expect(held.tags).toContain("decision:hold");
    expect(held.participants[0]!.personId).toBe(controlled);

    const chosen = chooseCentralBankRate(chaired, "raise-quarter");
    const proposed = holdCentralBankMeeting(chosen, "2999-03");
    const meeting = proposed.history.events.at(-1)!;
    expect(meeting.tags).toContain("proposal:raise-quarter");
    expect(proposed.macroEconomy!.centralBank!.chairChoice).toBeNull();
  });

  it("round-trips through Save/Continue and carries on", () => {
    const reopened = deserializeWorld(serializeWorld(later));
    expect(reopened.macroEconomy!.centralBank).toEqual(bank);
    const a = advanceWorld(reopened, 70, registry);
    const b = advanceWorld(later, 70, registry);
    expect(JSON.stringify(a.macroEconomy)).toBe(JSON.stringify(b.macroEconomy));
  });

  it("a save whose months carry no credit record starts one at its next month", () => {
    const store = later.macroEconomy!;
    const withoutCredit = (month: MacroMonthRecord): MacroMonthRecord => {
      const copy: {
        -readonly [K in keyof MacroMonthRecord]?: MacroMonthRecord[K];
      } = { ...month };
      delete copy.credit;
      delete copy.drivers;
      return copy as MacroMonthRecord;
    };
    const old: World = {
      ...later,
      macroEconomy: { ...store, months: store.months.map(withoutCredit) },
    };
    const resumed = advanceWorld(old, 40, registry);
    const national = resumed.macroEconomy!.months.filter(
      (month) => month.scope === "national",
    );
    expect(national.at(-1)!.credit).toBeDefined();
    expect(national.at(-1)!.drivers).toBeDefined();
  });
});

describe(
  "Build 19: a recession is recorded with its cause chain",
  { timeout: 900_000 },
  () => {
    const world = advanceWorld(started("b19-cycle"), 230, registry);

    /**
     * Rewrites the growth and drivers of the last national months in place,
     * keeping every recorded period, so the store stays valid.
     */
    function withLastMonths(
      base: World,
      rows: readonly { growthPct: number; drivers: MacroGrowthDrivers }[],
    ): World {
      const store = base.macroEconomy!;
      const national = store.months
        .map((month, index) => ({ month, index }))
        .filter(({ month }) => month.scope === "national")
        .slice(-rows.length);
      expect(national).toHaveLength(rows.length);
      const months = [...store.months];
      for (const [i, { month, index }] of national.entries())
        months[index] = { ...month, ...rows[i]! };
      return { ...base, macroEconomy: { ...store, months } };
    }
    const lastKey = (base: World) =>
      monthKeyOf(base.macroEconomy!.months.at(-1)!.periodStart);

    const falling: MacroGrowthDrivers = {
      trendPct: 2.4,
      carriedPp: -0.2,
      creditPp: -0.3,
      ratePp: -0.15,
      demandPp: -0.02,
      shocksPp: 0,
      chancePp: 0.05,
    };
    const rising: MacroGrowthDrivers = {
      ...falling,
      creditPp: 0.1,
      ratePp: 0.1,
      demandPp: 0.05,
    };

    it("names the causes that pulled output down and records the chain", () => {
      const shrinking = withLastMonths(
        world,
        Array.from({ length: 6 }, () => ({
          growthPct: -1.2,
          drivers: falling,
        })),
      );
      const recorded = recordBusinessCycle(shrinking, lastKey(shrinking));
      const onset = recorded.history.events.at(-1)!;
      expect(onset.type).toBe(RECESSION_BEGAN_EVENT);
      expect(onset.tags).toContain("cause:credit");
      expect(onset.tags).toContain("cause:policy-rate");
      // Too small a pull to count, and chance pushed the other way.
      expect(onset.tags).not.toContain("cause:lost-jobs");
      expect(onset.tags).not.toContain("cause:chance");
      expect(onset.summary).toMatch(/New lending fell behind/);
      expect(onset.summary).toMatch(/policy rate held spending back/);
      const chain = recorded.history.causalProcesses.at(-1)!;
      expect(chain.kind).toBe("economy:recession-onset");
      expect(chain.sourceEntityIds[0]).toBe(onset.id);
      expect(recorded.macroEconomy!.cycle).toMatchObject({
        phase: "recession",
        eventId: onset.id,
      });
      // Recorded once: reading the same shrinking months again starts nothing.
      const again = recordBusinessCycle(recorded, lastKey(recorded));
      expect(again).toBe(recorded);

      const recovered = withLastMonths(
        recorded,
        Array.from({ length: 3 }, () => ({ growthPct: 1.5, drivers: rising })),
      );
      const ended = recordBusinessCycle(recovered, lastKey(recovered));
      const end = ended.history.events.at(-1)!;
      expect(end.type).toBe(RECESSION_ENDED_EVENT);
      expect(end.tags).toContain(`cause-event:${onset.id}`);
      expect(end.summary).toMatch(/Unemployment peaked at/);
      expect(ended.macroEconomy!.cycle!.phase).toBe("expansion");
    });

    it("records nothing while output keeps growing", () => {
      const growing = withLastMonths(
        world,
        Array.from({ length: 6 }, () => ({ growthPct: 2, drivers: rising })),
      );
      expect(recordBusinessCycle(growing, lastKey(growing))).toBe(growing);
    });
  },
);
