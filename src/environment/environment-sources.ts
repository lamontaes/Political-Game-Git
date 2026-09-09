import assetManifest from "../../art/manifest/asset_manifest.json";
import environmentIntake from "../../art/intake/ax-92b1/environment-intake-report.json";
import driveInventory from "../../art/qa/p95-recent-drive-sweep/drive-image-inventory.json";

/**
 * EVERY ENVIRONMENT, TITLE, BACKGROUND AND PROP SOURCE THIS PROJECT HOLDS, AND
 * WHAT BECAME OF IT.
 *
 * `scene-consumers.ts` answers "what does the player see". This answers the
 * question one step earlier and one step wider: "of everything we already own,
 * what is in the game, what could be, and what exactly is stopping the rest".
 *
 * It exists because the honest answer had been spread across an asset manifest,
 * an intake report, a 286-row drive inventory, a request bank and a scene
 * registry, and reading five files in the right order is how a bank of approved
 * pictures quietly stays a bank. The activation that commissioned this lane put
 * it plainly: not another inventory, and not an inventory-only endpoint.
 *
 * WHAT IS DERIVED AND WHAT IS DECLARED. Counts, hashes, widths, tier ladders
 * and release status are READ from the manifests and the intake evidence, so
 * this file cannot claim a picture is released when the manifest says
 * otherwise. What is declared is the disposition sentence — why a source is
 * where it is — because that is a judgement and judgements should be signed
 * rather than computed.
 *
 * WHAT IT MUST NEVER DO. It does not approve anything. Rights status stays
 * unknown where it is unknown, style-family status stays unassessed where it is
 * unassessed, and a candidate stays a candidate until the owner says otherwise.
 * Nothing here releases art, and the strings below are not permission.
 */

export type EnvironmentSourceDisposition =
  /** Released, registered, and a canonical activity puts a life in it. */
  | "in-ordinary-play"
  /** Released and registered; no canonical activity reaches it yet. */
  | "released-no-canonical-activity"
  /** Approved art, carried through the pipeline, deliberately not released. */
  | "carried-not-released"
  /** Approved art that cannot be carried, for a stated mechanical reason. */
  | "blocked-below-master-minimum"
  /** Owner acceptance and/or geometry calibration is outstanding. */
  | "candidate-preview-only"
  /** Held as reference. Not a room, and never was going to be one. */
  | "reference-only"
  /** The same pixels as something else already accounted for. */
  | "duplicate-of-accounted-source"
  /** A sheet that would have to be cut up before any of it is an asset. */
  | "source-sheet-not-separable"
  /** A declared bank with nothing in it. */
  | "bank-empty";

export interface EnvironmentSourceRecord {
  readonly sourceId: string;
  /** What a reviewer would call it. */
  readonly label: string;
  /** Where the bytes are, when they are in this repository. */
  readonly path: string | null;
  readonly disposition: EnvironmentSourceDisposition;
  /** The registered scene it became, when it became one. */
  readonly sceneId: string | null;
  /**
   * The single next thing that would move this source forward. Null only when
   * the source is finished or is deliberately terminal.
   */
  readonly remainingStep: string | null;
  /** Who or what has to supply that step. Never "somebody". */
  readonly owedBy: string | null;
  /** Structured request ids from `art/requests/asset-requests.json`. */
  readonly openRequestIds: readonly string[];
  /** Why it is where it is. */
  readonly note: string;
}

interface ManifestAsset {
  readonly asset_id: string;
  readonly asset_type: string;
  readonly family_id?: string;
  readonly runtime_release_status: string;
  readonly qa_status: string;
  readonly final_path: string;
  readonly raster_tiers?: readonly { readonly width: number }[] | null;
}

const MANIFEST_ASSETS = (
  assetManifest as unknown as { readonly assets: readonly ManifestAsset[] }
).assets;

/** Manifested environment art, by id, so dispositions cannot drift from it. */
const ENVIRONMENT_ASSETS: ReadonlyMap<string, ManifestAsset> = new Map(
  MANIFEST_ASSETS.filter((asset) =>
    asset.asset_type.startsWith("environment"),
  ).map((asset) => [asset.asset_id, asset]),
);

