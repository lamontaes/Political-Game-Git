import { describe, expect, it } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "../presentation/engine-people29-review";
import {
  componentsAtGeneration,
  resolveCharacterRecipe,
} from "../presentation/character-components";
import {
  preparedFamily,
  preparedPartsAt,
  selectPreparedBody,
  generatedPreparedMaterial,
} from "../presentation/engine-people29-data";
import type { PersonAppearance } from "../simulation/types";

const bodies = (g: number) =>
  componentsAtGeneration(library, g)
    .filter(
      (c) =>
        c.definition.kind === "body" && c.definition.family.startsWith("ep41-"),
    )
    .map((c) => c.definition.family);
function explore(generation: number, pinned: boolean) {
  const out: Record<string, number> = {};
  const samples: string[] = [];
  const members = componentsAtGeneration(library, generation);
  for (const from of new Set(bodies(generation))) {
    const heads = [
      ...new Set(
        members
          .filter(
            (c) =>
              c.definition.kind === "head" &&
              (c.definition.compatible_body_families ?? [from]).includes(from),
          )
          .map((c) => c.definition.family),
      ),
    ];
    for (const head of heads) {
      const hairs = [
        null,
        ...new Set(
          members
            .filter(
              (c) =>
                c.definition.kind === "hair-front" &&
                (c.definition.compatible_body_families ?? [from]).includes(
                  from,
                ) &&
                (c.definition.compatible_head_families ?? [head]).includes(
                  head,
                ),
            )
            .map((c) => c.definition.family),
        ),
      ];
      for (const hair of hairs) {
        const a: PersonAppearance = {
          seed: "r1",
          recipeVersion: "appearance-recipe-v2",
          ...(pinned ? { catalogGeneration: generation } : {}),
          selection: { bodyFamily: from, headFamily: head, hairFamily: hair },
          material: generatedPreparedMaterial(
            preparedFamily(from)!,
            "r1",
            generation,
          ),
        } as PersonAppearance;
        try {
          resolveCharacterRecipe(
            { appearance: a, poseFamily: "standing-neutral" },
            library,
          );
        } catch {
          out["source-unresolvable"] = (out["source-unresolvable"] ?? 0) + 1;
          continue;
        }
        const fam = preparedFamily(from)!;
        const ident = (
          f: typeof fam,
          id: string | null,
          kind: string,
          g: number | undefined,
        ) =>
          id === null
            ? null
            : (preparedPartsAt(f, g).find(
                (p) =>
                  p.kind === kind && (p.id === id || p.logicalFamily === id),
              )?.logicalIdentity ??
              `raw:${id.replace(/^ep41-(masc|fem)-(lean|average|heavy)-/, "")}`);
        for (const to of new Set(bodies(generation))) {
          if (to === from) continue;
          const next = selectPreparedBody(a, to);
          let k: string;
          if (!next) k = "refused";
          else {
            const tf = preparedFamily(to)!;
            const sameHead =
              ident(fam, head, "head", a.catalogGeneration) ===
              ident(
                tf,
                next.selection!.headFamily,
                "head",
                a.catalogGeneration,
              );
            const sameHair =
              ident(fam, hair, "hair-front", a.catalogGeneration) ===
              ident(
                tf,
                next.selection!.hairFamily,
                "hair-front",
                a.catalogGeneration,
              );
            let resolves = true;
            try {
              resolveCharacterRecipe(
                { appearance: next, poseFamily: "standing-neutral" },
                library,
              );
            } catch {
              resolves = false;
            }
            k = `${sameHead ? "head-kept" : "HEAD-SWAPPED"}/${sameHair ? "hair-kept" : "HAIR-SWAPPED"}/${resolves ? "resolves" : "resolver-throws"}`;
            if ((!sameHead || !sameHair) && samples.length < 4)
              samples.push(
                `${from} [${head} | ${hair}] -> ${to} [${next.selection!.headFamily} | ${next.selection!.hairFamily}] resolves=${resolves}`,
              );
          }
          out[k] = (out[k] ?? 0) + 1;
        }
      }
    }
  }
  return { out, samples };
}
describe("R1 body change never substitutes face/hair", () => {
  for (const [g, pinned] of [
    [12, true],
    [13, true],
    [14, true],
    [15, true],
    [15, false],
  ] as const)
    it(`generation ${g} pinned=${pinned}`, { timeout: 120000 }, () => {
      const r = explore(g, pinned);
      console.log(
        `gen ${g} pinned=${pinned}`,
        JSON.stringify(r.out),
        "\n" + r.samples.join("\n"),
      );
      const swapped = Object.entries(r.out)
        .filter(([k]) => k.includes("SWAPPED") && k.endsWith("/resolves"))
        .reduce((n, [, v]) => n + v, 0);
      expect(swapped).toBe(0);
    });
});
