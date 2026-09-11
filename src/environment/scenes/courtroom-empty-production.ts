import type { EnvironmentSceneSpec } from "../environment-scene-spec";

/**
 * A courtroom, empty, authored as PRODUCTION art.
 *
 * PRODUCTION ART. Its raster is the owner-approved Our Civic Duty scene master
 * `OCD_SCENE_MASTER_COURTROOM_EMPTY_5504x3072_01.jpg`, preserved byte-for-byte
 * under `art/references/masters/scene-environment/` and carried in as two
 * deterministic Lanczos-3 DOWNSCALES. Nothing was enlarged, and nothing was
 * generated: this master has been banked and approved since the packet that
 * ingested it, and the only thing it lacked was a tier ladder and a spec.
 *
 * WHY IT WAS SITTING UNRELEASED. `scene-consumers.ts` recorded it as "banked
 * and registered with no tier derived ... so the picture is not lost". That is
 * a fair reason to keep a master and a bad reason to leave it unusable: the
 * plate clears the 4608px environment master minimum outright, so deriving its
 * ladder and authoring its geometry costs nothing that has to be taken back if
 * a court proceeding never arrives.
 *
 * WHAT IT IS NOT. It is not the hearing room and not the chamber floor. A
 * courtroom has a raised judicial bench with counsel tables facing it across a
 * bar, and a public gallery of fixed pews behind that bar; the hearing room has
 * a curved member bench, a testimony lectern and loose public seating, and the
 * chamber has a well and a rostrum. None of the three may stand in for another,
 * and no consumer in this repository is permitted to substitute this plate for
 * a legislative surface because a court is the room it happens to have.
 *
 * WHAT THE ROOM CONTAINS, read off the plate: a long judicial bench across the
 * left half with six high-backed chairs behind it, a second lower bench right
 * of centre with a further row of chairs behind it, two counsel tables each
 * with a microphone, a bar rail, and a public gallery of wooden pews filling
 * the right and the foreground. Tall arched windows on the left wall, a
 * panelled surround behind the bench, one framed landscape painting, and blank
 * plaster wall panels on the right. NO readable lettering anywhere in the
 * frame, and NOBODY painted into it.
 */
