import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { governments } from "./modules/budgets";
import { coreAPI } from "./state";

const replay =
  process.env.OPENING_TREASURY_SEED ?? randomBytes(8).toString("hex");
const places = [
  {
    name: "Checotah, Oklahoma",
    key: "4013650",
    seed: "47b06e171d253ce7139d26b0df3defc6376e0d99ab8022cebfbba3ff5d28b8dc",
    replay: "1acc04b6572d6ef2474607b73d0e7066b70ba9bcf5c519202b24a8c654ed707e",
  },
  ...[0, 1].map((index) => ({
    ...drawPlace(`${replay}:${index}`, "opening-treasury-json"),
    replay: `${replay}:${index}`,
  })),
];
const proof: unknown[] = [];

for (const place of places)
  it(`opens finite treasury records in ${place.name} (${place.key}), replay ${place.replay}`, () => {
    const previous = setBookkeeping(true);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const opening = governments(coreAPI(core)).map((government) => {
        const cash = government.openingCash;
        const where = `${place.name}: ${government.id}`;
        expect(cash, where).toBeDefined();
        expect(Number.isFinite(cash!.minor), where).toBe(true);
        if (cash!.minor === 0)
          expect(Object.hasOwn(cash!, "journalSequence"), where).toBe(false);
        else expect(Number.isInteger(cash!.journalSequence), where).toBe(true);
        expect(JSON.parse(JSON.stringify(cash)), where).toStrictEqual(cash);
        return { id: government.id, openingCash: cash };
      });
      expect(opening.length).toBeGreaterThan(0);
      if (place.key === "4013650")
        expect(opening.some((row) => row.openingCash?.minor === 0)).toBe(true);
      proof.push({ ...place, through: core.date, opening });
      if (process.env.OPENING_TREASURY_PROOF)
        writeFileSync(
          process.env.OPENING_TREASURY_PROOF,
          `${JSON.stringify(proof, null, 2)}\n`,
        );
      console.log(JSON.stringify(proof.at(-1)));
    } finally {
      setBookkeeping(previous);
    }
  }, 600_000);
