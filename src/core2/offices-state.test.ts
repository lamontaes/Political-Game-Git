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
import { buildBenchWorld } from "../bench/world";
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
