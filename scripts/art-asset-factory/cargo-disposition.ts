import type { AssetManifest } from "./schemas";

/**
 * The cargo disposition ledger.
 *
 * Two convergence questions have to be answered in writing and kept honest:
 * what happened to the unique production cargo on the superseded graphics
 * branches, and what happened to the externally downloaded asset packs. Both
 * are the same shape of claim — "this material was re-homed / archived /
 * rejected, for this reason, on this evidence" — so both live in one ledger
 * with one set of rules.
 *
 * The rules exist because a disposition ledger is worthless if it can claim
 * things nobody checked. So:
 *
 * - a `re-homed` entry must name real manifest assets AND must have been
 *   measured in this repository, not read off a filename;
 * - an `archive` or `rejected` entry must give a reason;
 * - a `pending-verification` entry must say exactly what command would settle
 *   it, and may not claim any re-homed asset;
 * - nothing may be re-homed on metadata alone.
 *
 * The ledger is bookkeeping. It is never loaded by the runtime and holds no
 * art of its own.
 */

export const CARGO_DISPOSITIONS = [
  "re-homed",
  "archive",
  "rejected",
  "pending-verification",
] as const;

export type CargoDisposition = (typeof CARGO_DISPOSITIONS)[number];

export const CARGO_VERIFICATION_LEVELS = [
  /** The bytes are in this repository and were measured here. */
  "measured-in-repository",
  /** Only catalogue metadata was available: name, size, type. */
  "metadata-only",
  /** Nothing about the material was checked. */
  "not-verified",
] as const;

export type CargoVerificationLevel = (typeof CARGO_VERIFICATION_LEVELS)[number];

export const CARGO_SOURCE_KINDS = [
  "repository-branch",
  "external-pack",
] as const;

export type CargoSourceKind = (typeof CARGO_SOURCE_KINDS)[number];

export const CARGO_BASES = ["technical", "legal", "authority"] as const;
export type CargoBasis = (typeof CARGO_BASES)[number];

export interface CargoSource {
  readonly source_id: string;
  readonly kind: CargoSourceKind;
  /** Where the material came from: a commit, a Drive id, a store listing. */
  readonly reference: string;
  readonly note: string;
}

export interface CargoEntry {
  readonly entry_id: string;
  readonly source_id: string;
  readonly label: string;
  readonly disposition: CargoDisposition;
  /** Why the disposition is what it is: technical, legal, or by authority. */
  readonly basis: readonly CargoBasis[];
  readonly reason: string;
  readonly verified_by: CargoVerificationLevel;
  /** Required unless the material was measured here: how to settle it. */
  readonly verify_command?: string;
  /** Required for `re-homed`: the manifest assets this became. */
  readonly rehomed_asset_ids?: readonly string[];
  /** Optional measured evidence, free-form but recorded. */
  readonly measurements?: Readonly<Record<string, string | number | boolean>>;
}

