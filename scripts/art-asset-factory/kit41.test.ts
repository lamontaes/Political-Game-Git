import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importKit, KIT_REGISTRY } from "./kit41";
interface SourceRegistry {
  readonly families: readonly {
    readonly id: string;
    readonly pose: string;
    readonly view: string;
    readonly canvas: { readonly width: number; readonly height: number };
    readonly provenance: { readonly sourcePath: string };
    readonly parts: readonly {
      readonly id: string;
      readonly svgPath: string;
    }[];
  }[];
  readonly assets: readonly {
    readonly asset_id: string;
    readonly candidate_component: Readonly<Record<string, unknown>>;
  }[];
}
// The engine-people41 source art is owner-private and absent from a public
// checkout; these intake checks run only where that source is present.
const SOURCE_REGISTRY =
  "art/manifest/character_candidate_engine41_registry.json";
const privateSourceArt = fs.existsSync(SOURCE_REGISTRY);
const registry: SourceRegistry = privateSourceArt
  ? JSON.parse(fs.readFileSync(SOURCE_REGISTRY, "utf8"))
  : { families: [], assets: [] };
const temporary: string[] = [];
function fixture(kind: "footwear" | "top" = "footwear") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kit41-intake-"));
  temporary.push(root);
  const copy = (p: string) => {
    const dest = path.join(root, p);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.resolve(p), dest);
  };
  copy("art/manifest/character_candidate_engine41_registry.json");
  copy("art/manifest/character_candidate_engine41_generation.json");
  const family = registry.families[0]!;
  copy(family.provenance.sourcePath);
  const asset = registry.assets.find(
    (a) =>
      a.candidate_component.kind === kind &&
      a.asset_id.startsWith("ep41-masc-average") &&
      !("render_piece_of" in a.candidate_component),
  )!;
  const def = asset.candidate_component;
  const ids = [
    asset.asset_id,
    ...("render_piece_ids" in def ? (def.render_piece_ids as string[]) : []),
  ];
  const inbox = path.join(root, "inbox");
  fs.mkdirSync(inbox);
  for (const id of ids) {
    const part = family.parts.find((p) => p.id === id)!;
    fs.copyFileSync(
      path.resolve(part.svgPath.replace(/\.svg$/, ".png")),
      path.join(inbox, id + ".png"),
    );
  }
  const bundle = {
    schema: "kit41-inbox-v1",
    id: "test-item-v1",
    version: 1,
    name: "Test garment",
    category: "Clothes",
    style: "Everyday cut",
    colour: "Source color",
    formality: "Everyday",
    provenance: family.provenance,
    variants: [
      {
        sourceFamilyId: family.id,
        sourceAssetId: asset.asset_id,
        parts: ids.map((id) => ({ sourceAssetId: id, png: id + ".png" })),
        canvas: family.canvas,
        alpha: "straight",
        fit: {
          body: "ep41-masc-average-body",
          pose: family.pose,
          orientation: family.view,
        },
      },
    ],
  };
  const file = path.join(inbox, "bundle.json");
  fs.writeFileSync(file, JSON.stringify(bundle));
  return { root, file, bundle };
}
afterEach(() => {
  for (const p of temporary.splice(0))
    fs.rmSync(p, { recursive: true, force: true });
});
describe.skipIf(!privateSourceArt)("KIT41 data-only asset intake", () => {
  it("previews real alpha then imports immutable shoes, with metadata and old version protected", async () => {
    const { root, file } = fixture();
    const preview = await importKit(root, file);
    expect(preview.registered).toBe(false);
    expect(fs.existsSync(path.join(root, KIT_REGISTRY))).toBe(false);
    const result = await importKit(root, file, true);
    expect(result.generation).toBe(11);
    expect(result.items[0]!.clear).toBeGreaterThan(0);
    const before = fs.readFileSync(path.join(root, KIT_REGISTRY), "utf8");
    expect((await importKit(root, file)).registered).toBe(false);
    await expect(importKit(root, file, true)).rejects.toThrow(
      "already registered",
    );
    expect(fs.readFileSync(path.join(root, KIT_REGISTRY), "utf8")).toBe(before);
    const saved = JSON.parse(before);
    expect(
      fs.readFileSync(
        path.join(root, saved.assets[0].provenance.preservedSourcePath),
      ),
    ).toEqual(
      fs.readFileSync(path.join(root, saved.assets[0].provenance.sourcePath)),
    );
    expect(saved.assets[0].labels.name).toBe("Test garment");
    expect(saved.assets[0].fit.body).toBe("ep41-masc-average-body");
    expect(saved.assets[0].runtime_release_status).toBe("unreleased");
  });
  it("imports a fitted shirt and collar as one logical item using the existing piece contract", async () => {
    const { root, file } = fixture("top");
    await importKit(root, file, true);
    const saved = JSON.parse(
      fs.readFileSync(path.join(root, KIT_REGISTRY), "utf8"),
    );
    expect(saved.assets).toHaveLength(2);
    expect(
      new Set(
        saved.assets.map(
          (a: { candidate_component: { family: string } }) =>
            a.candidate_component.family,
        ),
      ).size,
    ).toBe(1);
    expect(saved.assets[0].candidate_component.render_piece_ids).toEqual([
      saved.assets[1].asset_id,
    ]);
    expect(saved.assets[1].candidate_component.render_piece_of).toBe(
      saved.assets[0].asset_id,
    );
  });
  it("rejects missing pieces and false fits before any registry write", async () => {
    const { root, file, bundle } = fixture("top");
    bundle.variants[0]!.parts.pop();
    fs.writeFileSync(file, JSON.stringify(bundle));
    await expect(importKit(root, file, true)).rejects.toThrow("every declared");
    expect(fs.existsSync(path.join(root, KIT_REGISTRY))).toBe(false);
  });
  it("refuses a changed master and leaves it intact", async () => {
    const { root, file, bundle } = fixture();
    const master = path.join(root, bundle.provenance.sourcePath);
    fs.appendFileSync(master, "changed");
    await expect(importKit(root, file, true)).rejects.toThrow("hash changed");
    expect(fs.existsSync(path.join(root, KIT_REGISTRY))).toBe(false);
  });
});
