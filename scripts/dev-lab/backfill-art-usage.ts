/** Recover a declaration for an older immutable client from its exact source and installed bytes. */
import ts from "typescript";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { assertProvenanceMatches } from "../client-provenance.mjs";

const args = process.argv.slice(2);
function arg(name: string) {
  const value = args[args.indexOf(name) + 1];
  if (!args.includes(name) || !value) throw new Error(`Required: ${name}`);
  return value;
}
const composition = JSON.parse(readFileSync(arg("--composition"), "utf8"));
const installation = JSON.parse(readFileSync(arg("--installation"), "utf8"));
const build = installation.record;
const revision = build.revision;
if (
  !/^[a-f0-9]{40}$/.test(revision) ||
  composition.revision !== revision ||
  composition.clientIdentity.clientTreeSha256 !== build.clientTreeSha256
)
  throw new Error("Composition and installed build differ");
const source = (file: string) =>
  execFileSync("git", ["show", `${revision}:${file}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
const sourceHashes: Record<string, string> = {};
function constants(file: string) {
  const text = source(file);
  sourceHashes[file] = createHash("sha256").update(text).digest("hex");
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const declarations = new Map<string, ts.Expression>();
  for (const statement of tree.statements)
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name) && declaration.initializer)
          declarations.set(declaration.name.text, declaration.initializer);
  function literal(node: ts.Expression): unknown {
    if (
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node)
    )
      return literal(node.expression);
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isArrayLiteralExpression(node))
      return node.elements.map((item) => literal(item as ts.Expression));
    if (ts.isObjectLiteralExpression(node))
      return Object.fromEntries(
        node.properties.map((item) => {
          if (
            !ts.isPropertyAssignment(item) ||
            !(ts.isIdentifier(item.name) || ts.isStringLiteral(item.name))
          )
            throw new Error("Unsupported declaration property");
          return [item.name.text, literal(item.initializer)];
        }),
      );
    if (ts.isIdentifier(node) && declarations.has(node.text))
      return literal(declarations.get(node.text)!);
    throw new Error("Only source literals can establish legacy bindings");
  }
  return (name: string) => literal(declarations.get(name)!);
}
const layout = constants("src/presentation/playtest65-visual-layout.ts")(
  "PLAYTEST65_WHITE_HOUSE_LAYOUT",
) as { assetId: string };
const regional = constants("src/presentation/opening-regional-candidates.ts")(
  "OPENING_REGIONAL_CANDIDATES",
) as {
  assetId: string;
  coverage: { regionTypes?: string[] };
  months?: number[];
}[];
const consumers = [
  {
    assetId: layout.assetId,
    useLabels: [
      "Title screen",
      "National introduction",
      "White House · Washington, D.C.",
    ],
    eligible: ["White House illustration"],
  },
  ...regional.map((item) => ({
    assetId: item.assetId,
    useLabels: ["Home-region introduction"],
    eligible: [
      ...(item.coverage.regionTypes ?? []).map((label) =>
        label.replace(/-/g, " "),
      ),
      ...(item.months ? [`Months ${item.months.join(", ")}`] : []),
    ],
  })),
];
// Verify the actual consumer source still refers to the declarations, without executing it.
for (const [file, symbols] of [
  [
    "src/player/TitleScreen.tsx",
    ["PLAYTEST65_WHITE_HOUSE_LAYOUT.assetId", "candidateEstablishingPlate"],
  ],
  [
    "src/player/WorldOrientationPanel.tsx",
    [
      "PLAYTEST65_WHITE_HOUSE_LAYOUT.assetId",
      "OPENING_REGIONAL_CANDIDATES",
      "openingHomeRegionPreviews",
      "candidateEstablishingPlate",
    ],
  ],
] as const) {
  const text = source(file);
  if (symbols.some((symbol) => !text.includes(symbol)))
    throw new Error(`Consumer changed: ${file}`);
  sourceHashes[file] = createHash("sha256").update(text).digest("hex");
}
const manifest = JSON.parse(source("art/manifest/asset_manifest.json"));
const clientDir = join(build.appPath, "Contents", "Resources", "client");
const verified = assertProvenanceMatches({
  clientDir,
  expectedRevision: revision,
  expectedDirty: false,
});
if (verified.treeSha256 !== build.clientTreeSha256)
  throw new Error("Installed client changed");
const bindings = consumers.flatMap((consumer) => {
  const asset = manifest.assets.find(
    (item: { asset_id: string }) => item.asset_id === consumer.assetId,
  );
  const included = composition.included.find(
    (item: { sha256: string }) => item.sha256 === asset?.hash,
  );
  if (!included) return [];
  const file = included.compiledAssets.find(
    (file: string) =>
      file === basename(file) &&
      createHash("sha256")
        .update(readFileSync(join(clientDir, "assets", file)))
        .digest("hex") === asset.hash,
  );
  if (!file)
    throw new Error(`No verified installed derivative for ${consumer.assetId}`);
  return [
    {
      ...consumer,
      sourceSha256: asset.hash,
      derivativeSha256: asset.hash,
      derivativePath: `assets/${file}`,
    },
  ];
});
const output = arg("--output");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  JSON.stringify(
    {
      schema: "ocd-legacy-art-usage-v1",
      revision,
      clientTreeSha256: verified.treeSha256,
      packId: build.privatePack.packId,
      packManifestSha256: build.privatePack.manifestSha256,
      basis:
        "Verified consumer declarations and installed bytes; not an observation of a saved life.",
      sourceHashes,
      bindings,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
process.stdout.write(
  `Recovered ${bindings.length} consumer bindings for ${revision.slice(0, 7)}\n`,
);
