import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { format } from "prettier";
import { BODY_BUILDS } from "../../src/presentation/appearance-engine/pack";
import { placeDressCode } from "../../src/presentation/dress-code";

export const REQUIRED_VIEWS = {
  viewer: "front",
  left: "three-quarter",
  right: "three-quarter",
  away: "back",
} as const;
const REQUIRED_POSES = {
  stand: "standing",
  sit: "seated",
  podium: "podium",
  lean: "lean",
} as const;
const PRESENTATIONS = ["feminine", "masculine"] as const;
type Presentation = (typeof PRESENTATIONS)[number];
type Files = {
  file?: string;
  hides?: string;
  regions?: Record<string, string>;
};
type Builds = Record<string, Files | undefined>;
interface Postures {
  bodies?: Builds;
  seated?: { bodies?: Builds };
  poses?: Record<string, { bodies?: Builds }>;
}
interface Outfit {
  id: string;
  parts?: Record<string, string>;
  builds?: Builds;
  seated?: Builds;
  poses?: Record<string, Builds>;
  views?: Record<string, Omit<Outfit, "views">>;
}
interface Head {
  id: string;
  file?: string;
  front?: string;
  back?: string;
}
interface View extends Postures {
  faces: Head[];
  hair: Head[];
}
interface PackPresentation extends View {
  outfits: Outfit[];
  views?: Record<string, View>;
}
export interface DemandPack {
  presentations: Record<Presentation, PackPresentation>;
  slotKindsByPose: Record<string, string[]>;
}
export interface DemandStaging {
  places: Record<
    string,
    {
      spots: {
        id?: string;
        pose?: keyof typeof REQUIRED_POSES;
        facing?: keyof typeof REQUIRED_VIEWS;
      }[];
    }
  >;
}
export interface OutfitSpec {
  id: string;
  tags: string[];
}
export type OutfitSpecs = Record<Presentation, OutfitSpec[]>;

