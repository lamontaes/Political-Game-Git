/* global document */
// A figure's history as a plain line on the dark panel, never a bar graph (owner, Nov 8:
// The Political Process's "View Timeline": a line, the first and last years at its ends).
// The screen hands it the record's yearly amounts, oldest first; nothing here computes a
// figure, it only places points.

const NS = "http://www.w3.org/2000/svg";

/**
 * `history`: [{ fiscalYear, minor }] oldest first. Returns the SVG, or null when there is
 * less than a second year to draw (the line needs more than one year of data).
 */
export function trendLine(
  history,
  { width = 320, height = 90, valueOf = (point) => point.minor, labels } = {},
) {
  if (!history || history.length < 2) return null;
  const values = history.map(valueOf);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  // A labeled line leaves room for the figure over each point and the year under it.
  const padX = labels ? 44 : 10;
  const padTop = labels ? 30 : 10;
  const padBottom = labels ? 30 : 10;
  const at = (point, index) => [
    padX + (index / (history.length - 1)) * (width - 2 * padX),
    height -
      padBottom -
      ((valueOf(point) - low) / span) * (height - padTop - padBottom),
  ];
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "trend-line");
  svg.setAttribute("role", "img");
  const points = history.map(at);
  const line = document.createElementNS(NS, "polyline");
  line.setAttribute("points", points.map((p) => p.join(",")).join(" "));
  line.setAttribute("class", "trend-path");
  svg.append(line);
  const last = points.at(-1);
  const dot = document.createElementNS(NS, "circle");
  dot.setAttribute("cx", String(last[0]));
  dot.setAttribute("cy", String(last[1]));
  dot.setAttribute("r", "3.5");
  dot.setAttribute("class", "trend-dot");
  svg.append(dot);
  // Every value written on the line (owner, Nov 12: "each value written on it"), its year
  // under the point; the words come from the caller, never made here.
  if (labels)
    points.forEach(([x, y], index) => {
      const point = history[index];
      for (const [text, cls, at] of [
        [labels.value(point), "trend-value", y - 10],
        [labels.year(point), "trend-year", height - 8],
      ]) {
        const node = document.createElementNS(NS, "text");
        node.setAttribute("x", String(x));
        node.setAttribute("y", String(at));
        node.setAttribute("text-anchor", "middle");
        node.setAttribute("class", cls);
        node.textContent = text;
        svg.append(node);
      }
    });
  return svg;
}
