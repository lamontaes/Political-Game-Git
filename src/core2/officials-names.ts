/**
 * The real-name check: no generated official may carry the full name of a
 * real current officeholder. The checking list holds only one-way hashes of
 * normalized names (`scripts/research/export-real-officeholder-names.py`), so
 * neither the repository nor the game carries the names themselves.
 */
import { sha256Hex } from "./kernel/sha256";
import nameHashes from "../../data/research/offices/real-officeholder-name-hashes.json" with { type: "json" };

let hashes: ReadonlySet<string> | null = null;

export function normalizedFullName(given: string, family: string): string {
  return `${given} ${family}`
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

export function isRealOfficeholderName(given: string, family: string): boolean {
  hashes ??= new Set((nameHashes as { hashes: string[] }).hashes);
  const digest = sha256Hex(normalizedFullName(given, family)).slice(0, 16);
  return hashes.has(digest);
}
