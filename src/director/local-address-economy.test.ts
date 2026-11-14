/**
 * A governor's or mayor's address after a term that hurt the town's pay or
 * prices opens on it. Before the term read's `answeredBy` named the catalog
 * topics that answer jobs, pay and prices, no bill question answered them, so
 * a hurt address could not open on them (pool item
 * words-pay-and-prices-have-no-question-that-answers-them). Pinned: the seed
 * of local-address.test.ts, its first drawn place and the places named below.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { TERM_MEASURES } from "../core2/term-read";
import { HURT_KINDS } from "./address-kind";
import { answersCondition } from "./speech-outline";
import { composeLocalAddress } from "./local-address";

const SEED = "a7c13e";
/** The draws of the seed the test reads, each a named place in the failure message. */
const DRAWS = [0, 1, 2] as const;
setBookkeeping(false);

function fixture(n: number) {
  const drawn = drawPlace(`${SEED}:${n}`, "local-address");
  const built = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  return {
    where: `${drawn.name} (${drawn.key}), seed ${SEED}:${n}`,
    built,
    web: coreAPI(built.core).moduleState(OUTCOME_WEB_MODULE_ID).table("months"),
  };
}

/** The outcome web's rows for the town, with each measure group sliding by the given share over the term. */
function writeTerm(
  { built, web }: ReturnType<typeof fixture>,
  change: Record<string, number>,
) {
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const factor = Object.entries(change).find(([prefix]) =>
        key.startsWith(prefix),
      )?.[1];
      values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
    }
    web.put({
      id: `web:${built.placeId}:${month}`,
      placeId: built.placeId,
      month,
      date: `${month}-02`,
      values,
      bases: values,
      effects: {},
      engineSources: {},
    } as never);
  }
}

describe("a hurt address opens on the town's pay or prices", () => {
  it("opens on prices, then on pay, where it slid furthest and the speaker holds a stand that answers it", () => {
    const lines: string[] = [];
    const opened = { state: 0, town: 0 };
    for (const n of DRAWS) {
      const place = fixture(n);
      for (const [hurt, change] of [
        ["prices", { "household.prices": 0.4 }],
        ["pay", { "household.income": -0.4, "household.poverty-pct": 0.4 }],
      ] as const) {
        writeTerm(place, change);
        for (const level of ["state", "town"] as const) {
          const story = composeLocalAddress(place.built.core, level);
          if (!story) continue;
          lines.push(
            `${place.where} ${level} ${hurt}: ${story.addressKind}, crisis ${story.crisis ?? "none"}`,
          );
          if (!HURT_KINDS.includes(story.addressKind) || !story.crisis)
            continue;
          // The one area that went wrong opens the address, and the paragraph
          // that states it asks on a question that answers it, by record id.
          expect(story.crisis, `${place.where} ${level}`).toBe(hurt);
          const stated = story.sentences.find((row) =>
            row.facts.includes(`${hurt}-worse`),
          );
          expect(
            stated,
            `${place.where} ${level}: ${hurt} is not stated`,
          ).toBeTruthy();
          const asked = story.sentences.some(
            (row) =>
              row.part === stated!.part &&
              row.sourceRecordIds.some(
                (id) =>
                  id.startsWith("question:") &&
                  answersCondition(id.slice("question:".length), hurt),
              ),
          );
          expect(asked, `${place.where} ${level}: ${hurt} asks nothing`).toBe(
            true,
          );
          opened[level] += 1;
        }
      }
    }
    process.stdout.write(`ECONOMY ADDRESSES\n${lines.join("\n")}\n`);
    expect(opened.state, lines.join("; ")).toBeGreaterThan(0);
    // A mayor holds a few policy questions and the town's budget lines, and
    // answers pay through the welfare line (areas.json `answeredBy`).
    expect(opened.town, lines.join("; ")).toBeGreaterThan(0);
  }, 600_000);
});
