/**
 * What this substrate actually knows, counted honestly.
 *
 * A coverage report exists so that "fifty states" cannot be mistaken for "fifty
 * states known". Both numbers are here, side by side, and so is the third one
 * that matters most: how many states have identity but no bill procedure, which
 * is the gap this domain was built to make visible.
 *
 * The report is derived from the corpus and nothing else, so it cannot drift
 * from it, and it carries no wall clock so it replays byte-identically.
 */

import { citedArtifactIds, isUnresolved } from "../../core/index";
import type { CompiledCorpus } from "../../core/index";
import type { StateLegislatureIdentity } from "./types";

/** The five states accepted main already carries full bill procedure for. */
export const PROCEDURAL_PACK_STATES: readonly string[] = [
  "US-AK",
  "US-IL",
  "US-KY",
  "US-MN",
  "US-NE",
];

export interface StateCoverage {
  readonly jurisdictionKey: string;
  readonly stateName: string;
  readonly structureKnown: boolean;
  readonly chamberCount: number;
  readonly chambersWithKnownName: number;
  readonly chambersWithKnownSeatCount: number;
  readonly chambersWithKnownElection: number;
  readonly gapCount: number;
  readonly hasProceduralRulePack: boolean;
}

export interface CoverageReport {
  readonly reportVersion: string;
  readonly corpusId: string;
  readonly asOf: string;
  readonly canonicalSha256: string;
  readonly stateCount: number;
  readonly statesWithKnownStructure: number;
  /** Structure known, and every chamber's name, seats and election known. */
  readonly statesWithCompleteChamberIdentity: number;
  readonly statesWithAnyUnknownSeatOrElection: number;
  readonly statesWithNoCompiledFact: number;
  readonly distinctSourceArtifacts: number;
  readonly sourceArtifactIds: readonly string[];
  readonly proceduralPackStates: readonly string[];
  readonly identityOnlyStates: readonly string[];
  readonly states: readonly StateCoverage[];
}

export function buildCoverageReport(
  compiled: CompiledCorpus<StateLegislatureIdentity>,
): CoverageReport {
  const artifacts = new Set<string>();
  const states: StateCoverage[] = [];
  let completeIdentity = 0;
  let anyUnknown = 0;
  let nothing = 0;
  let structureKnownCount = 0;
  const identityOnly: string[] = [];

  for (const record of compiled.records) {
    const collect = (ids: readonly string[]): void => {
      for (const id of ids) artifacts.add(id);
    };
    // `citedArtifactIds` covers the investigated evidence an UNKNOWN carries,
    // which is exactly the provenance a coverage count would otherwise lose:
    // the provisions that were read and found to delegate or to give a range.
    collect(citedArtifactIds(record.legislatureName));
    collect(citedArtifactIds(record.structure));

    let knownNames = 0;
    let knownSeats = 0;
    let knownElection = 0;
    for (const chamber of record.chambers) {
      collect(citedArtifactIds(chamber.name));
      collect(citedArtifactIds(chamber.seatCount));
      collect(citedArtifactIds(chamber.membersElected));
      if (!isUnresolved(chamber.name)) knownNames += 1;
      if (!isUnresolved(chamber.seatCount)) knownSeats += 1;
      if (!isUnresolved(chamber.membersElected)) knownElection += 1;
    }

    const structureKnown = !isUnresolved(record.structure);
    if (structureKnown) structureKnownCount += 1;

    const complete =
      structureKnown &&
      record.chambers.length > 0 &&
      knownNames === record.chambers.length &&
      knownSeats === record.chambers.length &&
      knownElection === record.chambers.length;
    if (complete) completeIdentity += 1;
    if (
      record.chambers.length > 0 &&
      (knownSeats < record.chambers.length ||
        knownElection < record.chambers.length)
    ) {
      anyUnknown += 1;
    }
    if (!structureKnown && record.chambers.length === 0) nothing += 1;

    const hasPack = PROCEDURAL_PACK_STATES.includes(record.jurisdictionKey);
    if (!hasPack && structureKnown) identityOnly.push(record.jurisdictionKey);

    states.push({
      jurisdictionKey: record.jurisdictionKey,
      stateName: record.stateName,
      structureKnown,
      chamberCount: record.chambers.length,
      chambersWithKnownName: knownNames,
      chambersWithKnownSeatCount: knownSeats,
      chambersWithKnownElection: knownElection,
      gapCount: record.unresolvedGaps.length,
      hasProceduralRulePack: hasPack,
    });
  }

  return {
    reportVersion: "1",
    corpusId: compiled.corpus.corpusId,
    asOf: compiled.corpus.asOf,
    canonicalSha256: compiled.corpus.canonicalSha256,
    stateCount: compiled.records.length,
    statesWithKnownStructure: structureKnownCount,
    statesWithCompleteChamberIdentity: completeIdentity,
    statesWithAnyUnknownSeatOrElection: anyUnknown,
    statesWithNoCompiledFact: nothing,
    distinctSourceArtifacts: artifacts.size,
    sourceArtifactIds: [...artifacts].sort(),
    proceduralPackStates: [...PROCEDURAL_PACK_STATES],
    identityOnlyStates: identityOnly.sort(),
    states,
  };
}

