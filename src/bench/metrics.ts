import {
  METRICS_SECTIONS,
  metricsEntriesForSection,
  readOutputNumber,
} from "../core2/output-numbers";
import type { CoreState } from "../core2/types";

type Row = {
  key: string;
  unit: "percent" | "dollars" | "money" | "count";
  now: number;
  before: number | null;
};

/**
 * How the place is doing: this year beside last, read from the output-numbers
 * registry in `world-metrics`'s `months` and `years` tables by section
 * (`nation`, `state`, `city`, `housing`, `evictions`, `benefits`, `budget`).
 * A screen words the rows and adds nothing up.
 */
export function metricsView(
  core: CoreState,
  placeId: string,
  _personId: string,
) {
  const sections = METRICS_SECTIONS.map((section) => {
    const rows: Row[] = [];
    for (const entry of metricsEntriesForSection(section)) {
      const reading = readOutputNumber(core, entry.id, placeId);
      if (!reading || !entry.metricsKey) continue;
      rows.push({
        key: entry.metricsKey,
        unit: entry.unit as Row["unit"],
        now: reading.now,
        before: reading.before,
      });
    }
    return { key: section, rows };
  }).filter((section) => section.rows.length > 0);
  if (!sections.some((section) => section.key === "nation"))
    return { sections: [] };
  return { sections };
}
