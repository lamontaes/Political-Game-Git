/**
 * A town's polling places are its own government's building (pool item
 * elections-polling-place-misses-town-government): in the played world, a
 * place drawn from all 56 whose town has a government on record seats every
 * precinct's polling place in that government's building, the record the
 * disasters engine and the law reach read.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { pollingPlaces } from "./modules/voting";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** A drawn place without an incorporated town has no government on record; the next is drawn. */
const DRAWS = 4;

it("seats every precinct's polling place in the town government's building", () => {
  const was = setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let draw = 0; draw < DRAWS; draw++) {
      const place = drawPlace(`${seed}:${draw}`, "polling-place-building");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      const government = [...core.organizations.values()]
        .filter(
          (o) =>
            o.placeId === town &&
            o.classification === "service:municipal-government",
        )
        .map((o) => o.id)
        .sort()[0];
      if (!government) {
        passed.push(`${where}: no town government on record`);
        continue;
      }
      const rows = pollingPlaces(api);
      expect(rows.length, where).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.buildingId, `${where}: ${row.id}`).toBe(government);
        expect(row.kind, `${where}: ${row.id}`).toBe("government-building");
      }
      console.log(
        `POLLING ${where}: ${rows.length} precincts at ${government}; passed over: ${passed.join("; ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `No town government on record in ${DRAWS} draws: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(was);
  }
}, 900_000);
