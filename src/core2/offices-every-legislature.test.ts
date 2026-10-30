/**
 * U1 of the world-governing plan (docs/reports/world-governing-plan-2026-10-29.md),
 * under the CTO's ruling of Oct 29, 22:40 (OWNER-DECISIONS): every other place
 * in the session calendar data has its chambers, its governor and its
 * statewide executives as office rows with seats and serving terms from the
 * opening, written by the one writer `seatOutsideOffices`. Each holder is a
 * named official on the term row (`official:<term>`), not a full person: the
 * two-level rule fills one in only when the player meets or opens them. The
 * old 8-per-chamber sample of other legislatures is gone. Checked seat by
 * seat: every seat of every outside office is held once; a holder the roster
 * names no party for carries the research's; a term-limited state's
 * legislators' careers are capped by their own state's limit. After a played
 * year no outside holder has been filled in, and every other place's seat the
 * voting engine raced in the year through its one seat loop (its legislators,
 * its governor and its other statewide officers) is held by its race's
 * winner, at home in the office's own state. A winner of
 * another party is a new holder drawn from that state, and the town's law
 * reaches its own officeholders, never another place's.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { lawChain } from "./modules/laws";
import {
  isOutsideOffice,
  OFFICES_MODULE_ID,
  type TermRow,
} from "./modules/offices";
import { allOfficials, holderOf } from "./modules/officials";
import { racesOf, VOTING_MODULE_ID } from "./modules/voting";
import { targetsOf } from "./law-reach/group-a-records";
import { statePlaces } from "./electorate-places";
import { researchedHolderParty } from "./holder-parties";
import { POLICY_QUESTIONS } from "./policy-answers";
import { sessionPlaces } from "./state-session-calendar";
import partyCounts from "../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import research from "../../data/research/offices/state-offices.json" with { type: "json" };
import reachA from "./data/laws/reach-group-a-parameters.json" with { type: "json" };

const seed = process.env.GOVERNS_SEED ?? randomBytes(8).toString("hex");

interface Office {
  readonly id: string;
  readonly kind: string;
  readonly level: string;
  readonly jurisdiction: string;
  readonly coversTown: boolean;
  readonly elected: boolean;
  readonly termYears: number | null;
  readonly nextElectionYear?: number;
  readonly firstTermStart?: string;
}
interface Seat {
  readonly id: string;
  readonly officeId: string;
  readonly coversTown: boolean;
  readonly electionYear?: number;
}

const rosters = (
  partyCounts as unknown as {
    places: Record<
      string,
      Record<string, { seatParties?: Record<string, readonly unknown[]> }>
    >;
  }
).places;
const chambersRead = (
  research as unknown as {
    places: Record<
      string,
      { legislature?: { chambers?: { chamber: string; seats?: number }[] } }
    >;
  }
).places;
const TERM_LIMITS =
  "us-policy-positions:government-operations.legislative-term-limits";
const termLimitYears = (
  reachA as unknown as { parameters: Record<string, { value: number }> }
).parameters.termLimitYears!.value;
const year = (date: string) => Number(date.slice(0, 4));

it(`every other place's chambers, governor and statewide executives sit as named officials (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "offices-every-legislature");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const town = lawChain(api).stateKey;
  const opening = core.date;
  const servingOn = (seatId: string) =>
    offices
      .table("terms")
      .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[];
  const seatsOf = (officeId: string) =>
    offices.table("seats").query("byOffice", [officeId]) as unknown as Seat[];
  const others = sessionPlaces().filter((key) => key !== town);
  expect(others.length, where).toBe(55);
  const outside: Office[] = [];
  const lines: string[] = [];
  for (const key of others) {
    const own = offices
      .table("offices")
      .query("byJurisdiction", [key]) as unknown as Office[];
    // Another place's own offices, never its seats in Congress.
    outside.push(...own.filter((o) => o.level !== "federal"));
    // A lower chamber, or the one chamber of a unicameral legislature.
    const chamber =
      own.find((o) => o.kind === "legislature-lower") ??
      own.find((o) => o.kind === "legislature-unicameral");
    expect(chamber, `${where}: ${key} has no lower chamber`).toBeDefined();
    const seats = seatsOf(chamber!.id);
    // Every rostered member has a seat; a district the roster lists no
    // member for (vacant when it was read) is a seat too. Where there is no
    // roster (a territory), the chamber's recorded size, at large.
    const roster =
      rosters[key]?.[
        chamber!.kind === "legislature-lower" ? "lower" : "legislature"
      ]?.seatParties;
    const rostered = roster
      ? Object.values(roster).reduce((n, members) => n + members.length, 0)
      : null;
    if (rostered !== null)
      expect(
        seats.length,
        `${where}: ${chamber!.id} seats against the roster's ${rostered} members`,
      ).toBeGreaterThanOrEqual(rostered);
    else {
      const size = chambersRead[key]?.legislature?.chambers?.find(
        (c) =>
          c.chamber ===
          (chamber!.kind === "legislature-lower" ? "lower" : "unicameral"),
      )?.seats;
      expect(size, `${where}: ${key} chamber size on record`).toBeDefined();
      expect(seats.length, `${where}: ${chamber!.id} at large`).toBe(size);
    }
    // The chief executive: the governor, or the mayor where the place has
    // no governor (D.C.).
    const executive =
      own.find((o) => o.kind === "governor") ??
      own.find((o) => o.kind === "mayor");
    expect(executive, `${where}: ${key} has no chief executive`).toBeDefined();
    lines.push(
      `${key}: ${chamber!.id} ${seats.length} seats (roster ${rostered ?? "none"}), ${servingOn(seatsOf(executive!.id)[0]!.id)[0]?.id}`,
    );
  }
  // Every outside office is another place's by the one test, covers no part
  // of the town, and each of its seats is held by exactly one serving term
  // (none where the office's law creates it after the opening).
  const outsideSeats = new Map<string, Office>();
  let seatCount = 0;
  for (const office of outside) {
    expect(isOutsideOffice(api, office), `${where}: ${office.id}`).toBe(true);
    expect(office.coversTown, `${where}: ${office.id}`).toBe(false);
    const created = Boolean(
      office.firstTermStart && office.firstTermStart > opening,
    );
    for (const seat of seatsOf(office.id)) {
      seatCount += 1;
      outsideSeats.set(seat.id, office);
      expect(seat.coversTown, `${where}: ${seat.id} covers the town`).toBe(
        false,
      );
      expect(
        servingOn(seat.id).length,
        `${where}: ${seat.id} serving terms`,
      ).toBe(created ? 0 : 1);
    }
  }
  // The town's own offices and the federal ones are never another place's.
  for (const office of offices.table("offices").rows() as unknown as Office[])
    if (office.level === "federal" || office.jurisdiction === town)
      expect(isOutsideOffice(api, office), `${where}: ${office.id}`).toBe(
        false,
      );
  // Every outside office's holders are named on their term, at home in the
  // office's own state, not full people, and in the party the research
  // reads for the seat where the roster names none.
  const outsideIds = new Set(outside.map((o) => o.id));
  const officeOf = new Map(outside.map((o) => [o.id, o]));
  const outsideTerms = () =>
    (
      offices
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[]
    ).filter((term) => outsideIds.has(term.officeId));
  const opened = outsideTerms();
  expect(opened.length, where).toBeGreaterThan(7_000);
  let researched = 0;
  let partyless = 0;
  for (const term of opened) {
    expect(term.personId, `${where}: ${term.id} filled in`).toBeNull();
    expect(
      term.identity.givenName.length > 0 && term.identity.familyName.length > 0,
      `${where}: ${term.id} has no name`,
    ).toBe(true);
    expect(term.identity.homeState, `${where}: ${term.id}`).toBe(
      officeOf.get(term.officeId)!.jurisdiction,
    );
    expect(core.people.has(`official:${term.id}`), term.id).toBe(false);
    const read = researchedHolderParty(
      term.identity.homeState,
      term.seatId,
      term.reached,
    );
    if (term.party === null) {
      partyless += 1;
      // No holder sits party-less where the research reads a party.
      expect(read?.party ?? null, `${where}: ${term.id} party unread`).toBe(
        null,
      );
    }
    if (term.partySource) {
      researched += 1;
      expect(term.partySource, `${where}: ${term.id}`).toBe(read?.partySource);
      expect(term.party, `${where}: ${term.id}`).toBe(read?.party ?? null);
    }
  }
  expect(
    researched,
    `${where}: no holder seated in the research's party`,
  ).toBeGreaterThan(0);
  // A term-limited state's legislators' careers are capped by that state's
  // own limit, not the town's.
  let capped = 0;
  for (const term of opened) {
    const office = officeOf.get(term.officeId)!;
    if (
      !office.kind.startsWith("legislature-") ||
      !office.termYears ||
      POLICY_QUESTIONS[TERM_LIMITS]?.answers[office.jurisdiction]?.answer !==
        "yes"
    )
      continue;
    capped += 1;
    const prior = Math.max(0, Math.ceil(termLimitYears / office.termYears) - 2);
    expect(
      year(term.startDate) - year(term.serviceStart ?? term.startDate),
      `${where}: ${term.id} served from ${term.serviceStart} in a term-limited state`,
    ).toBeLessThanOrEqual(prior * office.termYears);
  }
  expect(capped, `${where}: no term-limited state outside`).toBeGreaterThan(0);
  const officialsOutside = () =>
    allOfficials(api).filter((row) => outsideSeats.has(row.seatId));
  expect(
    officialsOutside().map((row) => row.id),
    `${where}: outside officials filled in at the opening`,
  ).toEqual([]);
  expect(
    allOfficials(api)
      .filter((row) => row.seatId.includes(":sample:"))
      .map((row) => row.id),
    `${where}: sample officials`,
  ).toEqual([]);

  // Every outside seat whose election falls in the year, read at the
  // opening, by the one seat rule the voting engine races every outside
  // seat by: the seat's own election year, else the office's cycle (a
  // legislator, the governor and every other statewide officer alike). A
  // place with no counted electorate (a territory) is not raced
  // (SG-GOV-territory-legislature-race), nor is an office elected without
  // party labels (SG-GOV-outside-nonpartisan-race).
  const opensIn = year(opening);
  const counted = new Map<string, boolean>();
  const isCounted = (key: string) => {
    if (!counted.has(key))
      counted.set(key, statePlaces(key.slice(3), api.state.seed).length > 0);
    return counted.get(key)!;
  };
  const up = outside.flatMap((office) => {
    if (!office.elected || !isCounted(office.jurisdiction)) return [];
    return seatsOf(office.id)
      .filter(
        (seat) =>
          (seat.electionYear ?? office.nextElectionYear) === opensIn &&
          researchedHolderParty(office.jurisdiction, seat.id, "elected")
            ?.party !== null,
      )
      .map((seat) => ({
        seat,
        office,
        before: servingOn(seat.id)[0] as TermRow | undefined,
      }));
  });
  const executivesUp = up.filter(
    ({ office }) => !office.kind.startsWith("legislature-"),
  );
  expect(
    executivesUp.filter(({ office }) => office.kind === "governor").length,
    `${where}: no outside governor up in ${opensIn}`,
  ).toBeGreaterThan(0);
  expect(
    executivesUp.filter(({ office }) => office.kind !== "governor").length,
    `${where}: no other outside statewide officer up in ${opensIn}`,
  ).toBeGreaterThan(0);
  advanceCore(core, addDays(opening, 365));

  // Nobody outside the town was filled in during the year, unless the
  // player met them.
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  const met = new Set<string>(player?.knownIds ?? []);
  const filled = [
    ...outsideTerms()
      .filter((term) => term.personId && !met.has(term.personId))
      .map((term) => term.id),
    ...officialsOutside()
      .filter((row) => !met.has(row.id))
      .map((row) => row.id),
  ];
  expect(filled, `${where}: filled in during the year`).toEqual([]);

  // Every such seat the voting engine raced is held by its race's winner,
  // at home in the office's own state; a re-elected holder is the same
  // person, a winner of another party a new one.
  const races = new Map(
    racesOf(api).map((race) => [race.seatId, race] as const),
  );
  // A term won in the year that begins just after it (a governor
  // inaugurated in late January): run on to the morning after the last.
  const lastSeating = up
    .map(({ seat }) => races.get(seat.id)?.seatedOn ?? "")
    .reduce((a, b) => (a > b ? a : b), "");
  if (lastSeating >= core.date)
    advanceCore(core, addDays(lastSeating as typeof core.date, 1));
  const seated: string[] = [];
  const changed: string[] = [];
  for (const { seat, office, before } of up) {
    const race = races.get(seat.id);
    expect(
      race,
      `${where}: ${seat.id} up in ${opensIn} was not raced`,
    ).toBeDefined();
    const [term] = servingOn(seat.id);
    expect(term, `${where}: ${seat.id} after ${race!.id}`).toBeDefined();
    expect(term!.party, `${where}: ${term!.id} from ${race!.id}`).toBe(
      race!.winnerParty,
    );
    expect(term!.reached, `${where}: ${term!.id} from ${race!.id}`).toBe(
      `elected ${race!.date}`,
    );
    expect(term!.identity.homeState, `${where}: ${term!.id}`).toBe(
      office.jurisdiction,
    );
    expect(term!.personId, `${where}: ${term!.id}`).toBeNull();
    seated.push(`${race!.id} -> ${term!.id} (${term!.party})`);
    if (before && term!.party === before.party)
      expect(term!.identity, `${where}: ${term!.id} re-elected`).toEqual(
        before.identity,
      );
    else
      changed.push(
        `${race!.id} -> ${term!.id} (${before?.party ?? "a new office"} to ${term!.party}, ${term!.identity.givenName} ${term!.identity.familyName} of ${term!.identity.homeState})`,
      );
  }
  const governorsSeated = seated.filter((line) => line.includes(":governor:"));
  expect(
    governorsSeated.length,
    `${where}: no outside governor seated by ${core.date}`,
  ).toBeGreaterThan(0);
  const executive = new Set(
    executivesUp
      .filter(({ office }) => office.kind !== "governor")
      .map(({ seat }) => seat.id),
  );
  const executivesSeated = seated.filter((line) =>
    executive.has(line.slice("race:".length).replace(/:\d{4} -> .*$/, "")),
  );
  expect(
    executivesSeated.length,
    `${where}: no other outside statewide officer seated by ${core.date}`,
  ).toBeGreaterThan(0);

  // A winner of another party on an outside seat: the voting engine's own
  // seat-winner work, given a race the incumbent's party lost (a fixture for
  // the edge a year may not produce), seats a new holder drawn from the
  // office's state, never the town's.
  const target = outside
    .filter(
      (o) => o.kind.startsWith("legislature-") && isCounted(o.jurisdiction),
    )
    .flatMap((o) => seatsOf(o.id).map((seat) => ({ seat, office: o })))
    .find(({ seat }) => servingOn(seat.id)[0]?.party);
  expect(target, `${where}: no outside seat with a party`).toBeDefined();
  const holder = servingOn(target!.seat.id)[0]!;
  const loser = holder.party!;
  const winner = /republican/i.test(loser) ? "Democratic" : "Republican";
  const raceDate = core.date;
  const raceId = `race:${target!.seat.id}:${raceDate}:fixture`;
  const seatDay = addDays(raceDate, 1);
  api
    .moduleState(VOTING_MODULE_ID)
    .table("races")
    .put({
      id: raceId,
      seatId: target!.seat.id,
      office: target!.office.kind,
      date: raceDate,
      incumbentParty: loser,
      lean: 0.5,
      winnerParty: winner,
      seatedOn: seatDay,
      leanSource: "fixture",
      resultId: raceId,
      offices: {
        seatId: target!.seat.id,
        officeId: target!.office.id,
        termYears: target!.office.termYears,
      },
    });
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `seat:${raceId}`,
    date: seatDay,
    kind: "seat-winner",
    source: {
      tag: "SOURCED",
      citation: `Result of ${raceId}`,
      asOf: raceDate,
    },
    sourceRecordIds: [raceId],
  });
  advanceCore(core, addDays(seatDay, 1));
  const [newcomer] = servingOn(target!.seat.id);
  expect(newcomer!.party, `${where}: ${raceId}`).toBe(winner);
  expect(newcomer!.reached, `${where}: ${newcomer!.id}`).toBe(
    `elected ${raceDate}`,
  );
  expect(newcomer!.identity.homeState, `${where}: ${newcomer!.id}`).toBe(
    target!.office.jurisdiction,
  );
  expect(newcomer!.identity, `${where}: ${newcomer!.id}`).not.toEqual(
    holder.identity,
  );
  expect(newcomer!.personId, `${where}: ${newcomer!.id}`).toBeNull();

  // The town's law reaches its own officeholders (its state's legislators,
  // whether or not their district covers the town), never another place's,
  // even one the player opened.
  const openedHolder = holderOf(api, newcomer!);
  expect(openedHolder.personId, `${where}: ${newcomer!.id} opened`).toBe(
    `official:${newcomer!.id}`,
  );
  const reached = new Set(
    targetsOf(api, {
      id: "every-officeholder",
      target: "officeholders",
      kind: "rule",
      what: "every officeholder",
      enforcer: "none",
      penalty: "none",
    }).map((t) => t.personId),
  );
  expect(
    reached.has(openedHolder.personId!),
    `${where}: ${openedHolder.personId} reached`,
  ).toBe(false);
  const ownLegislators = (
    offices
      .table("terms")
      .query("byStatus", ["serving"]) as unknown as TermRow[]
  ).filter((term) => {
    const office = offices.table("offices").get(term.officeId) as unknown as
      Office | undefined;
    return (
      office?.jurisdiction === town &&
      office.kind.startsWith("legislature-") &&
      term.personId !== null
    );
  });
  expect(ownLegislators.length, `${where}: own legislators`).toBeGreaterThan(0);
  for (const term of ownLegislators)
    expect(reached.has(term.personId!), `${where}: ${term.id}`).toBe(true);

  process.stdout.write(
    `EVERY-LEGISLATURE ${where}: ${opened.length} outside terms on ${seatCount} seats named at the opening (${researched} in the research's party, ${partyless} with no party), ${capped} capped by their own state's term limit, none filled in by ${core.date}; ${seated.length} of ${up.length} seats up in ${opensIn} seated by their race, e.g. ${[
      ...governorsSeated,
      ...executivesSeated,
      ...seated,
    ]
      .slice(0, 4)
      .join(
        "; ",
      )}; ${changed.length} changed party, e.g. ${changed.slice(0, 2).join("; ")}; fixture ${raceId} seated ${newcomer!.identity.givenName} ${newcomer!.identity.familyName} of ${newcomer!.identity.homeState}; ${ownLegislators.length} own legislators reached\n${lines.join("\n")}\n`,
  );
}, 3_600_000);
