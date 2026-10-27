/**
 * An office its law creates after the game opens exists only from its first
 * term (pool item gov-offices-office-seated-before-it-exists): no holder, no
 * past term and no official before then, and its first election fills it.
 * The offices come from the research rows of all 56 places; the played world
 * is a locality drawn in a place that has one. Set OFFICE_LATER_SEED to
 * reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import stateOfficeResearch from "../../data/research/offices/state-offices.json" with { type: "json" };
import partyCounts from "../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import {
  OFFICES_MODULE_ID,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import { OFFICIALS_MODULE_ID } from "./modules/officials";
import { VOTING_MODULE_ID } from "./modules/voting";
import { stateOffices } from "./offices-state";
import { placeLocalities, placeStateKeys } from "./places";
import { coreAPI } from "./state";

const seed = process.env.OFFICE_LATER_SEED ?? randomBytes(8).toString("hex");
const places = (
  stateOfficeResearch as unknown as {
    places: Record<
      string,
      { executives?: { key: string; firstTermStart?: string }[] }
    >;
  }
).places;
/** Every office the research says begins after the opening, by place. */
const later = Object.entries(places).flatMap(([stateKey, place]) =>
  (place.executives ?? [])
    .filter((row) => row.firstTermStart && row.firstTermStart > gameStartDate())
    .map((row) => ({ stateKey, key: row.key, start: row.firstTermStart! })),
);

it("carries each later office's first-term start from its research row, in all 56 places", () => {
  expect([...placeStateKeys()].length).toBe(56);
  expect(later.length, "an office created after the opening").toBeGreaterThan(
    0,
  );
  for (const stateKey of placeStateKeys()) {
    const offices = stateOffices(stateKey, "", gameStartDate());
    for (const { office } of offices) {
      const row = later.find(
        (l) => l.stateKey === stateKey && office.kind === l.key,
      );
      expect(office.firstTermStart, `${office.id}`).toBe(row?.start);
    }
  }
});

