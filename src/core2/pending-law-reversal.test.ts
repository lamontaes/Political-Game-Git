// @vitest-environment node
/** Reader regression from the Hamburg played probe; these writer calls are not votes. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { enactLaw, lawInForce, questionSettled } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "pending-law-reversal");
const question =
  "us-policy-positions:health-human-services.medicaid-work-requirement";

it(`a later act can advance or repeal a pending law: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const opening = gameStartDate();
    const world = buildBenchWorld(place.seed, opening, {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const starting = lawInForce(api, question);
    const early = addDays(opening, 1);
    const later = addDays(opening, 30);
    // Advancing the opening statute's effective date is not a repetition.
    expect(
      questionSettled(api, "US", question, 1, undefined, early),
    ).toBeNull();
    const write = (value: number, effectiveDate: string, bill: string) =>
      enactLaw(api, {
        jurisdiction: "US",
        level: "federal",
        series: question,
        value,
        effectiveDate,
        measureId: bill,
        citation: "Reader regression: pending law",
        terms: { enactedByBill: bill },
      });
    // Text order need not match date order: one act's phases follow dates.
    const future = write(1, later, "reader-phased-act");
    const first = write(0, opening, "reader-phased-act");
    const federal = (date: string) =>
      lawInForce(api, question, date).levels.find((l) => l.level === "federal")
        ?.row;
    expect(federal(opening)?.id).toBe(first.id);
    expect(federal(later)?.id).toBe(future.id);
    expect(questionSettled(api, "US", question, 1)).toEqual({
      lawId: future.id,
      why: "restates-pending",
    });
    // An earlier effective date also changes a pending act passed in play.
    expect(
      questionSettled(api, "US", question, 1, undefined, early),
    ).toBeNull();
    const repeal = write(0, opening, "reader-later-repeal");
    expect(federal(later)?.id).toBe(repeal.id);
    expect(federal(opening)?.id).toBe(repeal.id);
    expect(lawInForce(api, question, later).governing?.id).toBe(
      starting.governing?.id,
    );
    expect(questionSettled(api, "US", question, 1)).toBeNull();
    expect(questionSettled(api, "US", question, 0)).toEqual({
      lawId: repeal.id,
      why: "restates-in-force",
    });
    const again = write(1, early, "reader-later-reenactment");
    expect(federal(later)?.id).toBe(again.id);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        starting: starting.governing?.id,
        first: first.id,
        future: future.id,
        repeal: repeal.id,
        reenactment: again.id,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
