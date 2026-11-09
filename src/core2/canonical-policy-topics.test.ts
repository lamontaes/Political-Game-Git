// @vitest-environment node
/** Background law reads use the same canonical record as the bill writer. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { gameStartDate } from "./game-start";
import {
  enactLaw,
  lawChain,
  questionSettled,
  lastEnactment,
} from "./modules/laws";
import { addDays, makeIsoDate } from "./kernel/dates";
import { answerIn, levelMayDecide } from "./modules/world-legislating";
import { policySeriesAtLevel } from "./policy-answers";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "canonical-policy-topics");
const shared = "us-policy-positions:labor-workforce.raise-minimum-wage";
const canonical =
  "us-federal-positions:labor-commerce.raise-federal-minimum-wage";
it(`canonical background law reads: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const topics = PLATFORM_QUESTIONS.filter((q) =>
      levelMayDecide(api, "federal", q),
    );
    const decisions = topics.map((q) => policySeriesAtLevel(q, "federal"));
    expect(
      new Set(decisions).size,
      "Two labels must not count as two policy decisions",
    ).toBe(topics.length);
    expect(topics).toContain(shared);
    expect(answerIn(api, "US", canonical)).toBe(-1);
    expect(answerIn(api, "US", shared)).toBe(answerIn(api, "US", canonical));
    const menu = billCatalog(api, "federal", "US").flatMap((s) =>
      s.topics.flatMap((t) => t.policies),
    );
    const common = menu.find((p) => p.id === `question:${shared}`)!;
    const legacy = menu.find((p) => p.id === `question:${canonical}`)!;
    expect(common.authority.allowed).toBe(true);
    expect(legacy.authority.allowed).toBe(true);
    expect(common.inForceRecordId).toBe(legacy.inForceRecordId);
    // The state still decides its own wage question through the same gate.
    expect(levelMayDecide(api, "state", shared)).toBe(true);
    expect(levelMayDecide(api, "state", canonical)).toBe(false);
    const stateKey = lawChain(api).stateKey;
    const stateBefore = answerIn(api, stateKey, shared);
    const effectiveDate = addDays(makeIsoDate(api.state.date), 30);
    const pending = enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: canonical,
      value: 1,
      effectiveDate,
      measureId: "canonical-read-fixture",
      citation: "Reader fixture, not a played vote",
      terms: { enactedBy: "reader-fixture", margin: 0.4 },
    });
    expect(answerIn(api, "US", shared)).toBe(-1);
    expect(answerIn(api, "US", shared, true)).toBe(1);
    expect(questionSettled(api, "US", shared, 1)?.lawId).toBe(pending.id);
    expect(lastEnactment(api, shared, ["US"])?.lawId).toBe(pending.id);
    api.state.date = effectiveDate;
    expect(answerIn(api, "US", shared)).toBe(1);
    expect(answerIn(api, stateKey, shared)).toBe(stateBefore);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        pendingRecord: pending.id,
        stateKey,
        stateAnswer: stateBefore,
        federalTopics: topics.length,
        canonicalDecisions: decisions.length,
        sharedCatalogRecord: common.inForceRecordId,
        legacyCatalogRecord: legacy.inForceRecordId,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
