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
import { levelMayDecide } from "./modules/world-legislating";
import { answerIn } from "./modules/laws";
import { policySeriesAtLevel } from "./policy-answers";
import { coreAPI } from "./state";

// The place is drawn each run (GOLDEN_PATH_SEED replays one) and printed with
// its seed. Congress's labels are the same at every place, so any draw holds
// the case; the state's own wage question is read at the drawn state.
// One label per rule at a level (item
// laws-congress-holds-two-questions-for-one-federal-wage-rule): the states'
// wage question is Congress's federal wage question at the federal level, so
// Congress holds and offers the federal label alone.
// Limit: 17.6 s alone and 20.7 s beside another played-world file (Nov 16);
// twice the slower is about 45 s.
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
    // Congress holds the rule under its own label, once.
    expect(topics).toContain(canonical);
    expect(topics).not.toContain(shared);
    expect(answerIn(api, "US", canonical)).toBe(-1);
    expect(answerIn(api, "US", shared)).toBe(answerIn(api, "US", canonical));
    const menu = billCatalog(api, "federal", "US").flatMap((s) =>
      s.topics.flatMap((t) => t.policies),
    );
    // The drafting menu offers each rule once: the federal label, and no
    // two questions that Congress reads as one series.
    const offered = menu
      .filter((p) => p.kind === "policy-question" && p.question)
      .map((p) => policySeriesAtLevel(p.question!, "federal"));
    expect(offered.length - new Set(offered).size).toBe(0);
    expect(menu.some((p) => p.id === `question:${shared}`)).toBe(false);
    const legacy = menu.find((p) => p.id === `question:${canonical}`)!;
    expect(legacy.authority.allowed).toBe(true);
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
    process.stdout.write(
      `${JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        pendingRecord: pending.id,
        stateKey,
        stateAnswer: stateBefore,
        federalTopics: topics.length,
        canonicalDecisions: decisions.length,
        legacyCatalogRecord: legacy.inForceRecordId,
      })}\n`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 45_000);
