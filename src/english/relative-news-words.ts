/**
 * How people at home say what happened to a relative (Words builder W1, Nov
 * 12, 2026): a cause of death said plainly to family, an illness by its
 * common name, what a prison term was for, and the age below which a death
 * is called too soon. Words only, from data/english/relative-news-words.json;
 * the director reads them here, through the English engine's entry.
 */
import words from "../../data/english/relative-news-words.json" with { type: "json" };

export interface RelativeNewsWords {
  readonly deathCauses: Readonly<Record<string, string>>;
  readonly illnesses: Readonly<Record<string, string>>;
  readonly offenses: Readonly<Record<string, string>>;
  /** An official as someone outside government says them, by body or by office. */
  readonly officials: { readonly onBody: string; readonly sole: string };
  readonly youngBelowAge: { readonly value: number };
}

export const RELATIVE_NEWS_WORDS = words as unknown as RelativeNewsWords;
