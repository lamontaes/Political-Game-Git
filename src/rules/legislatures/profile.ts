import type {
  LegislativeRulePack,
  RuleSourceRef,
  RuleValue,
} from "../../simulation/legislature-rules";
import type {
  LegislatureProfile,
  SeatBasis,
  ChamberSeatCount,
  OverrideThresholdChoice,
} from "../../simulation/legislature-game-profile";
import type { VetoOverrideSourceReading } from "../../simulation/veto-override-source-readings";
export interface LegislatureProfileFacts {
  readonly researchedPacks: readonly LegislativeRulePack[];
  readonly vetoRows: readonly VetoWindowRow[];
  readonly seatRows: readonly ChamberSeatRow[];
  readonly overrideReadings: readonly VetoOverrideSourceReading[];
  readonly noStateLegislature: ReadonlySet<string>;
  readonly settledSeats: Readonly<
    Record<string, { lower: number; upper: number; source: RuleSourceRef }>
  >;
  readonly districtSeats: { readonly lower: number; readonly upper: number };
  readonly chamberSource: RuleSourceRef;
  readonly vetoSourceCitation: string;
  readonly version: string;
}
function knownRule<T>(value: T, source: RuleSourceRef): RuleValue<T> {
  return { kind: "known", value, source };
}
function profileSource(
  facts: LegislatureProfileFacts,
  citation: string,
  note: string,
): RuleSourceRef {
  return {
    authority: "game-profile",
    citation,
    sourceTitle: `Our Civic Duty legislature profile (${facts.version})`,
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note,
  };
}
function compiledChamberSeats(
  rows: readonly ChamberSeatRow[],
  jurisdictionKey: string,
): {
  readonly lower: number | null;
  readonly upper: number | null;
  readonly unicameral: number | null;
} | null {
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey)?.[1];
  const row = rows.find((candidate) => candidate.usps === usps);
  if (!row) return null;
  return {
    lower: row.lowerSeats,
    upper: row.upperSeats,
    unicameral: row.unicameralSeats,
  };
}
export function middleOf(values: readonly number[]): number {
  return values[Math.floor((values.length - 1) / 2)]!;
}

interface ChamberSeatRow {
  readonly usps: string;
  readonly lowerSeats: number | null;
  readonly upperSeats: number | null;
  readonly unicameralSeats: number | null;
}

interface VetoWindowRow {
  readonly usps: string;
  readonly inSessionDays: number | null;
  readonly afterAdjournmentDays: number | null;
  readonly table: {
    readonly duringSession: string;
    readonly afterSessionBecomesLawUnlessVetoed: string;
    readonly afterSessionDiesUnlessSigned: string;
  };
}

export function vetoWindowDayBasisFor(
  facts: LegislatureProfileFacts,
  stateJurisdictionKey: string,
  afterAdjournment: boolean,
) {
  const cellFor = (row: VetoWindowRow) =>
    afterAdjournment
      ? row.table.afterSessionBecomesLawUnlessVetoed ||
        row.table.afterSessionDiesUnlessSigned
      : row.table.duringSession;
  const row = facts.vetoRows.find(
    (candidate) => candidate.usps === stateJurisdictionKey.replace(/^US-/, ""),
  );
  const cell = row ? cellFor(row) : "";
  const observations = facts.vetoRows.map(cellFor).filter(Boolean);
  const calendarCount = observations.filter((value) =>
    value.includes("(q)"),
  ).length;
  const basis = cell
    ? cell.includes("(q)")
      ? ("CALENDAR" as const)
      : ("SUNDAYS_EXCEPTED" as const)
    : calendarCount > observations.length / 2
      ? ("CALENDAR" as const)
      : ("SUNDAYS_EXCEPTED" as const);
  return knownRule(
    basis,
    profileSource(
      facts,
      "Veto action day counting",
      `${facts.vetoSourceCitation} says days exclude Sundays unless footnote (q) applies. ${cell ? `This row's recorded cell is ${cell}.` : "This row has no cell; the day basis is ESTIMATED from the most common basis among the table's recorded cells."}`,
    ),
  );
}