/** Read the builder's literal specs without importing its top-level art writes. */
export function readOutfitSpecs(source: string): OutfitSpecs {
  const ast = ts.createSourceFile(
    "build-people-pack.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  let initializer: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "OUTFITS"
    )
      initializer = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  const property = (node: ts.Expression, key: string): ts.Expression => {
    if (!ts.isObjectLiteralExpression(node))
      throw new Error(`OUTFITS ${key}: expected a literal object`);
    const entry = node.properties.find(
      (p) =>
        ts.isPropertyAssignment(p) &&
        (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
        p.name.text === key,
    );
    if (!entry || !ts.isPropertyAssignment(entry))
      throw new Error(`OUTFITS missing ${key}`);
    return entry.initializer;
  };
  const literal = (node: ts.Expression): string => {
    if (!ts.isStringLiteral(node))
      throw new Error("OUTFITS id and tags must be string literals");
    return node.text;
  };
  if (!initializer) throw new Error("Builder has no OUTFITS declaration");
  const outfitInitializer = initializer;
  const specs = (presentation: Presentation): OutfitSpec[] => {
    const entries = property(outfitInitializer, presentation);
    if (!ts.isArrayLiteralExpression(entries))
      throw new Error(`OUTFITS ${presentation}: expected an array`);
    return entries.elements.map((entry) => {
      const tags = property(entry, "tags");
      if (!ts.isArrayLiteralExpression(tags))
        throw new Error("OUTFITS tags must be a literal array");
      return {
        id: literal(property(entry, "id")),
        tags: tags.elements.map(literal),
      };
    });
  };
  return { feminine: specs("feminine"), masculine: specs("masculine") };
}

export interface DemandCell {
  place: string;
  spot: string;
  pose: string;
  view: string;
  presentation: Presentation;
  build: string;
  outfit: string;
}
interface HeadCell {
  presentation: Presentation;
  view: string;
  kind: "face" | "hair";
  id: string;
}

export function artDemand(
  staging: DemandStaging,
  pack: DemandPack,
  specs: OutfitSpecs,
  dressFor: (place: string) => string = (place) => placeDressCode(place).dress,
) {
  const cells: DemandCell[] = [];
  const missing: (DemandCell & { missing: string[] })[] = [];
  const views = new Set<string>();
  for (const [place, stage] of Object.entries(staging.places)) {
    const dress = dressFor(place);
    for (const [index, spot] of stage.spots.entries()) {
      const slotPose = spot.pose ?? "stand";
      const pose = REQUIRED_POSES[slotPose];
      const view = REQUIRED_VIEWS[spot.facing ?? "viewer"];
      if (!pose || !view)
        throw new Error(`Invalid staging pose or facing at ${place}:${index}`);
      views.add(view);
      for (const presentation of PRESENTATIONS) {
        const outfits = specs[presentation].filter((outfit) =>
          outfit.tags.includes(dress),
        );
        if (!outfits.length)
          throw new Error(
            `Builder has no ${presentation} outfits tagged ${dress}`,
          );
        const front = pack.presentations[presentation];
        const native = view === "front" ? front : front.views?.[view];
        for (const build of BODY_BUILDS)
          for (const spec of outfits) {
            const cell: DemandCell = {
              place,
              spot: spot.id ?? `${place}:spot:${index}`,
              pose,
              view,
              presentation,
              build,
              outfit: spec.id,
            };
            cells.push(cell);
            const gaps: string[] = [];
            if (!pack.slotKindsByPose[pose]?.includes(slotPose))
              gaps.push("slot-kind");
            const body =
              pose === "standing"
                ? native?.bodies?.[build]
                : pose === "seated"
                  ? native?.seated?.bodies?.[build]
                  : native?.poses?.[pose]?.bodies?.[build];
            if (!body?.file) gaps.push("body");
            const outfit = front.outfits.find((entry) => entry.id === spec.id);
            const garment = view === "front" ? outfit : outfit?.views?.[view];
            const worn =
              pose === "standing"
                ? garment?.builds?.[build]
                : pose === "seated"
                  ? garment?.seated?.[build]
                  : garment?.poses?.[pose]?.[build];
            if (
              !worn?.file ||
              !worn.hides ||
              Object.keys(outfit?.parts ?? {}).some(
                (part) => !worn.regions?.[part],
              )
            )
              gaps.push("outfit");
            if (!native?.faces.some((face) => face.file)) gaps.push("face");
            if (!native?.hair.some((hair) => hair.front && hair.back))
              gaps.push("hair");
            if (gaps.length) missing.push({ ...cell, missing: gaps });
          }
      }
    }
  }
  const heads: HeadCell[] = [];
  const missingHeads: HeadCell[] = [];
  for (const presentation of PRESENTATIONS) {
    const front = pack.presentations[presentation];
    for (const kind of ["face", "hair"] as const) {
      const key = kind === "face" ? "faces" : "hair";
      const ids = new Set(
        [front, ...Object.values(front.views ?? {})].flatMap((view) =>
          view[key].map((head) => head.id),
        ),
      );
      for (const view of views)
        for (const id of ids) {
          const cell = { presentation, view, kind, id };
          heads.push(cell);
          const native = view === "front" ? front : front.views?.[view];
          const head = native?.[key].find((entry) => entry.id === id);
          if (
            !head ||
            (kind === "face" ? !head.file : !head.front || !head.back)
          )
            missingHeads.push(cell);
        }
    }
  }
  return { cells, missing, heads, missingHeads };
}

export async function runArtDemand(
  root: string,
  output = resolve(root, "art/coverage/missing.json"),
  print: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
) {
  const paths = [
    "art/backdrops/staging.json",
    "art/people-engine/v1/manifest.json",
    "scripts/appearance/build-people-pack.ts",
  ];
  const inputs = paths.map((path) => readFileSync(resolve(root, path), "utf8"));
  const demand = artDemand(
    JSON.parse(inputs[0]!) as DemandStaging,
    JSON.parse(inputs[1]!) as DemandPack,
    readOutfitSpecs(inputs[2]!),
  );
  for (const cell of demand.cells)
    print(JSON.stringify({ kind: "outfit", ...cell }));
  for (const cell of demand.heads) print(JSON.stringify(cell));
  const report = {
    schema: "ocd-art-demand/v1",
    basis:
      "Exact manifest entries only; no pose or view fallback, art generation, file decoding, or visual approval.",
    sources: paths.map((path, index) => ({
      path,
      sha256: createHash("sha256").update(inputs[index]!).digest("hex"),
    })),
    gridSize: demand.cells.length,
    headGridSize: demand.heads.length,
    missing: demand.missing,
    missingHeads: demand.missingHeads,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    await format(JSON.stringify(report), { parser: "json" }),
  );
  print(
    `Demand: ${report.gridSize} outfit cells, ${report.headGridSize} head cells; missing ${report.missing.length} outfits and ${report.missingHeads.length} heads.`,
  );
  return report;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const index = process.argv.indexOf("--output");
  if (index >= 0 && !process.argv[index + 1])
    throw new Error("--output needs a path");
  await runArtDemand(
    root,
    index >= 0 ? resolve(process.argv[index + 1]!) : undefined,
  );
}
