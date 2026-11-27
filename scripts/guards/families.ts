/**
 * The one reading of tests/guards/families.json: a glob as a regular
 * expression, the family a file belongs to, and each family's entry files.
 * The families guard and every guard that asks "which engine is this file?"
 * import it from here, so there is one answer.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export type Family = {
  id: string;
  name: string;
  entry: string[];
  paths: string[];
};
type FamilyMap = { shared: string[]; families: Family[] };

const map = JSON.parse(
  readFileSync(path.join(ROOT, "tests", "guards", "families.json"), "utf8"),
) as FamilyMap;

export const families = map.families;

/** A glob from the repository root as a regular expression. */
export function globToRegExp(glob: string): RegExp {
  const body = glob
    .split("**")
    .map((part) =>
      part
        .split("*")
        .map((piece) => piece.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^/]*"),
    )
    .join(".*");
  return new RegExp(`^${body}$`);
}

/** How specific a glob is: an exact path beats a pattern, a longer literal beats a shorter one. */
const specificity = (glob: string) =>
  (glob.includes("*") ? 0 : 10_000) + glob.replace(/\*/g, "").length;

const shared = map.shared.map(globToRegExp);
const owners = families.flatMap((family) =>
  family.paths.map((glob) => ({
    family: family.id,
    test: globToRegExp(glob),
    rank: specificity(glob),
  })),
);
export const entries = new Map(
  families.map((family) => [family.id, family.entry.map(globToRegExp)]),
);

/** The family a file belongs to, "shared" for the kernel, or null. */
export function familyOf(file: string): string | null {
  if (shared.some((test) => test.test(file))) return "shared";
  const matches = owners.filter((owner) => owner.test.test(file));
  if (!matches.length) return null;
  return matches.sort((a, b) => b.rank - a.rank)[0]!.family;
}
