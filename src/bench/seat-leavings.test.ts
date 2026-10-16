import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  OFFICES_MODULE_ID,
  enforceIncompatibility,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { seatView } from "./legislature";
import { buildBenchWorld } from "./world";

// The seat sheet lists the seats the law made a person leave on taking
// another: the seat they left, the one they took, and the law that required
// it, read from the offices engine's record. The edge fixture is the
// President accepting a Senate mandate, which the Constitution forbids.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("lists the seat a person left, the one they took and the law", () => {
  const place = drawPlace(seed, "seat-leavings");
  const where = `${place.name}, seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const president = (
    terms.query("bySeatStatus", [
      "seat:US:president",
      "serving",
    ]) as unknown as TermRow[]
  )[0]?.personId;
  const senate = townSeats(api).find((row) => row.office.kind === "us-senate");
  expect(president, where).toBeTruthy();
  expect(senate, where).toBeDefined();
  const term = terms.query("bySeatStatus", [senate!.seat.id, "serving"])[0]!;
  terms.put({ ...term, personId: president });
  enforceIncompatibility(api, president!, senate!.seat.id);
  const left = seatView(core, president!).incompatibilities;
  expect(left.length, where).toBeGreaterThan(0);
  expect(left[0]!.law, where).toMatch(/Constitution/);
  expect(left[0]!.left, where).not.toBe(left[0]!.took);
}, 600_000);
