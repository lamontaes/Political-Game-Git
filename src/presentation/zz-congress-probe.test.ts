import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { advanceWorld, lifePlaceSearch } from "../simulation";
import { US_CONGRESS_PACK_ID } from "../simulation/congress-rule-pack";
import { measurePosition } from "../simulation/legislation";
import { lifeActivityHandlers } from "./life-time-handlers";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectMeasureBriefing } from "./legislation-projection";
it("probe", () => {
  const key = lifePlaceSearch("Hermann", 20).find((p) => p.displayName === "Hermann, Missouri")!.key;
  let w = generateOpeningLife(prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, placeKey: key, seed: "congress-hermann" })).game!.world;
  const h = lifeActivityHandlers();
  for (let d = 0; d < 120; d++) w = advanceWorld(w, 1, h);
  const bills = (w.history.legislativeMeasures ?? []).filter((m) => m.rulePackId === US_CONGRESS_PACK_ID);
  const out = bills.map((b) => ({ phase: measurePosition(w, b.id).phase, b: { designation: b.designation, propositionIds: (b as any).propositionIds, subjectClass: b.subjectClass, summary: b.summary }, brief: projectMeasureBriefing(w, b.id) }));
  writeFileSync(process.env.PROBE_OUT!, JSON.stringify(out, null, 1));
}, 600_000);
