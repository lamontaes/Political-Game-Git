# Generative AI content survey draft

Source: [Steamworks Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey), retrieved 2026-09-14.

Valve asks about **player-consumed** content (artwork, sound, narrative, localization, and similar), not about efficiency tools that never ship.

- **Pre-Generated:** created with AI tools during development and shipped for players to see or hear.
- **Live-Generated:** created with AI tools while the game is running.

Deterministic composition of shipped assets (scene assembly, wardrobe layering, seeded households, JSON pack loading) is not live AI.

## Recommended answers

**Does the product include pre-generated AI content?** Yes.

**Does the product include live-generated AI content?** No.

**Guardrails for live AI:** Not applicable. Shipped play does not call a language model, image model, or network generative service. There is no player prompt-to-image and no chatbot NPC.

## Pre-generated disclosure text (paste)

```
Some artwork players see was produced with generative image tools during development, then measured, masked, downscaled, and composed by the game’s ordinary deterministic pipeline. That includes environment plates and character art recorded in the project provenance ledger.

Some player-facing narrative (dialogue and related authored prose) was drafted with development-time language-model assistance and ships as static text. The running game does not call a model to write or rewrite that text.

No AI-generated music is included. Localization is English text only in this packet; no AI localization is claimed. Rights on AI-origin image files remain unresolved in the provenance ledger and are not declared cleared here.
```

## Internal notes (not for the store page)

Evidence at public main `f22fd314`, `art/manifest/provenance.json`:

- 80 entries `reference_type: ai-generated`
- 46 entries `procedural-dev-fixture` (owned; not AI)
- Recorded `generator_tool` strings: Gemini; an owner asset-factory pipeline that also names Scenario/Gemini; and `not-recorded` on some rows
- AI-origin `rights_license_status`: unknown (80)
- Several `generated_model_version` values are `not-recorded`

Do not invent a vendor history, a model version, or a cleared-rights statement. A filename that mentions Seedream 4.5 is not a generation receipt; do not list Seedream as a shipping generator.

Player prose: civic-prose authoring is a development-time process; production rendering has no model call (`docs/ARCHITECTURE-INTEGRITY-AUDIT.md`; `scripts/prose-eval`). Treat LLM-assisted authored lines as pre-generated narrative, not live generation.

D21-07: no AI-generated music. D21-11 is about not forcing the player to type speeches; it is not the live-AI rule. Live-AI “no” rests on the actual runtime: no model call in play.

Do not describe the JSON content-pack loader, seeded world generation, or wardrobe compositing as live AI.

Do not claim all art is hand-painted.
