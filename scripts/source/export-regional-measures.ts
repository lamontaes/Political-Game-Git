import { fileURLToPath } from "node:url";
/**
 * One-way export of the statewide figures that show what a place is up
 * against: what housing and everything else costs there against the nation,
 * what people earn, what a two-bedroom rents for, and how many are out of
 * work. Every number is a publisher's own observation or a population-weighted
 * average of them; nothing is estimated, filled in or thresholded here.
 *
 * Reads the locked BEA regional, HUD housing and BLS LAUS corpora and writes
 * `src/simulation/regional-issues/regional-measures.generated.json`.
 * `--check` fails if the committed file no longer matches its sources.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const TARGET =
  "src/simulation/regional-issues/regional-measures.generated.json";

interface Evidence {
  readonly evidence: { readonly artifactId: string };
}
interface KnownValue {
  readonly state: string;
  readonly value?: number;
}
interface BeaRow extends Evidence {
  readonly tableName: string;
  readonly lineCode: string;
  readonly geoFips: string;
  readonly geoName: string;
  readonly geographyLevel: string;
  readonly year: string;
  readonly value: KnownValue;
}
interface HudArea {
  readonly hudFipsCode: string;
  readonly stateFips: string;
  readonly stateUsps: string;
}
interface HudRow extends Evidence {
  readonly recordKind: "fair-market-rent" | "income-limit";
  readonly productVintage: string;
  readonly area: HudArea;
  readonly publishedPopulation?: number | null;
  readonly rentByBedrooms?: Record<string, number>;
  readonly areaMedianFamilyIncome?: number | null;
}
interface LausRow extends Evidence {
  readonly area: { readonly areaTypeCode: string; readonly areaText: string };
  readonly measure: { readonly code: string };
  readonly seasonalAdjustmentCode: string;
  readonly year: string;
  readonly period: string;
  readonly value: KnownValue;
}

/** Fifty states and D.C. HUD's national average covers these, not the territories. */
const STATES_AND_DC_FIPS = new Set(
  Array.from({ length: 56 }, (_, i) => String(i + 1).padStart(2, "0")).filter(
    (fips) => !["03", "07", "14", "43", "52"].includes(fips),
  ),
);

export interface RegionalObservation {
  /** Publisher period: a year ("2024"), a month ("2026-07") or a HUD fiscal year ("FY2025"). */
  readonly period: string;
  /** Last day the period covers; a reader never uses a period that ends after the date it asks about. */
  readonly periodEnd: string;
  /**
   * The first date the locked edition carrying this figure is proven to have
   * been public: the publisher's release date, or, where none is recorded,
   * the date it was retrieved. A reader never shows a figure before this.
   */
  readonly knownAvailableOn: string;
  readonly knownAvailableOnBasis:
    "publisher-release-date" | "retrieval-date-fallback";
  readonly value: number;
  /** The same figure for the nation, or null where the source publishes none. */
  readonly national: number | null;
}

export interface JurisdictionRegionalMeasures {
  readonly jurisdictionKey: string;
  readonly name: string;
  /** BEA SARPP line 3, "RPPs: Services: Housing" (index; the nation is near 100). */
  readonly housingPriceIndex: readonly RegionalObservation[];
  /** BEA SARPP line 1, "RPPs: All items". */
  readonly allItemsPriceIndex: readonly RegionalObservation[];
  /** BEA CAINC1 line 3, per capita personal income, in dollars. */
  readonly perCapitaIncome: readonly RegionalObservation[];
  /** HUD Fair Market Rent for two bedrooms, dollars a month, population-weighted across the state's HUD areas. */
  readonly twoBedroomFairMarketRent: readonly RegionalObservation[];
  /** HUD area median family income, dollars a year, weighted by the same populations. */
  readonly medianFamilyIncome: readonly RegionalObservation[];
  /** BLS LAUS statewide unemployment rate, seasonally adjusted, percent. */
  readonly unemploymentRate: readonly RegionalObservation[];
}

