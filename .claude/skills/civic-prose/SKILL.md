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
6. **Run the owner style pass** below. Grounding decides whether prose is
   legal; the owner rules decide whether it is good. Most rejected prose is
   grounded and still wrong.

## Owner prose rules — locked 2026-09-05

These are the owner's own review rules, recorded before any analysis and
treated as immutable. They are not preferences to balance against each other;
each one is a pass/fail check. Full detail, anti-pattern quotes, and repairs
live in `references/prose-contract.md` ("Owner rules"); the calibrated failures
are rows in `examples/rejected.jsonl`.

1. **Second person, always, for player-facing scenes.** Never "he", "she",
   "the senator", "the judge", "the representative". A packet CHARACTER line
   that names a role is describing who the player is — it is not permission to
   narrate them in third person. In-world artifacts (surfaces 9a–9e) keep
   their native register; that is the only exemption.
2. **Don't restate what the player already knows.** Office, term, title,
   spouse, "your bill", how long someone has been an ally — a fact being in
   the packet is not a reason to say it. Include a relationship or history
   only when this specific scene is unintelligible without it. No orienting
   preamble.
3. **No literary phrasing. No generated texture.** Write the plain political
   sentence. If a line sounds composed, cut it.
4. **Ordinary political and institutional words.** Say what a person in that
   building would say. In conversation, prefer the natural term where it is
   factually accurate ("library tax", not "library levy").
5. **Dialogue sounds spoken, not authored.** People interrupt, state things
   flatly, and leave things out. No epigrams.
6. **Money is an arrangement, not a label.** "She'll pay you $500 for two
   songs." Never "The offer: $500."
7. **Don't out-determine the facts.** State the concrete circumstance; let the
   player draw the obvious political conclusion. Do not close a scene by
   explaining what it means or what will follow.
8. **Get to the pressure, then hand back control.** Reach the decision the
   scene exists for and stop. End on the player's move ("How do you
   respond?"), not on further narration.
9. **Preserve variation.** Several genuinely different phrasings of the same
   packet can all be right. Do not converge on one canonical sentence, and do
   not manufacture difference by swapping synonyms.
10. **Dry stays dry.** Formal institutional documents need no decoration to
    feel authored.

Grounding outranks all ten: none of these authorize inventing a fact, motive,
object, reaction, or causal link to make a line land better.

### Before returning, scan for these

Delete on sight, in player-facing prose: third-person reference to the player;
an opening clause that re-establishes the player's own office, term, or
authorship of their own bill; metaphor about conversations, rooms, sentences,
or shapes; "the version X put in the room"; "changes the shape of the"; "say
the plain thing"; "holding the sentence"; "the one you've met exactly once";
"The offer: $"; a final sentence that interprets the scene instead of ending
it.

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
