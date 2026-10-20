---
name: civic-prose
description: Writes and reviews pieces for the English engine's banks against the owner's calibrated style and a grounding check on record facts. Use when adding or changing bank pieces for dialogue, narration, choices or in-world documents; not for text typed into screens or code, which never ships.
---

# Civic prose

Use this for development-time authoring; shipped gameplay does not call a prose model. The root is a router, not a fixed sequence of repeated audits.

Render the supplied scene facts naturally in the correct surface register. Preserve the owner's calibrated rules and conditional examples in `references/owner-authoring-contract.md`; the full style is `references/prose-contract.md`, the grounding check is `references/grounding-gate.md`, a different surface is `references/surface-registers.md`, and a packet or schema issue is `references/fact-packet-schema.md`. The full style, grounding rules and example files remain authoritative; do not reread every example for an unchanged familiar pattern.

Pieces go into the English engine's banks (`data/english/parts/`) with their move, register and record facts; the engine arranges them at play (`words-engine`). Do not polish a fixed scene merely to preserve its premise. Require a recorded person, motive, tension and available response for an interrupting moment; let an actual death, law effect or other world change settle first, then render the choice it creates. An ordinary exchange can matter without a dramatic outcome, but a generic favor or occasion with no personal reason or cost is not accepted prose.
New authored pieces stay `shippable: false` until the owner grades them in a batch (`words-engine`, "Grading batches"); build the causal mechanics meanwhile. Nothing waits on the review.

The player must understand the actual incident, relevant people and available choice. Grounded but evasive language such as "something happened" is not successful prose when the incident itself is needed to decide. A concise orientation is allowed when the screen does not already provide it. Do not repeat titles, recap needlessly, write metaphors/epigrams or interpret the scene for the player.

A prose renderer cannot invent an object, culprit, motive, outcome or past conversation to fill a packet gap. Return `MISSING_CONTEXT` with the precise missing detail to the implementation owner. That owner may implement an explicitly authored prospective scene through existing writers and provide the resulting packet; this is not a permanent instruction to leave the game empty. A legitimate fact-safe omission is `SAFE_RENDER_WITH_OMISSION`; otherwise return `SAFE_RENDER`.

Keep second person for the player in scenes; in-world records use their native register. Preserve identities, audibility and known versus reported facts. Choices state actions, not guaranteed outcomes. Support real variation in represented circumstances and voice, not synonym shuffling of the same vague scene.

Run the existing applicable `prose:eval` checks and the independent grounding review for new/changed claims. Grounding is a floor; evaluate style and comprehension using the actual assembled scene and continuations as well. One unchanged accepted result does not require repeated reviewer passes. Preserve the blind holdout and its hygiene tests.

The specialized prose writer proposes text; the owning implementation agent changes source, wires it to the real consumer and verifies the player route. Do not claim a prose migration is delivered merely because another file or a donor PR was merged.
