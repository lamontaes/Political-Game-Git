/* global document */
// A figure's history as a plain line on the dark panel, never a bar graph (owner, Nov 8:
// The Political Process's "View Timeline": a line, the first and last years at its ends).
// The screen hands it the record's yearly amounts, oldest first; nothing here computes a
// figure, it only places points.

const NS = "http://www.w3.org/2000/svg";

/**
 * `history`: [{ fiscalYear, minor }] oldest first. Returns the SVG, or null when there is
 * less than a second year to draw (the line needs more than one year of data).
 * `written` writes each point's value over it and its year under the line, in
 * the words the screen hands over (`written.value(point)`), the Metrics
 * timeline (owner, Nov 12: "one thin line over the years with each value
 * written on it").
 */
export function trendLine(history, { width = 320, height = 90, written } = {}) {
  if (!history || history.length < 2) return null;
  const values = history.map((point) => point.minor);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const pad = written ? 60 : 10;
  // Written values below a low point keep clear of the year axis.
  const base = written ? height - 84 : height - pad;
  const at = (point, index) => [
    pad + (index / (history.length - 1)) * (width - 2 * pad),
    base - ((point.minor - low) / span) * (base - pad),
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
  if (written) {
    const text = (x, y, words, className) => {
      const node = document.createElementNS(NS, "text");
      node.setAttribute("x", String(x));
      node.setAttribute("y", String(y));
      node.setAttribute("text-anchor", "middle");
      node.setAttribute("class", className);
      node.textContent = words;
      return node;
    };
    const axis = document.createElementNS(NS, "line");
    axis.setAttribute("x1", String(pad / 2));
    axis.setAttribute("x2", String(width - pad / 2));
    axis.setAttribute("y1", String(height - 34));
    axis.setAttribute("y2", String(height - 34));
    axis.setAttribute("class", "trend-axis");
    svg.append(axis);
    history.forEach((point, index) => {
      const [x, y] = points[index];
      // A value sits above its point where the line rises to it, below where it falls.
      const before = points[index - 1]?.[1] ?? y;
      const above = y <= before;
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", String(x));
      dot.setAttribute("cy", String(y));
      dot.setAttribute("r", "4");
      dot.setAttribute("class", "trend-point");
      svg.append(
        dot,
        text(x, above ? y - 14 : y + 26, written.value(point), "trend-value"),
        text(x, height - 10, String(point.fiscalYear), "trend-year"),
      );
    });
  }
  const last = points.at(-1);
  const dot = document.createElementNS(NS, "circle");
  dot.setAttribute("cx", String(last[0]));
  dot.setAttribute("cy", String(last[1]));
  dot.setAttribute("r", "3.5");
  dot.setAttribute("class", "trend-dot");
  svg.append(dot);
  return svg;
}
