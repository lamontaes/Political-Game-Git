/**
 * Members of Congress are drawn around where their own party stands in the world's history (owner,
 * Nov 17, 2026; CTO lines 6935508228 and 6936902133 on #9747, family 9, pin officials-roster.ts:224):
 * in a world whose day one is the century's, each party's members in the House and the Senate sit
 * around the century party's day-one position, not the 119th Congress's. Each party's mean is
 * checked within four standard errors of its members' own spread. Every world is a drawn place
 * (skill drawn-place-tests); each assertion names it and its seed.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { centuryParties, setHistoryMode } from "./electorate-century";
import { gameStartDate } from "./game-start";
import { createLifeCore } from "./life";
import { allOfficials, openOfficials } from "./modules/officials";
import { openOffices } from "./modules/offices";
import { partySide } from "./appointments";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

const RUN = `officials-century-parties:${Date.now()}`;

it("draws each party's members of Congress around the century party's day-one position, at drawn worlds", () => {
  setBookkeeping(false);
  for (let i = 0; i < 3; i += 1) {
    const place = drawPlace(`${RUN}:${i}`, "officials-century-parties");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
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
    const parties = centuryParties(core.seed)!;
    const officials = allOfficials(coreAPI(core));
    for (const body of ["us-house", "us-senate"] as const)
      for (const party of parties) {
        const position = party.positions.at(-1)!.position;
        const ideals = officials
          .filter(
            (o) =>
              o.bodyKind === body &&
              !o.independent &&
              partySide(o.party) === party.side,
          )
          .map((o) => o.ideal);
        expect(ideals.length, `${where}: ${body} ${party.id}`).toBeGreaterThan(
          10,
        );
        const mean = ideals.reduce((a, b) => a + b, 0) / ideals.length;
        const sd = Math.sqrt(
          ideals.reduce((a, b) => a + (b - mean) ** 2, 0) / ideals.length,
        );
        expect(
          Math.abs(mean - position),
          `${where}: ${body} ${party.id} members' mean ${mean.toFixed(3)} against the party's ${position.toFixed(3)}`,
        ).toBeLessThan((4 * sd) / Math.sqrt(ideals.length));
      }
  }
}, 180_000);