export function environmentAsset(assetId: string): ManifestAsset | null {
  return ENVIRONMENT_ASSETS.get(assetId) ?? null;
}

/** Every manifested environment asset id, so none can be silently omitted. */
export function manifestedEnvironmentAssetIds(): readonly string[] {
  return [...ENVIRONMENT_ASSETS.keys()].sort();
}

/**
 * The declared dispositions.
 *
 * Ordered by how close each source is to a player, because the question a
 * reviewer asks is "what is actually in the game", and the answer should not
 * start with 145 reference photographs.
 */
export const ENVIRONMENT_SOURCES: readonly EnvironmentSourceRecord[] = [
  /* --- In ordinary play ------------------------------------------------- */
  {
    sourceId: "env_residence_apartment_living_canonical_03_5504x3072_v1",
    label: "An ordinary apartment living room (canonical)",
    path: "art/families/apartment-ordinary/env_residence_apartment_living_canonical_03_v1.png",
    disposition: "in-ordinary-play",
    sceneId: "residence-apartment-living-canonical-03",
    remainingStep: null,
    owedBy: null,
    openRequestIds: [],
    note: "Home. `resolveLifeScene` picks a domestic room from the household on record, and PlayerGame paints it. This was already true before this lane.",
  },
  {
    sourceId: "env_residence_apartment_living_ordinary_02_5504x3072_v1",
    label: "An ordinary apartment living room (second)",
    path: "art/families/apartment-ordinary/env_residence_apartment_living_ordinary_02_v1.png",
    disposition: "in-ordinary-play",
    sceneId: "residence-apartment-living-ordinary-02",
    remainingStep: null,
    owedBy: null,
    openRequestIds: [],
    note: "The other home. Which household gets which room is keyed off the household id, so one home is one room for the life of a save.",
  },
  {
    sourceId: "title_bg_civic_community_meeting_hero_slot_5504x3072_v1",
    label: "The community meeting hall",
    path: "art/families/civic-community-meeting/title_bg_civic_community_meeting_hero_slot_v1.png",
    disposition: "released-no-canonical-activity",
    sceneId: "civic-community-meeting-room",
    remainingStep:
      "UI-core must integrate docs/integration/env-all1-ui-core.patch; activity execution and immediate aftermath are implemented, normal-root integration is pending.",
    owedBy: "UI-CORE-RELEASE",
    openRequestIds: [],
    note: "ONE PLATE, TWO SCENES. It has stood behind the title since #86; this lane authored it a second time as a room to be in, and the posted public meeting an ordinary life can attend now resolves to it. No new art was made for either use.",
  },
  {
    sourceId: "env_shared_workroom_office_v1",
    label: "A shared staff workroom",
    path: "art/families/shared-workroom-office/env_shared_workroom_office_v1.png",
    disposition: "released-no-canonical-activity",
    sceneId: "shared-workroom-office-production",
    remainingStep:
      "A PRODUCTION path that schedules a located day of legislative staff work. The venue mapping from `lexington-legislative-office` to this room is declared and proven, but that key is written only by `createRunDLiteFixture`, a development fixture reached at `?view=office-fixture`.",
    owedBy: "the legislation owner",
    openRequestIds: ["person-production-seated-body"],
    note: "CORRECTED IN FLIGHT. This row first said 'in ordinary play'. The review page's own exercise, run against the real build, returned no room for a fresh legislative start and showed the claim was wrong: the room and the mapping are fine, and nothing in production writes the key that reaches them. Its person anchors also still fail closed — there is no released seated body, and a development mannequin is not drawn on a production plate to hide that.",
  },

  /* --- Released, waiting on a canonical activity ------------------------- */
  {
    sourceId: "env_civic_hearing_room_5504x3072_v1",
    label: "A public hearing room",
    path: "art/families/civic-hearing-room/env_civic_hearing_room_v1.png",
    disposition: "released-no-canonical-activity",
    sceneId: "civic-hearing-room-production",
    remainingStep:
      "A committee hearing that is a LOCATED activity. Hearings are canonical today — `scheduleCommitteeHearing` and `COMMITTEE_HEARING_TRANSITION_KEY` are real — but they are scheduled as future due items, which carry no `location.locationKey` for the venue table to map.",
    owedBy: "the legislation owner",
    openRequestIds: ["env-hearing-room-foreground-mask"],
    note: "The art is not the blocker and has not been since the master arrived. The gap is one field: a hearing that says where it is.",
  },
  {
    sourceId: "env_legislative_chamber_floor_5632x3072_v1",
    label: "The chamber floor",
    path: "art/families/legislative-chamber/env_legislative_chamber_floor_v1.png",
    disposition: "released-no-canonical-activity",
    sceneId: "legislative-chamber-production",
    remainingStep:
      "A floor session that is a LOCATED activity, for the same reason as the hearing room. `takeFloorVote` is canonical; nothing about it says which room it happens in.",
    owedBy: "the legislation owner",
    openRequestIds: [],
    note: "Registered with a rostrum contact measured separately from the well floor. Ready and unreached.",
  },
  {
    sourceId: "title_bg_civic_community_meeting_hero_slot_5504x3072_v1:title",
    label: "The community meeting hall, as the title tableau",
    path: "art/families/civic-community-meeting/title_bg_civic_community_meeting_hero_slot_v1.png",
    disposition: "in-ordinary-play",
    sceneId: "civic-community-meeting-title",
    remainingStep: null,
    owedBy: null,
    openRequestIds: ["person-production-standing-body"],
    note: "The same asset in its original use. Listed separately from the room above so the two framings are countable apart rather than one hiding the other.",
  },

  /* --- Carried through the pipeline, deliberately not released ------------ */
  {
    sourceId: "env_courtroom_empty_5504x3072_v1",
    label: "A courtroom",
    path: "art/families/courtroom/env_courtroom_empty_v1.png",
    disposition: "carried-not-released",
    sceneId: "courtroom-empty-production",
    remainingStep:
      "A canonical court proceeding a life can be at. The 92G judicial kernel bank compiles proceedings and can already emit a located scheduled activity, but NOTHING in this repository calls `applyJudicialGameplayPlan`, so no life can reach a court.",
    owedBy: "a judicial gameplay owner",
    openRequestIds: [],
    note: "APPROVED ART, FULLY CARRIED, HELD AT THE GATE. This lane derived its two runtime tiers as deterministic downscales, authored its anchors, occluders and slots against the plate, and registered it. It stays UNRELEASED because the room has nothing to be the room of, and releasing it would be inventing judicial gameplay to give a picture somewhere to go. The departure from its earlier 'no tier until a consumer exists' constraint is recorded in the manifest entry rather than quietly taken.",
  },

  /* --- Approved, mechanically blocked ------------------------------------ */
  {
    sourceId: "env_office_executive_private_lincoln_1672x941_v1",
    label: "An executive's private study (banked master)",
    path: "art/references/masters/scene-environment/OCD_SCENE_MASTER_EXECUTIVE_PRIVATE_OFFICE_1672x941_01.png",
    disposition: "blocked-below-master-minimum",
    sceneId: null,
    remainingStep:
      "A replacement master at or above 4608px. IMG_5189.JPG in the drive sweep is a 5504x3072 empty executive-office candidate and is exactly that replacement — pending owner acceptance.",
    owedBy: "the owner, for acceptance of IMG_5189.JPG",
    openRequestIds: ["env-executive-office-4k-master"],
    note: "TWO INDEPENDENT BLOCKERS, and it matters that they are counted separately. At 1672px it is below the 4608px environment master minimum, so it cannot be carried at all. And `resolvePlayerCapabilities` has no executive capability, so even a 4K replacement would have nowhere to be shown. Fixing the pixels does not fix the life.",
  },
  {
    sourceId: "env_residence_apartment_living_modest_01_1376x768_v1",
    label: "A third, modest apartment living room (banked master)",
    path: "art/references/masters/scene-environment/OCD_SCENE_MASTER_APARTMENT_LIVING_STARTER_01_1376x768.png",
    disposition: "blocked-below-master-minimum",
    sceneId: null,
    remainingStep:
      "A 4608px-or-wider master of this room. It cannot be produced by enlarging this one: the pipeline never upscales a raster.",
    owedBy: "the owner, for a new source master",
    openRequestIds: ["env-domestic-living-rooms"],
    note: "1376x768 is a runtime TIER width, not a master width. Its two sibling apartments were re-sourced at 5504x3072 and released; this one never was, so a third home stays unavailable and the domestic chooser walks two rooms rather than three.",
  },

  /* --- Candidates: pixels exist, approval does not ----------------------- */
  {
    sourceId: "env_park_community_pavilion_5504x3072_01",
    label: "A park with a community pavilion (candidate)",
    path: "art/references/candidates/recent-drive-sweep/source-images/IMG_5204.JPG",
    disposition: "candidate-preview-only",
    sceneId: null,
    remainingStep:
      "THREE things, and none of them is a picture. (1) Owner acceptance and a style-family ruling — the AX-92B1 pass recorded `disposition: undecided` and `styleFamilyStatus: unassessed`. (2) The D-070 human floor-plane gate: `floorUsable` and `seatUsable` are unassessed on purpose, and no anchor may be authored until they are. (3) An outdoor environment family, because every registered scene in this game is an interior.",
    owedBy: "the owner",
    openRequestIds: [],
    note: "#131 intake ran it to `production` disposition mechanically; that is an intake verdict about the bytes, not owner acceptance of the art. Its baked furniture is extensive — roughly a dozen picnic tables — so modular people could not stand on the slab without contending with them. Rights status is unknown and stays unknown.",
  },
  {
    sourceId: "env_press_briefing_room_5504x3072_01",
    label: "A press or announcement room (candidate)",
    path: "art/references/candidates/recent-drive-sweep/source-images/IMG_5202.JPG",
    disposition: "candidate-preview-only",
    sceneId: null,
    remainingStep:
      "Owner acceptance plus the D-070 floor-plane gate, as above. It ALSO needs a canonical press event: nothing in this game says a briefing exists, is scheduled or is attendable.",
    owedBy: "the owner, and then a campaign or executive owner",
    openRequestIds: [],
    note: "IT IS NOT THE HEARING ROOM, and the intake pass says so explicitly. It must not be substituted for `civic-hearing-room-production` or the committee fixture. Very little open floor survives between its thirty stacking chairs and the riser.",
  },
  {
    sourceId: "IMG_5189.JPG",
    label: "An empty executive office at 5504x3072 (candidate)",
    path: "art/references/candidates/recent-drive-sweep/source-images/IMG_5189.JPG",
    disposition: "candidate-preview-only",
    sceneId: null,
    remainingStep:
      "Owner acceptance. Mechanically it is the strongest unaccepted candidate in the bank: it is the only one that answers a standing asset request outright.",
    owedBy: "the owner",
    openRequestIds: ["env-executive-office-4k-master"],
    note: "Classified NEW_PRODUCTION_SOURCE_CANDIDATE by the drive sweep and never carried further. At 5504px it clears the master minimum the banked 1672px executive master fails. Accepting it would close the art half of the executive gap; the capability half would remain.",
  },
  {
    sourceId: "IMG_5190.JPG",
    label: "A field office (candidate variant)",
    path: "art/references/candidates/recent-drive-sweep/source-images/IMG_5190.JPG",
    disposition: "candidate-preview-only",
    sceneId: null,
    remainingStep: "Owner acceptance, and a choice between this and IMG_5207.",
    owedBy: "the owner",
    openRequestIds: ["env-campaign-storefront"],
    note: "The sweep records it as visually similar to IMG_5207 with a different SHA-256, so it is a VARIANT and not a duplicate. Campaign activities are canonical today — `campaign-office`, `campaign-call-desk` — and have no room, which makes this the second-most valuable unaccepted candidate.",
  },
  {
    sourceId: "IMG_5207.JPG",
    label: "A field office (candidate)",
    path: "art/references/candidates/recent-drive-sweep/source-images/IMG_5207.JPG",
    disposition: "candidate-preview-only",
    sceneId: null,
    remainingStep: "Owner acceptance, and a choice between this and IMG_5190.",
    owedBy: "the owner",
    openRequestIds: ["env-campaign-storefront"],
    note: "Classified NEW_PRODUCTION_SOURCE_CANDIDATE and described as an empty civic/work environment with blank dynamic surfaces, which is the right shape for declared slots.",
  },
  {
    sourceId: "IMG_5205.JPG",
    label: "An empty civic or work environment (candidate)",
    path: "art/references/candidates/recent-drive-sweep/source-images/IMG_5205.JPG",
    disposition: "candidate-preview-only",
    sceneId: null,
    remainingStep:
      "Owner acceptance, and — before that — a decision about what room it is FOR. It answers no open request.",
    owedBy: "the owner",
    openRequestIds: [],
    note: "The one environment candidate with pixels and no destination. Carrying it further would mean choosing a use for a picture rather than finding a picture for a use, which is the wrong way round and is not done here.",
  },
  {
    sourceId: "PG_TITLE_BG_COURTROOM_JUDGE_HERO_SLOT_01_5504x3072.jpg",
    label: "A courtroom title background (reference)",
    path: null,
    disposition: "reference-only",
    sceneId: null,
    remainingStep:
      "A separate title-art review. It is held as reference pending that review and is not in this repository.",
    owedBy: "the owner",
    openRequestIds: [],
    note: "Named as a title background, retained REFERENCE_ONLY by the sweep. It is not the courtroom scene master and is not a second courtroom.",
  },

  /* --- Development fixtures, kept deliberately --------------------------- */
  {
    sourceId: "env_lexington_council_staff_office_prompt30_v1",
    label: "A municipal council staff office (frozen fixture)",
    path: "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_v1.png",
    disposition: "released-no-canonical-activity",
    sceneId: "office-council-staff-fixture",
    remainingStep: null,
    owedBy: null,
    openRequestIds: [],
    note: "QUARANTINED ON PURPOSE, and not a candidate for generic reuse. The plate has a Fayette County map on its wall, so it is admissible only for a legislative job whose jurisdiction is Lexington-Fayette; the generic `lexington-legislative-office` venue key resolves to the unscoped production WORKROOM instead. It is kept as frozen regression evidence and is reachable at ?view=office-fixture.",
  },
  {
    sourceId: "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
    label: "The council-staff office's furniture mask",
    path: "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_foreground_mask_2x_v1.png",
    disposition: "released-no-canonical-activity",
    sceneId: "office-council-staff-fixture",
    remainingStep: null,
    owedBy: null,
    openRequestIds: [],
    note: "THE ONLY AUTHORED FOREGROUND MASK IN THE PROJECT. Every other room's occluders are declared as rectangles with no cutout, which is why `env-hearing-room-foreground-mask` is still open. It is a deterministic furniture-only derivative of the approved Prompt 30 input and is a development fixture derived at 2x, so it carries an upscaled-development-fixture lineage rather than claiming native detail.",
  },

  /* --- Terminal: nothing is owed ----------------------------------------- */
  {
    sourceId: "IMG_5183.JPG",
    label: "The legislative chamber master, again",
    path: null,
    disposition: "duplicate-of-accounted-source",
    sceneId: "legislative-chamber-production",
    remainingStep: null,
    owedBy: null,
    openRequestIds: [],
    note: "Byte-identical to OCD_CANDIDATE_SCENE_GENERIC_LEGISLATIVE_CHAMBER_FLOOR_5632x3072_01.jpg, which is already released. A source duplicate is not an extra playable room.",
  },
  {
    sourceId: "supplies.png",
    label: "An office and accessory prop sheet",
    path: "art/references/candidates/recent-drive-sweep/source-images/supplies.png",
    disposition: "source-sheet-not-separable",
    sceneId: null,
    remainingStep:
      "A chopper that can separate adjacent objects. The accepted chopper groups neighbouring objects and CANNOT safely item-chop this sheet, which the sweep recorded rather than producing twenty-seven bad cutouts.",
    owedBy: "an art-pipeline owner",
    openRequestIds: [],
    note: "Twenty-seven staggered office and accessory objects including a lanyard badge. This is the whole of the prop-source position: one sheet nobody can cut, and eight empty prop banks below.",
  },
  {
    sourceId: "art/shared/*",
    label:
      "The shared prop banks: flags, seals, furniture, lecterns, AV/press, lighting, doors and rails, desk documents",
    path: "art/shared/",
    disposition: "bank-empty",
    sceneId: null,
    remainingStep:
      "Any prop asset at all. Eight directories are declared and every one contains only a `.gitkeep`.",
    owedBy: "an art-pipeline owner",
    openRequestIds: [],
    note: "AN EXACT AND UNCOMFORTABLE GAP. Every prop in every released room is BAKED into its plate. Nothing composites. That is why the civic-symbol slots on the lectern and the banner have canonical policies and no artwork to honour them: 18K names an official symbol library and this repository holds none of it.",
  },
];

