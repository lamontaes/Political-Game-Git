import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/** Candidate image-space geometry, not owner approval or fitted character proof.
 * Source: main fec18c8a3f94fdb73377d9d655de7248e8aceb49, art/backdrops.
 * All variants inspected individually at 1672x941. Marks are visual estimates.
 * Coordinate origin: upper-left image edge; percent = 100 * pixel / dimension.
 * No renderer/registry wiring here. No raster enlargement.
 */
export const RESIDENCE_LARGE_HOUSE_WAVE2_SCENES: readonly EnvironmentSceneSpec[] =
  [
    {
      environment_id: "environment:residence-large-house-morning-wave2:v1",
      scene_id: "residence-large-house-morning-wave2",
      family_id: "residence-large-house",
      label: "Large house (morning)",
      presentation_status: "development-fixture",
      fidelity_tier: "F2",
      coordinate_system: "plate-normalized",
      units: "plate-percent",
      plate: {
        width: 1672,
        height: 941,
      },
      sources: [
        {
          id: "plate",
          source_type:
            "generated illustration, JPEG encoding at native dimensions",
          authority_class: "unapproved candidate; exact raster SHA-256 in tier",
        },
      ],
      camera_policy: {
        minimum_aspect_ratio: 1.7768331562167907,
        maximum_aspect_ratio: 1.7768331562167907,
        horizontal_focus: 0.5,
        vertical_focus: 0.5,
      },
      safe_area: {
        x: 0,
        y: 0,
        width: 1672,
        height: 941,
      },
      essential_content_area: {
        x: 0,
        y: 0,
        width: 1672,
        height: 941,
      },
      ui_safe_zones: [],
      raster: {
        asset_id: "env_large_house_morning_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/large-house__morning.jpg",
            hash: "352fe086cd9217be112a18208b378a5455d0e92cdeec709563b4d40e781214ae",
            derivation: "native-master",
          },
        ],
      },
      fixed_furniture: [
        {
          id: "visible-tabletop-plane",
          type: "tabletop-plane",
          geometry_grade: "G1",
          provenance_refs: ["plate"],
          dimensions: {
            vertex_1_x: {
              value: 637,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 460,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 855,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 460,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 860,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 482,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 590,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 482,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
          },
        },
      ],
      anchors: [
        {
          id: "living-room-floor-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 26.31578947368421,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 50.239234449760765,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 74.16267942583733,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "RECORDED VISUAL ESTIMATE FROM THIS PLATE: the standing contacts use the visible foreground-floor intersections in this exact image. They remain development-fixture geometry pending owner pixel review and exact-image scene/actor proof; no approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "No television or loose papers. Closed book stack and plant occupy coffee table; landscape over fireplace is artwork, not screen. Four variants independently inspected.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-large-house-midday-wave2:v1",
      scene_id: "residence-large-house-midday-wave2",
      family_id: "residence-large-house",
      label: "Large house (midday)",
      presentation_status: "development-fixture",
      fidelity_tier: "F2",
      coordinate_system: "plate-normalized",
      units: "plate-percent",
      plate: {
        width: 1672,
        height: 941,
      },
      sources: [
        {
          id: "plate",
          source_type:
            "generated illustration, JPEG encoding at native dimensions",
          authority_class: "unapproved candidate; exact raster SHA-256 in tier",
        },
      ],
      camera_policy: {
        minimum_aspect_ratio: 1.7768331562167907,
        maximum_aspect_ratio: 1.7768331562167907,
        horizontal_focus: 0.5,
        vertical_focus: 0.5,
      },
      safe_area: {
        x: 0,
        y: 0,
        width: 1672,
        height: 941,
      },
      essential_content_area: {
        x: 0,
        y: 0,
        width: 1672,
        height: 941,
      },
      ui_safe_zones: [],
      raster: {
        asset_id: "env_large_house_midday_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/large-house__midday.jpg",
            hash: "755816035dc2068d24ddea0d7f54602b443fae490147bc25fe581ff8ca289285",
            derivation: "native-master",
          },
        ],
      },
      fixed_furniture: [
        {
          id: "visible-tabletop-plane",
          type: "tabletop-plane",
          geometry_grade: "G1",
          provenance_refs: ["plate"],
          dimensions: {
            vertex_1_x: {
              value: 637,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 460,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 855,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 460,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 860,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 482,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 590,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 482,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
          },
        },
      ],
      anchors: [
        {
          id: "living-room-floor-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 26.31578947368421,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 50.239234449760765,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 74.16267942583733,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "RECORDED VISUAL ESTIMATE FROM THIS PLATE: the standing contacts use the visible foreground-floor intersections in this exact image. They remain development-fixture geometry pending owner pixel review and exact-image scene/actor proof; no approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "No television or loose papers. Closed book stack and plant occupy coffee table; landscape over fireplace is artwork, not screen. Four variants independently inspected.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-large-house-night-wave2:v1",
      scene_id: "residence-large-house-night-wave2",
      family_id: "residence-large-house",
      label: "Large house (night)",
      presentation_status: "development-fixture",
      fidelity_tier: "F2",
      coordinate_system: "plate-normalized",
      units: "plate-percent",
      plate: {
        width: 1672,
        height: 941,
      },
      sources: [
        {
          id: "plate",
          source_type:
            "generated illustration, JPEG encoding at native dimensions",
          authority_class: "unapproved candidate; exact raster SHA-256 in tier",
        },
      ],
      camera_policy: {
        minimum_aspect_ratio: 1.7768331562167907,
        maximum_aspect_ratio: 1.7768331562167907,
        horizontal_focus: 0.5,
        vertical_focus: 0.5,
      },
      safe_area: {
        x: 0,
        y: 0,
        width: 1672,
        height: 941,
      },
      essential_content_area: {
        x: 0,
        y: 0,
        width: 1672,
        height: 941,
      },
      ui_safe_zones: [],
      raster: {
        asset_id: "env_large_house_night_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/large-house__night.jpg",
            hash: "d21c02801735ed132abb0aa97938908f87779806ad78ebfcabe43e4e2dadfd86",
            derivation: "native-master",
          },
        ],
      },
      fixed_furniture: [
        {
          id: "visible-tabletop-plane",
          type: "tabletop-plane",
          geometry_grade: "G1",
          provenance_refs: ["plate"],
          dimensions: {
            vertex_1_x: {
              value: 637,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 460,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 855,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 460,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 860,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 482,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 590,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 482,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
          },
        },
      ],
      anchors: [
        {
          id: "living-room-floor-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 26.31578947368421,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 50.239234449760765,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 74.16267942583733,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "RECORDED VISUAL ESTIMATE FROM THIS PLATE: the standing contacts use the visible foreground-floor intersections in this exact image. They remain development-fixture geometry pending owner pixel review and exact-image scene/actor proof; no approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "No television or loose papers. Closed book stack and plant occupy coffee table; landscape over fireplace is artwork, not screen. Four variants independently inspected.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-large-house-rain-wave2:v1",
      scene_id: "residence-large-house-rain-wave2",
      family_id: "residence-large-house",
      label: "Large house (rain)",
      presentation_status: "development-fixture",
      fidelity_tier: "F2",
      coordinate_system: "plate-normalized",
      units: "plate-percent",
      plate: {
        width: 1672,
        height: 941,
      },
      sources: [
        {
          id: "plate",
          source_type:
            "generated illustration, JPEG encoding at native dimensions",
          authority_class: "unapproved candidate; exact raster SHA-256 in tier",
        },
      ],
      camera_policy: {
        minimum_aspect_ratio: 1.7768331562167907,
        maximum_aspect_ratio: 1.7768331562167907,
        horizontal_focus: 0.5,
        vertical_focus: 0.5,
      },
      safe_area: {
        x: 0,
        y: 0,
        width: 1672,
        height: 941,
      },
      essential_content_area: {
        x: 0,
        y: 0,
        width: 1672,
        height: 941,
      },
      ui_safe_zones: [],
      raster: {
        asset_id: "env_large_house_rain_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/large-house__rain.jpg",
            hash: "6d140129a23de2b1404bd932ee97dd4f62add4ba86c6c2f30fbb82396c34a608",
            derivation: "native-master",
          },
        ],
      },
      fixed_furniture: [
        {
          id: "visible-tabletop-plane",
          type: "tabletop-plane",
          geometry_grade: "G1",
          provenance_refs: ["plate"],
          dimensions: {
            vertex_1_x: {
              value: 637,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 460,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 855,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 460,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 860,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 482,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 590,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 482,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
          },
        },
      ],
      anchors: [
        {
          id: "living-room-floor-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 26.31578947368421,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 50.239234449760765,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 74.16267942583733,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 85.01594048884166,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "RECORDED VISUAL ESTIMATE FROM THIS PLATE: the standing contacts use the visible foreground-floor intersections in this exact image. They remain development-fixture geometry pending owner pixel review and exact-image scene/actor proof; no approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "No television or loose papers. Closed book stack and plant occupy coffee table; landscape over fireplace is artwork, not screen. Four variants independently inspected.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
  ];