export const COURTROOM_EMPTY_PRODUCTION_SCENE: EnvironmentSceneSpec = {
  environment_id: "environment:courtroom:ocd-master:v1",
  scene_id: "courtroom-empty-production",
  family_id: "courtroom",
  label: "A courtroom (production)",
  presentation_status: "production",
  fidelity_tier: "F4",
  coordinate_system: "plate-normalized",
  units: "plate-percent",

  /** An exact 1/4 of the 5504x3072 master in both axes. */
  plate: { width: 1376, height: 768 },

  /**
   * Horizontal focus sits left of centre because the subject is the judicial
   * bench, which occupies x 1%-50%; the right third is gallery pews and blank
   * wall. Vertical focus is low: the top fifth is cornice and empty wall and is
   * the first band worth losing on a narrow crop.
   */
  camera_policy: {
    minimum_aspect_ratio: 1.5,
    maximum_aspect_ratio: 12 / 5,
    horizontal_focus: 0.42,
    vertical_focus: 0.68,
  },

  safe_area: { x: 96, y: 195, width: 1152, height: 573 },
  /** The bench, both counsel tables, the bar and the gallery floor. */
  essential_content_area: { x: 110, y: 280, width: 1100, height: 488 },

  ui_safe_zones: [
    { id: "lower-shell", edge: "bottom-left", width: 620, height: 120 },
    { id: "navigation-flyout", edge: "top-left", width: 320, height: 300 },
  ],

  raster: {
    asset_id: "env_courtroom_empty_5504x3072_v1",
    tiers: [
      {
        width: 1376,
        height: 768,
        path: "art/families/courtroom/env_courtroom_empty_v1.png",
        hash: "482887a6dc4da8d3879f542c0f6eafa2e39f995ad6c14bcc050f0231bcc8cbc4",
        derivation: "deterministic-downscale",
      },
      {
        width: 2752,
        height: 1536,
        path: "art/families/courtroom/env_courtroom_empty_runtime_2x_v1.png",
        hash: "d731c5c1f281ce7c617e57079742eb59eefb8a7096ffbbc2d5eb1b2757317a7c",
        derivation: "deterministic-downscale",
      },
    ],
  },

  anchors: [
    {
      /**
       * Standing at the left counsel table, on the near side of it, which is
       * where somebody addressing the bench from that table would stand. The
       * floor line is read where the table's own base meets the carpet.
       */
      id: "counsel-table-left-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 14,
      z_order: 4,
      footprint_percent: 14,
      allowed_pose_families: ["standing-neutral", "standing-podium-or-lectern"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 84, max_foot_spread_percent: 8 },
    },
    {
      /**
       * The open carpet in the well, between the judicial bench and the bar.
       * The widest genuinely clear floor in the room.
       */
      id: "well-floor-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 40,
      z_order: 3,
      footprint_percent: 16,
      allowed_pose_families: ["standing-neutral", "standing-listening"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 74, max_foot_spread_percent: 9 },
    },
    {
      /**
       * The gallery aisle at the front left, on the public side of the bar.
       * This is where a member of the public stands, and it is deliberately
       * separated from the two anchors above: standing in the well is not
       * something the room grants, it is something a canonical role does.
       */
      id: "gallery-aisle-standing",
      type: "standing-person",
      kind: "floor-standing",
      x_percent: 22,
      z_order: 6,
      footprint_percent: 18,
      allowed_pose_families: ["standing-neutral", "standing-listening"],
      permitted_facings: ["front"],
      floor_contact: { floor_y_percent: 99, max_foot_spread_percent: 10 },
    },
    {
      /**
       * The chair at the left counsel table — the ONLY seat in this room whose
       * cushion is visible from this camera. Every other chair in the frame is
       * either behind a bench that hides it or is a pew seen back-on. It is
       * drawn from behind and to the left, so somebody sitting in it faces
       * away from the camera and towards the bench.
       */
      id: "counsel-chair-left",
      type: "seated-person",
      kind: "seat",
      x_percent: 6,
      z_order: 5,
      footprint_percent: 10,
      allowed_pose_families: ["seated-at-desk"],
      permitted_facings: ["away"],
      seat_contact: {
        seat_plane_y_percent: 64.5,
        seat_front_x_percent: 6,
        seat_width_percent: 7,
        floor_y_percent: 81,
        seat_z_order: 5,
        backrest_z_order: 4,
      },
    },
  ],

  foreground_occlusion_objects: [
    {
      /** The near gallery pew, between the camera and the whole room. */
      id: "gallery-pew-foreground",
      type: "furniture-foreground",
      z_order: 9,
      region_percent: {
        x_percent: 23,
        y_percent: 48,
        width_percent: 55,
        height_percent: 52,
      },
    },
    {
      /** The bank of pews filling the right of the frame. */
      id: "gallery-pew-right-bank",
      type: "furniture-foreground",
      z_order: 8,
      region_percent: {
        x_percent: 66,
        y_percent: 43,
        width_percent: 34,
        height_percent: 57,
      },
    },
    {
      /** The left counsel table, which hides its own chair's occupant's legs. */
      id: "counsel-table-left-front",
      type: "furniture-foreground",
      z_order: 7,
      region_percent: {
        x_percent: 1,
        y_percent: 55,
        width_percent: 25,
        height_percent: 33,
      },
    },
    {
      /** The judicial bench, which hides everyone seated behind it entirely. */
      id: "judicial-bench-front",
      type: "furniture-foreground",
      z_order: 2,
      region_percent: {
        x_percent: 0,
        y_percent: 38,
        width_percent: 51,
        height_percent: 25,
      },
    },
    {
      /** The lower bench right of centre, and the chairs behind it. */
      id: "secondary-bench-front",
      type: "furniture-foreground",
      z_order: 1,
      region_percent: {
        x_percent: 49,
        y_percent: 43,
        width_percent: 24,
        height_percent: 13,
      },
    },
  ],

  surface_slots: [
    {
      /**
       * The left counsel table top: a flat, empty, lit wooden surface. Paper
       * laid on a table is a real object in the room, which is why this is a
       * document surface and not an invented screen.
       */
      slot_id: "counsel-table-left-papers",
      kind: "desk-document",
      rect_percent: {
        x_percent: 4,
        y_percent: 55.5,
        width_percent: 20,
        height_percent: 5,
      },
      z_order: 6,
      allowed_content_classes: ["document-body"],
      information_access: "public-record",
      fallback_decoration: "a bare table top",
    },
    {
      /** The centre counsel table top, seen further away and more edge-on. */
      slot_id: "counsel-table-centre-papers",
      kind: "desk-document",
      rect_percent: {
        x_percent: 45,
        y_percent: 48.5,
        width_percent: 13,
        height_percent: 4,
      },
      z_order: 3,
      allowed_content_classes: ["document-body"],
      information_access: "public-record",
      fallback_decoration: "a bare table top",
    },
    {
      /**
       * The framed landscape on the right-hand wall. Declared so the frame is
       * accounted for and so nothing later mistakes it for a display: it is
       * NOT dynamic, it holds a picture, and `neutral-art` says exactly that.
       */
      slot_id: "courtroom-wall-picture",
      kind: "picture-frame",
      rect_percent: {
        x_percent: 44,
        y_percent: 19,
        width_percent: 9.5,
        height_percent: 14,
      },
      z_order: 0,
      allowed_content_classes: ["neutral-art"],
      /**
       * NO `information_access`, deliberately. The validator refuses one here
       * and it is right to: this frame holds a picture, so there is no pipe
       * for anything to come down, and declaring an access class would claim
       * there was.
       */
      fallback_decoration: "the painted landscape already in the frame",
    },
  ],

  explicit_unknowns: [
    "NO dynamic display surface is declared, and that is a reading of the room rather than an omission. There is no monitor, no board, no placard, no docket sheet and no nameplate anywhere in this plate. The two largest flat regions the p76 measurement pass found are a solid wood wall panel and a blank plaster wall panel; promoting either to an agenda board would be inventing a display the picture does not contain. Only the two table tops carry paper, and only paper is declared on them.",
    "No floor calibration pair and no standard body width are declared. The floor is patterned carpet with no repeating unit that can be measured as a ruler, so a near/far scale pair would be a guess dressed as a measurement.",
    "Every anchor contact is a VISUAL ESTIMATE read off this plate where an object visibly meets the floor. The p76 measurement card for this master reports standingAnchors, seatedAnchors and occluderBounds as UNKNOWN precisely because a luminance pass cannot see them; they are authored here by hand and carry no more confidence than that.",
    "Only the left counsel chair has a visible seat cushion. The six chairs behind the judicial bench, the row behind the secondary bench, and every gallery pew seat are hidden by the furniture in front of them, so NO anchor is declared on any of them rather than giving them plausible numbers.",
    "None of the five occluder regions has an authored alpha mask, because no production body renders behind them yet. `gallery-pew-foreground` in particular is a rectangle over an object with a complex silhouette, and it is a bound rather than a cutout.",
    "This is a fictional generic courtroom. It depicts no real courthouse, and no court, jurisdiction, bench composition or level of court may be inferred from it. What the World calls a room shown with this plate is canonical truth supplied by a caller.",
    "Six chairs are visible behind the bench. No court type, authority, membership, or proceeding is inferred from that furniture arrangement.",
  ],
};