/* -------------------------------------------------------------------------- */
/* Derived totals                                                             */
/* -------------------------------------------------------------------------- */

interface DriveInventoryFile {
  readonly filename: string;
  readonly classification: string;
  readonly likelyAssetFamily: string;
}

const DRIVE_FILES = (
  driveInventory as unknown as {
    readonly count: number;
    readonly files: readonly DriveInventoryFile[];
  }
).files;

/**
 * The bulk of the drive sweep, counted rather than listed.
 *
 * 145 reference photographs and 32 duplicates are a real part of "every source
 * in the declared banks", and listing them individually above would bury the
 * eight that can still move. They are counted here so the total is checkable
 * and so nobody has to re-run the sweep to find out how many there were.
 */
export interface EnvironmentSourceBulkCount {
  readonly classification: string;
  readonly family: string;
  readonly count: number;
  readonly disposition: EnvironmentSourceDisposition;
  readonly note: string;
}

export function environmentSourceBulkCounts(): readonly EnvironmentSourceBulkCount[] {
  const tally = new Map<string, number>();
  for (const file of DRIVE_FILES) {
    const key = `${file.classification} ${file.likelyAssetFamily}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const rows: EnvironmentSourceBulkCount[] = [];
  for (const [key, count] of tally) {
    const [classification, family] = key.split(" ") as [string, string];
    if (!/environment|title background|historical source/i.test(family)) {
      // People, wardrobe and body morphology sources belong to PEOPLE1. They
      // are counted by that lane and are deliberately not re-adjudicated here.
      continue;
    }
    const disposition: EnvironmentSourceDisposition =
      classification === "EXACT_DUPLICATE"
        ? "duplicate-of-accounted-source"
        : classification === "REFERENCE_ONLY"
          ? "reference-only"
          : "candidate-preview-only";
    rows.push({
      classification,
      family,
      count,
      disposition,
      note:
        classification === "REFERENCE_ONLY"
          ? "Reference photographs and historical evidence. A photograph of a real room is not a playable room and is not a candidate for becoming one."
          : classification === "EXACT_DUPLICATE"
            ? "Byte-identical to something already accounted for."
            : "Counted here and adjudicated individually above.",
    });
  }
  return rows.sort(
    (left, right) =>
      right.count - left.count ||
      left.classification.localeCompare(right.classification),
  );
}

/** How many image sources the drive sweep byte-verified in total. */
export const DRIVE_SWEEP_TOTAL = DRIVE_FILES.length;

/**
 * How many environment candidates #131's intake carried, so this lane's claim
 * to have gone past park and press room is checkable rather than asserted.
 */
export const INTAKE_CARRIED_COUNT = (
  environmentIntake as unknown as { readonly productionCount: number }
).productionCount;

/**
 * Sources still owing somebody something, most player-adjacent first.
 *
 * This is the list the activation asked to be inspectable: what is left, and
 * exactly who owes it.
 */
export function environmentSourcesWithRemainingWork(): readonly EnvironmentSourceRecord[] {
  return ENVIRONMENT_SOURCES.filter((source) => source.remainingStep !== null);
}

/** Sources that are finished, for the same reason: so the total adds up. */
export function settledEnvironmentSources(): readonly EnvironmentSourceRecord[] {
  return ENVIRONMENT_SOURCES.filter((source) => source.remainingStep === null);
}
