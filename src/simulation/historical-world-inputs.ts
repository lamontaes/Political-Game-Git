import inputs from "../../data/research/money/historical-world-inputs.json" with { type: "json" };
import wageMatrix from "../../data/research/money/minimum-wage-dated-matrix-2026.json" with { type: "json" };
import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate } from "./dates";
import type { StartingLawRow } from "./governing/law-in-force";
import type { IsoDate } from "./types";

export const HISTORICAL_WORLD_START_DATE = makeIsoDate(inputs.startDate);
export const FIRST_HISTORICAL_PRESIDENTIAL_CYCLE =
  inputs.firstPresidentialCycle;

/** One year reader for opening inputs; saved laws, contracts and decisions win. */
function buildHistoricalWorldInputs(onDate: IsoDate) {
  const year = Number(onDate.slice(0, 4));
  const prices = inputs.priceIndexByYear as Readonly<Record<string, number>>;
  const years = Object.keys(prices)
    .map(Number)
    .sort((a, b) => a - b);
  const selected = years.filter((value) => value <= year).at(-1) ?? years[0]!;
  const last = years.at(-1)!;
  const previous = years.at(-2)!;
  const drift = prices[last]! / prices[previous]!;
  const priceIndex =
    year > last
      ? prices[last]! * drift ** (year - last)
      : year < selected
        ? prices[selected]! / drift ** (selected - year)
        : prices[selected]!;
  return {
    year,
    historical: year < inputs.contemporaryYear,
    priceIndex,
    nominalFactor: priceIndex / prices[inputs.contemporaryYear]!,
    priceSource: inputs.sources.prices,
    priceBasis:
      year === selected
        ? "researched"
        : "ESTIMATED FROM AVERAGE: recorded price-series drift",
    houseSeats:
      year < Number(inputs.apportionmentStartsAt.slice(0, 4)) ||
      onDate < inputs.apportionmentStartsAt
        ? (inputs.previousHouseSeats as Readonly<Record<string, number>>)
        : ({} as Readonly<Record<string, number>>),
    firstPresidentialCycle: inputs.firstPresidentialCycle,
  };
}

const yearInputs = new Map<
  string,
  ReturnType<typeof buildHistoricalWorldInputs>
>();
export function historicalWorldInputs(onDate: IsoDate) {
  const key = `${onDate.slice(0, 4)}:${onDate < inputs.apportionmentStartsAt}`;
  let context = yearInputs.get(key);
  if (!context) {
    context = buildHistoricalWorldInputs(onDate);
    yearInputs.set(key, context);
  }
  return context;
}

/** Dated wage evidence; absent years drift from this place's own recorded floor. */
export function historicalMinimumWage(placeKey: string, onDate: IsoDate) {
  const context = historicalWorldInputs(onDate);
  const years = (
    inputs.minimumHourlyMinorByPlaceAndYear as Readonly<
      Record<string, Readonly<Record<string, number>>>
    >
  )[placeKey];
  const rows =
    (
      wageMatrix.places as Readonly<
        Record<
          string,
          {
            rows: readonly {
              value: number;
              operativeAt: string;
              source: string;
            }[];
          }
        >
      >
    )[placeKey]?.rows ?? [];
  const known = rows
    .filter((row) => row.operativeAt <= onDate)
    .sort((a, b) => b.operativeAt.localeCompare(a.operativeAt));
  const annual = years?.[context.year];
  const latestDate = known[0]?.operativeAt;
  const latest = known.filter((row) => row.operativeAt === latestDate);
  if (
    latest.length &&
    (Number(latestDate!.slice(0, 4)) === context.year || !years)
  ) {
    return {
      value: Math.round(
        latest.reduce((sum, row) => sum + row.value, 0) / latest.length,
      ),
      operativeAt: makeIsoDate(latestDate!),
      source: latest.map((row) => row.source).join("; "),
      estimated: latest.length > 1,
    };
  }
  if (annual !== undefined)
    return {
      value: annual,
      operativeAt: makeIsoDate(`${context.year}-01-01`),
      source: `${inputs.sources.wages}; ${inputs.minimumWageSnapshotBasis}`,
      estimated: true,
    };
  const baseYear = years
    ? Math.max(...Object.keys(years).map(Number))
    : Number(rows[0]!.operativeAt.slice(0, 4));
  const baseDate = rows.map((row) => row.operativeAt).sort()[0];
  const peers = rows.filter((row) => row.operativeAt === baseDate);
  const base =
    years?.[baseYear] ??
    peers.reduce((sum, row) => sum + row.value, 0) / peers.length;
  const factor =
    context.priceIndex /
    historicalWorldInputs(makeIsoDate(`${baseYear}-01-01`)).priceIndex;
  return {
    value: Math.round(base * factor),
    operativeAt: makeIsoDate(`${context.year}-01-01`),
    source: `ESTIMATED FROM AVERAGE: same-place recorded wage with ${inputs.sources.prices} drift`,
    estimated: true,
  };
}

