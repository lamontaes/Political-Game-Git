import map from "./families.json";

const families = map.families;

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
/** The family a file belongs to, "shared" for the kernel, or null. */
export function familyOf(file: string): string | null {
  // A test under tests/src sits where its source sits under src: it is named
  // there, or it takes the family of the source path it mirrors.
  const names = file.startsWith("tests/src/") ? [file, file.slice(6)] : [file];
  if (shared.some((test) => names.some((name) => test.test(name))))
    return "shared";
  const matches = owners.filter((owner) =>
    names.some((name) => owner.test.test(name)),
  );
  if (!matches.length) return null;
  return matches.sort((a, b) => b.rank - a.rank)[0]!.family;
}
