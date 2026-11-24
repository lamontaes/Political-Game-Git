/**
 * The century's parties (owner, Nov 17, 2026, CTO lines 6935508228 and 6935528569 on #9747:
 * "parties emerge and change through each world's own history, and each one can be described from
 * its own records"; History's family 9 plan, PR 9a). Each party stands where the members it holds
 * in Congress stand, after every even November, so its position moves with its own seats and
 * differs between worlds. Every world is a drawn place (skill drawn-place-tests); each assertion
 * names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  centuryOf,
  centuryStateVote,
  setHistoryMode,
} from "./electorate-century";
import { partyKeyIssues } from "./electorate-century-laws";
import { gameStartDate } from "./game-start";
import {
  PARTIES_MODULE_ID,
  openParties,
  stateParties,
  type TieRow,
} from "./modules/parties";
import campaignParameters from "./data/campaigns/parameters.json" with { type: "json" };
import { setBookkeeping } from "./bookkeeping";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { stanceLean } from "./officials-roster";

const RUN = `history-parties:${Date.now()}`;

describe("the century's parties stand where their members stand", () => {
  it("records each party's position after every even November, on its own side, moving with its seats, and different between drawn worlds", () => {
    const lastPositions: string[] = [];
    const named: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-parties");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      named.push(where);
      setHistoryMode(place.seed, "century", gameStartDate(), place.state);
      const century = centuryOf(place.seed, gameStartDate());
      expect(century.parties.map((p) => p.side).sort(), where).toEqual([-1, 1]);
      const evens = century.congresses.length;
      for (const party of century.parties) {
        // One position per Congress, on the party's own side of the scale.
        expect(party.positions, `${where}: ${party.id}`).toHaveLength(evens);
        for (const row of party.positions)
          expect(
            Math.sign(row.position),
            `${where}: ${party.id} ${row.year}`,
          ).toBe(party.side);
        // It moves with the seats it holds: never one figure for a hundred years.
        expect(
          new Set(party.positions.map((row) => row.position.toFixed(4))).size,
          `${where}: ${party.id}'s positions`,
        ).toBeGreaterThan(1);
        // Its record names the issues it stands on.
        const other = century.parties.find((p) => p.side !== party.side)!;
        expect(
          partyKeyIssues(
            party.positions.at(-1)!.position,
            other.positions.at(-1)!.position,
            3,
          ),
          `${where}: ${party.id}'s key issues`,
        ).toHaveLength(3);
      }
      lastPositions.push(
        century.parties
          .map((p) => p.positions.at(-1)!.position.toFixed(4))
          .join(","),
      );
    }
    expect(
      new Set(lastPositions).size,
      `day one's party positions across ${named.join("; ")}`,
    ).toBeGreaterThan(1);
  }, 120_000);

  it("gives each state the century's parties, at their shares of its last presidential count, at drawn worlds", () => {
    const shares: string[] = [];
    const named: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const place = drawPlace(`${RUN}:state:${i}`, "history-parties");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      named.push(where);
      setHistoryMode(place.seed, "century", gameStartDate(), place.state);
      const counted = centuryStateVote(place.seed, place.state);
      if (!counted) continue;
      const century = centuryOf(place.seed, gameStartDate());
      const parties = stateParties(place.state, place.seed);
      // The century's parties, not the 2024 ballot's labels, each at its share of the count.
      expect(parties.map((p) => p.name).sort(), where).toEqual(
        century.parties.map((p) => p.name).sort(),
      );
      for (const party of parties) {
        const side = century.parties.find((p) => p.name === party.name)!.side;
        expect(party.share, `${where}: ${party.name}`).toBe(
          side > 0 ? counted.republicanShare : 1 - counted.republicanShare,
        );
        expect(party.source, `${where}: ${party.name}`).toContain(counted.id);
      }
      shares.push(parties.map((p) => p.share.toFixed(6)).join(","));
    }
    expect(shares.length, named.join("; ")).toBeGreaterThan(1);
    expect(
      new Set(shares).size,
      `state party shares across ${named.join("; ")}`,
    ).toBe(shares.length);
  }, 120_000);
  it("ties each adult to the party their own lean reaches toward, so how many take a party follows the world's parties, at drawn worlds", () => {
    setBookkeeping(false);
    const reach = (
      campaignParameters as unknown as {
        parameters: Record<string, { value: number }>;
      }
    ).parameters["partyIdentityReach"]!.value;
    const shares: string[] = [];
    const named: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const place = drawPlace(`${RUN}:ties:${i}`, "history-parties");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      named.push(where);
      const core = createLifeCore(
        buildPopulation({
          seed: place.seed,
          placeKey: place.key,
          startedAt: gameStartDate(),
          minimumPeople: 200,
        }),
      );
      setHistoryMode(core.seed, "century", gameStartDate(), place.state);
      openLaws(core);
      openOffices(core, core.seed, core.date);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      const api = coreAPI(core);
      const at: Record<number, number> = {};
      for (const party of centuryOf(core.seed, gameStartDate()).parties)
        at[party.side] = stanceLean(party.positions.at(-1)!.position);
      // A side with a party in this place (a place with no party labels has none).
      const sides = new Set(
        (
          api
            .moduleState(PARTIES_MODULE_ID)
            .table("parties")
            .rows() as unknown as {
            side: number;
          }[]
        ).map((row) => row.side),
      );
      const ties = api
        .moduleState(PARTIES_MODULE_ID)
        .table("ties")
        .rows() as unknown as TieRow[];
      const adults = ties.filter((t) => t.personId !== core.playerId);
      expect(adults.length, where).toBeGreaterThan(50);
      for (const t of adults) {
        const side = Math.sign(t.lean);
        const reaches =
          side !== 0 &&
          sides.has(side) &&
          at[side] !== undefined &&
          Math.abs(t.lean) >= reach * Math.abs(at[side]!);
        // A party exactly when their own lean reaches toward its position.
        expect(t.tie === "party", `${where}: ${t.personId} at ${t.lean}`).toBe(
          reaches,
        );
      }
      shares.push(
        (
          adults.filter((t) => t.tie === "party").length / adults.length
        ).toFixed(4),
      );
    }
    // No fixed share: the count follows each world's people and parties.
    expect(
      new Set(shares).size,
      `party shares ${shares.join(", ")} across ${named.join("; ")}`,
    ).toBeGreaterThan(1);
  }, 180_000);
});
