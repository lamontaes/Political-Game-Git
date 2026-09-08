import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * The council staff office, authored as an EnvironmentSceneSpec.
 *
 * DEVELOPMENT FIXTURE ART. The prompt30 lineage's true native detail is
 * 1024x572; the shipped 2048x1144 file is a deterministic 2x resample of it and
 * carries no additional detail. It cannot produce a production tier and is
 * frozen as regression art. It is NOT the office master of record.
 *
 * Every placement number below is a VISUAL ESTIMATE read off that fixture
 * plate. They are recorded as such in `explicit_unknowns` rather than dressed
 * up as measurements, because nothing in this scene is plan-derived.
 *
 * The camera policy, safe areas, anchor positions and occluder are the values
 * already accepted on main; migrating them here changes where they live, not
 * what they are.
 */
export const OFFICE_COUNCIL_STAFF_FIXTURE_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:council-staff-office:prompt30-fixture:v1",
  scene_id: "office-council-staff-fixture",
  family_id: "council-staff-office",
  label: "Council staff office (development fixture)",
  presentation_status: "development-fixture",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  plate: { width: 1024, height: 572 },
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.5,
    vertical_focus: 0.75,
  },
  safe_area: { x: 86, y: 112, width: 850, height: 421 },
  essential_content_area: { x: 185, y: 165, width: 730, height: 353.75 },
  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_lexington_council_staff_office_prompt30_v1",
    tiers: [
      {
        width: 1024,
        height: 572,
        path: "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_v1.png",
        hash: "76d9ae5878acbd0050c60695bebd2f3f9f0da36c75ce2e9e392d30254ab64b43",
        derivation: "native-master",
      },
      {
        width: 2048,
        height: 1144,
        path: "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_runtime_2x_v1.png",
        hash: "66678f0e91c52ca86f851ae4ba73d1a736a56be9cb7875512ab6bd1235de07f0",
        derivation: "upscaled-development-fixture",
        native_detail_width: 1024,
      },
    ],
  },

  /**
   * Two calibration pairs and a linear ramp between them.
   *
   * The ramp itself is unchanged and was never the defect. What was wrong is
   * what it used to be read at: an 84% floor line shared by both chairs, which
   * was derived from the 63.5% seat plane rather than measured against the
   * painted furniture. Deriving one unmeasured number from another made the two
   * agree with each other and with nothing in the picture — the primary sitter
   * had her pelvis 5.3% of plate height above the cushion she was supposed to
   * be on, which is why she read as a person hovering in front of a chair
   * rather than sitting in one.
   *
   * Both chairs are now measured off the plate raster, and each carries its own
   * floor line because they stand at different depths. The ramp then produces a
   * scale at which each sprite's own measured pelvis-to-sole span exactly
   * covers its own seat-to-floor gap, so pelvis-on-cushion and soles-on-floor
   * are satisfied together instead of traded off.
   */
  floor_calibration: {
    near: { floor_y_percent: 100, scale: 1.05 },
    far: { floor_y_percent: 60, scale: 0.8 },
  },

  /**
   * How wide a normalized modular body canvas paints here at scale 1, chosen so
   * that a seated body puts its pelvis on the seat plane and its soles on the
   * floor at the same time — the two constraints together, not one traded for
   * the other.
   *
   * It moved from 21.5% because the lines it was fitted against moved. It was
   * solved against a shared 84% floor that no chair actually stood on; re-solved
   * against each chair's measured floor it comes out at 19.48%, and the modular
   * seated contacts land within tolerance at both anchors again. The number is
   * derived from the scene's geometry, so it changes when that geometry is
   * corrected.
   */
  standard_body_width_percent: 19.48,

  anchors: [
    {
      /**
       * The measured horizontal centroid of the chair's seat cushion.
       *
       * This used to be 79.2%, a staging compromise: the body was placed by its
       * hip JOINT rather than by its seat contact, which pushed its visible mass
       * right, and 79.2% was where that mass had to start for the figure to
       * survive the camera at the narrowest supported aspect. Placing the
       * measured contact instead removes the compromise — the body now sits on
       * the cushion centre and its right edge lands at 87.7%, comfortably inside
       * the 91.4% guaranteed safe area. The anchor can go back to describing
       * where the furniture is.
       */
      id: "primary-desk-chair",
      type: "seated-person",
      kind: "seat",
      x_percent: 77.2,
      z_order: 2,
      footprint_percent: 30,
      hitbox_percent: {
        x_percent: 35,
        y_percent: 5,
        width_percent: 55,
        height_percent: 50,
      },
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        // Measured off the runtime plate. This chair's blue cushion spans
        // y 68.4%-75.6% (back edge to front lip) and x 72.3%-84.0%. The plane
        // is one third forward of the back edge, because a sitter with their
        // back against the backrest rests on the rear of the seat rather than
        // its middle; the same rule is applied to the guest chair below, so
        // neither number is tuned to its own sprite. The old 63.5% was not on
        // the cushion at all — it sat a third of the way up the BACKREST,
        // which is what held the sitter above her chair.
        seat_plane_y_percent: 70.8,
        seat_front_x_percent: 77.2,
        seat_width_percent: 11.13,
        // The chair's five-star base spreads its casters across y 86.3%-94.2%
        // as it comes toward the camera; the floor directly under the seat
        // column reads at about 91%. At 90.01% the ramp yields scale 0.988 and
        // A01's measured contact-to-sole span (0.3183 of its raster) lands her
        // soles there, just behind the front casters. Seat and floor agree
        // because both were measured off the plate, not because one was solved
        // from the other.
        floor_y_percent: 90.01,
        seat_z_order: 1,
        backrest_z_order: 0,
      },
    },
    {
      id: "left-guest-chair",
      type: "seated-person",
      kind: "seat",
      x_percent: 29.2,
      z_order: 3,
      footprint_percent: 26,
      hitbox_percent: {
        x_percent: 5,
        y_percent: 2,
        width_percent: 90,
        height_percent: 50,
      },
      // The guest chair prefers the P0 guest-seating pose. No body art
      // declares it yet, so the runtime reports the exact gap and falls back
      // to the one other pose this anchor itself permits.
      allowed_pose_families: ["seated-guest-neutral", "seated-at-desk"],
      permitted_facings: ["front"],
      seat_contact: {
        // Measured and derived the same way: this chair's cushion spans
        // y 61.8%-65.2% and x 25.3%-33.1%, and the plane is one third forward
        // of its back edge. The old 63% looked close enough vertically, which
        // is exactly why the real error hid here — it was the shared 84% floor
        // line that was wrong, and with it the scale.
        seat_plane_y_percent: 62.93,
        seat_front_x_percent: 29.2,
        seat_width_percent: 7.57,
        // This chair stands further back than the desk chair, so its floor
        // line is higher on the plate; its wood legs meet the carpet at about
        // 75%. At 75.17% the ramp yields scale 0.895 and B01's measured
        // contact-to-sole span (0.3086) lands its soles there. Under the
        // shared 84% the sprite rendered at 0.95 and drove its feet through
        // this chair's real floor, which is the intersection that read as the
        // chair cutting through him.
        floor_y_percent: 75.17,
        seat_z_order: 1,
        backrest_z_order: 0,
      },
    },
    {
      id: "doorway-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 47,
      z_order: 1,
      footprint_percent: 20,
      allowed_pose_families: ["standing-neutral"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 68, max_foot_spread_percent: 7 },
    },
    {
      id: "near-desk-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 62,
      z_order: 2,
      footprint_percent: 24,
      allowed_pose_families: ["standing-neutral"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 82, max_foot_spread_percent: 9 },
    },
  ],

  foreground_occlusion_objects: [
    {
      id: "desk-front",
      type: "furniture-foreground",
      asset_id:
        "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
      z_order: 4,
      region_percent: {
        x_percent: 42,
        y_percent: 62,
        width_percent: 58,
        height_percent: 38,
      },
    },
    {
      id: "guest-chair-near-arm",
      type: "furniture-foreground",
      z_order: 5,
      region_percent: {
        x_percent: 18,
        y_percent: 66,
        width_percent: 22,
        height_percent: 26,
      },
    },
  ],

  /**
   * The five surfaces the geometry inspection found and promoted, and the two
   * it refused.
   *
   * The map is the one that decides whether this room is reusable. The plate is
   * painted with Lexington and Fayette County's own street grid; either that
   * grid is replaceable or the office serves exactly one city and is a hero
   * asset wearing a family's clothes.
   *
   * The two stacked wall certificates are absent on purpose. They are 3.8% by
   * 5.9% of the plate — about 41 by 45 pixels at 1080p — and a credential drawn
   * at that size is an illegible smear asserting a qualification. They are
   * declared as ambient `paper-shapes` in the dynamic-surface record instead,
   * so a later pass cannot quietly promote them.
   *
   * The corkboard pin is absent for the same reason, and that is a correction.
   * The inspection promoted it; at 4.5% of plate width it is about 46 pixels
   * across at 1080p, which is under the component width floor this repository
   * applies and cannot hold a legible line. It is declared ambient here. The
   * floor is ours, not the inspection's, so a human pass that disagrees can
   * reverse this by moving one declaration.
   *
   * The kinds below are the scene spec's own: the inspection was written
   * against a finer set of names — `monitor-display` for a screen,
   * `district-map` for a wall map — that the convergence retired into this one.
   */
  surface_slots: [
    {
      slot_id: "desk-working-document",
      kind: "desk-document",
      // The existing working-draft desk object, not the briefing to its left.
      // Both the dynamic paper and its transparent entry target use this rect.
      rect_percent: {
        x_percent: 67,
        y_percent: 55.5,
        width_percent: 6,
        height_percent: 7.5,
      },
      z_order: 9,
      allowed_content_classes: ["document-body", "bill-title", "bill-number"],
      information_access: "institutional-working",
      fallback_decoration: "a clean paper stack on the blotter",
    },
    {
      slot_id: "wall-district-map-slot",
      kind: "large-wall-map",
      rect_percent: {
        x_percent: 58.6,
        y_percent: 21,
        width_percent: 12.9,
        height_percent: 21.5,
      },
      z_order: 1,
      allowed_content_classes: [
        "map-label",
        "jurisdiction-seal",
        "jurisdiction-name",
      ],
      civic_symbol_policy: "canonical-source-only",
      information_access: "public-record",
      fallback_decoration: "a generic municipal street grid with no labels",
    },
    {
      slot_id: "monitor-primary-widescreen",
      kind: "monitor-or-screen",
      rect_percent: {
        x_percent: 58.2,
        y_percent: 41.5,
        width_percent: 7.5,
        height_percent: 16,
      },
      z_order: 2,
      allowed_content_classes: ["document-body", "agenda", "election-result"],
      information_access: "institutional-working",
      fallback_decoration: "a dark desktop with no windows open",
    },
    {
      slot_id: "monitor-secondary-portrait",
      kind: "monitor-or-screen",
      rect_percent: {
        x_percent: 68.1,
        y_percent: 38,
        width_percent: 5.4,
        height_percent: 18,
      },
      z_order: 2,
      allowed_content_classes: ["document-body", "agenda"],
      information_access: "institutional-working",
      fallback_decoration: "a dark desktop with no windows open",
    },
  ],

  explicit_unknowns: [
    "Every anchor, contact, occluder region and surface slot in this scene is a visual estimate read off fixture art. None of it is plan-derived, and none of it should be copied into a production scene.",
    "The prompt30 plate's real detail is 1024x572. The 2048x1144 runtime file is a 2x resample of that same source and is registered as an upscale so the runtime reports its shortfall honestly.",
    "The guest chair's near arm has no authored alpha mask yet, so its occluder region is declared for footprint and debug purposes without a raster.",
    "The corkboard pin above the desk was promoted by the geometry inspection and is declared ambient decor here instead: at 4.5% of plate width it is roughly 46 pixels across at 1080p, below the width a runtime component needs to be legible. This is a repository judgement about a number the inspection did not rule on, and it is reversible.",
    "The authored B01 guest raster carries 16% of plate height between its measured pelvis and its soles, while this scene puts 21% between the guest seat plane and the guest floor line. Placing the pelvis on the seat therefore leaves the guest's feet about 5% of plate height above the floor. The measurement and the scene are both recorded as found; the figure is not stretched to close the gap, and no seated body drawn for this room exists yet.",
  ],
};
