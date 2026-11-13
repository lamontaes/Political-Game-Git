import { governmentProperName } from "../core2/government-proper-name";
import { outputReads, readOutputNumber } from "../core2/output-number-readers";
import { METRICS_SECTIONS, OUTPUT_NUMBERS } from "../core2/output-numbers";
import type { CoreState } from "../core2/types";

/**
 * How the place is doing: this year beside last. Every row is one registered output number
 * (src/core2/data/output-numbers.json) read for the played place; this screen looks each up by
 * its section and counts nothing. A figure its owner holds no value for is left out, and a row
 * with no last year on record carries none: the screen then shows the figure alone.
 */
export function metricsView(core: CoreState, placeId: string) {
  const reads = outputReads(core, placeId);
  return {
    sections: METRICS_SECTIONS.map((key) => {
      // The government whose books a section shows, named as the record names it: a town run
      // by its county reads the county's name, never the town's.
      let name: string | undefined;
      const rows = OUTPUT_NUMBERS.flatMap((number) => {
        const shown = number.metrics;
        if (shown?.section !== key) return [];
        const read = readOutputNumber(reads, number.id);
        if (!read || (shown.absentWhenZero && !(read.now > 0))) return [];
        // The people behind a small town's count ("13 of 86 looking for work").
        const of = shown.of ? read.inputs[shown.of] : undefined;
        const { government, governmentId } = read.inputs;
        if (typeof government === "string" && typeof governmentId === "string")
          name = governmentProperName(government, governmentId);
        return [
          {
            key: shown.key,
            unit: shown.unit,
            now: read.now,
            before: read.before,
            ...(typeof of === "number" ? { of } : {}),
          },
        ];
      });
      return { key, ...(name ? { name } : {}), rows };
    }).filter((section) => section.rows.length),
  };
}