/** The same report as prose, for a reader rather than a consumer. */
export function renderCoverageMarkdown(report: CoverageReport): string {
  const lines: string[] = [];
  lines.push("# State elective-office identity — source coverage");
  lines.push("");
  lines.push(
    `Corpus \`${report.corpusId}\`, as of ${report.asOf}, records hashing to \`${report.canonicalSha256}\`.`,
  );
  lines.push("");
  lines.push(`- States present: **${report.stateCount}**`);
  lines.push(
    `- States with a known legislature structure: **${report.statesWithKnownStructure}**`,
  );
  lines.push(
    `- States with complete chamber identity (name, seats and election known for every chamber): **${report.statesWithCompleteChamberIdentity}**`,
  );
  lines.push(
    `- States carrying at least one UNKNOWN seat count or election fact: **${report.statesWithAnyUnknownSeatOrElection}**`,
  );
  lines.push(
    `- States with nothing compiled, each carrying a gap saying why: **${report.statesWithNoCompiledFact}**`,
  );
  lines.push(
    `- Distinct source artifacts cited: **${report.distinctSourceArtifacts}**`,
  );
  lines.push(
    `- States with a full legislative rule pack on main: **${report.proceduralPackStates.length}** (${report.proceduralPackStates.join(", ")})`,
  );
  lines.push(
    `- States with identity here but no rule pack: **${report.identityOnlyStates.length}**`,
  );
  lines.push("");
  /*
   * The table is column-padded here rather than left ragged.
   *
   * This file is generated and also checked by `prettier --check`, and prettier
   * pads markdown tables. Emitting the padded form is what lets the same file be
   * both regenerated byte-identically and formatted.
   */
  const header = [
    "State",
    "Structure",
    "Chambers",
    "Names",
    "Seats",
    "Elected",
    "Gaps",
    "Rule pack",
  ];
  const rows = report.states.map((state) => [
    `${state.jurisdictionKey} ${state.stateName}`,
    state.structureKnown ? "known" : "UNKNOWN",
    String(state.chamberCount),
    String(state.chambersWithKnownName),
    String(state.chambersWithKnownSeatCount),
    String(state.chambersWithKnownElection),
    String(state.gapCount),
    state.hasProceduralRulePack ? "yes" : "no",
  ]);
  const widths = header.map((cell, column) =>
    Math.max(cell.length, ...rows.map((row) => (row[column] ?? "").length)),
  );
  const line = (cells: readonly string[]): string =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(" | ")} |`;
  lines.push(line(header));
  lines.push(`| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`);
  for (const row of rows) lines.push(line(row));
  lines.push("");
  return `${lines.join("\n")}`;
}
