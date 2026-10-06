import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/** Candidate image-space geometry, not owner approval or fitted character proof.
 * Source: main fec18c8a3f94fdb73377d9d655de7248e8aceb49, art/backdrops.
 * All variants inspected individually at 1672x941. Marks are visual estimates.
 * Coordinate origin: upper-left image edge; percent = 100 * pixel / dimension.
 * No renderer/registry wiring here. No raster enlargement.
 */
export const RESIDENCE_RURAL_FARMHOUSE_WAVE2_SCENES: readonly EnvironmentSceneSpec[] =
  [
    {
      environment_id: "environment:residence-rural-farmhouse-morning-wave2:v1",
      scene_id: "residence-rural-farmhouse-morning-wave2",
      family_id: "residence-rural-farmhouse",
      label: "Rural farmhouse (morning)",
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
        asset_id: "env_rural_farmhouse_morning_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/rural-farmhouse__morning.jpg",
            hash: "427dbf23dd1aa7fbf5b7b96f5084ad81548526fcaae37750e98c416d49a76f05",
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
              value: 99,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 538,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 501,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 405,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 109,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 405,
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
          x_percent: 23.923444976076556,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 48.74401913875598,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 72.96650717703349,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "PLACEHOLDER(wave2): candidate geometry only. Replace after owner pixel review and exact-image scene/actor proof. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Kitchen, no television or loose papers. Tabletop visible portion is interrupted by pitcher and foreground chair. Five variants inspected including winter; no object substitution.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-rural-farmhouse-midday-wave2:v1",
      scene_id: "residence-rural-farmhouse-midday-wave2",
      family_id: "residence-rural-farmhouse",
      label: "Rural farmhouse (midday)",
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
        asset_id: "env_rural_farmhouse_midday_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/rural-farmhouse__midday.jpg",
            hash: "5e1618ea67eea76cf469a43a9fd7db7fa7baa0d68aa860ca0d8bbe3a9cc9d209",
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
              value: 99,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 538,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 501,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 405,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 109,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 405,
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
          x_percent: 23.923444976076556,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 48.74401913875598,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 72.96650717703349,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "PLACEHOLDER(wave2): candidate geometry only. Replace after owner pixel review and exact-image scene/actor proof. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Kitchen, no television or loose papers. Tabletop visible portion is interrupted by pitcher and foreground chair. Five variants inspected including winter; no object substitution.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-rural-farmhouse-night-wave2:v1",
      scene_id: "residence-rural-farmhouse-night-wave2",
      family_id: "residence-rural-farmhouse",
      label: "Rural farmhouse (night)",
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
        asset_id: "env_rural_farmhouse_night_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/rural-farmhouse__night.jpg",
            hash: "3a4543bb3de08bed36571b7ceeb3cb1bbe7bd84e4fa17e70061523a21bffe0e2",
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
              value: 99,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 538,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 501,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 405,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 109,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 405,
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
          x_percent: 23.923444976076556,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 48.74401913875598,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 72.96650717703349,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "PLACEHOLDER(wave2): candidate geometry only. Replace after owner pixel review and exact-image scene/actor proof. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Kitchen, no television or loose papers. Tabletop visible portion is interrupted by pitcher and foreground chair. Five variants inspected including winter; no object substitution.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-rural-farmhouse-rain-wave2:v1",
      scene_id: "residence-rural-farmhouse-rain-wave2",
      family_id: "residence-rural-farmhouse",
      label: "Rural farmhouse (rain)",
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
        asset_id: "env_rural_farmhouse_rain_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/rural-farmhouse__rain.jpg",
            hash: "9f7e67308726f60858a917a29b1ff4dbf68f7234a14f7135cd04a76d2ce3eb77",
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
              value: 99,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 538,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 501,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 405,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 109,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 405,
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
          x_percent: 23.923444976076556,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 48.74401913875598,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 72.96650717703349,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "CANDIDATE REVIEW STATUS: geometry only. Owner pixel review and exact-image scene/actor proof remain required. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Kitchen, no television or loose papers. Tabletop visible portion is interrupted by pitcher and foreground chair. Five variants inspected including winter; no object substitution.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-rural-farmhouse-winter-wave2:v1",
      scene_id: "residence-rural-farmhouse-winter-wave2",
      family_id: "residence-rural-farmhouse",
      label: "Rural farmhouse (winter)",
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
        asset_id: "env_rural_farmhouse_winter_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/rural-farmhouse__winter.jpg",
            hash: "cb0c5f5d9b5555119be8e3e3d15316ac49acccf2f0ef7c4af02803c7d976b720",
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
              value: 99,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 538,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 386,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 501,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 405,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 109,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 405,
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
          x_percent: 23.923444976076556,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 48.74401913875598,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 72.96650717703349,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.1413390010627,
          },
        },
      ],
      surface_slots: [],
      explicit_unknowns: [
        "CANDIDATE REVIEW STATUS: geometry only. Owner pixel review and exact-image scene/actor proof remain required. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Kitchen, no television or loose papers. Tabletop visible portion is interrupted by pitcher and foreground chair. Five variants inspected including winter; no object substitution.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
  ];
