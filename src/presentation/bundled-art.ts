import { optionalGlob } from "./optional-glob";

export const rasterUrls = optionalGlob(() =>
  import.meta.glob<string>(
    ["../../art/**/*.{png,jpg,jpeg,webp}", "!../../art/references/masters/**"],
    {
      eager: true,
      import: "default",
      query: "?url",
    },
  ),
);

export const candidateManifests = optionalGlob(() =>
  import.meta.glob<object>(
    [
      "../../art/manifest/character_candidate_{engine29,engine34,engine35,engine36,engine40,engine41,kit41}_{registry,generation}.json",
      "../../art/manifest/character_candidate_modular41_heads.json",
      "../../art/manifest/character_candidate_modular45_registry.json",
    ],
    { eager: true, import: "default" },
  ),
);

export const preparedSources = optionalGlob(() =>
  import.meta.glob<string>(
    [
      "../../art/authoring/kit41/families/*/*.svg",
      "../../art/authoring/engine-people29/families/*/*.svg",
      "../../art/authoring/engine-people34/families/*/*.svg",
      "../../art/authoring/engine-people35/families/*/*.svg",
      "../../art/authoring/engine-people36/families/*/*.svg",
      "../../art/authoring/engine-people40/families/*/*.svg",
      "../../art/authoring/engine-people41/families/*/*.svg",
      "../../art/authoring/modular41-head-v2/*.svg",
      "../../art/authoring/modular45/parts/*.svg",
      "../../art/authoring/modular45/pose/*.svg",
      "../../art/authoring/modular47/parts/*.svg",
      "../../art/authoring/modular47/pose/*.svg",
      "../../art/authoring/modular47-r1/parts/*.svg",
    ],
    { query: "?raw", import: "default" },
  ),
);

export const componentUrls = optionalGlob(() =>
  import.meta.glob<string>(
    [
      "../../art/generated/candidates/kit41/*.svg",
      "../../art/generated/candidates/engine-people29/*.svg",
      "../../art/generated/candidates/engine-people34/*.svg",
      "../../art/generated/candidates/engine-people35/*.svg",
      "../../art/generated/candidates/engine-people36/*.svg",
      "../../art/generated/candidates/engine-people40/*.svg",
      "../../art/generated/candidates/engine-people41/*.svg",
    ],
    { eager: true, query: "?url", import: "default" },
  ),
);

export const poseUrls = optionalGlob(() =>
  import.meta.glob<string>("../../art/generated/candidates/pose41/*.png", {
    eager: true,
    query: "?url",
    import: "default",
  }),
);

export const posePacks = optionalGlob(() =>
  import.meta.glob<{ readonly variants: readonly unknown[] }>(
    [
      "../../art/authoring/pose41/pack.json",
      "../../art/authoring/modular41-head-v2/pose-pack.json",
      "../../art/authoring/modular45/pose-pack.json",
      "../../art/authoring/systemic-repair/pose-pack.json",
      "../../art/authoring/modular47/pose-pack.json",
      "../../art/authoring/modular47-r1/pose-pack.json",
    ],
    { eager: true, import: "default" },
  ),
);
