/**
 * The player is offered one race of each local body, and only while its
 * filing is open (owner, v0.73.0 playtest, Nov 1: "it just gives me the
 * choice of a bunch of council seats. No, I should only be able to run for
 * one council seat"; pool item campaign-player-files-for-one-council-race,
 * under the CTO's town council seats ruling). For each local body the player
 * may run for, on a day its filing is open: one seat of its district seats
 * (the home's district), and the at-large race once; the clerk's counter
 * (`playerContests`) and Campaigns (`localRaces`) offer the same races; no
 * race is offered outside its filing window; and once the player has filed
 * in one of the body's races, none of its others is offered.
 *
 * Places drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins it).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  fileCandidacy,
  filingWindowOpen,
  filingWindowOpens,
  playerContests,
  playerMayFileForKind,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { localRaces } from "./government";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ELECTIONS = "core2-elections-v1";
const OFFICES = "core2-offices-v1";
const LOCAL = new Set(["city", "township", "county"]);
const DRAWS = 8;

interface Office {
  readonly id: string;
  readonly kind: string;
  readonly level: string;
  readonly coversTown: boolean;
}
interface Seat {
  readonly id: string;
  readonly officeId: string;
  readonly district: string | null;
}

/** The town's own local offices, as the offices table indexes them. */
function townLocalOffices(core: CoreState): readonly Office[] {
  return (
    coreAPI(core)
      .moduleState(OFFICES)
      .table("offices")
      .query("byTown", [true]) as unknown as Office[]
  ).filter((o) => LOCAL.has(o.level));
}

/** Checks every local body the player may run for on today's date; returns what it read. */
function checkDay(core: CoreState, where: string): string[] {
  const api = coreAPI(core);
  const today = core.date;
  const playerId = core.playerId!;
  const local = townLocalOffices(core);
  const localKinds = local.map((o) => o.kind);
  const seats = new Map(
    (api.moduleState(OFFICES).table("seats").rows() as unknown as Seat[]).map(
      (s) => [s.id, s],
    ),
  );
  const contests = api
    .moduleState(ELECTIONS)
    .table("contests")
    .rows() as unknown as ContestRow[];
  const offered = playerContests(api);
  const offeredIds = new Set(offered.map((c) => c.id));
  // Nothing outside its filing window is offered.
  for (const c of offered)
    expect(
      filingWindowOpen(c, today),
      `${where}: ${c.id} offered on ${today} outside ${filingWindowOpens(c)} to ${c.filingDeadline}`,
    ).toBe(true);
  // Campaigns offers to file exactly where the clerk does, among local races.
  const campaigns = localRaces(core);
  for (const race of campaigns.races)
    expect(
      race.playerMayFile,
      `${where}: Campaigns and the clerk on ${race.contestId}`,
    ).toBe(offeredIds.has(race.contestId));
  const read: string[] = [];
  for (const office of local) {
    if (!playerMayFileForKind(office.kind, localKinds)) continue;
    const open = contests.filter(
      (c) => c.officeId === office.id && filingWindowOpen(c, today),
    );
    for (const date of new Set(open.map((c) => c.electionDate))) {
      const day = open.filter((c) => c.electionDate === date);
      const district = day.filter((c) => seats.get(c.seatId)?.district);
      const atLarge = day.filter((c) => !seats.get(c.seatId)?.district);
      const mine = day.filter((c) => offeredIds.has(c.id));
      const label = `${where}: ${office.id} on ${date} (${district.length} district, ${atLarge.length} at-large seats open)`;
      // One of its district seats, and the at-large race once.
      expect(
        mine.filter((c) => seats.get(c.seatId)?.district).length,
        `${label}: district seats offered`,
      ).toBe(district.length ? 1 : 0);
      expect(
        mine.filter((c) => !seats.get(c.seatId)?.district).length,
        `${label}: at-large races offered`,
      ).toBe(atLarge.length ? 1 : 0);
      read.push(
        `${office.kind} ${date}: ${district.length} district + ${atLarge.length} at-large open, offered ${mine.map((c) => c.seatId).join(", ")}`,
      );
      // Filed in one, the body's other races that day are not offered.
      const pick = mine[0];
      if (!pick) continue;
      const filed = fileCandidacy(api, {
        personId: playerId,
        contestId: pick.id,
        platform: [],
        party: null,
      });
      if (filed.status === "refused") {
        read.push(
          `  ${pick.id}: the filing was refused (${filed.unmet.map((u) => u.rule).join(", ")})`,
        );
        continue;
      }
      const after = new Set(playerContests(api).map((c) => c.id));
      for (const other of day.filter((c) => c.id !== pick.id))
        expect(
          after.has(other.id),
          `${label}: ${other.id} offered after filing ${filed.filing.id}`,
        ).toBe(false);
      read.push(`  filed ${filed.filing.id}; none of the others offered`);
    }
  }
  return read;
}

it(`the player is offered one race of each local body, only while its filing is open (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "one-council-race");
      const where = `${place.name} (${place.key}), seed ${seed}:${draw}, world seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      if (!core.playerId) {
        tried.push(`${where}: no player`);
        continue;
      }
      // The first day a local race the player could run for opens to filing.
      const api = coreAPI(core);
      const local = townLocalOffices(core);
      const localKinds = local.map((o) => o.kind);
      const eligible = new Set(
        local
          .filter((o) => playerMayFileForKind(o.kind, localKinds))
          .map((o) => o.id),
      );
      const first = (
        api
          .moduleState(ELECTIONS)
          .table("contests")
          .rows() as unknown as ContestRow[]
      )
        .filter(
          (c) => eligible.has(c.officeId) && c.filingDeadline >= core.date,
        )
        .map((c) => filingWindowOpens(c))
        .sort()[0];
      if (!first) {
        tried.push(`${where}: no local race the player could run for`);
        continue;
      }
      // Before it opens, none of its races is offered.
      const before = checkDay(core, where);
      if (first > core.date) advanceCore(core, makeIsoDate(first));
      const lines = checkDay(core, where);
      if (!lines.length) {
        tried.push(`${where}: no local race open to file on ${core.date}`);
        continue;
      }
      console.log(
        `one council race: ${where}, ${core.date}\n  ${[...before.map((l) => `(opening) ${l}`), ...lines].join("\n  ")}`,
      );
      return;
    }
    throw new Error(`No drawn place opened a local race: ${tried.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