it(`seats no one in an office before its first term, and puts its seat on its first election (seed ${seed})`, () => {
  const pick =
    later[parseInt(stableHash(seed).slice(0, 8), 16) % later.length]!;
  const localities = [...placeLocalities(pick.stateKey)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  const locality =
    localities[
      parseInt(stableHash(`${seed}:place`).slice(0, 8), 16) % localities.length
    ]!;
  const where = `${locality.displayName} (${locality.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: locality.key,
  });
  const api = coreAPI(core);
  const officeId = `office:${pick.stateKey}:${pick.key}`;
  const seatId = `seat:${pick.stateKey}:${pick.key}`;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  expect(
    offices.table("offices").get(officeId),
    `${where}: ${officeId}`,
  ).toBeDefined();
  const terms = offices.table("terms").rows() as unknown as TermRow[];
  expect(
    terms.filter((t) => t.officeId === officeId).map((t) => t.id),
    `${where}: terms of ${officeId} before ${pick.start}`,
  ).toEqual([]);
  const officials = api
    .moduleState(OFFICIALS_MODULE_ID)
    .table("officials")
    .rows() as unknown as { id: string; seatId: string }[];
  expect(
    officials.filter((o) => o.seatId === seatId).map((o) => o.id),
    `${where}: officials of ${seatId}`,
  ).toEqual([]);
  // Its first election, before its first term, with no incumbent.
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).find((c) => c.seatId === seatId);
  expect(contest, `${where}: a contest for ${seatId}`).toBeDefined();
  expect(contest!.incumbentTermId, `${where}: ${contest!.id}`).toBeNull();
  expect(contest!.electionDate < pick.start, `${where}: ${contest!.id}`).toBe(
    true,
  );
  // The last regular election before the first term, not merely the next.
  const research = (places[pick.stateKey]!.executives ?? []).find(
    (row) => row.key === pick.key,
  ) as { nextRegularElectionYear?: number } | undefined;
  if (research?.nextRegularElectionYear)
    expect(contest!.electionDate.slice(0, 4), `${where}: ${contest!.id}`).toBe(
      String(research.nextRegularElectionYear),
    );
  // Played through its first term's start: the election's winner holds it,
  // or, with no one elected, the office's vacancy rule fills it from that
  // result (an office no one holds has no one to hold over).
  advanceCore(core, addDays(makeIsoDate(pick.start), 7));
  const result = api
    .moduleState(VOTING_MODULE_ID)
    .table("results")
    .rows()
    .find((r) => r.contestId === contest!.id) as unknown as
    { id: string; winnerId: string | null } | undefined;
  expect(result, `${where}: the result of ${contest!.id}`).toBeDefined();
  const first = (offices.table("terms").rows() as unknown as TermRow[]).filter(
    (t) => t.officeId === officeId,
  );
  expect(first.length, `${where}: terms of ${officeId}`).toBe(1);
  expect(first[0]!.startDate, `${where}: ${first[0]!.id}`).toBe(pick.start);
  let filledBy: string;
  if (result!.winnerId) {
    expect(first[0]!.personId, `${where}: ${first[0]!.id}`).toBe(
      result!.winnerId,
    );
    filledBy = `won by ${result!.winnerId} per ${result!.id}`;
  } else {
    const vacancy = (
      offices.table("vacancies").rows() as unknown as VacancyRow[]
    ).find((v) => v.seatId === seatId);
    expect(vacancy?.cause, `${where}: the vacancy after ${result!.id}`).toBe(
      result!.id,
    );
    expect(vacancy!.since, `${where}: ${vacancy!.id}`).toBe(pick.start);
    expect(vacancy!.filledBy, `${where}: ${vacancy!.id}`).toBe(first[0]!.id);
    filledBy = `empty per ${result!.id}, so ${vacancy!.id} was filled by ${first[0]!.reached}`;
  }
  console.info(
    `office-later ${where}: ${officeId} has no term or official before ${pick.start}; its first election is ${contest!.id}, ${filledBy}; its first term is ${first[0]!.id} from ${first[0]!.startDate}`,
  );
}, 1_800_000);

it(`keeps an office's generated history from its first term on, when the game opens on or after it (seed ${seed})`, () => {
  const pick =
    later[parseInt(stableHash(seed).slice(0, 8), 16) % later.length]!;
  const localities = [...placeLocalities(pick.stateKey)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  const locality =
    localities[
      parseInt(stableHash(`${seed}:place`).slice(0, 8), 16) % localities.length
    ]!;
  const officeId = `office:${pick.stateKey}:${pick.key}`;
  setBookkeeping(false);
  // The day the office's first term begins, and a later opening two years on.
  const later2 = `${Number(pick.start.slice(0, 4)) + 2}${pick.start.slice(4)}`;
  for (const opening of [pick.start, later2]) {
    const where = `${locality.displayName} (${locality.key}), seed ${seed}, opening ${opening}`;
    const { core } = buildBenchWorld(seed, makeIsoDate(opening), {
      twoLevel: true,
      placeKey: locality.key,
    });
    const terms = (
      coreAPI(core)
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[]
    ).filter((t) => t.officeId === officeId);
    expect(terms.length, `${where}: ${officeId} is held`).toBeGreaterThan(0);
    for (const t of terms) {
      expect(
        t.startDate >= pick.start,
        `${where}: ${t.id} starts ${t.startDate}, before ${pick.start}`,
      ).toBe(true);
      expect(
        (t.serviceStart ?? t.startDate) >= pick.start,
        `${where}: ${t.id} service from ${t.serviceStart}, before ${pick.start}`,
      ).toBe(true);
    }
    console.info(
      `office-later ${where}: ${terms.map((t) => `${t.id} from ${t.startDate} (service ${t.serviceStart})`).join("; ")}`,
    );
  }
}, 600_000);

interface Chamber {
  readonly chamber: string;
  readonly seats?: number;
}
const legislatures = (
  stateOfficeResearch as unknown as {
    places: Record<string, { legislature?: { chambers?: Chamber[] } }>;
  }
).places;
const rosters = (
  partyCounts as unknown as {
    places: Record<
      string,
      Record<string, { seatParties: Record<string, string[]> }>
    >;
  }
).places;

/**
 * A chamber's seats against its legal size and its roster: every roster
 * member sits in exactly one seat, a district with no member on the roster
 * is one empty seat, and where the roster seats the legal size the chamber
 * has exactly that many seats (no district seated twice under two names).
 */
function chamberCheck(
  stateKey: string,
  kind: string,
  seats: readonly SeatLike[],
) {
  const key = kind.replace("legislature-", "");
  const chambers = legislatures[stateKey]?.legislature?.chambers ?? [];
  const legal = (
    key === "unicameral" ? chambers[0] : chambers.find((c) => c.chamber === key)
  )?.seats;
  const roster =
    rosters[stateKey]?.[key === "unicameral" ? "legislature" : key]
      ?.seatParties ?? {};
  const members = Object.values(roster).reduce((n, m) => n + m.length, 0);
  const empty = seats.filter(
    (s) => s.party === null && !Object.hasOwn(roster, s.district),
  );
  return { legal, members, seats: seats.length, empty: empty.length };
}
interface SeatLike {
  readonly id: string;
  readonly district: string;
  readonly party?: string | null;
}

it("seats each chamber at its legal size, every roster member once, in all 56 places", () => {
  const disagree: string[] = [];
  let checked = 0;
  for (const stateKey of placeStateKeys()) {
    for (const { office, seats } of stateOffices(
      stateKey,
      "",
      gameStartDate(),
    )) {
      if (!office.kind.startsWith("legislature-")) continue;
      const c = chamberCheck(stateKey, office.kind, seats);
      // Every member the roster seats is in one seat, no more.
      expect(c.seats - c.empty, `${office.id}: roster members`).toBe(c.members);
      if (c.legal === undefined) continue;
      // A chamber with no roster (a territory's) seats its legal size empty.
      const consistent =
        !c.members || c.members + c.empty === c.legal || c.members === c.legal;
      if (consistent) {
        expect(c.seats, `${office.id}: legal size`).toBe(c.legal);
        checked += 1;
      } else {
        // Where the roster itself holds a different number of members than
        // the legal size, the data disagree (gov-legislature-roster-size-data).
        disagree.push(`${office.id} ${c.seats}/${c.legal}`);
      }
    }
  }
  process.stdout.write(
    `chambers checked against their legal size: ${checked}; whose roster disagrees with it: ${disagree.length} (${disagree.join(", ")})\n`,
  );
  // The check ran on chambers; it is not vacuous.
  expect(checked, "chambers checked").toBeGreaterThan(0);
  // The four chambers whose roster data still disagree with the legal size
  // (gov-legislature-roster-size-data): a new disagreement fails here, and
  // fixing one of these in the data takes it off this list.
  expect(disagree, "rosters that disagree with the legal size").toEqual([
    "office:US-ME:legislature-lower 153/151",
    "office:US-NH:legislature-lower 386/400",
    "office:US-PR:legislature-upper 28/27",
    "office:US-PR:legislature-lower 53/51",
  ]);
});

it(`a played world seats its state's legislature by the same rule (seed ${seed})`, () => {
  const place = drawPlace(seed, "legislature-seats");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const offices = coreAPI(core).moduleState(OFFICES_MODULE_ID);
  const chambers = (
    offices.table("offices").rows() as unknown as {
      id: string;
      jurisdiction: string;
      kind: string;
    }[]
  ).filter((o) => o.kind.startsWith("legislature-"));
  expect(chambers.length, where).toBeGreaterThan(0);
  for (const chamber of chambers) {
    const seats = offices
      .table("seats")
      .query("byOffice", [chamber.id]) as unknown as SeatLike[];
    const c = chamberCheck(chamber.jurisdiction, chamber.kind, seats);

    expect(c.seats - c.empty, `${where}: ${chamber.id}`).toBe(c.members);
    // A chamber with no roster (a territory's) seats its legal size empty.
    if (!c.members || c.members + c.empty === c.legal || c.members === c.legal)
      expect(c.seats, `${where}: ${chamber.id}`).toBe(c.legal);
    console.info(
      `legislature seats: ${where}: ${chamber.id} ${c.seats} of ${c.legal}, e.g. ${seats[0]?.id}`,
    );
  }
}, 600_000);
