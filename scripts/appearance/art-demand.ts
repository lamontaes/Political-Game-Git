import { createHash } from "node:crypto";
import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export interface VenueSource {
  path: string;
  text: string;
}

/** Exact literal targets only. Dynamic world-dependent keys remain visible gaps. */
export function placeDemand(
  paintedPlaces: readonly string[],
  mapper: VenueSource,
  producers: readonly VenueSource[],
) {
  const parse = (source: VenueSource) =>
    ts.createSourceFile(source.path, source.text, ts.ScriptTarget.Latest, true);
  const mapperAst = parse(mapper);
  const tables: Record<string, Record<string, string>> = {};
  const tableLines = new Map<string, number>();
  const readTables = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const entry of node.initializer.properties) {
        if (
          ts.isPropertyAssignment(entry) &&
          (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name))
        )
          tableLines.set(
            `${node.name.text}:${entry.name.text}`,
            mapperAst.getLineAndCharacterOfPosition(entry.getStart(mapperAst))
              .line + 1,
          );
      }
      tables[node.name.text] = Object.fromEntries(
        node.initializer.properties.flatMap((entry) =>
          ts.isPropertyAssignment(entry) &&
          (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) &&
          ts.isStringLiteral(entry.initializer)
            ? [[entry.name.text, entry.initializer.text]]
            : [],
        ),
      );
    }
    ts.forEachChild(node, readTables);
  };
  readTables(mapperAst);
  const exact = tables.LOCATION_PLACE;
  const prefixes = tables.LOCATION_PREFIX_PLACE;
  if (!exact || !prefixes)
    throw new Error(
      "Place reader has no literal location tables; reconcile its data contract",
    );
  const locations = new Map<string, { source: string; line: number }[]>();
  const add = (key: string, source: string, line: number) => {
    locations.set(key, [...(locations.get(key) ?? []), { source, line }]);
  };
  for (const key of Object.keys(exact))
    add(key, mapper.path, tableLines.get(`LOCATION_PLACE:${key}`)!);
  const dynamic: { source: string; line: number; expression: string }[] = [];
  const constants = new Map<string, Map<string, string>>();
  const parsed = producers.map((source) => ({ source, ast: parse(source) }));
  for (const { source, ast } of parsed) {
    const values = new Map<string, string>();
    const visit = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        ts.isSourceFile(node.parent.parent.parent) &&
        (node.parent.flags & ts.NodeFlags.Const) !== 0 &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      ) {
        values.set(node.name.text, node.initializer.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    constants.set(source.path, values);
  }
  for (const { source, ast } of parsed) {
    const bindingHas = (name: ts.BindingName, id: string): boolean =>
      ts.isIdentifier(name)
        ? name.text === id
        : name.elements.some(
            (element) =>
              ts.isBindingElement(element) && bindingHas(element.name, id),
          );
    const shadowed = (node: ts.Node, id: string): boolean => {
      for (
        let parent = node.parent;
        parent && !ts.isSourceFile(parent);
        parent = parent.parent
      ) {
        if (
          ts.isFunctionLike(parent) &&
          parent.parameters.some((parameter) => bindingHas(parameter.name, id))
        )
          return true;
        if (
          ts.isBlock(parent) &&
          parent.statements.some(
            (statement) =>
              ts.isVariableStatement(statement) &&
              statement.declarationList.declarations.some((declaration) =>
                bindingHas(declaration.name, id),
              ),
          )
        )
          return true;
      }
      return false;
    };
    const visit = (node: ts.Node) => {
      if (
        ts.isPropertyAssignment(node) &&
        (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
        node.name.text === "locationKey"
      ) {
        const line =
          ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
        const value = node.initializer;
        if (
          ts.isStringLiteral(value) ||
          ts.isNoSubstitutionTemplateLiteral(value)
        )
          add(value.text, source.path, line);
        else if (
          ts.isIdentifier(value) &&
          constants.get(source.path)?.has(value.text) &&
          !shadowed(node, value.text)
        )
          add(constants.get(source.path)!.get(value.text)!, source.path, line);
        else
          dynamic.push({
            source: source.path,
            line,
            expression: value.getText(ast),
          });
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  const painted = new Set(paintedPlaces);
  const unresolved: {
    locationKey: string;
    target: string | null;
    sources: { source: string; line: number }[];
  }[] = [];
  const inventory: {
    locationKey: string;
    place: string;
    sources: { source: string; line: number }[];
  }[] = [];
  // These are the reader's world-dependent dispatch cases, not painted places.
  const worldDependent = new Set(["home", "doors", "workplace"]);
  for (const [locationKey, sources] of [...locations.entries()].sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    const direct = exact[locationKey];
    const target = direct ?? prefixes[locationKey.split(":")[0]!];
    // Prefix dispatch can have conditional overrides; a default is no proof.
    if (!direct || !target || worldDependent.has(target))
      unresolved.push({ locationKey, target: target ?? null, sources });
    else inventory.push({ locationKey, place: target, sources });
  }
  return {
    inventory,
    missing: inventory.filter((entry) => !painted.has(entry.place)),
    unresolved,
    dynamic,
  };
}

export async function runPlaceDemand(
  root: string,
  output = resolve(root, "art/coverage/missing-places.json"),
) {
  const mapper = {
    path: "src/presentation/place-backdrops.ts",
    text: readFileSync(
      resolve(root, "src/presentation/place-backdrops.ts"),
      "utf8",
    ),
  };
  const paths = [
    "src/presentation/scene-venues.ts",
    ...globSync("src/simulation/**/*.ts", { cwd: root }).filter(
      (path) => !path.includes(".test.") && !path.includes(".generated."),
    ),
  ].sort();
  const producers = paths
    .map((path) => ({ path, text: readFileSync(resolve(root, path), "utf8") }))
    .filter(
      (source) =>
        source.text.includes("locationKey") ||
        source.text.includes("LOCATION_KEY"),
    );
  const manifestPath = "art/backdrops/manifest.json";
  const manifestText = readFileSync(resolve(root, manifestPath), "utf8");
  const manifest = JSON.parse(manifestText) as {
    backdrops: { place: string }[];
  };
  const demand = placeDemand(
    [...new Set(manifest.backdrops.map((row) => row.place))],
    mapper,
    producers,
  );
  const report = {
    schema: "ocd-place-demand-audit/v1",
    basis:
      "Independent source inventory: missing lists only known literal location targets absent from the painted manifest. Unresolved dispatch and dynamic expressions prevent a complete venue coverage claim. No wiring, tags, painting, or art acceptance.",
    sources: [
      { path: manifestPath, text: manifestText },
      mapper,
      ...producers,
    ].map((source) => ({
      path: source.path,
      sha256: createHash("sha256").update(source.text).digest("hex"),
    })),
    ...demand,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    await format(JSON.stringify(report), { parser: "json" }),
  );
  for (const entry of report.inventory)
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  process.stdout.write(
    `Place audit: ${report.inventory.length} literal targets; ${report.missing.length} missing; ${report.unresolved.length} unresolved keys; ${report.dynamic.length} dynamic expressions.\n`,
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
  const output = index >= 0 ? resolve(process.argv[index + 1]!) : undefined;
  if (process.argv.includes("--places-only"))
    await runPlaceDemand(root, output);
  else await runArtDemand(root, output);
}
