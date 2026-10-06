import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/** Candidate image-space geometry, not owner approval or fitted character proof.
 * Source: main fec18c8a3f94fdb73377d9d655de7248e8aceb49, art/backdrops.
 * All variants inspected individually at 1672x941. Marks are visual estimates.
 * Coordinate origin: upper-left image edge; percent = 100 * pixel / dimension.
 * No renderer/registry wiring here. No raster enlargement.
 */
export const RESIDENCE_MOBILE_HOME_WAVE2_SCENES: readonly EnvironmentSceneSpec[] =
  [
    {
      environment_id: "environment:residence-mobile-home-morning-wave2:v1",
      scene_id: "residence-mobile-home-morning-wave2",
      family_id: "residence-mobile-home",
      label: "Mobile home (morning)",
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
        asset_id: "env_mobile_home_morning_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/mobile-home__morning.jpg",
            hash: "d9981a4fdc8b629121d81a4c72312e8de449405056ba98bab045f301de0dc20c",
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
              value: 0,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 562,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 170,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 574,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 170,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 584,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 30,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 612,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_5_x: {
              value: 0,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_5_y: {
              value: 607,
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
          x_percent: 37.08133971291866,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 57.71531100478469,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 76.55502392344498,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
      ],
      surface_slots: [
        {
          slot_id: "living-room-television",
          kind: "television",
          rect_percent: {
            x_percent: 45.633971291866025,
            y_percent: 34.218916046758764,
            width_percent: 9.210526315789474,
            height_percent: 9.24548352816153,
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
        "PLACEHOLDER(wave2): candidate geometry only. Replace after owner pixel review and exact-image scene/actor proof. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "TV screen fully visible. Only side tables, no coffee table; left tabletop cropped and occupied by lamp. No loose papers. Four variants independently inspected.",
      ],
    },
    {
      environment_id: "environment:residence-mobile-home-midday-wave2:v1",
      scene_id: "residence-mobile-home-midday-wave2",
      family_id: "residence-mobile-home",
      label: "Mobile home (midday)",
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
        asset_id: "env_mobile_home_midday_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/mobile-home__midday.jpg",
            hash: "7792137d5f32684d2bf45416a23a298d815a7b8f3137063895044fbe8b1a4ec2",
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
              value: 0,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 562,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 170,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 574,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 170,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 584,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 30,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 612,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_5_x: {
              value: 0,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_5_y: {
              value: 607,
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
          x_percent: 37.08133971291866,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 57.71531100478469,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 76.55502392344498,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
      ],
      surface_slots: [
        {
          slot_id: "living-room-television",
          kind: "television",
          rect_percent: {
            x_percent: 45.633971291866025,
            y_percent: 34.218916046758764,
            width_percent: 9.210526315789474,
            height_percent: 9.24548352816153,
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
        "PLACEHOLDER(wave2): candidate geometry only. Replace after owner pixel review and exact-image scene/actor proof. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "TV screen fully visible. Only side tables, no coffee table; left tabletop cropped and occupied by lamp. No loose papers. Four variants independently inspected.",
      ],
    },
    {
      environment_id: "environment:residence-mobile-home-night-wave2:v1",
      scene_id: "residence-mobile-home-night-wave2",
      family_id: "residence-mobile-home",
      label: "Mobile home (night)",
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
        asset_id: "env_mobile_home_night_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/mobile-home__night.jpg",
            hash: "83f787f82aee54a92ee9992f0350017db1ce1a2ef680f511340ea86c625b690b",
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
              value: 0,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 562,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 170,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 574,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 170,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 584,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 30,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 612,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_5_x: {
              value: 0,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_5_y: {
              value: 607,
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
          x_percent: 37.08133971291866,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 57.71531100478469,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 76.55502392344498,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
      ],
      surface_slots: [
        {
          slot_id: "living-room-television",
          kind: "television",
          rect_percent: {
            x_percent: 45.633971291866025,
            y_percent: 34.218916046758764,
            width_percent: 9.210526315789474,
            height_percent: 9.24548352816153,
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
        "RECORDED VISUAL ESTIMATE: geometry is measured from this scene's named 1672-by-941 mobile-home plate, the sole place used. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "TV screen fully visible. Only side tables, no coffee table; left tabletop cropped and occupied by lamp. No loose papers. Four variants independently inspected.",
      ],
    },
    {
      environment_id: "environment:residence-mobile-home-rain-wave2:v1",
      scene_id: "residence-mobile-home-rain-wave2",
      family_id: "residence-mobile-home",
      label: "Mobile home (rain)",
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
        asset_id: "env_mobile_home_rain_wave2_candidate",
        tiers: [
          {
            width: 1672,
            height: 941,
            path: "art/backdrops/mobile-home__rain.jpg",
            hash: "1370115fa5e8f6baa94df76b6ef31e2ca9466f7294704bc3e815948b4548f641",
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
              value: 0,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_1_y: {
              value: 562,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_x: {
              value: 170,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_2_y: {
              value: 574,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_x: {
              value: 170,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_3_y: {
              value: 584,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_x: {
              value: 30,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_4_y: {
              value: 612,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_5_x: {
              value: 0,
              unit: "pixel",
              confidence: "visual-estimate",
              provenance_refs: ["plate"],
            },
            vertex_5_y: {
              value: 607,
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
          x_percent: 37.08133971291866,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
        {
          id: "living-room-middle-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 57.71531100478469,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
        {
          id: "entry-side-standing",
          type: "standing-person",
          kind: "floor-standing",
          x_percent: 76.55502392344498,
          z_order: 6,
          floor_contact: {
            floor_y_percent: 87.67268862911796,
          },
        },
      ],
      surface_slots: [
        {
          slot_id: "living-room-television",
          kind: "television",
          rect_percent: {
            x_percent: 45.633971291866025,
            y_percent: 34.218916046758764,
            width_percent: 9.210526315789474,
            height_percent: 9.24548352816153,
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
        "RECORDED VISUAL ESTIMATE: geometry is measured from this scene's named 1672-by-941 mobile-home plate, the sole place used. No approved or installed character placement is asserted.",
        "Full-frame camera only. safe_area and essential_content_area preserve the entire source; UI overlays, responsive crops and client-scale interaction proof are NOT RUN.",
        "Standing points are proposed contacts on visible open foreground floor. No actor has been tested: floor calibration, standard body width, standing height, permitted poses/facings and footprints remain deliberately unset.",
        "Tabletop vertices are image-edge pixel estimates in clockwise order, including any occupied portions of that plane. They are reference geometry, not a paper hotspot or foreground alpha mask. Furniture occlusion and hand/table contact remain untested.",
        "No loose papers are visible; no desk-document slot is invented. A paper interaction requires separately authored content and receiver review.",
        "TV screen fully visible. Only side tables, no coffee table; left tabletop cropped and occupied by lamp. No loose papers. Four variants independently inspected.",
      ],
    },
  ];
