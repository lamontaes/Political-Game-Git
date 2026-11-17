/**
 * Each official's district and state lean is where the century's last count left them (owner,
 * Nov 17, 2026; CTO lines 6935086070 and 6936902133 on #9747, family 8, pin officials.ts:327):
 * in a world whose day one is the century's, a member of the House or a state legislature reads
 * the century's last count in their district, and every official reads their state's, never the
 * 2024 result. Every world is a drawn place (skill drawn-place-tests); each assertion names it and
 * its seed.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { centurySignedLean, setHistoryMode } from "./electorate-century";
import { gameStartDate } from "./game-start";
import { createLifeCore } from "./life";
import { allOfficials, openOfficials } from "./modules/officials";
import { openOffices } from "./modules/offices";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

const RUN = `officials-century-leans:${Date.now()}`;

it("seats every official on the century's last count in their district and state, at drawn worlds", () => {
  setBookkeeping(false);
  const days: string[] = [];
  const named: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const place = drawPlace(`${RUN}:${i}`, "officials-century-leans");
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
    openOffices(core, core.seed, core.date);
    openOfficials(core);
    let states = 0,
      districts = 0;
    const leans: string[] = [];
    for (const row of allOfficials(coreAPI(core))) {
      const state = centurySignedLean(core.seed, row.stateKey);
      if (state !== undefined) {
        states += 1;
        expect(row.stateLean, `${where}: ${row.id} (${row.body})`).toBe(state);
      }
      const district =
        row.bodyKind === "legislature"
          ? centurySignedLean(core.seed, row.stateKey, { seatId: row.seatId })
          : row.bodyKind === "us-house" && row.district !== null
            ? centurySignedLean(core.seed, row.stateKey, {
                usps: row.stateKey.slice(3),
                houseCode: /^\d+$/.test(row.district) ? row.district : "0",
              })
            : undefined;
      if (district === undefined) continue;
      districts += 1;
      expect(row.districtLean, `${where}: ${row.id} (${row.seatId})`).toBe(
        district,
      );
      expect(row.leanSource, `${where}: ${row.id}`).toContain("century");
      leans.push(`${row.seatId}=${district.toFixed(6)}`);
    }
    expect(
      states,
      `${where}: officials on a century state lean`,
    ).toBeGreaterThan(0);
    expect(
      districts,
      `${where}: officials on a century district lean`,
    ).toBeGreaterThan(0);
    days.push(leans.sort().join(","));
  }
  expect(
    new Set(days).size,
    `day one's district leans across ${named.join("; ")}`,
  ).toBe(days.length);
}, 180_000);
