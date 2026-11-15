// @vitest-environment node
/**
 * A state's estate and inheritance taxes are its own, owed beside the
 * federal estate tax: a state with none has none in force, and a bill that
 * creates one at 16 percent raises it from nothing. Before, a state with no
 * row read the federal 40 percent as its own, so the same bill weighed as a
 * cut. Pinned: Nathrop, Colorado, a state with neither tax.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { billValueInForce } from "./laws-bill-values";
import { lawInForce } from "./modules/laws";
import { provisionStance } from "./modules/legislature";
import { coreAPI } from "./state";

const SEED = "612deadbcae7ad23";
const PLACE = "0853010";
const STATE = "US-CO";

it(
  `a state with no estate or inheritance tax has none in force, not the federal rate (Nathrop CO, seed ${SEED})`,
  // Measured 7.9 s alone on Nov 15 (building the world is most of it); the
  // limit is about twice that, with room for a gate running two workers.
  { timeout: 20_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(SEED, gameStartDate(), {
        twoLevel: true,
        placeKey: PLACE,
      });
      const api = coreAPI(core);
      for (const series of ["estate-tax", "inheritance-tax"] as const) {
        const own = billValueInForce(
          api,
          { kind: "law-amount", series },
          STATE,
        );
        expect(own.value, `${series} in ${STATE}`).toBe(0);
        expect(own.recordId, `${series} in ${STATE}`).toBeNull();
      }
      // The federal estate tax is still in force at its own level.
      const federal = lawInForce(api, "estate-tax").levels.find(
        (level) => level.level === "federal",
      );
      expect(federal?.row?.value).toBe(40);
      // A state bill that creates a 16 percent estate tax raises it.
      expect(
        provisionStance(
          api,
          {
            kind: "law-amount",
            series: "estate-tax",
            value: 16,
            unit: "percent-top-rate",
          },
          "state",
          STATE,
        ),
      ).toEqual({
        question: "us-policy-positions:fiscal.graduated-income-tax",
        position: 1,
      });
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
