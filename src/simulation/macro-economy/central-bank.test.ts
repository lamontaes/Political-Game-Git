import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import type { NewGameSetup } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { advanceWorld, recordWorldEvent } from "../world";
import { startValuesFromLatents } from "./kernel";
import { CRUNCH46_PROVISIONAL_POLICY } from "./policy";
import { ensureMacroEconomyStarted } from "./producer";
import {
  CENTRAL_BANK_APPOINTED_EVENT,
  CENTRAL_BANK_NOMINATED_EVENT,
  CENTRAL_BANK_PROFILE,
  CENTRAL_BANK_RATE_EVENT,
  RESERVE_BANKS,
  chooseCentralBankRate,
  ensureCentralBankSeated,
  ensureReserveBankPresidents,
  holdCentralBankMeeting,
  stepCentralBankSeats,
  votingReserveBanks,
} from "./central-bank";
import { currentPresidentOf } from "../crisis/offices";
import { addDays } from "../dates";
import { federalColleaguesOf } from "../patronage/federal-circle";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { recordRelationshipInteraction } from "../records";
import type { MacroMonthRecord } from "./types";

const registry = createCampaignElectionTransitionRegistry();

/** A life whose economy starts from a controlled near-reference record. */
function started(seed: string, placeKey = "nebraska"): World {
  const setup: NewGameSetup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey,
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
  let later: World;
  let bank: NonNullable<NonNullable<World["macroEconomy"]>["centralBank"]>;
  function initialize() {
    if (later) return;
    later = advanceWorld(started("b19-central-bank"), 100, registry);
    bank = later.macroEconomy!.centralBank!;
  }

  it("seats seven governors and a chair, each a person with a recorded view", () => {
    initialize();
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
    initialize();
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
    initialize();
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

  it("the President names the chair from the sitting governors by a recorded decision, not a draw", () => {
    initialize();
    const president = currentPresidentOf(later)!.personId;
    expect(later.control).not.toMatchObject({ personId: president });
    const store = later.macroEconomy!;
    const vacant: World = {
      ...later,
      macroEconomy: {
        ...store,
        centralBank: {
          ...store.centralBank!,
          chair: null,
          openings: [
            {
              office: "chair",
              seat: 0,
              since: addDays(
                later.currentDate,
                -CENTRAL_BANK_PROFILE.daysFromVacancyToNomination,
              ),
            },
          ],
        },
      },
    };
    const next = stepCentralBankSeats(vacant);
    const nominated = next.history.events.at(-1)!;
    expect(nominated.type).toBe(CENTRAL_BANK_NOMINATED_EVENT);
    const nominee = nominated.participants[1]!.personId;
    expect(bank.seats.map((seat) => seat!.personId)).toContain(nominee);
    const trace = next.history.decisionTraces.find(
      (row) =>
        row.context.decisionType === "appointment.choose-appointee" &&
        row.context.actorPersonId === president &&
        !later.history.decisionTraces.includes(row),
    );
    expect(trace?.selectedOptionKey).toBe(`person:${nominee}`);
  });

  it("never names a sitting member of Congress to the board, even one who helped the President", () => {
    initialize();
    const president = currentPresidentOf(later)!.personId;
    const members = federalColleaguesOf(later).filter(
      (id) =>
        !currentStateExecutiveHolders(later).some((row) => row.personId === id),
    );
    expect(members.length).toBeGreaterThan(0);
    const helper = members[0]!;
    const known = recordRelationshipInteraction(later, {
      stableKey: "test:member-helped-president",
      personIds: [helper, president],
      eventId: null,
      occurredAt: later.currentDate,
      kind: "support:helped-through-a-hard-time",
      change: "strengthened",
      significance: "major",
      summary: "One helped the other through a hard time.",
      tags: [`relationship.actor:${String(helper)}`],
    });
    const store = known.macroEconomy!;
    const vacant: World = {
      ...known,
      macroEconomy: {
        ...store,
        centralBank: {
          ...store.centralBank!,
          openings: [
            {
              office: "governor",
              seat: 0,
              since: addDays(
                later.currentDate,
                -CENTRAL_BANK_PROFILE.daysFromVacancyToNomination,
              ),
            },
          ],
        },
      },
    };
    const next = stepCentralBankSeats(vacant);
    const nominations = next.history.events
      .slice(vacant.history.events.length)
      .filter((event) => event.type === CENTRAL_BANK_NOMINATED_EVENT);
    for (const nominated of nominations)
      expect(members).not.toContain(nominated.participants[1]!.personId);
    // A President who knows nobody else who may serve leaves the seat open,
    // as real boards have sat with seats empty for years; no draw fills it.
    if (nominations.length === 0)
      expect(next.macroEconomy!.centralBank!.openings).toContainEqual(
        vacant.macroEconomy!.centralBank!.openings[0],
      );
  });

  it("never decides for a player who chairs the board", () => {
    initialize();
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
    initialize();
    const reopened = deserializeWorld(serializeWorld(later));
    expect(reopened.macroEconomy!.centralBank).toEqual(bank);
    const a = advanceWorld(reopened, 70, registry);
    const b = advanceWorld(later, 70, registry);
    expect(JSON.stringify(a.macroEconomy)).toBe(JSON.stringify(b.macroEconomy));
  });

  it("a save whose months carry no credit record starts one at its next month", () => {
    initialize();
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

describe("A65: new members remain undecided without a recorded view", () => {
  const seed = "a65-undecided-bank-members";
  const place = drawRandomPlace(seed);
  const rate = {
    lowerPct: CRUNCH46_PROVISIONAL_POLICY.baseline.policyRateRangePct.lower,
    upperPct: CRUNCH46_PROVISIONAL_POLICY.baseline.policyRateRangePct.upper,
    basis: "retained-reference" as const,
    decisionEventId: null,
  };
  const seated = (world: World) =>
    ensureReserveBankPresidents(ensureCentralBankSeated(world, rate));

  it("seats identical absent leans under two seeds, without claiming a balanced opinion", () => {
    const a = seated(started(`${seed}:a`, place.key));
    const b = seated(started(`${seed}:b`, place.key));
    const leans = (world: World) => {
      const bank = world.macroEconomy!.centralBank!;
      return [...bank.seats, ...bank.presidents!].map(
        (seat) => seat!.inflationLean,
      );
    };
    expect(leans(a)).toHaveLength(19);
    expect(leans(a)).toEqual(Array.from({ length: 19 }, () => null));
    expect(leans(b)).toEqual(leans(a));
    for (const world of [a, b]) {
      const appointments = world.history.events.filter(
        (event) => event.type === CENTRAL_BANK_APPOINTED_EVENT,
      );
      expect(appointments).toHaveLength(20);
      for (const event of appointments) {
        expect(event.tags).toContain("view:inflation-lean:null");
        expect(event.summary).toContain(
          "has not formed a view on prices versus jobs",
        );
        expect(event.summary).not.toContain("weighs prices and jobs evenly");
      }
    }
    console.info(
      `A65 controlled bank record: ${place.displayName} (${place.key}), ${seed}:a / ${seed}:b`,
    );
  });

  it("preserves absent and legacy numeric views through a meeting and Save/Continue", () => {
    const world = seated(started(`${seed}:saved`, place.key));
    const store = world.macroEconomy!;
    const bank = store.centralBank!;
    const legacy: World = {
      ...world,
      macroEconomy: {
        ...store,
        centralBank: {
          ...bank,
          seats: bank.seats.map((seat, index) =>
            index === 0 ? { ...seat!, inflationLean: 2 } : seat,
          ),
        },
      },
    };
    const reopened = deserializeWorld(serializeWorld(legacy));
    expect(reopened.macroEconomy!.centralBank).toEqual(
      legacy.macroEconomy!.centralBank,
    );
    const meeting = holdCentralBankMeeting(reopened, "2026-01");
    expect(meeting.history.events.at(-1)!.type).toBe(CENTRAL_BANK_RATE_EVENT);
    expect(meeting.history.events.at(-1)!.involvedEntityIds).toHaveLength(12);
    expect(meeting.macroEconomy!.centralBank!.seats[0]!.inflationLean).toBe(2);
    expect(
      meeting.macroEconomy!.centralBank!.seats[1]!.inflationLean,
    ).toBeNull();
    expect(holdCentralBankMeeting(meeting, "2026-01")).toBe(meeting);
    const continued = deserializeWorld(serializeWorld(meeting));
    expect(continued.macroEconomy!.centralBank).toEqual(
      meeting.macroEconomy!.centralBank,
    );
  });

  it("seats a reserve-bank successor without inventing a view", () => {
    const world = seated(started(`${seed}:successor`, place.key));
    const store = world.macroEconomy!;
    const bank = store.centralBank!;
    const prior = bank.presidents![0]!;
    const opened: World = {
      ...world,
      macroEconomy: {
        ...store,
        centralBank: {
          ...bank,
          presidents: bank.presidents!.map((seat, index) =>
            index === 0 ? null : seat,
          ),
          presidentOpenings: [
            { bank: prior.bank, since: addDays(world.currentDate, -180) },
          ],
        },
      },
    };
    const successor = stepCentralBankSeats(opened);
    const replacement = successor.macroEconomy!.centralBank!.presidents![0]!;
    expect(replacement.personId).not.toBe(prior.personId);
    expect(successor.people[replacement.personId]).toBeDefined();
    expect(replacement.inflationLean).toBeNull();
    expect(
      successor.history.events.find(
        (event) => event.id === replacement.appointedEventId,
      )!.tags,
    ).toContain("view:inflation-lean:null");
  });

  it("confirms a governor without inventing a view", () => {
    const world = seated(started(`${seed}:confirmed`, place.key));
    const presidentId = world.personOrder[0]!;
    const recorded = recordWorldEvent(world, {
      stableKey: "a65-controlled-president-tenure",
      type: "world.office-tenure",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [presidentId],
      participants: [
        { personId: presidentId, role: "focus:subject", detail: "President" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["office:us-president"],
      summary: "Controlled appointment test: a president holds office.",
      context: {
        placeLabel: null,
        eventFamily: "world.office-tenure",
        occasion: null,
        immediateReaction: null,
      },
    });
    expect(currentPresidentOf(recorded)!.personId).toBe(presidentId);
    const store = recorded.macroEconomy!;
    const bank = store.centralBank!;
    const nomineeId = bank.presidents![0]!.personId;
    const nominated: World = {
      ...recorded,
      macroEconomy: {
        ...store,
        centralBank: {
          ...bank,
          nominations: [
            {
              office: "governor",
              seat: 0,
              nomineeId,
              presidentId,
              nominatedAt: world.currentDate,
              confirmationDue: world.currentDate,
              eventId: recorded.history.events.at(-1)!.id,
            },
          ],
        },
      },
    };
    const confirmed = stepCentralBankSeats(nominated);
    const governor = confirmed.macroEconomy!.centralBank!.seats[0]!;
    expect(governor.personId).toBe(nomineeId);
    expect(governor.inflationLean).toBeNull();
    const event = confirmed.history.events.find(
      (row) => row.id === governor.appointedEventId,
    )!;
    expect(event.tags).toContain("basis:confirmed");
    expect(event.tags).toContain("view:inflation-lean:null");
  });

  it("seats an ordinary random opening's bank without changing its generated macro evidence", () => {
    const openingSeed = `${seed}:ordinary`;
    const world = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: openingSeed,
        placeKey: place.key,
        startAge: 34,
        questionnaire: "skipped",
      }),
    ).game!.world;
    expect(world.macroEconomy).toBeDefined();
    const bankWorld = seated(world);
    expect(bankWorld.macroEconomy!.start).toEqual(world.macroEconomy!.start);
    expect(bankWorld.macroEconomy!.centralBank!.seats).toHaveLength(7);
    expect(bankWorld.macroEconomy!.centralBank!.presidents).toHaveLength(12);
    for (const member of [
      ...bankWorld.macroEconomy!.centralBank!.seats,
      ...bankWorld.macroEconomy!.centralBank!.presidents!,
    ])
      expect(member!.inflationLean).toBeNull();
    const meeting = holdCentralBankMeeting(bankWorld, "2026-01");
    const event = meeting.history.events.at(-1)!;
    expect(event.type).toBe(CENTRAL_BANK_RATE_EVENT);
    expect(event.involvedEntityIds).toHaveLength(12);
    expect(
      deserializeWorld(serializeWorld(meeting)).macroEconomy!.centralBank,
    ).toEqual(meeting.macroEconomy!.centralBank);
    const withoutMacro = { ...world };
    delete (withoutMacro as { macroEconomy?: unknown }).macroEconomy;
    expect(ensureCentralBankSeated(withoutMacro, rate)).toBe(withoutMacro);
    console.info(
      `A65 ordinary opening and direct bank handler: ${place.displayName} (${place.key}), ${openingSeed}; ${world.personOrder.length} opening people; 19 undecided bank members; 12 meeting participants; generated macro evidence preserved.`,
    );
  });
});