export interface CargoDispositionLedger {
  readonly ledger_version: string;
  readonly sources: readonly CargoSource[];
  readonly entries: readonly CargoEntry[];
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Structural validation of the ledger against the asset manifest. Returns
 * named errors so the art validator can aggregate them with everything else.
 */
export function validateCargoDisposition(
  ledger: CargoDispositionLedger,
  manifest: AssetManifest,
): readonly string[] {
  const errors: string[] = [];
  if (!ledger || typeof ledger !== "object") {
    return ["Cargo disposition ledger is missing or not an object."];
  }
  if (!isNonEmptyString(ledger.ledger_version)) {
    errors.push("Cargo disposition ledger must declare 'ledger_version'.");
  }
  if (!Array.isArray(ledger.sources) || !Array.isArray(ledger.entries)) {
    errors.push(
      "Cargo disposition ledger must declare 'sources' and 'entries' arrays.",
    );
    return errors;
  }

  const sourceIds = new Set<string>();
  for (const source of ledger.sources) {
    if (!isNonEmptyString(source?.source_id)) {
      errors.push("A cargo source is missing its 'source_id'.");
      continue;
    }
    if (sourceIds.has(source.source_id)) {
      errors.push(`Duplicate cargo source '${source.source_id}'.`);
    }
    sourceIds.add(source.source_id);
    if (!(CARGO_SOURCE_KINDS as readonly string[]).includes(source.kind)) {
      errors.push(
        `Cargo source '${source.source_id}' has invalid kind '${source.kind}'.`,
      );
    }
    for (const field of ["reference", "note"] as const) {
      if (!isNonEmptyString(source[field])) {
        errors.push(
          `Cargo source '${source.source_id}' must declare a non-empty '${field}'.`,
        );
      }
    }
  }

  const assetIds = new Set(manifest.assets.map((asset) => asset.asset_id));
  const entryIds = new Set<string>();
  for (const entry of ledger.entries) {
    if (!isNonEmptyString(entry?.entry_id)) {
      errors.push("A cargo entry is missing its 'entry_id'.");
      continue;
    }
    const label = `Cargo entry '${entry.entry_id}'`;
    if (entryIds.has(entry.entry_id)) {
      errors.push(`Duplicate cargo entry '${entry.entry_id}'.`);
    }
    entryIds.add(entry.entry_id);

    if (!sourceIds.has(entry.source_id)) {
      errors.push(`${label} names unknown source '${entry.source_id}'.`);
    }
    if (!isNonEmptyString(entry.label)) {
      errors.push(`${label} must declare a non-empty 'label'.`);
    }
    if (!isNonEmptyString(entry.reason)) {
      errors.push(
        `${label} must give a reason. A disposition without one is an assertion, not a decision.`,
      );
    }
    if (
      !(CARGO_DISPOSITIONS as readonly string[]).includes(entry.disposition)
    ) {
      errors.push(`${label} has invalid disposition '${entry.disposition}'.`);
      continue;
    }
    if (
      !(CARGO_VERIFICATION_LEVELS as readonly string[]).includes(
        entry.verified_by,
      )
    ) {
      errors.push(`${label} has invalid verified_by '${entry.verified_by}'.`);
      continue;
    }
    if (
      !Array.isArray(entry.basis) ||
      entry.basis.length === 0 ||
      entry.basis.some(
        (basis) => !(CARGO_BASES as readonly string[]).includes(basis),
      )
    ) {
      errors.push(
        `${label} must declare a non-empty 'basis' drawn from ${CARGO_BASES.join(", ")}.`,
      );
    }

    if (entry.verified_by !== "measured-in-repository") {
      if (!isNonEmptyString(entry.verify_command)) {
        errors.push(
          `${label} was not measured here and must name the 'verify_command' that would settle it.`,
        );
      }
    } else if (entry.verify_command !== undefined) {
      errors.push(
        `${label} was measured here and must not also carry a verify_command.`,
      );
    }

    if (entry.disposition === "re-homed") {
      if (entry.verified_by !== "measured-in-repository") {
        errors.push(
          `${label} claims material was re-homed but was only ${entry.verified_by}. Nothing is re-homed on metadata alone.`,
        );
      }
      const rehomed = entry.rehomed_asset_ids;
      if (!Array.isArray(rehomed) || rehomed.length === 0) {
        errors.push(
          `${label} claims material was re-homed and must name the manifest assets it became.`,
        );
      } else {
        for (const assetId of rehomed) {
          if (!assetIds.has(assetId)) {
            errors.push(
              `${label} claims re-homed asset '${assetId}', which the asset manifest does not contain.`,
            );
          }
        }
      }
    } else if (
      entry.rehomed_asset_ids !== undefined &&
      entry.rehomed_asset_ids.length > 0
    ) {
      errors.push(
        `${label} is '${entry.disposition}' and must not claim re-homed assets.`,
      );
    }
  }

  return errors;
}
