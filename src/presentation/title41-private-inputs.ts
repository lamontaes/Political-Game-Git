import { optionalGlob } from "./optional-glob";

/** Private title inputs use LAND's optional seam; an art-free checkout has none. */
export interface Title41PosePack {
  readonly pose: string;
  readonly facing: string;
  readonly variants: readonly {
    readonly family: string;
    readonly sourceAssetIds: readonly string[];
    readonly canvas: { readonly width: number; readonly height: number };
    readonly alphaBounds: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
    readonly crown: readonly number[];
    readonly leftFoot: readonly number[];
    readonly rightFoot: readonly number[];
    readonly scale: number;
    readonly translation: readonly number[];
    readonly layers: readonly {
      readonly assetId: string;
      readonly kind: string;
      readonly layer: number;
      readonly path: string;
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }[];
  }[];
}
const packs = optionalGlob(() =>
  import.meta.glob<Title41PosePack>(
    "../../art/authoring/title41/correction-v2/pack.json",
    { eager: true, import: "default" },
  ),
);
export const TITLE41_POSE_PACK =
  packs["../../art/authoring/title41/correction-v2/pack.json"];
export const TITLE41_PART_URLS = optionalGlob(() =>
  import.meta.glob<string>("../../art/generated/candidates/title41/v2/*.png", {
    eager: true,
    query: "?url",
    import: "default",
  }),
);
const plates = optionalGlob(() =>
  import.meta.glob<string>(
    "../../art/authoring/title41/inputs/corrected-audience.png",
    { eager: true, query: "?url", import: "default" },
  ),
);
export const TITLE41_CORRECTED_URL =
  plates["../../art/authoring/title41/inputs/corrected-audience.png"];
