import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/** Candidate image-space geometry, not owner approval or fitted character proof.
 * Source: main fec18c8a3f94fdb73377d9d655de7248e8aceb49, art/backdrops.
 * All variants inspected individually at 1672x941. Marks are visual estimates.
 * Coordinate origin: upper-left image edge; percent = 100 * pixel / dimension.
 * No renderer/registry wiring here. No raster enlargement.
 */
export const RESIDENCE_SMALL_APARTMENT_WAVE2_SCENES: readonly EnvironmentSceneSpec[] =
  [
    {
      environment_id: "environment:residence-small-apartment-morning-wave2:v1",
      scene_id: "residence-small-apartment-morning-wave2",
      family_id: "residence-small-apartment",
      label: "Small apartment (morning)",
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
        asset_id: "env_small_apartment_morning_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/small-apartment__morning.jpg",
            hash: "627fe036660db362c962645f09fe4a6b79f1878a0fe5cfefb65338a0d5ad195b",
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
              value: 1384,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 444,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 1480,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 444,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 1510,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 1419,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 460,
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
          x_percent: 38.8755980861244,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 60.4066985645933,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 80.74162679425838,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
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
        "No visible television or papers; small side table only. Four variants inspected; table edges consistent to visual-estimate precision.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-small-apartment-midday-wave2:v1",
      scene_id: "residence-small-apartment-midday-wave2",
      family_id: "residence-small-apartment",
      label: "Small apartment (midday)",
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
        asset_id: "env_small_apartment_midday_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/small-apartment__midday.jpg",
            hash: "95965b136cfcfc2b2a630e0492bd876ac56a6bb619674cfec6993520635bfe5e",
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
              value: 1384,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 444,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 1480,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 444,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 1510,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 1419,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 460,
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
          x_percent: 38.8755980861244,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 60.4066985645933,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 80.74162679425838,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
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
        "No visible television or papers; small side table only. Four variants inspected; table edges consistent to visual-estimate precision.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-small-apartment-night-wave2:v1",
      scene_id: "residence-small-apartment-night-wave2",
      family_id: "residence-small-apartment",
      label: "Small apartment (night)",
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
        asset_id: "env_small_apartment_night_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/small-apartment__night.jpg",
            hash: "b35c8f2ba46a722260275700c7f8864b5151587fcfc2047a69779b135595c6e2",
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
              value: 1384,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 444,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 1480,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 444,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 1510,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 1419,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 460,
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
          x_percent: 38.8755980861244,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 60.4066985645933,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 80.74162679425838,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
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
        "No visible television or papers; small side table only. Four variants inspected; table edges consistent to visual-estimate precision.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
    {
      environment_id: "environment:residence-small-apartment-rain-wave2:v1",
      scene_id: "residence-small-apartment-rain-wave2",
      family_id: "residence-small-apartment",
      label: "Small apartment (rain)",
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
        asset_id: "env_small_apartment_rain_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/small-apartment__rain.jpg",
            hash: "b257e77563785e0e16f8efd5768240d6dc7fc9c38ebfbffc959e5a26762836d2",
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
              value: 1384,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 444,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 1480,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 444,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 1510,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 1419,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 460,
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
          x_percent: 38.8755980861244,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 60.4066985645933,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 80.74162679425838,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 88.20403825717322,
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
        "No visible television or papers; small side table only. Four variants inspected; table edges consistent to visual-estimate precision.",
        "No television is visible; no television surface or hotspot is declared.",
      ],
    },
  ];
