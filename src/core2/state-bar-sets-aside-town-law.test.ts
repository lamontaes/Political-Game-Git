/** Law levels: a town's rule never takes effect where its state bars towns (a lower level never overrules a higher one). */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { resolveLawInForce } from "./laws-in-force";
import { lawChainForPlace, type LawRowInput } from "./laws-starting";
import { POLICY_QUESTIONS } from "./policy-answers";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const QUESTION = "us-policy-positions:justice-public-safety.stand-your-ground";

for (const bars of [true, false])
  it(`a town's rule ${bars ? "is set aside" : "stands"} where its state ${bars ? "bars" : "leaves"} towns: replay ${replay}`, () => {
    const place = drawPlace(replay + String(bars), "state-bar", (key) => {
      const state = lawChainForPlace(key).stateKey;
      return POLICY_QUESTIONS[QUESTION]!.answers[state]?.preempts === bars;
    });
    const chain = lawChainForPlace(place.key);
    const town = chain.levels.at(-1)!;
    const row = (
      id: string,
      level: string,
      jurisdiction: string,
      value: number,
    ): LawRowInput => ({
      id,
      jurisdiction,
      level,
      series: QUESTION,
      tier: "general",
      value,
      effectiveDate: "2026-01-01",
      endDate: null,
      source: "Test-only input",
      retrieved: "2026-01-01",
      estimate: true,
      unit: "answer",
    });
    const answer = resolveLawInForce({
      series: QUESTION,
      chain,
      date: "2027-01-01",
      rows: [
        row("t:state", "state", chain.stateKey, 0),
        row("t:town", town.level, town.jurisdiction, 1),
      ],
      ...(bars ? { statePreempts: true } : {}),
    });
    expect(answer.governing?.id, place.name).toBe(bars ? "t:state" : "t:town");
  });
