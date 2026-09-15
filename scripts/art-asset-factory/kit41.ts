import { exportProductionInputs } from "./kit41-production-inputs";
/* eslint-disable @typescript-eslint/no-explicit-any -- external authoring schemas are validated at intake; source metadata is preserved verbatim. */
import fs from "node:fs";
import path from "node:path";
import { hashArtFile } from "./content-hash";
import { readPng } from "./pg-modular-intake";
import {
  computeCharacterGenerationSignature,
  type CharacterComponentDefinition,
} from "../../src/presentation/character-components";

export const KIT_REGISTRY =
  "art/manifest/character_candidate_kit41_registry.json";
const kinds = [
  "body",
  "head",
  "hair-front",
  "hair-back",
  "top",
  "bottom",
  "footwear",
];
type Json = Record<string, any>;
const json = (p: string): Json => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (p: string, data: unknown) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
};
const escaped = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function inside(root: string, relative: string) {
  const p = path.resolve(root, relative);
  if (!p.startsWith(path.resolve(root) + path.sep))
    throw new Error(`Path escapes bundle: ${relative}`);
  return p;
}
function copy(root: string, dest: string, file: string) {
  const p = inside(root, file);
  const target = inside(dest, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(p, target);
}
export function emptyKitRegistry() {
  return {
    schema: "kit41-registration-v1",
    assets: [],
    garments: [],
    templates: {},
    familyAdditions: {},
    generations: [],
    labels: {},
  };
}
/** Export exact source definitions; no universal fitted dimensions or invented measurements. */
export function exportKit(
  root: string,
  destination: string,
  registryPath: string,
) {
  const registry = json(inside(root, registryPath));
  const contract: Json = {
    schema: "kit41-export-v1",
    sourceRegistry: registryPath,
    sourceSha256: hashArtFile(inside(root, registryPath)),
    classes: {},
    families: [],
    unsupported: [
      "independent iris color without a real mask",
      "new poses without authored fit",
      "automatic cross-body fitting",
    ],
    styleReference: "Drive:1SBz4LrIX2XSJrsDprorQ7P8tjNZMCYY0",
    geometryReference: "Source family landmarks; never the style reference",
    privacy: "private-unapproved",
    rightsStatus: "unknown",
  };
  const copied = new Set<string>();
  const take = (p: string | undefined) => {
    if (p && !copied.has(p)) {
      copy(root, destination, p);
      copied.add(p);
    }
  };
  for (const family of registry.families ?? []) {
    contract.families.push({
      id: family.id,
      bodyType: family.bodyType,
      canvas: family.canvas,
      pose: family.pose,
      view: family.view,
      portraitFrame: family.portraitFrame ?? null,
      geometry: family.geometry,
      provenance: family.provenance,
    });
    const familyManifest = `templates/${family.id}/manifest.json`;
    write(inside(destination, familyManifest), family);
    const marks = Object.entries(family.geometry.landmarks ?? {})
      .map(
        ([id, point]: [string, any]) =>
          `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#ad6931"/><text x="${point.x + 8}" y="${point.y}" font-size="14">${escaped(id)}</text>`,
      )
      .join("");
    fs.writeFileSync(
      inside(destination, `templates/${family.id}/anchors.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" width="${family.canvas.width}" height="${family.canvas.height}" viewBox="0 0 ${family.canvas.width} ${family.canvas.height}"><rect width="100%" height="100%" fill="#f2eadc"/>${marks}</svg>`,
    );

    for (const p of family.parts) {
      take(p.svgPath);
      take(p.coverageMaskPath);
      const png = p.svgPath.replace(/\.svg$/, ".png");
      if (fs.existsSync(inside(root, png))) take(png);
    }
    take(family.provenance?.sourcePath);
    for (const kind of kinds) {
      if (contract.classes[kind]) continue;
      const asset = registry.assets.find(
        (a: Json) =>
          a.candidate_component.kind === kind &&
          !a.candidate_component.render_piece_of &&
          family.parts.some((p: Json) => p.id === a.asset_id),
      );
      if (!asset) continue;
      const part = family.parts.find((p: Json) => p.id === asset.asset_id);
      take(asset.final_path);
      const pieces = [
        asset.asset_id,
        ...(asset.candidate_component.render_piece_ids ?? []),
        ...(asset.candidate_component.paired_with
          ? [asset.candidate_component.paired_with]
          : []),
      ];
      for (const id of pieces)
        take(registry.assets.find((a: Json) => a.asset_id === id)?.final_path);
      contract.classes[kind] = {
        example: asset.asset_id,
        raw: part.svgPath,
        imported: asset.final_path,
        sourceSha256: part.sha256,
        definition: asset.candidate_component,
        material: part.materials,
        fit:
          registry.garments.find(
            (g: Json) =>
              g.component_family === asset.candidate_component.family,
          ) ?? null,
        relatedPieces: pieces,
      };
    }
  }
  const hashes = Object.fromEntries(
    [...copied].sort().map((p) => [p, hashArtFile(inside(destination, p))]),
  );
  write(inside(destination, "contract.json"), contract);
  write(inside(destination, "source-hashes.json"), hashes);
  const example = registry.assets.find(
    (a: Json) => a.candidate_component.kind === "footwear",
  );
  if (example) {
    const family = registry.families.find((f: Json) =>
      f.parts.some((p: Json) => p.id === example.asset_id),
    );
    const part = family.parts.find((p: Json) => p.id === example.asset_id);
    write(inside(destination, "inbox/example/bundle.json"), {
      schema: "kit41-inbox-v1",
      id: "external-shoes-v1",
      version: 1,
      name: "Leather shoes",
      category: "Shoes",
      style: "Low leather shoes",
      colour: "Source color",
      formality: "Everyday",
      browsingCategory: "Unisex",
      provenance: {
        ...family.provenance,
        sourceAssetId: example.asset_id,
        sourceRegistry: registryPath,
      },
      variants: [
        {
          sourceFamilyId: family.id,
          sourceAssetId: example.asset_id,
          png: "shoes.png",
          fit: {
            body: example.candidate_component.compatible_body_families[0],
            pose: family.pose,
            orientation: family.view,
          },
          alpha: "straight",
          canvas: family.canvas,
        },
      ],
    });
    const png = part.svgPath.replace(/\.svg$/, ".png");
    if (fs.existsSync(inside(root, png))) {
      fs.mkdirSync(inside(destination, "inbox/example"), { recursive: true });
      fs.copyFileSync(
        inside(root, png),
        inside(destination, "inbox/example/shoes.png"),
      );
    }
  }

  for (const kind of ["top", "bottom", "hair-front", "footwear"]) {
    const example = contract.classes[kind];
    if (!example) continue;
    const asset = registry.assets.find(
      (a: Json) => a.asset_id === example.example,
    );
    const family = registry.families.find((f: Json) =>
      f.parts.some((p: Json) => p.id === asset.asset_id),
    );
    const pieces = example.relatedPieces.map((id: string) => ({
      id,
      part: family.parts.find((p: Json) => p.id === id),
    }));
    if (
      pieces.some(
        (p: Json) =>
          !p.part ||
          !fs.existsSync(
            inside(root, p.part.svgPath.replace(/\.svg$/, ".png")),
          ),
      )
    )
      continue;
    const folder = `inbox/${kind}`;
    const bundle = {
      schema: "kit41-inbox-v1",
      id: `${kind}-example-v1`,
      version: 1,
      name:
        kind === "top"
          ? "Everyday shirt"
          : kind === "bottom"
            ? "Straight pants"
            : kind === "footwear"
              ? "Everyday shoes"
              : "Painted hairstyle",
      category:
        kind === "top"
          ? "Shirts"
          : kind === "bottom"
            ? "Pants"
            : kind === "footwear"
              ? "Shoes"
              : "Hair",
      style:
        kind === "top" ? "Fitted sleeve and collar" : "Original fitted shape",
      colour: "Source color",
      formality: "Everyday",
      browsingCategory: "Unisex",
      provenance: {
        ...family.provenance,
        sourceAssetId: asset.asset_id,
        sourceRegistry: registryPath,
      },
      variants: [
        {
          sourceFamilyId: family.id,
          sourceAssetId: asset.asset_id,
          parts: pieces.map((p: Json) => ({
            sourceAssetId: p.id,
            png: p.id + ".png",
          })),
          fit: {
            body: asset.candidate_component.compatible_body_families[0],
            pose: family.pose,
            orientation: family.view,
          },
          alpha: "straight",
          canvas: family.canvas,
        },
      ],
    };
    write(inside(destination, folder + "/bundle.json"), bundle);
    for (const p of pieces)
      fs.copyFileSync(
        inside(root, p.part.svgPath.replace(/\.svg$/, ".png")),
        inside(destination, folder + "/" + p.id + ".png"),
      );
  }
  if (!contract.classes["hair-back"])
    contract.unsupported.push(
      "This source pack has no paired long-hair back layer; no long-hair fit is claimed.",
    );
  write(inside(destination, "contract.json"), contract);
  const cards = Object.entries(contract.classes)
    .map(
      ([kind, v]: [string, any]) =>
        `<article><h2>${escaped(kind)}</h2><img src="${escaped(v.imported)}"><p>${escaped(v.example)}</p><a href="${escaped(v.raw)}">Working source</a></article>`,
    )
    .join("");
  fs.writeFileSync(
    inside(destination, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>KIT41 private asset kit</title><style>body{background:#182334;color:#f7efd9;font:16px system-ui;margin:30px}main{display:flex;flex-wrap:wrap;gap:18px}article{background:#27364a;padding:16px;width:230px}img{width:220px;height:350px;object-fit:contain;background:repeating-conic-gradient(#ddd 0 25%,#bbb 0 50%) 0/20px 20px}a{color:#ffe2a6}</style><h1>KIT41 · private production kit</h1><p>Exact fitted source files and imported examples. Source artwork and rights remain unchanged. See README.md and contract.json.</p><main>${cards}</main>`,
  );
  contract.productionInputs = exportProductionInputs(root, destination);
  write(inside(destination, "contract.json"), contract);
  return contract;
}

function knownRegistries(root: string) {
  return fs
    .readdirSync(path.join(root, "art/manifest"))
    .filter((n) => /^character_candidate_engine\d+_registry\.json$/.test(n))
    .map((n) => json(path.join(root, "art/manifest", n)));
}
/** Batch intake for an existing fitted class. Unknown geometry is refused, never guessed. */
export async function importKit(
  root: string,
  bundleFile: string,
  register = false,
) {
  const bundle = json(bundleFile);
  const inbox = path.dirname(bundleFile);
  if (
    bundle.schema !== "kit41-inbox-v1" ||
    !/^[a-z][a-z0-9-]+-v\d+$/.test(bundle.id)
  )
    throw new Error("Use a stable versioned bundle id, e.g. linen-shirt-v1.");
  for (const key of ["name", "category", "style", "colour", "formality"])
    if (typeof bundle[key] !== "string" || !bundle[key].trim())
      throw new Error(`Missing readable ${key}.`);
  if (
    !bundle.provenance?.rightsStatus ||
    !bundle.provenance?.sourcePath ||
    !bundle.provenance?.sha256
  )
    throw new Error(
      "Declare source provenance/hash and rightsStatus (unknown is valid).",
    );
  if (
    !Number.isInteger(bundle.version) ||
    bundle.version < 1 ||
    !bundle.id.endsWith(`-v${bundle.version}`)
  )
    throw new Error("Version must match the immutable bundle id.");
  const master = fs.existsSync(inside(inbox, bundle.provenance.sourcePath))
    ? inside(inbox, bundle.provenance.sourcePath)
    : inside(root, bundle.provenance.sourcePath);
  if (
    !fs.existsSync(master) ||
    hashArtFile(master) !== bundle.provenance.sha256
  )
    throw new Error("Raw provenance master is missing or its hash changed.");
  if (!Array.isArray(bundle.variants) || !bundle.variants.length)
    throw new Error("No fitted variants.");
  const bank = knownRegistries(root);
  const baseAssets = bank.flatMap((r) => r.assets);
  const families = bank.flatMap((r) => r.families);
  const target = path.join(root, KIT_REGISTRY);
  const kit = fs.existsSync(target) ? json(target) : emptyKitRegistry();
  const records: Json[] = [];
  const files = new Map<string, string | Buffer>();
  const preservedMaster = `art/authoring/kit41/families/${bundle.id}/raw-master${path.extname(master)}`;
  files.set(preservedMaster, fs.readFileSync(master));
  const additions: Json = {};
  const templates: Json = {};
  const fits: Json[] = [];
  const labels: Json = {};
  const reports: Json[] = [];
  for (const [i, v] of bundle.variants.entries()) {
    const source = baseAssets.find((a) => a.asset_id === v.sourceAssetId);
    const family = families.find((f) => f.id === v.sourceFamilyId);
    if (!source || !family)
      throw new Error("Unknown frozen template or family.");
    const def = source.candidate_component;
    const kind = def.kind;
    const sourceIds = [
      source.asset_id,
      ...(def.render_piece_ids ?? []),
      ...(def.paired_with ? [def.paired_with] : []),
    ];
    const supplied = v.parts ?? [
      { sourceAssetId: v.sourceAssetId, png: v.png },
    ];
    if (
      supplied.length !== sourceIds.length ||
      sourceIds.some(
        (id) => !supplied.some((p: Json) => p.sourceAssetId === id),
      )
    )
      throw new Error(
        "Supply every declared front/back/collar piece exactly once in variants[].parts.",
      );
    if (!["top", "bottom", "footwear", "hair-front"].includes(kind))
      throw new Error(
        `New ${kind} imports need their owner: this inbox accepts fitted shirt/trousers/shoes/hair.`,
      );
    if (
      v.fit?.body !== def.compatible_body_families?.[0] ||
      v.fit?.pose !== family.pose ||
      v.fit?.orientation !== family.view
    )
      throw new Error("Declared fit differs from the frozen template.");
    if (
      v.canvas?.width !== family.canvas.width ||
      v.canvas?.height !== family.canvas.height ||
      v.alpha !== "straight"
    )
      throw new Error(
        "Canvas/straight-alpha declaration must match template. No resize or guessed fitting.",
      );
    const groupIds = Object.fromEntries(
      sourceIds.map((sourceId: string, j: number) => [
        sourceId,
        `kit41-${bundle.id}-${i}${j ? `-${j}` : ""}`,
      ]),
    );
    const logicalFamily = `kit41-${bundle.id}`;
    for (const piece of supplied) {
      const pieceSource = baseAssets.find(
        (a) => a.asset_id === piece.sourceAssetId,
      );
      if (!pieceSource) throw new Error("Missing paired template.");
      const pieceDef = pieceSource.candidate_component;
      const input = inside(inbox, piece.png);
      const raster = await readPng(input);
      if (
        raster.width !== family.canvas.width ||
        raster.height !== family.canvas.height
      )
        throw new Error("PNG dimensions differ from fitted canvas.");
      let visible = 0,
        clear = 0,
        spill = 0;
      let left = raster.width,
        top = raster.height,
        right = 0,
        bottom = 0;
      for (let y = 0; y < raster.height; y++)
        for (let x = 0; x < raster.width; x++) {
          const k = (y * raster.width + x) * 4;
          const a = raster.data[k + 3]!;
          if (a === 0) clear++;
          else {
            visible++;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            if (
              a > 32 &&
              a < 255 &&
              raster.data[k + 1]! >
                Math.max(raster.data[k]!, raster.data[k + 2]!) + 45
            )
              spill++;
          }
        }
      if (!visible || !clear)
        throw new Error(
          "PNG needs real visible art and transparent pixels; a painted checkerboard is not alpha.",
        );
      if (spill > visible * 0.01)
        throw new Error(
          "Possible green matte spill: inspect/clean source before importing.",
        );
      const id = groupIds[piece.sourceAssetId]!;
      if (register && kit.assets.some((a: Json) => a.asset_id === id))
        throw new Error(
          "Immutable asset/version already registered. Use a new version.",
        );
      const folder = `art/authoring/kit41/families/${bundle.id}`;
      const raw = `${folder}/${id}.png`;
      const svgPath = `${folder}/${id}.svg`;
      const out = `art/generated/candidates/kit41/${id}.svg`;
      const bytes = fs.readFileSync(input);
      const image = `<image width="${raster.width}" height="${raster.height}" href="data:image/png;base64,${bytes.toString("base64")}"/>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${raster.width}" height="${raster.height}" viewBox="0 0 ${raster.width} ${raster.height}">${image}</svg>`;
      files.set(raw, bytes);
      files.set(svgPath, svg);
      files.set(out, svg);
      const crypto = await import("node:crypto");
      const hash = crypto.createHash("sha256").update(svg).digest("hex");
      const part: Json = {
        id,
        kind: pieceDef.kind,
        layer: pieceDef.layer,
        svgPath,
        sha256: hash,
        materials: [],
      };
      if (["top", "bottom", "footwear"].includes(kind)) {
        const mask = `${folder}/${id}-coverage.svg`;
        files.set(
          mask,
          svg.replace(
            image,
            `<defs><filter id="black"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter></defs><g filter="url(#black)">${image}</g>`,
          ),
        );
        part.coverageMaskPath = mask;
      }
      (additions[family.id] ??= []).push(part);
      templates[id] = {
        familyId: family.id,
        partIds: [id],
        sourceSha256: hash,
      };
      const definition = { ...pieceDef, family: logicalFamily };
      if (definition.render_piece_ids)
        definition.render_piece_ids = definition.render_piece_ids.map(
          (id: string) => groupIds[id],
        );
      if (definition.render_piece_of)
        definition.render_piece_of = groupIds[definition.render_piece_of];
      if (definition.paired_with)
        definition.paired_with = groupIds[definition.paired_with];
      records.push({
        ...pieceSource,
        asset_id: id,
        hash,
        final_path: out,
        candidate_component: definition,
        labels: {
          name: bundle.name,
          category: bundle.category,
          style: bundle.style,
          colour: bundle.colour,
          formality: bundle.formality,
          browsingCategory: bundle.browsingCategory ?? null,
          logicalItemId: bundle.id,
        },
        fit: v.fit,
        version: bundle.version,
        provenance: {
          ...bundle.provenance,
          preservedSourcePath: preservedMaster,
          importedPngSha256: hashArtFile(input),
        },
      });
      labels[logicalFamily] = {
        name: bundle.name,
        category: bundle.category,
        style: bundle.style,
        colour: bundle.colour,
        logicalItemId: bundle.id,
      };
      if (!pieceDef.render_piece_of && pieceDef.kind !== "hair-back") {
        const fit = bank
          .flatMap((r) => r.garments)
          .find((g) => g.component_family === def.family);
        if (fit) {
          const existing = fits.find(
            (g) => g.component_family === logicalFamily,
          );
          if (existing) existing.profiles.push(...fit.profiles);
          else
            fits.push({
              ...fit,
              component_family: logicalFamily,
              profiles: [...fit.profiles],
            });
        }
      }
      reports.push({
        id,
        kind: pieceDef.kind,
        sourceAssetId: piece.sourceAssetId,
        fit: v.fit,
        canvas: v.canvas,
        alphaBounds: { left, top, right, bottom },
        visible,
        clear,
        spill,
        sha256: hash,
      });
    }
  }
  // Freeze every new kit batch independently. Base generations must already have owner ledgers.
  const ledgerFiles = fs
    .readdirSync(path.join(root, "art/manifest"))
    .filter((n) => /^character_candidate_engine\d+_generation\.json$/.test(n));
  const ledgers = ledgerFiles.map((n) =>
    json(path.join(root, "art/manifest", n)),
  );
  const baseMembers = new Set(ledgers.flatMap((g) => g.component_ids));
  if (register && baseAssets.some((a) => !baseMembers.has(a.asset_id)))
    throw new Error(
      "Base catalog has an unfrozen pack. Ask B/A to freeze its generation before registering additive assets. Preview is available.",
    );
  const generation =
    Math.max(
      0,
      ...ledgers.map((g) => g.generation),
      ...kit.generations.map((g: Json) => g.generation),
    ) + 1;
  const next = {
    ...kit,
    assets: [...kit.assets, ...records],
    garments: [...kit.garments, ...fits],
    templates: { ...kit.templates, ...templates },
    labels: { ...kit.labels, ...labels },
    familyAdditions: { ...kit.familyAdditions },
  };
  for (const [id, parts] of Object.entries(additions))
    next.familyAdditions[id] = [
      ...(next.familyAdditions[id] ?? []),
      ...(parts as Json[]),
    ];
  const members = records.map((a) => ({
    assetId: a.asset_id,
    definition: {
      ...a.candidate_component,
      catalog_generation: generation,
    } as CharacterComponentDefinition,
  }));
  next.generations = [
    ...kit.generations,
    {
      generation,
      component_ids: records.map((a) => a.asset_id).sort(),
      signature: computeCharacterGenerationSignature(members),
    },
  ];
  const previewDir = path.join(inbox, "preview");
  fs.mkdirSync(previewDir, { recursive: true });
  write(path.join(previewDir, "report.json"), {
    registered: register,
    generation,
    items: reports,
  });
  fs.writeFileSync(
    path.join(previewDir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>${escaped(bundle.name)} import preview</title><style>body{font:16px system-ui;background:#223;color:#fff}img{width:260px;height:520px;object-fit:contain;background:repeating-conic-gradient(#ddd 0 25%,#bbb 0 50%) 0/20px 20px}</style><h1>${escaped(bundle.name)}</h1><p>${escaped(bundle.category)} · ${escaped(bundle.style)} · ${escaped(bundle.colour)} · private unapproved candidate</p>${bundle.variants.flatMap((v: Json) => (v.parts ?? [{ png: v.png }]).map((p: Json) => `<img src="../${escaped(p.png)}">`)).join("")}<pre>${escaped(JSON.stringify(reports, null, 2))}</pre>`,
  );
  if (register) {
    for (const p of files.keys())
      if (fs.existsSync(inside(root, p)))
        throw new Error(`Refusing source overwrite: ${p}`);
    for (const [p, data] of files) {
      const dest = inside(root, p);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, data);
    }
    write(target, next);
    write(
      path.join(root, `art/authoring/kit41/families/${bundle.id}/bundle.json`),
      bundle,
    );
  }
  return {
    registered: register,
    generation,
    items: reports,
    preview: path.join(previewDir, "index.html"),
  };
}
