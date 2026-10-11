// STOPGAP RULES3-CAM-045: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/simulation/campaign-canvass.ts; RULES-3, 2026-10-11.
import calibration from "../../../data/research/campaign-reality/campaign-calibration.json" with { type: "json" };

export const CANVASS_SUPPORT_EFFECT: {
  readonly pooled: number;
  readonly partisan: number;
  /** The share of the base a warm conversation carries. */
  readonly warm: number;
  /** The share of the base a cool conversation carries. */
  readonly cool: number;
} = (() => {
  const effect = (id: string) => {
    const row = calibration.observations.find((entry) => entry.id === id);
    if (!row) throw new Error(`The calibration packet has no ${id} row.`);
    return row.range.min;
  };
  const pooledAtt = effect("candidate-canvass-support-pooled-att");
  return {
    pooled: effect("candidate-canvass-support-pooled"),
    partisan: effect("candidate-canvass-support-partisan"),
    warm: effect("candidate-canvass-support-vote-info-arm") / pooledAtt,
    cool: effect("candidate-canvass-support-political-arm") / pooledAtt,
  };
})();
