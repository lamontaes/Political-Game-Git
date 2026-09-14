# Generative AI content survey draft

Source: [Steamworks Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey), retrieved 2026-09-14.

Valve distinguishes:

- **Pre-Generated:** ships with the game; created with AI tools during development.
- **Live-Generated:** created while the game is running.

Procedural assembly of approved assets is **not** live AI. Development-time helpers that never ship a model call are not live AI.

## Recommended answers

**Does the product include pre-generated AI content?** Yes.

**Does the product include live-generated AI content?** No.

**Guardrails for live AI:** Not applicable. The simulation does not call a language model, image model, or network generative service at runtime. Player-facing copy is authored. Character appearance is composed from a catalog. D21-11 forbids a runtime language-model dependency for play.

## Pre-generated disclosure text (paste)

```
Some environment plates and character art that ship with the game were produced with generative image tools during development (recorded in the asset provenance ledger as Gemini and as an owner asset-factory pipeline that also names Scenario/Gemini; several generator versions are honestly “not-recorded”). Those images were then measured, masked, downscaled, and composed by deterministic project tools. Rights on AI-origin rasters remain recorded as unknown unless a later owner license decision changes that.

Player-facing prose, rules, and institutional data are not live-generated. Some development-time writing and research used large language models; shipped play does not call a model. Music will not use AI-generated scores (owner decision D21-07). No live generative AI, no player prompt-to-image, and no chatbot NPC.
```

## Internal evidence (not for the store page)

From `art/manifest/provenance.json` at main `f22fd314`:

- 80 entries `reference_type: ai-generated`
- 46 entries `procedural-dev-fixture` (owned; not AI)
- AI `generator_tool` values: Gemini (4); owner asset factory Scenario/Gemini pipeline (60 combined wordings); `not-recorded` (16)
- AI-origin `rights_license_status`: unknown (80)

Board note: an original filename mentioning Seedream 4.5 is not itself a generation receipt. Do not assert Seedream as a shipping generator unless provenance says so.

## What not to tell Valve

- Do not describe the JSON content-pack loader as live AI.
- Do not describe seeded world generation as generative AI.
- Do not claim all art is hand-painted.
