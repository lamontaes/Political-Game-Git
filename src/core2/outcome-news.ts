/**
 * What a town can hear about its own conditions: the outcome web's month
 * record, turned into one public record per place per month (facts only; the
 * words come from the English engine). Its facts are every measure an engine
 * reads (data/news/outcome-news.json) that moved since the month before,
 * with the web record it stands on and the links behind the move. Whether it
 * becomes a story is the press's choice (press-desk scores it); people hear
 * it through the news engine's delivery.
 */
import data from "./data/news/outcome-news.json" with { type: "json" };
import { WIRED_INTO } from "./outcome-web-model";
import type { WebMonth } from "./modules/outcome-web";
import type { CoreAPI } from "./types";

export const OUTCOME_MONTH_KIND = "outcome-web.month";
/** The key a heard measure is known by: `web:<measure>`. */
export const webFactKey = (measure: string) => `web:${measure}`;

interface MeasureRow {
  readonly topic: string;
  readonly readBy: string | null;
  readonly stopgapId?: string;
}
export const NEWS_MEASURES = data.measures as Readonly<
  Record<string, MeasureRow>
>;

/** The measure of a `web:<measure>` fact key, or null. */
export function measureOfFactKey(key: string): string | null {
  if (!key.startsWith("web:")) return null;
  const measure = key.slice("web:".length);
  return measure in NEWS_MEASURES ? measure : null;
}

/**
 * The place's month record as an event: the measures that moved since the
 * month before (`last`: that month's values; a measure it lacks reads
 * against the web's base), or null when nothing moved.
 */
export function monthEvent(
  api: CoreAPI,
  row: WebMonth,
  last: Readonly<Record<string, number>>,
) {
  const facts: Record<string, string> = { webRecordId: row.id };
  let topic = "";
  let largest = 0;
  for (const [measure, spec] of Object.entries(NEWS_MEASURES)) {
    const value = row.values[measure];
    if (value === undefined) continue;
    if (spec.stopgapId) api.stopgap(spec.stopgapId);
    const was = last[measure] ?? row.bases[measure] ?? value;
    if (value === was) continue;
    const size = Math.abs(value - was) / Math.max(Math.abs(was), 1e-9);
    if (size > largest || !topic) {
      largest = size;
      topic = spec.topic;
    }
    const key = webFactKey(measure);
    facts[key] = String(value);
    facts[`${key}:was`] = String(was);
    facts[`${key}:base`] = String(row.bases[measure] ?? "");
    facts[`${key}:record`] = row.id;
    facts[`${key}:links`] = (WIRED_INTO.get(measure) ?? [])
      .filter((link) => row.effects[link.key])
      .map((link) => link.key)
      .join(",");
  }
  if (!topic) return null;
  facts.magnitude = String(largest);
  return {
    event: {
      id: `${OUTCOME_MONTH_KIND}:${row.placeId}:${row.month}`,
      date: row.date,
      kind: OUTCOME_MONTH_KIND,
      personIds: [] as string[],
      placeId: row.placeId,
      topic,
      publicRecord: true,
      facts,
      source: {
        tag: "SOURCED" as const,
        citation: `Outcome web month ${row.id}: the readings that moved since the month before.`,
        asOf: row.date,
      },
    },
  };
}
