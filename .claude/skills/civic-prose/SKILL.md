---
name: civic-prose
description: Render or review player-visible prose against an existing fact packet and the owner's style. Use for authored dialogue, narration, choices and in-world documents.
---

# Civic prose

Use this for development-time authoring; shipped gameplay does not call a prose model. The root is a router, not a fixed sequence of repeated audits.

Render the supplied scene facts naturally in the correct surface register. Preserve the owner's calibrated rules and conditional examples in `references/owner-authoring-contract.md`; use `references/surface-registers.md` for a different surface and `references/fact-packet-schema.md` for a packet/schema issue. The full style, grounding rules and example files remain authoritative; do not reread every example for an unchanged familiar pattern.

All legacy player-facing copy is disposable, including headings, setup, buttons, status and Journal lines. Do not polish a fixed scene merely to preserve its premise. Require a recorded person, motive, tension and available response for an interrupting moment; let an actual death, law effect or other world change settle first, then render the choice it creates. An ordinary exchange can matter without a dramatic outcome, but a generic favor or occasion with no personal reason or cost is not accepted prose.
Send each new substantial player-facing line, button, choice and assembled dialogue packet to the owner with its supporting facts for editorial review before publication or merge. Implement causal mechanics while the words are being reviewed; keep unreviewed copy in a reviewable branch.

The player must understand the actual incident, relevant people and available choice. Grounded but evasive language such as "something happened" is not successful prose when the incident itself is needed to decide. A concise orientation is allowed when the screen does not already provide it. Do not repeat titles, recap needlessly, write metaphors/epigrams or interpret the scene for the player.

A prose renderer cannot invent an object, culprit, motive, outcome or past conversation to fill a packet gap. Return `MISSING_CONTEXT` with the precise missing detail to the implementation owner. That owner may implement an explicitly authored prospective scene through existing writers and provide the resulting packet; this is not a permanent instruction to leave the game empty. A legitimate fact-safe omission is `SAFE_RENDER_WITH_OMISSION`; otherwise return `SAFE_RENDER`.

Keep second person for the player in scenes; in-world records use their native register. Preserve identities, audibility and known versus reported facts. Choices state actions, not guaranteed outcomes. Support real variation in represented circumstances and voice, not synonym shuffling of the same vague scene.

Run the existing applicable `prose:eval` checks and the independent grounding review for new/changed claims. Grounding is a floor; evaluate style and comprehension using the actual assembled scene and continuations as well. One unchanged accepted result does not require repeated reviewer passes. Preserve the blind holdout and its hygiene tests.

The specialized prose writer proposes text; the owning implementation agent changes source, wires it to the real consumer and verifies the player route. Do not claim a prose migration is delivered merely because another file or a donor PR was merged.
