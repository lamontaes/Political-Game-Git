---
name: civic-prose
description: >
  Owner-calibrated prose contract for Our Civic Duty. Use when rendering a
  canonical fact packet into player-facing prose, when reviewing candidate
  player-facing prose against the accepted contract, or when classifying prose
  output as SAFE_RENDER / SAFE_RENDER_WITH_OMISSION / MISSING_CONTEXT.
---

# Civic Prose — owner-calibrated prose rendering

Our Civic Duty is a POLITICS-AND-GOVERNMENT RPG supported by life simulation.
Deep gameplay centers on legislatures, governing, judicial roles, campaigns,
parties, committees, political/government staff, bargaining, lobbying,
constituents, political relationships, and the consequences of governing.
Ordinary life matters because it makes the character a person; it supports that
center of gravity. Unrelated careers (doctor, musician, athlete) establish
income, schedule, time, location, and context — never a profession simulator.

## Workflow

1. **Read the packet.** The fact packet is the complete authority for this
   moment (`references/fact-packet-schema.md`). Never add facts, motives,
   objects, relationships, reactions, consequences, locations, feelings,
   connective events, or character knowledge it does not support.
2. **Identify the surface first.** Pick the register from
   `references/surface-registers.md` before writing a word. The same canonical
   fact renders very differently per surface. Second person is the default for
   character-facing narration and player actions only — in-world artifacts
   (news, letters, legal documents, memos, dossiers) keep their native
   register.
3. **Draft under the contract.** `references/prose-contract.md` is the full
   accepted authority. Calibrated examples live in `examples/approved.jsonl`,
   `examples/rejected.jsonl`, and `examples/needs-context.jsonl` — each row
   records WHY, and conditional approvals carry their condition. Never promote
   a conditional example into a universal template.
4. **Classify the result.** Return exactly one of:
   - `SAFE_RENDER` — the packet fully supports natural prose.
   - `SAFE_RENDER_WITH_OMISSION` — natural prose is possible only by omitting
     an unsupported connective detail; list each omission and why.
   - `MISSING_CONTEXT` — a specific missing fact is necessary; name it,
     produce no prose, never an invented rescue. Do not choose this when a
     natural fact-safe omission still satisfies the requested moment.
5. **Self-check the hard gates** before returning: no invention; character
   knowledge respected; no system-label leakage; choice labels describe
   actions only; certain intrinsic consequences exposed before confirmation;
   player choice outranks trait; no unearned drama or filler.

## Conditional rules at scale

You may self-apply a recorded conditional rule when the packet clearly
satisfies its condition (e.g., first-name reference once familiarity is
established). Escalate to owner review for: new patterns, ambiguous condition
matches, repeated systematic failure, evaluation samples, and any change to the
prose contract itself.

## Holdout hygiene — hard rule

The blind-evaluation holdout fact packets (Drive:
`00_HOLDOUT_FACT_PACKETS — BLIND EVAL — DO NOT USE AS SKILL EXAMPLES`) must
NEVER appear in this skill, its references, its example files, few-shots, or
development evals. Do not copy, paraphrase, or cite any held-out packet here.
`npm run prose:eval -- hygiene` enforces the machine-checkable part of this
rule.

## Role limits

This is a development-time authoring/editorial workflow. Accepted prose is
reviewed and stored with authored game content; shipped play never depends on
generating new prose. The prose worker does not decide simulation truth and
does not write to repository source files.
