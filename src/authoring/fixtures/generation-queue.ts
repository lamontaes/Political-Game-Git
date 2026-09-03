/**
 * PRODUCTION CARGO — the exact remaining queue for modular-person parts.
 *
 * Read the statuses before the descriptions. The headline number people reach
 * for is "how many parts are missing", and it is the wrong number: most of what
 * is wanted already exists somewhere, and the useful question is which of the
 * five things standing between the project and a finished person applies.
 *
 * Two entries are worth reading closely because they look like the same problem
 * and are not:
 *
 * - The seated body is NOT missing. A seated master exists in Drive and was
 *   measured at 1216 pixels wide against a 1530 minimum. That is a re-render at
 *   a stated size, not an art brief.
 * - The complexion-matched bodies ARE missing. The two bodies this project has
 *   are untextured gray geometry, and no amount of collecting produces a body
 *   with skin on it.
 *
 * Everything cited comes from `npm run inventory:masters`, recorded in
 * `art/qa/banked_master_inventory.json`, or from the banked candidate set in
 * `art/generated/approved/pg-modular/`.
 */

import type { GenerationQueueEntry } from "../generation-queue";

const DRIVE_INVENTORY =
  "Drive 000_FIREFLY_PRODUCTION; measured in art/qa/banked_master_inventory.json";