const catalog = startingLaw as unknown as {
  defaultOperativeAt: string;
  questions: Readonly<
    Record<string, { answers: Readonly<Record<string, StartingLawRow>> }>
  >;
};

/** Authority and term readers share the same selection, including prior phases. */
export function historicalStartingLawRow(
  questionKey: string,
  placeKey: string,
  onDate: IsoDate,
): { row: StartingLawRow; operativeAt: IsoDate; estimated: boolean } | null {
  const context = historicalWorldInputs(onDate);
  const recorded = catalog.questions[questionKey]?.answers[placeKey];
  const dated =
    recorded ??
    (context.historical
      ? Object.entries(catalog.questions[questionKey]?.answers ?? {}).find(
          ([key, row]) =>
            key.startsWith("US-") === placeKey.startsWith("US-") &&
            (row.operativeAt ?? catalog.defaultOperativeAt) <= onDate,
        )?.[1]
      : undefined);
  if (!dated) return null;
  const defaultAt = makeIsoDate(catalog.defaultOperativeAt);
  const answerAt = makeIsoDate(dated.operativeAt ?? defaultAt);
  let selected =
    answerAt <= onDate
      ? { row: dated, operativeAt: answerAt, estimated: false }
      : dated.before && defaultAt <= onDate
        ? { row: dated.before, operativeAt: defaultAt, estimated: false }
        : null;
  const seen = new Set<string>([answerAt]);
  for (const phase of dated.phases ?? []) {
    const at = makeIsoDate(phase.operativeAt);
    if (at <= answerAt || seen.has(at))
      throw new Error(
        "Starting law phases require distinct dates after the initial rule",
      );
    seen.add(at);
    if (at <= onDate && (!selected || at > selected.operativeAt))
      selected = { row: phase, operativeAt: at, estimated: false };
  }
  if (!context.historical) return selected;
  const isWage = questionKey === wageMatrix.questionKey;
  if (isWage) {
    const wage = historicalMinimumWage(placeKey, onDate);
    const row = selected?.row ?? dated;
    return {
      row: {
        ...row,
        lawTerms: [
          {
            questionKey,
            key: wageMatrix.termKey,
            value: wage.value,
            unit: "minor/hour",
          },
        ],
        regionalTerms: undefined,
      },
      operativeAt: wage.operativeAt,
      estimated: wage.estimated,
    };
  }
  // A sourced later commencement is never backdated. Its prior text, if any,
  // remains authoritative. Undated monetary text is calibrated from its own
  // existing entity, with price drift recorded in this developer-only reader.
  if (!selected || !recorded) {
    const peers = Object.entries(catalog.questions[questionKey]!.answers)
      .filter(
        ([key, row]) =>
          key !== placeKey &&
          key.startsWith("US-") === placeKey.startsWith("US-") &&
          (row.operativeAt ?? catalog.defaultOperativeAt) <= onDate,
      )
      .sort(([a], [b]) => a.localeCompare(b));
    const yes = peers.filter(([, row]) => row.answer === "yes");
    const no = peers.filter(([, row]) => row.answer === "no");
    const comparable = yes.length > no.length ? yes : no;
    const peer = comparable[0]?.[1];
    if (!peer) return null;
    return {
      row: {
        ...peer,
        operativeAt: undefined,
        phases: undefined,
        before: undefined,
        constitution: undefined,
        lawTerms: peer.lawTerms?.map((term) => {
          const values = comparable.flatMap(
            ([, row]) =>
              row.lawTerms
                ?.filter(
                  (entry) => entry.key === term.key && entry.unit === term.unit,
                )
                .map((entry) => entry.value) ?? [],
          );
          const mean =
            values.reduce((sum, value) => sum + value, 0) / values.length;
          return {
            ...term,
            value: term.unit.startsWith("minor")
              ? Math.round(mean * context.nominalFactor)
              : mean,
          };
        }),
      },
      operativeAt: defaultAt,
      estimated: true,
    };
  }
  if (dated.operativeAt !== undefined || !selected.row.lawTerms?.length)
    return selected;
  return {
    ...selected,
    estimated: true,
    row: {
      ...selected.row,
      lawTerms: selected.row.lawTerms.map((term) => ({
        ...term,
        value: term.unit.startsWith("minor")
          ? Math.round(term.value * context.nominalFactor)
          : term.value,
      })),
    },
  };
}
