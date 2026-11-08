/* global fetch */
// Dev mode's memory view, a section on a person's card: what they remember, one row per event
// they lived through (the event's record kind, the day learned, the day it fades or what keeps
// it). Record data and bare labels only; nothing under a row.
import { el } from "./dom.mjs";
import { stripSection } from "./strips.mjs";

/**
 * The section, or null when the person has no memory rows. `labels` is controls.devMemory;
 * `dateOf(iso)` words a date the way the game does.
 */
export async function devMemorySection({ personId, labels, dateOf }) {
  const response = await fetch(
    `/api/dev/memory?id=${encodeURIComponent(personId)}`,
  );
  if (!response.ok) return null;
  const rows = await response.json();
  if (!rows.length) return null;
  return stripSection(
    6,
    labels.title,
    ...rows.map((row) =>
      el(
        "div",
        { className: "dev-memory-row" },
        el("span", { textContent: row.kind ?? row.eventId }),
        el("span", { textContent: dateOf(row.learnedAt) }),
        el("span", {
          textContent: row.keptBy
            ? labels.kept[row.keptBy]
            : dateOf(row.fadesOn),
        }),
      ),
    ),
  );
}
