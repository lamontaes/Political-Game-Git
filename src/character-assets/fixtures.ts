import type { CharacterAssetLibrary } from "./types";

export const SYNTHETIC_LIBRARY_V1: CharacterAssetLibrary = {
  version: "lib_v1",
  bodyFamilies: [
    {
      id: "body_family_01",
      shoulderWidthBand: "narrow",
      statureBand: "average",
      supportedPoseFamilies: ["pose_standing_neutral", "pose_seated_chair"],
      provenanceRef: "synthetic-source-A",
    },
    {
      id: "body_family_02",
      shoulderWidthBand: "broad",
      statureBand: "tall",
      supportedPoseFamilies: ["pose_standing_neutral", "pose_seated_chair", "pose_leaning_desk"],
      provenanceRef: "synthetic-source-B",
    },
  ],
  headFamilies: [
    {
      id: "head_family_01",
      compatibleBodyFamilies: ["body_family_01", "body_family_02"],
    },
    {
      id: "head_family_02",
      compatibleBodyFamilies: ["body_family_02"],
    },
  ],
  headAssets: [
    {
      id: "head_01_young",
      familyId: "head_family_01",
      ageState: "young_adult",
      provenanceRef: "synthetic-head-1-young",
    },
    {
      id: "head_01_adult",
      familyId: "head_family_01",
      ageState: "adult",
      provenanceRef: "synthetic-head-1-adult",
    },
    {
      id: "head_01_senior",
      familyId: "head_family_01",
      ageState: "senior",
      provenanceRef: "synthetic-head-1-senior",
    },
    {
      id: "head_02_young",
      familyId: "head_family_02",
      ageState: "young_adult",
      provenanceRef: "synthetic-head-2-young",
    },
    {
      id: "head_02_adult",
      familyId: "head_family_02",
      ageState: "adult",
      provenanceRef: "synthetic-head-2-adult",
    },
  ],
  hairAssets: [
    {
      id: "hair_short_neat",
      compatibleHeadFamilies: ["head_family_01", "head_family_02"],
      provenanceRef: "synthetic-hair-1",
    },
    {
      id: "hair_long_tied",
      compatibleHeadFamilies: ["head_family_01"],
      provenanceRef: "synthetic-hair-2",
    },
  ],
  wardrobeAssets: [
    {
      id: "wardrobe_business_01",
      compatibleBodyFamilies: ["body_family_01", "body_family_02"],
      tags: ["formal", "office"],
      provenanceRef: "synthetic-suit-1",
    },
    {
      id: "wardrobe_casual_01",
      compatibleBodyFamilies: ["body_family_01"],
      tags: ["casual"],
      provenanceRef: "synthetic-casual-1",
    },
    {
      id: "wardrobe_business_02",
      compatibleBodyFamilies: ["body_family_02"],
      tags: ["formal", "office"],
      provenanceRef: "synthetic-suit-2",
    },
  ],
  poses: [
    {
      id: "pose_standing_neutral",
      compatibleSceneAnchors: ["anchor_hallway", "anchor_podium"],
      provenanceRef: "synthetic-pose-1",
    },
    {
      id: "pose_seated_chair",
      compatibleSceneAnchors: ["anchor_visitor_chair", "anchor_committee_seat"],
      provenanceRef: "synthetic-pose-2",
    },
    {
      id: "pose_leaning_desk",
      compatibleSceneAnchors: ["anchor_desk_side"],
      provenanceRef: "synthetic-pose-3",
    },
  ],
};
