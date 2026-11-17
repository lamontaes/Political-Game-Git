/**
 * Day one's state legislatures are the century's (owner, Nov 17, 2026, CTO line 6935086070 on
 * #9747: "Day one is whatever that history produced: who holds every office, party control"; the
 * PR 3b plan approved in CTO line 6937011121). Every legislative seat is elected in its own cycle
 * from 1925 on the one path with play: the played town's state seat by seat, every other state's
 * chambers as results. Every world is a drawn place (skill drawn-place-tests); each assertion
 * names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { partySide } from "./appointments";
import { setBookkeeping } from "./bookkeeping";
import {
  centuryLegislatures,
  centuryOf,
  setHistoryMode,
} from "./electorate-century";
import {
  legislativePlace,
  statePlaces,
  worldRoster,
} from "./electorate-places";
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";
import legislatureParties from "../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };

const RUN = `history-legislatures:${Date.now()}`;

const PUBLISHED = (
  legislatureParties as unknown as {
    places: Record<
      string,
      Record<string, { parties?: Record<string, number> } | undefined>
    >;
  }
).places;

/** Each state's chambers by Republican and Democratic seats after the century. */
function chambersOf(seed: string): Map<string, string> {
  const out = new Map<string, { r: number; d: number }>();
  for (const seat of centuryLegislatures(seed, gameStartDate()).values()) {
    const key = `${seat.stateKey}:${seat.rosterChamber}`;
    const count = out.get(key) ?? { r: 0, d: 0 };
    if (seat.side > 0) count.r += 1;
    else count.d += 1;
    out.set(key, count);
  }
  return new Map([...out].map(([key, c]) => [key, `${c.r}R-${c.d}D`]));
}

describe("the century elects day one's state legislatures", () => {
  it("seats the century's legislators in the town's state, and its roster and race places read the century, at three drawn places", () => {
    setBookkeeping(false);
    const passed: string[] = [];
    let worlds = 0;
    for (let i = 0; worlds < 3 && i < 12; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-legislatures");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const century = centuryOf(place.seed, gameStartDate());
      const legislatures = centuryLegislatures(place.seed, gameStartDate());
      const mine = [...legislatures.values()].filter((seat) => !seat.hidden);
      // A state whose chambers are not elected on the two national sides keeps its record.
      if (!mine.length) {
        passed.push(
          `${where}: its legislature is not elected on the two sides`,
        );
        continue;
      }
      // A place with no presidential vote (a territory) has no race places in play: its
      // legislative seats are not raced after day one (stopgap SG-GOV-territory-legislature-race).
      if (!statePlaces(place.state.slice(3), place.seed).length) {
        passed.push(
          `${where}: its seats are not raced in play (no counted places)`,
        );
        continue;
      }
      worlds += 1;
      expect(
        mine.every((seat) => seat.stateKey === place.state),
        `${where}: the seats counted one by one are the town's state's`,
      ).toBe(true);
      const api = coreAPI(world.core);
      const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
      let checked = 0;
      for (const row of api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[]) {
        const office = offices.get(row.officeId) as unknown as
          { kind: string; jurisdiction: string } | undefined;
        if (
          office?.jurisdiction !== place.state ||
          !office.kind.startsWith("legislature")
        )
          continue;
        const seat = legislatures.get(row.seatId);
        expect(seat, `${where}: ${row.seatId}`).toBeDefined();
        expect(partySide(row.party), `${where}: ${row.seatId}`).toBe(
          seat!.side,
        );
        checked += 1;
      }
      expect(checked, `${where}: the state's legislators`).toBe(mine.length);
      // Every engine's chambers (worldRoster) are the century's count.
      const roster = worldRoster(place.seed).places[place.state] ?? {};
      for (const [key, counted] of chambersOf(place.seed))
        if (key.startsWith(`${place.state}:`)) {
          const chamber = roster[key.slice(place.state.length + 1)];
          const r = Object.entries(chamber?.parties ?? {})
            .filter(([party]) => partySide(party) > 0)
            .reduce((sum, [, n]) => sum + n, 0);
          const d = Object.entries(chamber?.parties ?? {})
            .filter(([party]) => partySide(party) < 0)
            .reduce((sum, [, n]) => sum + n, 0);
          expect(`${r}R-${d}D`, `${where}: roster ${key}`).toBe(counted);
        }
      // The next race in a seat counts its district where the century left it, not at 2024.
      const seat = mine[0]!;
      const district = legislativePlace(
        place.state.slice(3),
        seat.key,
        mine.filter((s) => s.officeId === seat.officeId).length,
        seat.side,
        null,
        place.seed,
      );
      expect(district?.rightShare, `${where}: ${seat.key}`).toBe(
        century.districtLeans[seat.key],
      );
    }
    expect(
      worlds,
      `three drawn worlds whose legislatures the century elects; passed over: ${passed.join("; ") || "none"}`,
    ).toBe(3);
  }, 300_000);

  it("ends the century with different chambers in the same states in two drawn worlds, and elects only chambers on the two sides", () => {
    const a = drawPlace(`${RUN}:a`, "history-legislatures");
    const b = drawPlace(`${RUN}:b`, "history-legislatures");
    const where = `${a.name} (${a.key}), world seed ${a.seed}, and ${b.name} (${b.key}), world seed ${b.seed}`;
    setHistoryMode(a.seed, "century", gameStartDate(), a.state);
    setHistoryMode(b.seed, "century", gameStartDate(), b.state);
    // CTO line 6937011121, condition 2: no two races anyone can open print one winning share,
    // across Congress, the statewide offices and every legislature, in both worlds.
    for (const world of [a, b]) {
      const shares = new Map<number, string>();
      for (const seat of [
        ...centuryOf(world.seed, gameStartDate()).seats.values(),
        ...centuryLegislatures(world.seed, gameStartDate()).values(),
      ])
        for (const race of seat.races) {
          expect(
            shares.get(race.winnerShare),
            `${world.name} (${world.key}), world seed ${world.seed}: ${race.id}`,
          ).toBe(undefined);
          shares.set(race.winnerShare, race.id);
        }
    }
    const ca = chambersOf(a.seed);
    const cb = chambersOf(b.seed);
    // CTO line 6937011121, condition 1: the same outside state ends the century differently.
    const outside = [...ca.keys()].filter(
      (key) => !key.startsWith(`${a.state}:`) && !key.startsWith(`${b.state}:`),
    );
    const differ = outside.filter((key) => ca.get(key) !== cb.get(key));
    expect(
      differ.length * 2,
      `${where}: chambers that differ, of ${outside.length}: ${differ
        .slice(0, 8)
        .map((key) => `${key} ${ca.get(key)} and ${cb.get(key)}`)
        .join("; ")}`,
    ).toBeGreaterThan(outside.length);
    // A chamber most of whose published members belong to no national side is not counted.
    for (const key of ca.keys()) {
      const [stateKey, chamber] = key.split(":") as [string, string];
      const parties = PUBLISHED[stateKey]?.[chamber]?.parties ?? {};
      const all = Object.values(parties).reduce((sum, n) => sum + n, 0);
      const sided = Object.entries(parties)
        .filter(([party]) => partySide(party) !== 0)
        .reduce((sum, [, n]) => sum + n, 0);
      expect(
        sided * 2,
        `${where}: ${key}, published ${JSON.stringify(parties)}`,
      ).toBeGreaterThan(all);
    }
  }, 120_000);
});
