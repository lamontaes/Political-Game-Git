/**
 * Where a life can start on Guam, the U.S. Virgin Islands, American Samoa and
 * the Northern Mariana Islands.
 *
 * PLACEHOLDER. The national place corpus is the 2025 Census Gazetteer, and the
 * Gazetteer covers the fifty states, D.C. and Puerto Rico only, so these four
 * territories had no place at all and nobody could be born or live there. The
 * Census Island Areas lists that would supply them could not be fetched from
 * this environment, so the question is filed as research
 * (`docs/research/requests/territory-place-identities.json`) and, until it is
 * answered, each territory offers a short list of its well-known villages and
 * towns.
 *
 * What this list claims and what it does not:
 *
 * 1. A name here is a place residents really say they live in. That is all.
 * 2. It is not a Census record. The key is this module's own
 *    (`territory:GU:dededo`), never a place code made to look like one, and
 *    provenance says `placeholder` so no surface presents it as sourced.
 * 3. It claims no population, no boundary and no government of its own. A
 *    village's mayor, a municipal council or a county council is not seated by
 *    naming the village; those offices wait on the answered territory research
 *    and a place that can carry them.
 * 4. It may leave villages out. The answer to the research replaces this list,
 *    and a crosswalk from these keys carries existing saves forward.
 *
 * Each territory is its own government and electorate. Nothing here, or
 * anything that reads it, may lend a territory a state's rules.
 */

export const TERRITORY_PLACES_META = {
  asOf: null,
  source: "territory-place-placeholder",
  status: "placeholder",
  research: "territory-place-identities",
} as const;

/** `[key, resident-facing name, USPS code, plain spelling for search]`. */
export type TerritoryPlaceRow = readonly [
  key: string,
  displayName: string,
  usps: string,
  searchAlias: string | null,
];

function row(
  usps: string,
  displayName: string,
  searchAlias: string | null = null,
): TerritoryPlaceRow {
  const slug = (searchAlias ?? displayName)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return [`territory:${usps}:${slug}`, displayName, usps, searchAlias];
}

export const TERRITORY_PLACE_ROWS: readonly TerritoryPlaceRow[] = [
  // Guam: its nineteen villages, each of which elects a mayor.
  row("GU", "Agana Heights"),
  row("GU", "Agat"),
  row("GU", "Asan-Maina"),
  row("GU", "Barrigada"),
  row("GU", "Chalan Pago-Ordot"),
  row("GU", "Dededo"),
  row("GU", "Hagåtña", "Hagatna"),
  row("GU", "Inarajan"),
  row("GU", "Mangilao"),
  row("GU", "Merizo"),
  row("GU", "Mongmong-Toto-Maite"),
  row("GU", "Piti"),
  row("GU", "Santa Rita"),
  row("GU", "Sinajana"),
  row("GU", "Talofofo"),
  row("GU", "Tamuning"),
  row("GU", "Umatac"),
  row("GU", "Yigo"),
  row("GU", "Yona"),
  // U.S. Virgin Islands: the principal towns of St. Thomas, St. Croix and
  // St. John. The territory has no municipal governments.
  row("VI", "Charlotte Amalie"),
  row("VI", "Christiansted"),
  row("VI", "Frederiksted"),
  row("VI", "Cruz Bay"),
  row("VI", "Coral Bay"),
  // American Samoa: principal villages of Tutuila and Manu'a.
  row("AS", "Pago Pago"),
  row("AS", "Fagatogo"),
  row("AS", "Tafuna"),
  row("AS", "Nu'uuli", "Nuuuli"),
  row("AS", "Leone"),
  row("AS", "Vaitogi"),
  row("AS", "Aua"),
  row("AS", "Ta'ū", "Tau"),
  // Northern Mariana Islands: villages of Saipan, and the main villages of
  // Tinian and Rota.
  row("MP", "Garapan"),
  row("MP", "Susupe"),
  row("MP", "Chalan Kanoa"),
  row("MP", "San Antonio"),
  row("MP", "San Vicente"),
  row("MP", "Capitol Hill"),
  row("MP", "Kagman"),
  row("MP", "Koblerville"),
  row("MP", "Tanapag"),
  row("MP", "San Jose, Tinian", "San Jose Tinian"),
  row("MP", "Songsong, Rota", "Songsong Rota"),
  row("MP", "Sinapalo, Rota", "Sinapalo Rota"),
];

/** The four territories this list seats. Puerto Rico is in the Gazetteer. */
export const PLACEHOLDER_TERRITORY_USPS: ReadonlySet<string> = new Set([
  "GU",
  "VI",
  "AS",
  "MP",
]);
