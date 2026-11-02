/**
 * The revolving-door bar starts when a person leaves an office, never when a
 * term ends because the same person was seated on the next one. In a played
 * world (a random place from all 56, the bench's world with every module
 * installed) with a state lobbying ban in force, a town resident who stands
 * for their seat and wins again is not barred from lobbying while they serve;
 * the bar starts from the day they leave, and an incumbent the voters (or
 * their own choice) sent home is barred from the day the term ended. Both
 * halves read the offices engine's term records by id.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { lobbyingBarredUntil } from "./law-reach/group-a-voting";
import { reachParameter } from "./law-reach/group-a-records";
import { LOBBYING_BAN } from "./law-reach/voting-keys";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { enactLaw, lawChain } from "./modules/laws";
import {
  OFFICES_MODULE_ID,
  townSeats,
  vacateSeat,
  type TermRow,
} from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places drawn before the test gives up, and why each was passed over. */
const DRAWS = 10;

const plusYears = (iso: string, years: number) => {
  const date = new Date(Date.parse(`${iso}T00:00:00Z`));
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
};

/** The state's own yes on the ban, as the laws engine takes a law from a body. */
function enactBan(api: CoreAPI): string {
  const state = lawChain(api).levels.find((l) => l.level === "state");
  if (!state) throw new Error("The law chain has no state level");
  return enactLaw(api, {
    jurisdiction: state.jurisdiction,
    level: "state",
    series: LOBBYING_BAN,
    value: 1,
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: "lobbying-bar-reelection-test",
    citation: "Lobbying bar and re-election test",
  }).id;
}

it(`a resident re-elected to their seat is not barred from lobbying while they serve, and is from the day they leave (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "lobbying-bar-reelection");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core as CoreState;
    const api = coreAPI(core);
    const opened = core.date;
    const banId = enactBan(api);
    advanceCore(core, addDays(makeIsoDate(opened), 2));

    const town = lawChain(api).townPlaceId;
    const resident = (personId: string | null) =>
      personId !== null && api.state.people.get(personId)?.placeId === town;
    const seats = new Set(
      townSeats(api)
        .filter((s) => resident(s.holder?.personId ?? null))
        .map((s) => s.seat.id),
    );
    const election = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .filter((c) => seats.has(c.seatId))
      .map((c) => c.electionDate)
      .sort()[0];
    // A place whose first town election is past the end of its first year
    // would take a second year of play to reach: draw the next one.
    if (!election || election > `${opened.slice(0, 4)}-12-31`) {
      passed.push(
        `${where}: ${election ? `first resident election ${election}` : "no resident-held seat with an election"}`,
      );
      continue;
    }
    // Seated on the term's first day, some weeks after the count.
    advanceCore(core, addDays(makeIsoDate(election), 90));

    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
    const residents = terms.filter((t) => resident(t.personId));
    const endedInPlay = residents.filter(
      (t) => t.status === "ended" && t.endDate! > opened,
    );
    // The same person seated on the same office's next term that day.
    const successor = (old: TermRow) =>
      residents.find(
        (u) =>
          u.id !== old.id &&
          u.personId === old.personId &&
          u.officeId === old.officeId &&
          u.startDate === old.endDate &&
          u.status === "serving",
      );
    const reelected = endedInPlay
      .map((old) => ({ old, now: successor(old) }))
      .filter((r): r is { old: TermRow; now: TermRow } => !!r.now)
      .sort((a, b) => a.old.id.localeCompare(b.old.id));
    const gone = endedInPlay.filter((old) => !successor(old));
    if (!reelected.length) {
      passed.push(
        `${where}: ${endedInPlay.length} resident terms ended after ${election}, none of them re-seated`,
      );
      continue;
    }

    // While they serve: no bar for anyone seated again, and none for a
    // sitting holder whose service was opened with past terms (the world's
    // history is contiguous with the term they hold).
    for (const { old, now } of reelected)
      expect(
        lobbyingBarredUntil(api, now.personId!),
        `${where}: ${now.personId} re-seated on ${now.id} after ${old.id}`,
      ).toBeNull();
    const withHistory = residents.filter(
      (t) =>
        t.status === "serving" &&
        terms.some((u) => u.id.startsWith(`${t.id}:past:`)),
    );
    for (const t of withHistory)
      expect(
        lobbyingBarredUntil(api, t.personId!),
        `${where}: ${t.personId} serving on ${t.id} with past terms`,
      ).toBeNull();

    // The bar is the law in force: whoever left office in the same election
    // (lost, or did not stand) is barred for the cooling-off years, from the
    // day the term ended.
    const years = reachParameter("lobbyingCoolingOffYears");
    for (const old of gone) {
      const holdsAgain = residents.some(
        (u) =>
          u.personId === old.personId &&
          u.officeId === old.officeId &&
          u.status === "serving",
      );
      if (holdsAgain) continue;
      expect(
        lobbyingBarredUntil(api, old.personId!),
        `${where}: ${old.personId} left ${old.id} on ${old.endDate}`,
      ).toBe(plusYears(old.endDate!, years));
    }

    // Then the re-seated resident leaves through the offices engine's own
    // resignation a month later: the bar runs from that day, not from the
    // day the earlier term ended.
    const { old, now } = reelected[0]!;
    advanceCore(core, addDays(makeIsoDate(api.state.date), 30));
    expect(
      lobbyingBarredUntil(api, now.personId!),
      `${where}: ${now.personId} still serving ${now.id}`,
    ).toBeNull();
    const left = api.state.date;
    vacateSeat(api, now.seatId, "resigned");
    const ended = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .get(now.id) as unknown as TermRow;
    expect(ended.status, `${where}: ${now.id}`).toBe("ended");
    expect(ended.endDate, `${where}: ${now.id}`).toBe(left);
    const bar = lobbyingBarredUntil(api, now.personId!);
    expect(bar, `${where}: ${now.personId} left ${now.id} on ${left}`).toBe(
      plusYears(left, years),
    );
    expect(bar, `${where}: not counted from ${old.id}`).not.toBe(
      plusYears(old.endDate!, years),
    );

    process.stdout.write(
      `LOBBY-REELECT ${where}: ban ${banId}; town election ${election}; ${reelected.length} residents re-seated with no bar (e.g. ${old.id} -> ${now.id}); ${withHistory.length} sitting holders with past terms unbarred; ${gone.length} residents left (barred from the day each ended); ${now.personId} resigned ${left}, barred until ${bar}; passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place re-seated a resident in its first year: ${passed.join("; ")}`,
  );
}, 3_600_000);
