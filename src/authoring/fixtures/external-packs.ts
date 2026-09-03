/**
 * EXTERNAL CARGO — the three free/CC0 packs downloaded for this project.
 *
 * Every count below was read off the archive with `unzip`, every licence off a
 * document inside it, and the two body renders were opened and looked at. The
 * archives themselves are NOT in this repository and are not going to be: a
 * record is a statement about a download, identified by that download's hash,
 * and nothing here copies a byte.
 *
 * All three come back the same way, for two different reasons, and the split is
 * worth stating plainly because it is the whole argument for keeping licence
 * and usability as separate questions:
 *
 * - Both Quaternius packs are CC0 1.0, stated in a licence file inside the
 *   archive. There is no rights problem at all. They are rigged 3D meshes and
 *   skeletal animation, and this project has no rigging step, no Blender, and
 *   no 3D renderer — so they are ARCHIVE, and would be even if they were
 *   perfect.
 * - The office set is the mirror image. It has no licence document anywhere in
 *   the archive, so its rights are unknown and stay unknown. It is also a
 *   Blender/Substance source project, so it would be unusable regardless.
 *   REJECT on the first ground alone.
 *
 * None of the three yields a single file this compositor can draw. The PNGs
 * they contain in quantity are UV texture atlases and marketing renders, which
 * look like art in a file listing and are not art.
 */

import type { ExternalPackRecord } from "../external-packs";

const REVIEWED_ON = "2026-09-03";
const REVIEWED_BY = "graphics-convergence intake";

/**
 * Quaternius, "Universal Base Characters [Standard]".
 *
 * CC0 1.0, stated in `License_Standard.txt`. Six stylised superhero-proportion
 * base meshes in FBX and glTF, eight hair/eyebrow meshes in two rigging
 * variants, and their PBR maps. `Preview.png` is a marketing composite of the
 * characters in underwear.
 *
 * Nothing here is 2D art. Getting a usable part out of it would mean rigging a
 * mesh, posing it, lighting it and rendering an orthographic frame — the exact
 * pipeline the operating rule refuses. The subject is wrong as well: these are
 * heroic-proportion figures for an action game, not the ordinary adults a
 * political-life simulation puts in an office.
 */
export const PACK_UNIVERSAL_BASE_CHARACTERS: ExternalPackRecord = {
  packId: "quaternius-universal-base-characters-standard",
  title: "Universal Base Characters [Standard]",
  archiveFileName: "Universal Base Characters[Standard].zip",
  archiveByteLength: 128_968_391,
  archiveSha256:
    "fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40",
  creator: "Quaternius",
  sourceUrl: "https://quaternius.com",
  entryCount: 112,
  contents: [
    {
      kind: "3d-model",
      fileCount: 62,
      extensions: ["fbx", "gltf", "bin"],
      examplePath:
        "Universal Base Characters[Standard]/Base Characters/Unity/Superhero_Male_FullBody.fbx",
      note: "Two full-body base meshes and eight hair/eyebrow meshes, each shipped for Unity and for Godot/Unreal, and the hair again rigged to a head bone.",
    },
    {
      kind: "pbr-texture-map",
      fileCount: 47,
      extensions: ["png"],
      examplePath:
        "Universal Base Characters[Standard]/Base Characters/Textures/T_Superhero_Male_Dark.png",
      note: "2048x2048 base-colour, normal and roughness atlases. They are UV unwraps of the meshes above, not pictures of a person.",
    },
    {
      kind: "promotional-render",
      fileCount: 1,
      extensions: ["png"],
      examplePath: "Universal Base Characters[Standard]/Preview.png",
      note: "1921x1081 marketing composite: six figures in underwear against a purple checkerboard, with the pack's wordmark across the top.",
    },
    {
      kind: "licence-document",
      fileCount: 1,
      extensions: ["txt"],
      examplePath: "Universal Base Characters[Standard]/License_Standard.txt",
    },
    {
      kind: "readme",
      fileCount: 1,
      extensions: ["txt"],
      examplePath:
        "Universal Base Characters[Standard]/Base Characters/Unreal-Engine-README.txt",
    },
  ],
  licence: {
    spdxId: "CC0-1.0",
    statement:
      "CC0 1.0 Universal Public Domain Dedication, stated in the archive's own licence file. Models by @Quaternius.",
    evidence: "archive-document",
    evidencePath: "Universal Base Characters[Standard]/License_Standard.txt",
    attributionRequired: false,
    creator: "Quaternius",
  },
  disposition: "archive",
  refusalReasons: [
    "needs-rigging-or-render",
    "no-finished-2d-art",
    "subject-unsuitable",
  ],
  rationale:
    "Legally unencumbered and technically unreachable. Every mesh would have to be rigged, posed, lit and rendered to produce a single frame this compositor could draw, and that pipeline does not exist here. The only 2D files are UV texture atlases and one marketing render of heroic-proportion figures in underwear. Kept on the shelf against a future in which the project acquires a 3D render step; nothing is copied in.",
  harvested: [],
  reviewedOn: REVIEWED_ON,
  reviewedBy: REVIEWED_BY,
};

