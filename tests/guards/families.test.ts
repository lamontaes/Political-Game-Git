import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import map from "./families.json";
import baseline from "./families-baseline.json";
import { codeowners, CODEOWNERS_PATH } from "../../scripts/guards/codeowners";

/**
 * One engine per mechanic (owner: "There's one election engine... You
 * shouldn't need a million different election levers"; "The game
 * generally"). Every source file belongs to one engine family in
 * families.json, and a file reaches another family only through that
 * family's entry files, the way an engine module exposes a public face and
 * keeps its insides private (docs/design/guards.md, the research). A second
 * writer of a record kind is refused file by file by no-second-source.test.ts;
 * this guard draws the families that rule is read against.
 *
 * Today's state is in families-baseline.json and only shrinks: the files not
 * yet in any family, and each file's imports that reach inside another
 * family. Move an import to the family's entry (or move the code to the
 * family that owns it) and lower the count.
 */

const ROOT = path.resolve(__dirname, "../..");
type Family = { id: string; name: string; entry: string[]; paths: string[] };
const families = map.families as Family[];

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
const entries = new Map(
  families.map((family) => [family.id, family.entry.map(globToRegExp)]),
);

/** The family a file belongs to, "shared" for the kernel, or null. */
export function familyOf(file: string): string | null {
  if (shared.some((test) => test.test(file))) return "shared";
  const matches = owners.filter((owner) => owner.test.test(file));
  if (!matches.length) return null;
  return matches.sort((a, b) => b.rank - a.rank)[0]!.family;
}

const SOURCE =
  /^(?:src\/(?:core2|director|english|bench)\/.*\.(?:ts|tsx|mjs))$/;
function sources(): string[] {
  return execFileSync(
    "git",
    ["ls-files", "src/core2", "src/director", "src/english", "src/bench"],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\n")
    .filter(
      (file) =>
        SOURCE.test(file) &&
        !/\.(test|spec|browser)\.(ts|tsx|mjs)$/.test(file) &&
        !/\.d\.m?ts$/.test(file),
    );
}

/** The repository files a source imports by relative path. */
export function importsOf(file: string, source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(
    /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*["'](\.{1,2}\/[^"']+)["']/g,
  )) {
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), match[1]!),
    );
    out.push(/\.(ts|tsx|mjs|js|json)$/.test(target) ? target : `${target}.ts`);
  }
  return out;
}

function deepImports(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const file of sources()) {
    const from = familyOf(file);
    if (!from || from === "shared") continue;
    const reached = importsOf(file, readFileSync(path.join(ROOT, file), "utf8"))
      .map((target) => target.replace(/\.js$/, ".ts"))
      .filter((target) => {
        const to = familyOf(target);
        return (
          to !== null &&
          to !== "shared" &&
          to !== from &&
          !entries.get(to)!.some((test) => test.test(target))
        );
      });
    if (reached.length) out.set(file, reached);
  }
  return out;
}

describe("one engine per mechanic: families and their boundaries", () => {
  const files = sources();
  const unassigned = files.filter((file) => familyOf(file) === null);
  const deep = deepImports();
  const known = baseline.deepImports as Record<string, number>;

  it("puts every new source file in a family", () => {
    const fresh = unassigned.filter(
      (file) => !baseline.unassigned.includes(file),
    );
    expect(
      fresh,
      "add each file to its family's paths in tests/guards/families.json",
    ).toEqual([]);
  });

  it("reaches no further inside another family than before", () => {
    const over = [...deep]
      .filter(([file, reached]) => reached.length > (known[file] ?? 0))
      .map(
        ([file, reached]) =>
          `${file} (${familyOf(file)}): ${reached.length} imports inside other families, ${known[file] ?? 0} known: ${[...new Set(reached)].join(", ")}. Import the family's entry instead.`,
      );
    expect(over).toEqual([]);
  });

  it("only shrinks: lowers a count or drops a file as soon as it is fixed", () => {
    const stale = [
      ...Object.entries(known)
        .filter(([file, n]) => (deep.get(file)?.length ?? 0) < n)
        .map(
          ([file, n]) =>
            `${file}: lower ${n} to ${deep.get(file)?.length ?? 0}`,
        ),
      ...baseline.unassigned
        .filter((file) => !unassigned.includes(file))
        .map(
          (file) => `${file}: now in a family or gone; drop it from unassigned`,
        ),
    ];
    expect(stale, "edit tests/guards/families-baseline.json").toEqual([]);
  });

  it("keeps every entry inside its own family", () => {
    for (const family of families)
      for (const glob of family.entry)
        expect(
          family.paths.some((p) =>
            globToRegExp(p).test(glob.replace(/\*\*?/g, "x")),
          ) || family.paths.some((p) => p === glob),
          `${family.id}: entry ${glob} is outside its paths`,
        ).toBe(true);
  });

  it("names the same families in .github/CODEOWNERS", () => {
    expect(
      readFileSync(CODEOWNERS_PATH, "utf8"),
      "run node --import tsx scripts/guards/codeowners.ts",
    ).toBe(codeowners());
  });

  it("matches globs and resolves imports as written", () => {
    expect(
      globToRegExp("src/core2/housing-*.ts").test("src/core2/housing-sale.ts"),
    ).toBe(true);
    expect(
      globToRegExp("src/core2/housing-*.ts").test(
        "src/core2/x/housing-sale.ts",
      ),
    ).toBe(false);
    expect(
      globToRegExp("src/director/**").test("src/director/data/a.json"),
    ).toBe(true);
    expect(familyOf("src/core2/opening-kin.ts")).toBe("people");
    expect(familyOf("src/core2/opening-capital.ts")).toBe("jobs-businesses");
    expect(
      importsOf(
        "src/director/a.ts",
        'import { x } from "../core2/modules/laws";',
      ),
    ).toEqual(["src/core2/modules/laws.ts"]);
  });
});
