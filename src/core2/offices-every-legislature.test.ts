/**
 * U1 of the world-governing plan (docs/reports/world-governing-plan-2026-10-29.md),
 * under the CTO's ruling of Oct 29, 22:40 (OWNER-DECISIONS): every other place
 * in the session calendar data has its chambers, its governor and its
 * statewide executives as office rows with seats and serving terms from the
 * opening, written by the one writer `seatOutsideOffices`. Each holder is a
 * named official on the term row (`official:<term>`), not a full person: the
 * two-level rule fills one in only when the player meets or opens them. The
 * old 8-per-chamber sample of other legislatures is gone. After a played
 * year no outside holder has been filled in, and every other place's seat
 * the voting engine raced in the year is held by its race's winner, at home
 * in the office's own state.
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
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { allOfficials } from "./modules/officials";
import { racesOf } from "./modules/voting";
import { sessionPlaces } from "./state-session-calendar";
import partyCounts from "../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import research from "../../data/research/offices/state-offices.json" with { type: "json" };

const seed = process.env.GOVERNS_SEED ?? randomBytes(8).toString("hex");

interface Office {
  readonly id: string;
  readonly kind: string;
  readonly jurisdiction: string;
  readonly coversTown: boolean;
  readonly elected: boolean;
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
  const year = Number(opening.slice(0, 4));
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
    outside.push(...own);
    // A lower chamber, or the one chamber of a unicameral legislature.
    const chamber =
      own.find((o) => o.kind === "legislature-lower") ??
      own.find((o) => o.kind === "legislature-unicameral");
    expect(chamber, `${where}: ${key} has no lower chamber`).toBeDefined();
    expect(chamber!.coversTown, `${where}: ${chamber!.id}`).toBe(false);
    const seats = seatsOf(chamber!.id);
    const held = seats.flatMap((seat) => servingOn(seat.id));
    // Every seat is held, once.
    expect(held.length, `${where}: ${chamber!.id} serving terms`).toBe(
      seats.length,
    );
    expect(
      seats.every((seat) => !seat.coversTown),
      `${where}: ${chamber!.id} seats cover the town`,
    ).toBe(true);
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
    const head = seatsOf(executive!.id).flatMap((seat) => servingOn(seat.id));
    expect(head.length, `${where}: ${executive!.id} held`).toBe(1);
    lines.push(
      `${key}: ${chamber!.id} ${held.length}/${seats.length} (roster ${rostered ?? "none"}), ${head[0]!.id}`,
    );
  }
  // Every outside office's holders are named on their term, at home in the
  // office's own state, and not full people.
  const outsideIds = new Set(outside.map((o) => o.id));
  const jurisdictionOf = new Map(outside.map((o) => [o.id, o.jurisdiction]));
  const outsideTerms = () =>
    (
      offices
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[]
    ).filter((term) => outsideIds.has(term.officeId));
  const opened = outsideTerms();
  expect(opened.length, where).toBeGreaterThan(7_000);
  for (const term of opened) {
    expect(term.personId, `${where}: ${term.id} filled in`).toBeNull();
    expect(
      term.identity.givenName.length > 0 && term.identity.familyName.length > 0,
      `${where}: ${term.id} has no name`,
    ).toBe(true);
    expect(term.identity.homeState, `${where}: ${term.id}`).toBe(
      jurisdictionOf.get(term.officeId),
    );
    expect(core.people.has(`official:${term.id}`), term.id).toBe(false);
  }
  const outsideSeats = new Set(
    outside.flatMap((o) => seatsOf(o.id).map((s) => s.id)),
  );
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

  // The seats whose election falls in the year, read at the opening.
  const up = outside.flatMap((office) =>
    office.elected && office.kind.startsWith("legislature-")
      ? seatsOf(office.id)
          .filter((seat) => seat.electionYear === year)
          .map((seat) => ({ seat, office }))
      : [],
  );
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
  // at home in the office's own state.
  const races = new Map(
    racesOf(api).map((race) => [race.seatId, race] as const),
  );
  const seated: string[] = [];
  for (const { seat, office } of up) {
    const race = races.get(seat.id);
    expect(race, `${where}: ${seat.id} up in ${year} was not raced`).toBeDefined();
    if (race!.seatedOn > core.date) continue;
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
  }
  expect(up.length, `${where}: no outside seat up in ${year}`).toBeGreaterThan(
    0,
  );
  expect(seated.length, `${where}: no raced seat seated by ${core.date}`).toBeGreaterThan(0);
  process.stdout.write(
    `EVERY-LEGISLATURE ${where}: ${opened.length} outside terms named at the opening, none filled in by ${core.date}; ${seated.length} of ${up.length} seats up in ${year} seated by their race, e.g. ${seated
      .slice(0, 3)
      .join("; ")}\n${lines.slice(0, 5).join("\n")}\n`,
  );
}, 3_600_000);
