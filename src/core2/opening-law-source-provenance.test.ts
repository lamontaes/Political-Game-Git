// @vitest-environment node
/** Opening law provenance is read through the same law answer used by the game. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lawHere, lawChain, LAWS_MODULE_ID } from "./modules/laws";
import { POLICY_QUESTIONS } from "./policy-answers";
import type { LawRowInput } from "./laws-starting";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "opening-law-source-provenance");
it(`opening laws keep each jurisdiction's source: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    console.log(
      JSON.stringify({
        stage: "opening",
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
      }),
    );
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const rows = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[];
    const answers = lawHere(api);
    const checked: { id: string; source: string; cite?: unknown }[] = [];
    const state = lawChain(api).stateKey;
    for (const [question, entry] of Object.entries(POLICY_QUESTIONS)) {
      for (const jurisdiction of [state, "US"]) {
        if (
          question.startsWith("us-federal-positions:") &&
          jurisdiction !== "US"
        )
          continue;
        const answer = entry.answers[jurisdiction];
        if (answer?.answer !== "yes" && answer?.answer !== "no") continue;
        const row = rows.find(
          (r) => r.series === question && r.jurisdiction === jurisdiction,
        )!;
        expect(row, `${question}, ${jurisdiction}`).toBeDefined();
        expect(row.source, row.id).toBe(
          answer.source ??
            entry.source ??
            "data/research/laws/starting-law-2026",
        );
        expect(row.terms?.cite, row.id).toEqual(answer.cite);
        expect(row.terms?.lawTerms, row.id).toEqual(
          answer.lawTerms?.length ? answer.lawTerms : undefined,
        );
        const resolved = answers.find((a) => a.series === question)!;
        expect(resolved, row.id).toBeDefined();
        // A future operative law is exposed in pending; an opening law is
        // exposed at its own level even when another law sets it aside.
        const visible =
          row.effectiveDate > api.state.date
            ? resolved.pending.find((r) => r.id === row.id)
            : resolved.levels.find((l) => l.row?.id === row.id)?.row;
        expect(visible?.source, row.id).toBe(row.source);
        checked.push({ id: row.id, source: row.source, cite: row.terms?.cite });
      }
    }
    expect(checked.length).toBeGreaterThan(0);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        checked,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