function readCorpus<T>(domain: string): { rows: T[]; sha256: string } {
  const bytes = readFileSync(
    resolve(root, `data/source/${domain}/corpus.json`),
  );
  const rows: unknown = JSON.parse(bytes.toString());
  if (!Array.isArray(rows)) throw new Error(`${domain}: expected an array.`);
  return {
    rows: rows as T[],
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

interface Availability {
  readonly knownAvailableOn: string;
  readonly knownAvailableOnBasis:
    "publisher-release-date" | "retrieval-date-fallback";
}

/** Availability of every artifact in a domain's lock, the economic-context source-time rule. */
function readAvailability(domain: string): Map<string, Availability> {
  const lock = JSON.parse(
    readFileSync(
      resolve(root, `data/source/${domain}/artifact-lock.json`),
      "utf8",
    ),
  ) as {
    artifacts: {
      artifactId: string;
      publisher: { releaseDate: string | null };
      retrieval: { retrievedAt: string };
    }[];
  };
  return new Map(
    lock.artifacts.map((artifact) => [
      artifact.artifactId,
      artifact.publisher.releaseDate
        ? {
            knownAvailableOn: artifact.publisher.releaseDate,
            knownAvailableOnBasis: "publisher-release-date",
          }
        : {
            knownAvailableOn: artifact.retrieval.retrievedAt.slice(0, 10),
            knownAvailableOnBasis: "retrieval-date-fallback",
          },
    ]),
  );
}

function availabilityOf(
  locks: Map<string, Availability>,
  artifactId: string,
): Availability {
  const found = locks.get(artifactId);
  if (!found) throw new Error(`Artifact ${artifactId} is not in its lock.`);
  return found;
}

function known(value: KnownValue): number | null {
  return value.state === "KNOWN" && typeof value.value === "number"
    ? value.value
    : null;
}

/** HUD fiscal year N runs October 1 of N-1 through September 30 of N. */
function hudPeriodEnd(vintage: string): string {
  const match = /^FY(\d{4})$/.exec(vintage);
  if (!match) throw new Error(`Unexpected HUD vintage ${vintage}.`);
  return `${match[1]}-09-30`;
}

function monthEnd(year: string, month: number): string {
  const last = new Date(Date.UTC(Number(year), month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function renderRegionalMeasures(): string {
  const bea = readCorpus<BeaRow>("bea-regional");
  const hud = readCorpus<HudRow>("hud-housing");
  const laus = readCorpus<LausRow>("bls-laus");
  const beaLock = readAvailability("bea-regional");
  const hudLock = readAvailability("hud-housing");
  const lausLock = readAvailability("bls-laus");

  // Identity: USPS code by state FIPS, from HUD, which covers all fifty-six.
  const uspsByFips = new Map<string, string>();
  for (const row of hud.rows)
    uspsByFips.set(row.area.stateFips, row.area.stateUsps);
  const nameByUsps = new Map<string, string>();
  for (const row of bea.rows) {
    if (row.geographyLevel !== "state") continue;
    const usps = uspsByFips.get(row.geoFips.slice(0, 2));
    if (usps) nameByUsps.set(usps, row.geoName);
  }
  const uspsByName = new Map(
    [...nameByUsps].map(([usps, name]) => [name, usps] as const),
  );
  uspsByName.set("Puerto Rico", "PR");
  const TERRITORY_NAMES: Record<string, string> = {
    PR: "Puerto Rico",
    GU: "Guam",
    VI: "U.S. Virgin Islands",
    AS: "American Samoa",
    MP: "Northern Mariana Islands",
  };

  const measures = new Map<string, Record<string, RegionalObservation[]>>();
  const slot = (usps: string, measure: string): RegionalObservation[] => {
    const entry = measures.get(usps) ?? {};
    measures.set(usps, entry);
    return (entry[measure] ??= []);
  };

  // BEA: price parities and per capita income, state against nation.
  const BEA_SERIES: Record<string, string> = {
    "SARPP:3": "housingPriceIndex",
    "SARPP:1": "allItemsPriceIndex",
    "CAINC1:3": "perCapitaIncome",
  };
  const beaNational = new Map<string, number>();
  for (const row of bea.rows) {
    const key = `${row.tableName}:${row.lineCode}`;
    const value = known(row.value);
    if (BEA_SERIES[key] && row.geographyLevel === "nation" && value !== null)
      beaNational.set(`${key}:${row.year}`, value);
  }
  for (const row of bea.rows) {
    const key = `${row.tableName}:${row.lineCode}`;
    const measure = BEA_SERIES[key];
    const value = known(row.value);
    if (!measure || row.geographyLevel !== "state" || value === null) continue;
    const usps = uspsByFips.get(row.geoFips.slice(0, 2));
    if (!usps) continue;
    slot(usps, measure).push({
      period: row.year,
      periodEnd: `${row.year}-12-31`,
      ...availabilityOf(beaLock, row.evidence.artifactId),
      value,
      national: beaNational.get(`${key}:${row.year}`) ?? null,
    });
  }

  // HUD: two-bedroom rent and median family income, weighted by the
  // population HUD publishes for each area. Income-limit rows carry no
  // population, so they borrow the rent row's for the same HUD area.
  const population = new Map<string, number>();
  for (const row of hud.rows)
    if (row.recordKind === "fair-market-rent" && row.publishedPopulation)
      population.set(
        `${row.productVintage}:${row.area.hudFipsCode}`,
        row.publishedPopulation,
      );
  const sums = new Map<string, { weighted: number; weight: number }>();
  const add = (key: string, value: number, weight: number) => {
    const sum = sums.get(key) ?? { weighted: 0, weight: 0 };
    sum.weighted += value * weight;
    sum.weight += weight;
    sums.set(key, sum);
  };
  const vintages = new Set<string>();
  const artifactOf = new Map<string, string>();
  for (const row of hud.rows) {
    const weight = population.get(
      `${row.productVintage}:${row.area.hudFipsCode}`,
    );
    if (!weight) continue;
    const value =
      row.recordKind === "fair-market-rent"
        ? row.rentByBedrooms?.["2"]
        : row.areaMedianFamilyIncome;
    if (typeof value !== "number") continue;
    const measure =
      row.recordKind === "fair-market-rent"
        ? "twoBedroomFairMarketRent"
        : "medianFamilyIncome";
    vintages.add(row.productVintage);
    const artifactKey = `${measure}:${row.productVintage}`;
    if (
      (artifactOf.get(artifactKey) ?? row.evidence.artifactId) !==
      row.evidence.artifactId
    )
      throw new Error(`${artifactKey} spans more than one artifact.`);
    artifactOf.set(artifactKey, row.evidence.artifactId);
    add(
      `${measure}:${row.productVintage}:${row.area.stateUsps}`,
      value,
      weight,
    );
    if (STATES_AND_DC_FIPS.has(row.area.stateFips))
      add(`${measure}:${row.productVintage}:US`, value, weight);
  }
  for (const [key, sum] of sums) {
    const [measure, vintage, usps] = key.split(":") as [string, string, string];
    if (usps === "US") continue;
    const national = sums.get(`${measure}:${vintage}:US`);
    slot(usps, measure).push({
      period: vintage,
      periodEnd: hudPeriodEnd(vintage),
      ...availabilityOf(hudLock, artifactOf.get(`${measure}:${vintage}`)!),
      value: Math.round(sum.weighted / sum.weight),
      national: national
        ? Math.round(national.weighted / national.weight)
        : null,
    });
  }

  // LAUS: statewide unemployment rate, seasonally adjusted. The corpus holds
  // no national series, so the national figure is null rather than guessed.
  for (const row of laus.rows) {
    if (row.area.areaTypeCode !== "A" || row.measure.code !== "03") continue;
    if (row.seasonalAdjustmentCode !== "S") continue;
    const month = /^M(\d{2})$/.exec(row.period);
    const value = known(row.value);
    const usps = uspsByName.get(row.area.areaText);
    if (!month || month[1] === "13" || value === null || !usps) continue;
    slot(usps, "unemploymentRate").push({
      period: `${row.year}-${month[1]}`,
      periodEnd: monthEnd(row.year, Number(month[1])),
      ...availabilityOf(lausLock, row.evidence.artifactId),
      value,
      national: null,
    });
  }

  const byPeriod = (a: RegionalObservation, b: RegionalObservation) =>
    a.periodEnd.localeCompare(b.periodEnd);
  const jurisdictions: JurisdictionRegionalMeasures[] = [...uspsByFips.values()]
    .filter((usps, index, all) => all.indexOf(usps) === index)
    .sort()
    .map((usps) => {
      const entry = measures.get(usps) ?? {};
      const series = (measure: string) =>
        [...(entry[measure] ?? [])].sort(byPeriod);
      return {
        jurisdictionKey: `US-${usps}`,
        name: nameByUsps.get(usps) ?? TERRITORY_NAMES[usps] ?? usps,
        housingPriceIndex: series("housingPriceIndex"),
        allItemsPriceIndex: series("allItemsPriceIndex"),
        perCapitaIncome: series("perCapitaIncome"),
        twoBedroomFairMarketRent: series("twoBedroomFairMarketRent"),
        medianFamilyIncome: series("medianFamilyIncome"),
        unemploymentRate: series("unemploymentRate"),
      };
    });

  const output = {
    provenance: {
      beaRegionalSha256: bea.sha256,
      hudHousingSha256: hud.sha256,
      blsLausSha256: laus.sha256,
      hudVintages: [...vintages].sort(),
      meaning:
        "Publisher observations by state. HUD figures are averages of HUD areas weighted by HUD's published population; the national HUD figure covers the fifty states and D.C. LAUS publishes no national series in this corpus.",
    },
    jurisdictions,
  };
  return `${JSON.stringify(output)}\n`;
}

function main(): void {
  const output = renderRegionalMeasures();
  const target = resolve(root, TARGET);
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== output)
      throw new Error(
        "Regional measures differ from their locked BEA, HUD and LAUS sources. Run npm run export:regional-measures.",
      );
    process.stdout.write("Regional measures regenerate byte-identically.\n");
  } else writeFileSync(target, output);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
