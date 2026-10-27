// A town in the creator's list: its name with its count, and, where another
// town in the state shares the name, the county as its own labeled line, so
// the county never reads as the thing the count belongs to.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

/** The row's words, from the town record and the creator's control names. */
export function townRowParts(town, words, format) {
  const size = `${town.estimated ? `${words.about} ` : ""}${format(town.population)} ${words.people}`;
  return {
    name: town.name,
    count: size,
    county: town.county
      ? (words.countyLine ?? "").replace("{county}", town.county)
      : null,
  };
}

export function townRow(town, words, format, onPick) {
  const parts = townRowParts(town, words, format);
  const head = el(
    "div",
    { className: "town-head" },
    el("span", { className: "town-name", textContent: parts.name }),
    el("small", { className: "town-count", textContent: parts.count }),
  );
  const row = makeButton({ className: "item town" }, head);
  if (parts.county)
    row.append(
      el("small", { className: "town-county", textContent: parts.county }),
    );
  row.addEventListener("click", () => onPick(town));
  return row;
}
