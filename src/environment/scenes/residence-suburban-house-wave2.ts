import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/** Candidate image-space geometry, not owner approval or fitted character proof.
 * Source: main fec18c8a3f94fdb73377d9d655de7248e8aceb49, art/backdrops.
 * All variants inspected individually at 1672x941. Marks are visual estimates.
 * Coordinate origin: upper-left image edge; percent = 100 * pixel / dimension.
 * No renderer/registry wiring here. No raster enlargement.
 */
export const RESIDENCE_SUBURBAN_HOUSE_WAVE2_SCENES: readonly EnvironmentSceneSpec[] =
  [
    {
      environment_id: "environment:residence-suburban-house-morning-wave2:v1",
      scene_id: "residence-suburban-house-morning-wave2",
      family_id: "residence-suburban-house",
      label: "Suburban house (morning)",
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
        asset_id: "env_suburban_house_morning_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/suburban-house__morning.jpg",
            hash: "e79bef0959d8f82d0ca0405738e20a03563f7022911916d3b12f2c1ba885bb41",
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
              value: 419,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 626,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 628,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 479,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 383,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 479,
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
          x_percent: 26.913875598086126,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 50.83732057416268,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 75.35885167464114,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
      ],
      surface_slots: [
        {
          slot_id: "living-room-television",
          kind: "television",
          rect_percent: {
            x_percent: 0.23923444976076555,
            y_percent: 31.455897980871413,
            width_percent: 6.758373205741627,
            height_percent: 7.651434643995749,
          },
          z_order: 1,
          allowed_content_classes: [
            "headline",
            "election-result",
            "briefing-slide",
          ],
          information_access: "public-broadcast",
          fallback_decoration: "the dark screen painted into the plate",
        },
      ],
      explicit_unknowns: [
        "RECORDED VISUAL ESTIMATE: geometry is measured from this scene's named 1672-by-941 suburban-house plate, the sole place used. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Television is cropped by left image edge and foliage covers lower-left screen. Rectangle marks only unobstructed visible screen interior, not full screen. Coffee table contains closed books and plant, no loose papers. Four variants individually inspected.",
      ],
    },
    {
      environment_id: "environment:residence-suburban-house-midday-wave2:v1",
      scene_id: "residence-suburban-house-midday-wave2",
      family_id: "residence-suburban-house",
      label: "Suburban house (midday)",
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
        asset_id: "env_suburban_house_midday_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/suburban-house__midday.jpg",
            hash: "857ffa02ebc7f124f63b3f83e7a980eebb68a6f361998a90a865489c559334e9",
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
              value: 419,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 626,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 628,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 479,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 383,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 479,
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
          x_percent: 26.913875598086126,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 50.83732057416268,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 75.35885167464114,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
      ],
      surface_slots: [
        {
          slot_id: "living-room-television",
          kind: "television",
          rect_percent: {
            x_percent: 0.23923444976076555,
            y_percent: 31.455897980871413,
            width_percent: 6.758373205741627,
            height_percent: 7.651434643995749,
          },
          z_order: 1,
          allowed_content_classes: [
            "headline",
            "election-result",
            "briefing-slide",
          ],
          information_access: "public-broadcast",
          fallback_decoration: "the dark screen painted into the plate",
        },
      ],
      explicit_unknowns: [
        "RECORDED VISUAL ESTIMATE: geometry is measured from this scene's named 1672-by-941 suburban-house plate, the sole place used. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Television is cropped by left image edge and foliage covers lower-left screen. Rectangle marks only unobstructed visible screen interior, not full screen. Coffee table contains closed books and plant, no loose papers. Four variants individually inspected.",
      ],
    },
    {
      environment_id: "environment:residence-suburban-house-night-wave2:v1",
      scene_id: "residence-suburban-house-night-wave2",
      family_id: "residence-suburban-house",
      label: "Suburban house (night)",
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
        asset_id: "env_suburban_house_night_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/suburban-house__night.jpg",
            hash: "331d3fb92b5e46bb36c676bd48bd69332e6835663eaf659c6fc4dd1129f2f39d",
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
              value: 419,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 626,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 628,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 479,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 383,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 479,
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
          x_percent: 26.913875598086126,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 50.83732057416268,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 75.35885167464114,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
      ],
      surface_slots: [
        {
          slot_id: "living-room-television",
          kind: "television",
          rect_percent: {
            x_percent: 0.23923444976076555,
            y_percent: 31.455897980871413,
            width_percent: 6.758373205741627,
            height_percent: 7.651434643995749,
          },
          z_order: 1,
          allowed_content_classes: [
            "headline",
            "election-result",
            "briefing-slide",
          ],
          information_access: "public-broadcast",
          fallback_decoration: "the dark screen painted into the plate",
        },
      ],
      explicit_unknowns: [
        "RECORDED VISUAL ESTIMATE: geometry is measured from this scene's named 1672-by-941 suburban-house plate, the sole place used. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Television is cropped by left image edge and foliage covers lower-left screen. Rectangle marks only unobstructed visible screen interior, not full screen. Coffee table contains closed books and plant, no loose papers. Four variants individually inspected.",
      ],
    },
    {
      environment_id: "environment:residence-suburban-house-rain-wave2:v1",
      scene_id: "residence-suburban-house-rain-wave2",
      family_id: "residence-suburban-house",
      label: "Suburban house (rain)",
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
        asset_id: "env_suburban_house_rain_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/suburban-house__rain.jpg",
            hash: "bbb092f1cbf0c45fc79342802703e5add35291ff8c53fc2d5f789f30918d3619",
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
              value: 419,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 626,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 453,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 628,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 479,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 383,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 479,
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
          x_percent: 26.913875598086126,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 50.83732057416268,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 75.35885167464114,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 86.60998937300744,
          },
        },
      ],
      surface_slots: [
        {
          slot_id: "living-room-television",
          kind: "television",
          rect_percent: {
            x_percent: 0.23923444976076555,
            y_percent: 31.455897980871413,
            width_percent: 6.758373205741627,
            height_percent: 7.651434643995749,
          },
          z_order: 1,
          allowed_content_classes: [
            "headline",
            "election-result",
            "briefing-slide",
          ],
          information_access: "public-broadcast",
          fallback_decoration: "the dark screen painted into the plate",
        },
      ],
      explicit_unknowns: [
        "RECORDED VISUAL ESTIMATE: geometry is measured from this scene's named 1672-by-941 suburban-house plate, the sole place used. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "Television is cropped by left image edge and foliage covers lower-left screen. Rectangle marks only unobstructed visible screen interior, not full screen. Coffee table contains closed books and plant, no loose papers. Four variants individually inspected.",
      ],
    },
  ];
