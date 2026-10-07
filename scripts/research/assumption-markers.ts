import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { isScanned, walk } from "./placeholder-scan";

export interface AssumptionMarker {
  file: string;
  line: number;
  text: string;
  occurrence: number;
}

export interface AssumptionDisposition extends AssumptionMarker {
  disposition: "rebuild" | "acceptable";
  rebuildStep: string | null;
  reason: string;
}

/** Exact words from A166; broader research-marker coverage stays in the existing ledger. */
export function markersInSource(
  file: string,
  source: string,
): AssumptionMarker[] {
  const occurrences = new Map<string, number>();
  return source.split("\n").flatMap((line, index) => {
    if (!/\bPLACEHOLDER\b|\bUNRESEARCHED\b|SET BY HAND/.test(line)) return [];
    const text = line.trim();
    const occurrence = (occurrences.get(text) ?? 0) + 1;
    occurrences.set(text, occurrence);
    return [{ file, line: index + 1, text, occurrence }];
  });
}

export function scanAssumptions(root: string): AssumptionMarker[] {
  const files: string[] = [];
  walk(resolve(root, "src"), files);
  return files.flatMap((full) => {
    const file = relative(root, full).split("\\").join("/");
    if (!isScanned(file) || /\.spec\.tsx?$/.test(file)) return [];
    return markersInSource(file, readFileSync(full, "utf8"));
  });
}

function identity(marker: AssumptionMarker): string {
  return JSON.stringify([marker.file, marker.text, marker.occurrence]);
}

/** Line numbers are evidence, not identity: an unrelated inserted line needs no remapping. */
export function unmappedAssumptions(
  markers: readonly AssumptionMarker[],
  mappings: readonly AssumptionDisposition[],
): AssumptionMarker[] {
  const mapped = new Set(mappings.map(identity));
  return markers.filter((marker) => !mapped.has(identity(marker)));
}

export function dispositionErrors(
  mappings: readonly AssumptionDisposition[],
  rebuildSteps: ReadonlySet<string>,
): string[] {
  const seen = new Set<string>();
  return mappings.flatMap((mapping) => {
    const errors: string[] = [];
    const key = identity(mapping);
    if (seen.has(key)) errors.push(`${mapping.file}: duplicate disposition`);
    seen.add(key);
    if (!mapping.reason.trim()) errors.push(`${mapping.file}: missing reason`);
    if (mapping.disposition === "rebuild") {
      if (!mapping.rebuildStep || !rebuildSteps.has(mapping.rebuildStep))
        errors.push(`${mapping.file}: unknown rebuild step`);
    } else if (mapping.disposition === "acceptable") {
      if (mapping.rebuildStep !== null)
        errors.push(`${mapping.file}: acceptable record has a rebuild step`);
    } else errors.push(`${mapping.file}: unknown disposition`);
    return errors;
  });
}