/**
 * Quaternius, "Universal Animation Library [Standard]".
 *
 * CC0 1.0, stated in `License.txt`. Two files of skeletal animation, each
 * shipped for Unity and for Godot/Unreal, plus three engine setup screenshots.
 *
 * There is no art in this pack at all, finished or otherwise — it is motion
 * data for a rig this project does not have. It is recorded so that nobody
 * downloads it twice hoping for something else.
 */
export const PACK_UNIVERSAL_ANIMATION_LIBRARY: ExternalPackRecord = {
  packId: "quaternius-universal-animation-library-standard",
  title: "Universal Animation Library [Standard]",
  archiveFileName: "Universal Animation Library[Standard].zip",
  archiveByteLength: 15_904_933,
  archiveSha256:
    "cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724",
  creator: "Quaternius",
  sourceUrl: "https://quaternius.com",
  entryCount: 9,
  contents: [
    {
      kind: "animation-clip",
      fileCount: 4,
      extensions: ["fbx", "glb"],
      examplePath:
        "Universal Animation Library[Standard]/Unity/UAL1_Standard.fbx",
      note: "One library with root motion baked in and one without, each for Unity and for Godot/Unreal.",
    },
    {
      kind: "promotional-render",
      fileCount: 3,
      extensions: ["png"],
      examplePath: "Universal Animation Library[Standard]/Unity_Setup.png",
      note: "Engine import screenshots. Instructions, not assets.",
    },
    {
      kind: "licence-document",
      fileCount: 1,
      extensions: ["txt"],
      examplePath: "Universal Animation Library[Standard]/License.txt",
    },
    {
      kind: "readme",
      fileCount: 1,
      extensions: ["txt"],
      examplePath: "Universal Animation Library[Standard]/README.txt",
    },
  ],
  licence: {
    spdxId: "CC0-1.0",
    statement:
      "CC0 1.0 Universal Public Domain Dedication, stated in the archive's own licence file. Models by @Quaternius.",
    evidence: "archive-document",
    evidencePath: "Universal Animation Library[Standard]/License.txt",
    attributionRequired: false,
    creator: "Quaternius",
  },
  disposition: "archive",
  refusalReasons: ["needs-rigging-or-render", "no-finished-2d-art"],
  rationale:
    "Skeletal animation for a humanoid rig. This project composites still 2D layers and has no rig, no skeleton and no runtime that could play a clip. Extracting a pose would mean rigging a separate mesh, posing it to a frame and rendering it, which the operating rule excludes. Recorded so the download is accounted for.",
  harvested: [],
  reviewedOn: REVIEWED_ON,
  reviewedBy: REVIEWED_BY,
};

