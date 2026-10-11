// Lifted unchanged from src/simulation/campaign-canvass.ts; RULES-3, 2026-10-11.
import calibration from "../../../data/research/campaign-reality/campaign-calibration.json" with { type: "json" };

export const CANVASS_DOORS_PER_HOUR: number = (() => {
  const lows = calibration.observations
    .filter((row) => row.metric === "doors-per-volunteer-hour")
    .map((row) => row.range.min)
    .sort((a, b) => a - b);
  if (lows.length === 0)
    throw new Error("The calibration packet has no door-knocking pace.");
  const middle = Math.floor(lows.length / 2);
  return lows.length % 2 === 1
    ? lows[middle]!
    : (lows[middle - 1]! + lows[middle]!) / 2;
})();

export const CANVASS_SESSION_MINUTES: readonly number[] = (() => {
  const shifts = calibration.observations.filter(
    (row) => row.metric === "canvass-shift-hours",
  );
  if (shifts.length === 0)
    throw new Error("The calibration packet has no canvass shift length.");
  const shortest = Math.ceil(Math.min(...shifts.map((row) => row.range.min)));
  const longest = Math.floor(Math.max(...shifts.map((row) => row.range.max)));
  const lengths: number[] = [];
  for (let hours = shortest; hours <= longest; hours += 1)
    lengths.push(hours * 60);
  return lengths;
})();
