// One place makes a Metrics row's figure and its change from last year, so the change always
// comes from the two figures the row shows (Words lead, Nov 13: "$209,000 / last year $207,000,
// up $2,200"). Each figure is shown rounded; the change is the difference of the shown figures.
import { moneyWords } from "../../english/plain-words.mjs";

// The number a money figure shows once rounded the way moneyWords says it: whole dollars to
// three figures below a million, one decimal of a million, billion or trillion above.
function shownDollars(dollars) {
  const sign = dollars < 0 ? -1 : 1;
  const whole = Math.round(Math.abs(dollars));
  if (whole < 1e6) return sign * Number(whole.toPrecision(3));
  const scale = Math.min(10 ** (3 * Math.floor(Math.log10(whole) / 3)), 1e12);
  return sign * Math.round((whole / scale) * 10) * (scale / 10);
}

/** The number a row's figure shows, in the row's own unit (dollars, count or percent). */
export function shownValue(row, value) {
  if (row.unit === "dollars" || row.unit === "money")
    return shownDollars(row.unit === "dollars" ? value : value / 100);
  if (row.unit === "count") return Math.round(value);
  return Number(value.toFixed(1));
}

/** A row's figure as the screen says it. */
export function metricsFigure(row, value, percentWord) {
  if (row.unit === "dollars")
    return moneyWords(Math.round(value * 100), { rounded: true });
  if (row.unit === "money")
    return moneyWords(Math.round(value), { rounded: true });
  if (row.unit === "count") return Math.round(value).toLocaleString("en-US");
  return `${value.toFixed(1)} ${percentWord}`;
}

/**
 * The change from last year: its direction ("same", "up" or "down", null with no last year)
 * and the size as words ("" when the shown figures match). Both come from the shown figures.
 */
export function metricsChange(row) {
  if (row.before === null || row.before === undefined)
    return { direction: null, size: "" };
  const moved = shownValue(row, row.now) - shownValue(row, row.before);
  if (moved === 0 || Math.abs(moved) < 0.05)
    return { direction: "same", size: "" };
  const size = Math.abs(moved);
  const text =
    row.unit === "dollars" || row.unit === "money"
      ? moneyWords(Math.round(size * 100), { rounded: true })
      : row.unit === "count"
        ? size.toLocaleString("en-US")
        : size.toFixed(1);
  return { direction: moved > 0 ? "up" : "down", size: text };
}