/**
 * "Office Cubicle Set", as downloaded (`Office Cubicle Set.zip`).
 *
 * Referred to in the routing authority as "Omie's Office Set"; the archive
 * carries no creator name, so the two are recorded as the same download by
 * hash rather than asserted to be the same product.
 *
 * A Blender/Substance Painter source project: one cubicle, a desk, a chair, a
 * computer setup, sticky notes and a cartoon "Office Man", as FBX meshes with
 * 2048x2048 PBR maps, plus the `.blend` and `.spp` authoring files and eighty
 * turntable frames.
 *
 * There is no licence document anywhere in the archive. Under the repository's
 * rights rule that is the end of it — unknown rights stay unknown, and being
 * free to download is not evidence of a grant. Independently, it is a 3D source
 * project and the render it ships is flat-shaded low-poly, which is not the
 * grounded semi-realistic illustration the environment library is drawn in.
 */
export const PACK_OFFICE_CUBICLE_SET: ExternalPackRecord = {
  packId: "office-cubicle-set",
  title: "Office Cubicle Set (routed as “Omie’s Office Set”)",
  archiveFileName: "Office Cubicle Set.zip",
  archiveByteLength: 527_258_457,
  archiveSha256:
    "e3fffca9529fc3627bbda2bb6d3b366058069473e8b9d621bdeb1efc31b51ac9",
  entryCount: 138,
  contents: [
    {
      kind: "3d-model",
      fileCount: 24,
      extensions: ["fbx"],
      examplePath: "Office Cubicle/DeskSetup/Models/SM_Desk.fbx",
      note: "Cubicle, desk, drawers, chair, monitor, keyboard, mouse, notebook, pencil holder, sticky notes, trash bin and one character mesh.",
    },
    {
      kind: "pbr-texture-map",
      fileCount: 21,
      extensions: ["png"],
      examplePath:
        "Office Cubicle/DeskSetup/Textures/Mat_DeskSetup_BaseColor.png",
      note: "2048x2048 base-colour, displacement, metallic, normal and roughness atlases for four material sets.",
    },
    {
      kind: "promotional-render",
      fileCount: 85,
      extensions: ["png", "mp4"],
      examplePath: "Office Cubicle/PromationalFiles/SceenShot.png",
      note: "Four screenshots and wireframes, eighty turntable frames and the video cut from them. Pictures of the model, not the model.",
    },
    {
      kind: "source-project-file",
      fileCount: 8,
      extensions: ["blend", "blend1", "spp"],
      examplePath: "Office Cubicle/Office Cubicle.blend",
      note: "Blender scene, its autosave, and four Substance Painter projects.",
    },
  ],
  licence: {
    statement:
      "No licence document of any kind exists in the archive: no LICENSE, no README, no terms in any folder. The rights position is unknown, and free availability is not evidence of a grant.",
    evidence: "none",
    attributionRequired: false,
  },
  disposition: "reject",
  refusalReasons: [
    "rights-unverified",
    "needs-rigging-or-render",
    "no-finished-2d-art",
    "style-mismatch",
  ],
  rationale:
    "Rejected on rights first: the archive contains no licence, so nothing in it may be shipped, and no amount of technical suitability would change that. It also happens to be a Blender and Substance Painter source project whose only 2D files are PBR atlases and turntable frames, and the render it ships is flat-shaded low-poly against the environment library's grounded semi-realistic illustration. Not archived either — archiving implies a future in which it becomes usable, and unverified rights do not resolve themselves.",
  harvested: [],
  reviewedOn: REVIEWED_ON,
  reviewedBy: REVIEWED_BY,
};

export const EXTERNAL_PACK_RECORDS: readonly ExternalPackRecord[] = [
  PACK_OFFICE_CUBICLE_SET,
  PACK_UNIVERSAL_ANIMATION_LIBRARY,
  PACK_UNIVERSAL_BASE_CHARACTERS,
];
