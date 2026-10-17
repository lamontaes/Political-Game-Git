import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { candidateIdentity } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { electionResults } from "./results";
import { buildBenchWorld } from "./world";

// Election night names every candidate from the records, a drawn challenger
// included, through the voting module's own reader (no repeat of its draw).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it("names every candidate on election night by the voting module's reader", () => {
  setBookkeeping(false);
  let named = 0;
  let drawn = 0;
  const where: string[] = [];
  for (let attempt = 0; attempt < 4 && drawn === 0; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "election-night-names");
    where.push(`${place.name} [${place.key}] seed ${place.seed}`);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 420));
    for (const race of electionResults(core, playerId ?? core.playerId!)) {
      for (const candidate of race.candidates) {
        const who = candidateIdentity(api, candidate.id);
        expect(who, `${where.at(-1)} ${candidate.id}`).not.toBeNull();
        expect(candidate.name, `${where.at(-1)} ${candidate.id}`).toBe(
          `${who!.givenName} ${who!.familyName}`,
        );
        expect(candidate.name).not.toMatch(/^official:/);
        named += 1;
        if (who!.kind === "drawn") drawn += 1;
      }
    }
  }
  expect(named, where.join("; ")).toBeGreaterThan(0);
}, 900_000);
