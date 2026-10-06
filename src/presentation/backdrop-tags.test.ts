import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { placeDressCode } from "./dress-code";
import {
  civicBackdropKind,
  civicTitlePictures,
  type BackdropManifestRow,
} from "./title-civic-rotation";

// Proposed independent validation boundary; reconcile the data owner's schema
// before migrating any reader. No tag data or place classifications are guessed.
const fields = [
  "kind",
  "use",
  "setting",
  "region",
  "climate",
  "terrain",
  "light",
  "season",
  "dressCode",
  "civicKind",
  "group",
  "floor",
] as const;
type Vocabulary = Readonly<Record<string, readonly string[]>>;
type Tags = Readonly<Record<string, string | readonly string[]>>;
const rows = (
  JSON.parse(readFileSync("art/backdrops/manifest.json", "utf8")) as {
    backdrops: readonly (BackdropManifestRow & { tags?: Tags })[];
  }
).backdrops;
const places = [...new Set(rows.map((row) => row.place))].sort();
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function errors(tags: Tags, vocabulary: Vocabulary): string[] {
  return Object.entries(tags).flatMap(([field, value]) => {
    const allowed = vocabulary[field];
    if (!fields.includes(field as (typeof fields)[number]) || !allowed)
      return [`unknown tag field ${field}`];
    const values = typeof value === "string" ? [value] : value;
    if (!Array.isArray(values) || values.length === 0)
      return [`empty or invalid tag ${field}`];
    return values
      .filter((entry) => typeof entry !== "string" || !allowed.includes(entry))
      .map((entry) => `unknown ${field} value ${String(entry)}`);
  });
}

describe("one closed backdrop tag vocabulary", () => {
  it("rejects a value or field outside a supplied vocabulary", () => {
    const vocabulary = { use: ["civic", "work", "home", "leisure", "travel"] };
    expect(errors({ use: "work" }, vocabulary)).toEqual([]);
    expect(errors({ use: "not-in-vocabulary" }, vocabulary)).toEqual([
      "unknown use value not-in-vocabulary",
    ]);
    expect(errors({ undeclared: "work" }, vocabulary)).toEqual([
      "unknown tag field undeclared",
    ]);
  });

  it("requires the owner's closed lists and tags for every backdrop row", () => {
    expect(
      existsSync("art/tags.json"),
      "Input gap: the existing tag owner has not supplied art/tags.json; this is not a silently skipped validation",
    ).toBe(true);
    const vocabulary = JSON.parse(
      readFileSync("art/tags.json", "utf8"),
    ) as Vocabulary;
    for (const field of fields) {
      const allowed = vocabulary[field];
      expect(Array.isArray(allowed), `Missing closed list ${field}`).toBe(true);
      if (!allowed) throw new Error(`Missing closed list ${field}`);
      expect(allowed.length, `Empty closed list ${field}`).toBeGreaterThan(0);
      expect(new Set(allowed).size, `Duplicate values in ${field}`).toBe(
        allowed.length,
      );
    }
    const failures = rows.flatMap((row) => {
      if (!row.tags) return [`${row.place}/${row.variant}: missing tags`];
      const missing = fields.filter((field) => !(field in row.tags!));
      return [
        ...missing.map(
          (field) => `${row.place}/${row.variant}: missing ${field}`,
        ),
        ...errors(row.tags, vocabulary).map(
          (error) => `${row.place}/${row.variant}: ${error}`,
        ),
      ];
    });
    expect(failures, failures.join("\n")).toEqual([]);
    const campus = JSON.parse(
      readFileSync("art/campuses/manifest.json", "utf8"),
    ) as {
      states: Readonly<
        Record<string, { region: string; climate: string; terrain: string }>
      >;
    };
    for (const field of ["region", "climate", "terrain"] as const)
      for (const value of new Set(
        Object.values(campus.states).map((state) => state[field]),
      ))
        expect(
          vocabulary[field],
          `Reuse campus ${field} value ${value}`,
        ).toContain(value);
  });

  // Actual pre-migration outputs on main ae27b4da, 117 places / 346 rows.
  // Hashes contain place identities without adding a hard-coded place list.
  it("preserves every existing place's dress code", () => {
    expect(
      hash(places.map((place) => ({ place, ...placeDressCode(place) }))),
    ).toBe("8aa3a3cb556b94d9cc12a875b702c572e13c6a0250e677a4ac78726184e104bb");
  });
  it("preserves existing civic kinds and title rotation", () => {
    expect(
      hash(places.map((place) => ({ place, kind: civicBackdropKind(place) }))),
    ).toBe("b44bcea1a4e3f82b1865d7c5c76c86a5ae09a9b019ffd32f76ce2b6eeb293c42");
    expect(hash(civicTitlePictures(rows, (file) => `fixture:${file}`))).toBe(
      "307052b3f4a8cd4e313460db1314a25b34c30baf5df9a7037d343efcf1294a1f",
    );
  });
});
