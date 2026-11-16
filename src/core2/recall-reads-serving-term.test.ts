/**
 * A recall or misconduct check reads the term an official serves now, not the term their id was
 * minted from (pool item elections-recall-reads-ended-term): in a played world of a place drawn from
 * all 56, a town seat's named official is re-elected and `termOf` answers with the new serving term.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { termOf } from "./modules/recalls";
import {
  OFFICES_MODULE_ID,
  seatTerm,
  servingTermsOf,
  townSeats,
  type TermRow,
} from "./modules/offices";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe("recall checks read the serving term", () => {
  for (const salt of ["a", "b"]) {
    const seed = `${base}-${salt}`;
    it(
      `a re-elected official's id resolves to the new term (seed ${seed})`,
      { timeout: 300_000 },
      () => {
        setBookkeeping(false);
        const draw = drawPlace(seed, "recall-serving-term");
        const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
        const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: draw.key,
        });
        const api = coreAPI(core);
        const held = townSeats(api).find(
          (s) => s.holder?.personId && s.office.level !== "federal",
        );
        expect(held, where).toBeTruthy();
        const opening = held!.holder as unknown as TermRow;
        const memberId = `official:${opening.id}`;
        expect(termOf(api, memberId)?.id, where).toBe(opening.id);
        // Re-elected: the opening term ends and a new term serves on the same seat.
        const next = seatTerm(api, {
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
        const ended = api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .get(opening.id) as unknown as TermRow;
        expect(ended.status, where).toBe("ended");
        const found = termOf(api, memberId);
        expect(found?.id, `${where}: the check reads the serving term`).toBe(
          next.id,
        );
        expect(found?.status, where).toBe("serving");
        expect(
          servingTermsOf(api, opening.personId).map((t) => t.id),
          where,
        ).toContain(found!.id);
      },
    );
  }
});
