/**
 * The one-way, reviewed export of compiled office qualifications to the game.
 *
 * `src/source` is Node-only and the browser must never import it. This script
 * is the single seam that carries verified qualification records across that
 * line: it reads the compiled corpus under
 * `data/source/state-office-qualifications/`, keeps the fields a candidacy
 * decision needs, and writes one generated module the simulation can import.
 *
 * What crosses, and what does not. A record's state, office, field, epistemic
 * state, value, citation and effective date cross, because a player who is
 * turned away deserves to be told which law turned them away and when it took
 * effect. The retrieved bytes do not cross, the excerpt does not cross, and the
 * refusal ledger does not cross — those are review material and belong to the
 * source layer and its documentation.
 *
 * Nothing is invented here and nothing is widened. A record that is not KNOWN
 * arrives not-KNOWN, and the read model above it must decide what to do with
 * that rather than reading a value out of it.
 *
 * Regenerate with `npm run export:office-qualifications`. The output is
 * committed so the browser build never runs Node source code.
 */

import { readFileSync, writeFileSync } from "fs";
import path from "path";

import type { QualificationRecord } from "../../src/source/domains/state-office-qualifications/index";
import { isOfficeExistence } from "../../src/source/domains/state-office-qualifications/index";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_PATH = path.join(
  REPOSITORY_ROOT,
  "data/source/state-office-qualifications/corpus.json",
);
const MANIFEST_PATH = path.join(
  REPOSITORY_ROOT,
  "data/source/state-office-qualifications/corpus-manifest.json",
);
const OUTPUT_PATH = path.join(
  REPOSITORY_ROOT,
  "src/simulation/office-qualifications.generated.ts",
);

interface CorpusManifest {
  readonly asOf: string;
  readonly canonicalSha256: string;
  readonly recordCount: number;
  readonly coverage: { readonly universeDescription: string };
  readonly compiler: { readonly name: string; readonly version: string };
}

/**
 * One exported row.
 *
 * `state` is the source layer's own eight-state algebra name, carried across
 * verbatim rather than flattened into "known or not". The difference between
 * NO_REQUIREMENT_FOUND and UNKNOWN is the difference between "this law imposes
 * none" and "nobody here has looked", and a player-facing sentence that
 * conflated them would be a lie in one direction or the other.
 */
interface ExportedRow {
  readonly stateUsps: string;
  readonly officeFamily: string;
  readonly field: string;
  readonly sourceState: string;
  readonly value: string | number | null;
  readonly citation: string;
  readonly authorityType: string;
  readonly effectiveDate: string;
  readonly authorityUrl: string;
  readonly researchBatch: string | null;
  readonly researchArtifactId: string | null;
  readonly researchArtifactSha256: string | null;
  readonly derivation: string;
  readonly derivationChain: string | null;
  readonly notes: string | null;
}

function authorityProvenance(record: QualificationRecord) {
  return {
    researchBatch: record.citedAuthority.researchTransport?.batch ?? null,
    researchArtifactId:
      record.citedAuthority.researchTransport?.artifactId ?? null,
    researchArtifactSha256:
      record.citedAuthority.researchTransport?.sha256 ?? null,
    derivation: record.citedAuthority.derivation,
    derivationChain: record.citedAuthority.derivationChain,
    notes: record.citedAuthority.notes,
  };
}

function rowFor(record: QualificationRecord): ExportedRow {
  if (isOfficeExistence(record)) {
    return {
      stateUsps: record.stateUsps,
      officeFamily: record.officeFamily,
      field: "OFFICE_EXISTENCE",
      sourceState: record.exists.state,
      value:
        record.exists.state === "KNOWN"
          ? String(record.exists.value)
          : record.exists.state === "NOT_YET_OPERATIVE"
            ? String(record.exists.value)
            : null,
      citation: record.citedAuthority.legalLocator,
      authorityType: record.citedAuthority.authorityType,
      effectiveDate: record.citedAuthority.effectiveDate,
      authorityUrl: record.citedAuthority.authorityUrl,
      ...authorityProvenance(record),
    };
  }
  const requirement = record.requirement;
  return {
    stateUsps: record.stateUsps,
    officeFamily: record.officeFamily,
    field: record.field,
    sourceState: requirement.state,
    value:
      requirement.state === "KNOWN" ||
      requirement.state === "HISTORICAL" ||
      requirement.state === "NOT_YET_OPERATIVE"
        ? (requirement.value ?? null)
        : null,
    citation: record.citedAuthority.legalLocator,
    authorityType: record.citedAuthority.authorityType,
    effectiveDate: record.citedAuthority.effectiveDate,
    authorityUrl: record.citedAuthority.authorityUrl,
    ...authorityProvenance(record),
  };
}

function main(): void {
  const records = JSON.parse(
    readFileSync(CORPUS_PATH, "utf8"),
  ) as readonly QualificationRecord[];
  const manifest = JSON.parse(
    readFileSync(MANIFEST_PATH, "utf8"),
  ) as CorpusManifest;

  const rows = records.map(rowFor).sort((left, right) => {
    const leftKey = `${left.stateUsps}:${left.officeFamily}:${left.field}`;
    const rightKey = `${right.stateUsps}:${right.officeFamily}:${right.field}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

  const states = [...new Set(rows.map((row) => row.stateUsps))].sort();

  const output = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/export-office-qualifications.ts\` from the
 * compiled \`state-office-qualifications\` corpus. Every row below was checked
 * against the enacted text of the provision it cites, in bytes this repository
 * retrieved from the state's own publisher and hashed. Regenerate with
 * \`npm run export:office-qualifications\`.
 *
 * This file imports nothing from \`src/source\`; it is the browser-safe side of
 * the one-way source-to-game seam.
 *
 * The states below are the states whose authorities were retrieved. Every other
 * state is absent, and its absence is a fact about this repository rather than
 * about that state's law — which is why the read model above this file says
 * "the game has not read" rather than "there is no rule".
 */

/** Provenance for the qualification rows below. Surfaced honestly. */
export const OFFICE_QUALIFICATIONS_META = ${JSON.stringify(
    {
      asOf: manifest.asOf,
      corpusSha256: manifest.canonicalSha256,
      compiler: `${manifest.compiler.name}@${manifest.compiler.version}`,
      recordCount: manifest.recordCount,
      states,
      coverage: manifest.coverage.universeDescription,
    },
    null,
    2,
  )} as const;

/**
 * One row per verified qualification fact, as one JSON string.
 *
 * Kept as a string so the type checker never has to describe the literal, and
 * parsed once by \`office-qualification-rules.ts\`.
 */
export const OFFICE_QUALIFICATION_ROWS: string =
  ${JSON.stringify(JSON.stringify(rows))};
`;

  writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(
    `export:office-qualifications — ${rows.length} rows across ${states.length} states (${states.join(", ")})`,
  );
}

main();