export function mostCommon(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(
    ([a, countA], [b, countB]) => countB - countA || b - a,
  )[0]![0];
}

export function vetoWindowFor(
  facts: LegislatureProfileFacts,
  stateJurisdictionKey: string,
): {
  readonly inSessionDays: number;
  readonly afterAdjournmentDays: number;
  readonly inSessionEstimated: boolean;
  readonly afterAdjournmentEstimated: boolean;
} {
  const row = facts.vetoRows.find(
    (candidate) => `US-${candidate.usps}` === stateJurisdictionKey,
  );
  const inSession = row?.inSessionDays ?? null;
  const after = row?.afterAdjournmentDays ?? null;
  return {
    inSessionDays:
      inSession ??
      mostCommon(facts.vetoRows.flatMap((r) => r.inSessionDays ?? [])),
    afterAdjournmentDays:
      after ??
      mostCommon(facts.vetoRows.flatMap((r) => r.afterAdjournmentDays ?? [])),
    inSessionEstimated: inSession === null,
    afterAdjournmentEstimated: after === null,
  };
}

export function mostCommonReadOverride(
  facts: LegislatureProfileFacts,
): readonly [number, number] {
  const counts = new Map<string, number>();
  for (const reading of facts.overrideReadings) {
    const threshold = reading.actions[0]?.thresholds[0];
    if (!threshold) continue;
    const key = `${threshold.numerator}/${threshold.denominatorParts}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [best] = [...counts.entries()].sort(
    ([a, countA], [b, countB]) =>
      countB - countA || fractionValue(b) - fractionValue(a),
  );
  const [numerator, denominatorParts] = best![0].split("/").map(Number);
  return [numerator!, denominatorParts!];
}

export function fractionValue(fraction: string): number {
  const [numerator, denominatorParts] = fraction.split("/").map(Number);
  return numerator! / denominatorParts!;
}

export function ascendingDistinct(
  values: readonly number[],
): readonly number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

export function researchedChamberSpread(facts: LegislatureProfileFacts): {
  readonly lowerSeats: readonly number[];
  readonly senatePercentOfHouse: readonly number[];
} {
  const lowerSeats: number[] = [];
  const senatePercentOfHouse: number[] = [];
  for (const pack of facts.researchedPacks) {
    if (pack.basis !== "researched" || pack.structure !== "bicameral") continue;
    const [lower, upper] = pack.chamberOrder;
    const lowerChamber = pack.chambers.find((c) => c.chamberKey === lower);
    const upperChamber = pack.chambers.find((c) => c.chamberKey === upper);
    if (lowerChamber?.seats.kind !== "known") continue;
    lowerSeats.push(lowerChamber.seats.value);
    if (upperChamber?.seats.kind !== "known") continue;
    senatePercentOfHouse.push(
      Math.round((upperChamber.seats.value / lowerChamber.seats.value) * 100),
    );
  }
  return {
    lowerSeats: ascendingDistinct(lowerSeats),
    senatePercentOfHouse: ascendingDistinct(senatePercentOfHouse),
  };
}

export function researchedExecutiveSpread(facts: LegislatureProfileFacts): {
  readonly inSessionDays: readonly number[];
  readonly afterAdjournmentDays: readonly number[];
  readonly overrideFractions: readonly (readonly [number, number])[];
} {
  const inSessionDays: number[] = [];
  const afterAdjournmentDays: number[] = [];
  const overrideFractions: (readonly [number, number])[] = [];
  const seenFractions = new Set<string>();
  for (const pack of facts.researchedPacks) {
    if (pack.basis !== "researched") continue;
    const executive = pack.executive;
    if (executive.actionWindowDaysInSession.kind === "known") {
      inSessionDays.push(executive.actionWindowDaysInSession.value);
    }
    if (executive.actionWindowDaysAfterAdjournment.kind === "known") {
      afterAdjournmentDays.push(
        executive.actionWindowDaysAfterAdjournment.value,
      );
    }
    if (executive.override.kind === "each-chamber") {
      const { numerator, denominatorParts } = executive.override.threshold;
      const key = `${numerator}/${denominatorParts}`;
      if (!seenFractions.has(key)) {
        seenFractions.add(key);
        overrideFractions.push([numerator, denominatorParts]);
      }
    }
  }
  return {
    inSessionDays: ascendingDistinct(inSessionDays),
    afterAdjournmentDays: ascendingDistinct(afterAdjournmentDays),
    overrideFractions: [...overrideFractions].sort(
      (left, right) => left[0] / left[1] - right[0] / right[1],
    ),
  };
}

export function buildLegislatureProfile(
  facts: LegislatureProfileFacts,
  stateJurisdictionKey: string,
): LegislatureProfile | null {
  if (facts.noStateLegislature.has(stateJurisdictionKey)) return null;
  const chambers = researchedChamberSpread(facts);
  const executive = researchedExecutiveSpread(facts);
  if (
    chambers.lowerSeats.length === 0 ||
    chambers.senatePercentOfHouse.length === 0 ||
    executive.inSessionDays.length === 0 ||
    executive.afterAdjournmentDays.length === 0 ||
    executive.overrideFractions.length === 0
  ) {
    return null;
  }
  const settled = facts.settledSeats[stateJurisdictionKey] ?? null;
  const row = compiledChamberSeats(facts.seatRows, stateJurisdictionKey);
  const compiled =
    row && row.lower !== null && row.upper !== null
      ? { lower: row.lower, upper: row.upper }
      : null;
  const lowerDistricts = facts.districtSeats.lower;
  const upperDistricts = facts.districtSeats.upper;
  const lowerEstimate = middleOf(chambers.lowerSeats);
  const lowerSeats =
    settled?.lower ??
    compiled?.lower ??
    (lowerDistricts > 0 ? lowerDistricts : lowerEstimate);
  const upperEstimate = Math.min(
    lowerSeats - 1,
    Math.max(
      2,
      Math.round((lowerSeats * middleOf(chambers.senatePercentOfHouse)) / 100),
    ),
  );
  const basis = (districts: number): SeatBasis =>
    settled
      ? "settled"
      : compiled
        ? "compiled-table"
        : districts > 0
          ? "census-districts"
          : "estimated";
  return {
    stateJurisdictionKey,
    version: facts.version,
    lowerSeats,
    upperSeats:
      settled?.upper ??
      compiled?.upper ??
      (upperDistricts > 0 ? upperDistricts : upperEstimate),
    lowerSeatsBasis: basis(lowerDistricts),
    upperSeatsBasis: basis(upperDistricts),
    seatSource: settled?.source ?? (compiled ? facts.chamberSource : null),
    vetoWindowDaysInSession: vetoWindowFor(facts, stateJurisdictionKey)
      .inSessionDays,
    vetoWindowDaysAfterAdjournment: vetoWindowFor(facts, stateJurisdictionKey)
      .afterAdjournmentDays,
    overrideFraction: mostCommonReadOverride(facts),
  };
}

export function committeeSize(seats: number): number {
  return Math.max(5, Math.min(25, Math.round(seats / 6)));
}

export function seatsForChamber(
  facts: LegislatureProfileFacts,
  pack: LegislativeRulePack,
  chamberKey: string,
): ChamberSeatCount | null {
  const chamber = pack.chambers.find(
    (candidate) => candidate.chamberKey === chamberKey,
  );
  if (!chamber) return null;
  if (chamber.seats.kind === "known") {
    return {
      seats: chamber.seats.value,
      basis:
        pack.basis === "game-profile" &&
        chamber.seats.source.authority === "game-profile"
          ? "game-profile"
          : "researched",
    };
  }
  const compiled = compiledChamberSeats(facts.seatRows, pack.jurisdictionKey);
  const isUpper =
    pack.structure === "bicameral" && pack.chamberOrder[1] === chamberKey;
  if (compiled) {
    const seats =
      pack.structure === "bicameral"
        ? isUpper
          ? compiled.upper
          : compiled.lower
        : compiled.unicameral;
    if (seats !== null) return { seats, basis: "researched" };
  }
  const spread = researchedChamberSpread(facts);
  if (spread.lowerSeats.length === 0) return null;
  if (isUpper && spread.senatePercentOfHouse.length > 0) {
    const lower = seatsForChamber(facts, pack, pack.chamberOrder[0]!);
    if (lower !== null) {
      return {
        seats: Math.min(
          lower.seats - 1,
          Math.max(
            2,
            Math.round(
              (lower.seats * middleOf(spread.senatePercentOfHouse)) / 100,
            ),
          ),
        ),
        basis: "game-profile",
      };
    }
  }
  return { seats: middleOf(spread.lowerSeats), basis: "game-profile" };
}

export function overrideThresholdFor(
  facts: LegislatureProfileFacts,
  stateJurisdictionKey: string,
  drawn: readonly [number, number],
): OverrideThresholdChoice {
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1] ?? "";
  const reading =
    facts.overrideReadings.find((row) => row.stateUsps === usps) ?? null;
  const fallback: OverrideThresholdChoice = {
    numerator: drawn[0],
    denominatorParts: drawn[1],
    rounding: "at-least-fraction",
    label: `${drawn[0]} of ${drawn[1]} of the members elected to each chamber`,
    countedAgainst: "members-elected",
    basis: "game-profile",
    readBasis: null,
    unexpressed: [],
  };
  if (reading === null || reading.actions.length === 0) return fallback;
  const overrides = reading.actions.filter((action) =>
    /override|restore/i.test(action.operation),
  );
  const candidates = overrides.length > 0 ? overrides : reading.actions;
  const ordinary =
    candidates.find(
      (action) =>
        !/^(?!.*non)(?=.*(appropriation|budget|revenue)).*$/i.test(
          action.operation,
        ),
    ) ?? candidates[0]!;
  const chosen = ordinary.thresholds.find(
    (threshold) => threshold.countedAgainst !== null,
  );
  const primary = chosen ?? ordinary.thresholds[0];
  if (!primary) return fallback;
  const unexpressed: string[] = [];
  if (primary.countedAgainst === null) {
    unexpressed.push(
      `${reading.name} counts its override against "${primary.readBasis}" (${reading.locator}), which is not the same set as anything this schema names. The fraction is the instrument's; the denominator is the game's nearest.`,
    );
  }
  for (const other of ordinary.thresholds) {
    if (other === primary) continue;
    unexpressed.push(
      `${reading.name} also requires ${other.numerator} of ${other.denominatorParts} of "${other.readBasis}" for the same override (${reading.locator}). This schema carries one threshold per forum, so that condition is recorded here rather than enforced, and the override is easier in play than the instrument allows.`,
    );
  }
  for (const action of reading.actions) {
    if (action === ordinary) continue;
    const stated = action.thresholds
      .map(
        (threshold) =>
          `${threshold.numerator} of ${threshold.denominatorParts} of "${threshold.readBasis}"`,
      )
      .join(" and ");
    unexpressed.push(
      `${reading.name} sets a separate bar for ${action.operation}: ${stated} (${reading.locator}). An each-chamber forum in this schema carries no per-measure-class threshold, so that is recorded rather than applied.`,
    );
  }
  return {
    numerator: primary.numerator,
    denominatorParts: primary.denominatorParts,
    rounding: primary.rounding ?? "at-least-fraction",
    label:
      primary.rounding === "strictly-greater-than-fraction" &&
      primary.numerator * 2 === primary.denominatorParts
        ? `A majority of ${primary.readBasis}`
        : `${primary.numerator} of ${primary.denominatorParts} of ${primary.readBasis}`,
    countedAgainst: primary.countedAgainst ?? "members-elected",
    basis: "read",
    readBasis: primary.readBasis,
    unexpressed,
  };
}

// stopgapId: "SG-P14-legislatures-profile-estimates"
