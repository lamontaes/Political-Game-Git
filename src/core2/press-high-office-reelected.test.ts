/**
 * The press desk's public figures by office (pool item words-reelected-official-reads-ended-term): in a
 * played world of a place drawn from all 56, a federal or state official named by the term they were
 * first seated on is still held to their office after a re-election ends that term.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { holdsHighOffice } from "./press-desk";
import { seatTerm, townSeats, type TermRow } from "./modules/offices";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

for (const salt of ["a", "b"]) {
  const seed = `${base}-${salt}`;
  it(
    `a re-elected high official still holds high office (seed ${seed})`,
    { timeout: 300_000 },
    () => {
      setBookkeeping(false);
      const draw = drawPlace(seed, "press-high-office");
      const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const held = townSeats(api).find(
        (s) => s.holder?.personId && s.office.level === "federal",
      );
      expect(held, where).toBeTruthy();
      const opening = held!.holder as unknown as TermRow;
      const id = `official:${opening.id}`;
      expect(holdsHighOffice(api, id), `${where}: serving`).toBe(true);
      // Re-elected: the opening term ends and a new term serves on the same seat.
      seatTerm(api, {
        seatId: opening.seatId,
        officeId: opening.officeId,
        personId: opening.personId,
        identity: opening.identity,
        party: opening.party,
        startDate: core.date,
        endDate: null,
        endEstimated: true,
        reached: "re-elected",
        endsServingBecause: "re-elected",
      });
      expect(
        holdsHighOffice(api, id),
        `${where}: a re-elected official holds their office`,
      ).toBe(true);
    },
  );
}
