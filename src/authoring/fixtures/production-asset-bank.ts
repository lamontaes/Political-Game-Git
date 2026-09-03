/**
 * PRODUCTION CARGO — the approved environment library as an asset bank.
 *
 * Eight files: six approved masters, and the two enlargements that turned out
 * not to be what their names say. Each is banked with what the inspection could
 * actually determine and `unassessed` for everything it could not, which is
 * most of the questions that decide whether a plate ships.
 *
 * Nothing here is dispositioned `production`. That is not caution, it is the
 * schema: `production-while-unassessed` is a validation error, and the
 * questions that decide it — does the permanent shell cover anything that
 * matters, is the style in family, is there readable text painted into it —
 * need eyes on the actual pixels at the actual size. The plates are in Drive;
 * nobody has done that pass; the bank says so.
 *
 * The two mislabelled files are worth banking rather than deleting. They are
 * JPEG bitstreams inside files named `.png`, which is a specific and quiet kind
 * of wrong: every tool in the chain opens them, the container lies about the
 * codec, and a raster ladder built from one would carry JPEG artefacts under a
 * lossless label forever. Recording them as `reject` with the reason is how the
 * next person avoids re-deriving that discovery.
 */

import {
  createAssetBankEntry,
  createAssetBankManifest,
  type AssetBankEntry,
  type AssetBankManifest,
} from "../asset-bank";

/**
 * A plate the inspection looked at.
 *
 * Only two questions were genuinely answered by it — whether there are people
 * painted into the picture, and whether any text in it is readable — because
 * those are the two a careful look settles. Everything else stays
 * `unassessed`, including the style judgement, because "does this belong to the
 * same art family as the rest of the library" is a comparison nobody has made
 * side by side.
 */
function inspected(
  seed: {
    readonly entryId: string;
    readonly proposedFilename: string;
    readonly width: number;
    readonly height: number;
    readonly sceneFamilyId: string;
  },
  overrides: Partial<AssetBankEntry>,
): AssetBankEntry {
  return {
    ...createAssetBankEntry(seed),
    bakedPeople: "no",
    bakedReadableText: "no",
    assessedBy: "external-multimodal-qa",
    assessedAt: "2026-09-02",
    disposition: "undecided",
    ...overrides,
  };
}