export const MODULAR_PERSON_GENERATION_QUEUE: readonly GenerationQueueEntry[] =
  [
    // -----------------------------------------------------------------------
    // Genuinely missing: nothing exists anywhere.
    // -----------------------------------------------------------------------
    {
      entryId: "body-complexion-bases",
      kind: "body",
      description:
        "Body bases carrying an art complexion, in each of the four bands, for both body families and both poses.",
      status: "missing",
      count: 16,
      note: "The two bodies this project has are untextured gray geometry authorities. Every skin region a garment does not cover — hands, neck, forearms, any leg below a skirt — renders gray, and that is the single reason the banked candidate set is not released. Nothing is collectable here: a body with skin on it has to be made.",
    },
    {
      entryId: "hair-masculine",
      kind: "hair-front",
      description:
        "Masculine hairstyle masters: short, tapered, receding, and one longer.",
      status: "missing",
      count: 6,
      note: "The banked set has eight Black feminine hairstyles and no masculine hair at all, so four of the five banked head masters have nothing to wear.",
    },
    {
      entryId: "facial-hair",
      kind: "facial-hair",
      description: "Beard and moustache masters at the head's own scale.",
      status: "missing",
      count: 4,
      note: "The slot exists in the catalog and no master has ever been produced for it, in fixture form or otherwise.",
    },
    {
      entryId: "head-feminine-identity",
      kind: "head",
      description:
        "Feminine head and face identity masters beyond the single bald sample.",
      status: "missing",
      count: 4,
      note: "Four masculine identity masters were banked against one feminine sample. The asymmetry is in the art, not in the contract.",
    },
    {
      entryId: "hair-feminine-non-black",
      kind: "hair-front",
      description:
        "Feminine hairstyle masters outside the Black hair set already banked.",
      status: "missing",
      count: 8,
      note: "The eight banked styles are a complete and deliberate Black feminine hair set. What is absent is every other feminine hair texture, which is a gap in coverage rather than a defect in what exists.",
    },
    {
      entryId: "garment-seated-derivatives",
      kind: "top",
      description:
        "Seated derivatives of the banked tops, bottoms and footwear, per body family.",
      status: "missing",
      count: 20,
      blockedBy: "body-seated-master",
      note: "Blocked, not merely absent: a garment is fitted to a body, so there is nothing to fit these to until a seated body exists at a usable size.",
    },

    // -----------------------------------------------------------------------
    // Exists in Drive, below the intake's measured minimum.
    // -----------------------------------------------------------------------
    {
      entryId: "body-seated-master",
      kind: "body",
      description: "A seated body master for the desk pose.",
      status: "in-drive-below-standard",
      count: 2,
      location: DRIVE_INVENTORY,
      shortfall:
        "PG-P01_DESK_seated_man_transparent_VISUAL_PASS_v1.png measures 1216x1293; the intake minimum for a seated body is 1530 wide.",
      note: "This is the entry most likely to be mistaken for missing. It is not: the pose exists and was rendered, at about eighty percent of the width the pipeline needs. Re-render at the stated size rather than commissioning a new pose.",
    },
    {
      entryId: "body-standing-alternates",
      kind: "body",
      description:
        "Alternate standing body masters, including a heavier masculine build.",
      status: "in-drive-below-standard",
      count: 2,
      location: DRIVE_INVENTORY,
      shortfall:
        "PG-P01_STANDING_A_POSE measures 1926x2048 against a 2528 height minimum; PG-RIGFIT_B_AVERAGE_MASCULINE measures 1024x1536 against a 1696 width minimum.",
      note: "Two separate renders, both short of the minimum on one axis. Neither is far off.",
    },
    {
      entryId: "hair-short-set",
      kind: "hair-front",
      description:
        "Nine short hairstyle masters: buzz, side part, textured crop, soft curls, close coils, short afro, two pixies, wavy crop.",
      status: "in-drive-below-standard",
      count: 9,
      location: DRIVE_INVENTORY,
      shortfall:
        "Every one measures between 247 and 318 pixels on its long edge, against a 1024 minimum for hair-front. They were generated at thumbnail scale.",
      note: "Nine of the twelve inventory failures are this one batch. Re-generating it at 1024 would close most of the masculine and short-hair gap at once, which makes it the highest-value single task in the queue.",
    },

    // -----------------------------------------------------------------------
    // Exists in Drive and passes measurement: collect, do not generate.
    // -----------------------------------------------------------------------
    {
      entryId: "hair-wavy-layers",
      kind: "hair-front",
      description:
        "A wavy hairstyle as a true two-layer front/back pair with real alpha.",
      status: "in-drive-usable",
      count: 2,
      location: DRIVE_INVENTORY,
      note: "The only two files in the inventory that passed. 1001x1024 with genuinely varying alpha, and correctly split into the front and back layers the compositor draws either side of the body. Nothing needs making; the intake needs running on them.",
    },

    // -----------------------------------------------------------------------
    // Banked here, waiting on a person rather than on an artist.
    // -----------------------------------------------------------------------
    {
      entryId: "banked-production-candidates",
      kind: "body",
      description:
        "The thirty-five normalized candidates: two bodies, five heads, eight hairstyles, and tops, bottoms and footwear fitted per body family.",
      status: "banked-here",
      count: 35,
      location: "art/generated/approved/pg-modular/",
      blockedBy: "body-complexion-bases",
      note: "Hashed, reproducible and reviewable at ?view=character-proof&set=real. What they are waiting for is a judgement, and the judgement is currently blocked by the gray bodies underneath them.",
    },

    // -----------------------------------------------------------------------
    // A fixture is standing in, and nothing looks broken.
    // -----------------------------------------------------------------------
    {
      entryId: "eyewear",
      kind: "eyewear",
      description: "Eyewear masters: thin frames, heavy frames, rimless.",
      status: "dev-fixture-only",
      count: 3,
      location: "art/generated/approved/dev-modular-g2/",
      note: "Two procedural fixtures cover this slot, so people wearing glasses render and nothing reports a gap. That is precisely why it needs to be in the queue.",
    },
    {
      entryId: "accessory",
      kind: "accessory",
      description:
        "Accessory masters: lanyard, lapel pin, credential badge, scarf.",
      status: "dev-fixture-only",
      count: 4,
      location: "art/generated/approved/dev-modular-g2/",
      note: "Same shape of problem as eyewear: a fixture is filling the slot silently.",
    },
  ];