const ENTRIES: readonly AssetBankEntry[] = [
  inspected(
    {
      entryId: "apartment-starter-01",
      proposedFilename:
        "env_residence_apartment_living_starter_01_1376x768_v1.png",
      width: 1376,
      height: 768,
      sceneFamilyId: "HOME_APARTMENT_STARTER_01",
    },
    {
      cameraAngle: "eye level, three-quarter into the room from the hallway",
      floorUsable: "yes",
      seatUsable: "yes",
      occluderCandidates: ["modest-coffee-table"],
      reuseContexts: [
        "player-first-home",
        "acquaintance-home",
        "volunteer-doorstep-conversation",
      ],
      notes: [
        "No enlargement exists anywhere. 1376 pixels is the honest ceiling, and the ladder stops there rather than inventing a tier.",
        "One television, two ambient frames. The right-hand frame is clipped by the plate boundary.",
      ],
    },
  ),
  inspected(
    {
      entryId: "apartment-ordinary-02",
      proposedFilename:
        "env_residence_apartment_living_ordinary_02_1376x768_v1.png",
      width: 1376,
      height: 768,
      sceneFamilyId: "HOME_APARTMENT_ORDINARY_02",
    },
    {
      cameraAngle:
        "eye level, three-quarter across the sofa toward the hallway",
      floorUsable: "yes",
      seatUsable: "yes",
      occluderCandidates: ["coffee-table-ordinary", "blue-armchair-front-arm"],
      reuseContexts: [
        "parents-home",
        "player-home",
        "acquaintance-home",
        "living-room-meeting",
      ],
      notes: [
        "Three seats and two standing positions: the most people of the three apartments.",
        "The autumn landscape on the left wall is a finished painting and is deliberately not a slot.",
      ],
    },
  ),
  inspected(
    {
      entryId: "apartment-settled-03",
      proposedFilename:
        "env_residence_apartment_living_settled_03_1376x768_v1.png",
      width: 1376,
      height: 768,
      sceneFamilyId: "HOME_APARTMENT_SETTLED_03",
    },
    {
      cameraAngle: "eye level, square to the sofa wall",
      floorUsable: "yes",
      seatUsable: "yes",
      occluderCandidates: ["coffee-table-foreground", "club-chair-near-arm"],
      reuseContexts: [
        "player-home",
        "mentor-home",
        "private-meeting",
        "election-night-at-home",
      ],
      notes: [
        "The benchmark room: widest seat group, largest television, only window big enough to carry weather.",
        "Four bookcase micro-frames. This is the plate the promotion threshold was written against.",
      ],
    },
  ),
  inspected(
    {
      entryId: "civic-community-meeting-hall",
      proposedFilename:
        "title_bg_civic_community_meeting_hero_slot_5504x3072_v1.png",
      width: 5504,
      height: 3072,
      sceneFamilyId: "CIVIC_COMMUNITY_MEETING_HALL_01",
    },
    {
      cameraAngle: "slightly above eye level, down the hall past the lectern",
      heroSlot: "yes",
      heroJustification:
        "The title tableau. Its podium position is the one place in the library a player's own current figure is meant to stand, and the composition is built around that spot.",
      floorUsable: "yes",
      seatUsable: "yes",
      occluderCandidates: ["podium-body-occluder", "foreground-chair-frame"],
      // The one plate in the library with people painted into it.
      bakedPeople: "yes",
      reuseContexts: [
        "title-tableau",
        "public-comment-meeting",
        "campaign-meet-and-greet",
        "neighbourhood-association",
      ],
      notes: [
        "The audience is baked. That is a real constraint and not a defect: only the podium hero slot and the right foreground chair accept modular people, and the scaffold declares exactly those two.",
        "Native 5504x3072, so it is the only master in the library that could fill a 4096 tier without any enlargement.",
      ],
    },
  ),
  inspected(
    {
      entryId: "executive-private-office",
      proposedFilename: "env_office_executive_private_1672x941_v1.png",
      width: 1672,
      height: 941,
      sceneFamilyId: "EXECUTIVE_PRIVATE_OFFICE_01",
    },
    {
      cameraAngle: "eye level, square across the desk from the guest side",
      floorUsable: "yes",
      seatUsable: "yes",
      occluderCandidates: [
        "executive-desk-front",
        "guest-chair-left-silhouette",
        "guest-chair-right-silhouette",
      ],
      reuseContexts: [
        "executive-working-office",
        "executive-meeting",
        "transition-day",
      ],
      notes: [
        "The left window frames a real classical capitol dome, which is why the family is jurisdiction-scoped. Bound outside a jurisdiction with one, it is a declared mismatch.",
        "The two guest chairs are occupied from behind. A front-facing seated body at either would be turned the wrong way in its own chair.",
      ],
    },
  ),
  inspected(
    {
      entryId: "office-council-staff-lexington",
      proposedFilename: "env_office_lexington_council_staff_1024x572_v1.png",
      width: 1024,
      height: 572,
      sceneFamilyId: "COUNCIL_STAFF_OFFICE_LEXINGTON_01",
    },
    {
      cameraAngle: "eye level, across the desk from the guest chair",
      floorUsable: "yes",
      seatUsable: "yes",
      occluderCandidates: ["desk-front", "guest-chair-near-arm"],
      // The only plate here whose bytes are in the repository, so its style and
      // its text were judged against real pixels rather than a description.
      styleFamilyStatus: "in-family",
      assessedBy: "human-review",
      disposition: "reference",
      reuseContexts: ["staff-working-day", "constituent-meeting"],
      notes: [
        "Frozen development fixture, and dispositioned `reference` rather than `production` for that reason. Its real detail is 1024x572; the shipped 2048x1144 file is a 2x resample of the same source and carries nothing extra.",
        "The one room in the library with a derived alpha mask, and the one whose wall map makes the case for dynamic surfaces: the plate is painted with one city's street grid.",
      ],
    },
  ),
  {
    ...createAssetBankEntry({
      entryId: "apartment-ordinary-02-upscale-mislabelled",
      proposedFilename: "upscale_image_01-3.png",
      width: 5504,
      height: 3072,
      sceneFamilyId: "HOME_APARTMENT_ORDINARY_02",
    }),
    artifactFlags: ["compression-mush"],
    duplicateOf: "apartment-ordinary-02",
    disposition: "reject",
    assessedBy: "automated-measurement",
    assessedAt: "2026-09-02",
    notes: [
      "A JPEG bitstream in a file named .png. Every tool in the chain opens it happily, which is exactly the problem: a ladder built from it would carry JPEG artefacts under a lossless label forever.",
      "Rejected as it stands. Remuxing it into a real PNG and declaring it an `external-upscale-derivative` with nativeDetailWidth 1376 would make it admissible; nothing about that is automatic, and it has not been done.",
    ],
  },
  {
    ...createAssetBankEntry({
      entryId: "apartment-settled-03-upscale-mislabelled",
      proposedFilename: "upscale_image_01-4.png",
      width: 5504,
      height: 3072,
      sceneFamilyId: "HOME_APARTMENT_SETTLED_03",
    }),
    artifactFlags: ["compression-mush"],
    duplicateOf: "apartment-settled-03",
    disposition: "reject",
    assessedBy: "automated-measurement",
    assessedAt: "2026-09-02",
    notes: [
      "The same defect as the ordinary apartment's enlargement: a JPEG bitstream in a .png container.",
      "Its pixel width would fill a 4096 tier. Its real detail stops at 1376, and the two facts must never be confused, which is what nativeDetailWidth exists to prevent.",
    ],
  },
];

export const PRODUCTION_PLATE_ASSET_BANK: AssetBankManifest =
  createAssetBankManifest(
    "approved-environment-library-2026-09-03",
    ENTRIES,
    "The six approved environment masters and the two mislabelled enlargements. Six of the eight are Drive-only; the seventh is the Lexington fixture, whose bytes are in this repository. No entry is dispositioned production, because the questions that decide production need eyes on pixels at size and nobody has done that pass.",
  );
