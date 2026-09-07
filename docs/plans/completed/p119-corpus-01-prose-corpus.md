# P119-CORPUS-01 — current-main player-facing prose corpus and review system

Base main `2663b3585c1dc9a191720bd3fa359d6ba423fbf7`, verified live and
unmoved at task start.

The first implementation task of the prose/language reset. It builds the
measuring and review system the migration will use; it rewrites **no**
production prose, changes no simulation semantics, eligibility, life, campaign,
election or governing behaviour, no schema, and adds no runtime dependency.

## What it is

`scripts/prose-corpus/` reads the production banks and reports what they
declare. `docs/systems/prose-corpus.md` is the durable description. The
generated artifacts live in `docs/prose-inventory/`.

The direction is one-way and enforced: the corpus reads `src/`, and an eslint
`no-restricted-imports` rule plus a test keep any module under `src/` from
importing the corpus. The old #92 harness lived at
`src/presentation/playthrough-transcript.ts`, inside the production tree; that
is what this arrangement replaces.

## The decisions worth recording

**Semantic IDs, not positions.** `prose:<domain>:<bank>:<stable-key>#<field>`.
The old global `S-0001`/`C-0251` numbering meant one inserted line renumbered
every mark after it. Array position survives only inside a stage's own key,
where the bank has no per-sentence key to borrow. Collision detection fails
closed.

**Withholding is read, never inferred.** PR #119 made it a first-class
`EpisodeRequirement` carrying its own reason, so 104 templates across the ten
withheld stages report `WITHHELD_BY_GROUNDING` with the bank's exact reason. A
test also plays every seed and asserts no withheld stage ever appears in a
transcript.

**Coverage is proved independently.** The check walks the source and asks of
each literal whether the inventory has it, rather than asking the adapters what
they found. 100% is not claimed: 2,786 candidates still need a person's
classification, reported with reasons, and every exclusion states what the file
is. Forcing identifiers and fixtures into the inventory to reach a round number
is the old failure wearing a new one.

**Warnings are not bans.** Hard errors are objectively wrong. Everything about
wording reports and counts, because lint that fails a build on "something" or
"rather than" produces prose written to satisfy a regex.

**The transcripts drive the real seams.** `projectStoryMoment`,
`chooseStoryOption`, `fileForOffice`, `spendAnAfternoon`, `openLegislativeWork`.
Six seeds prove childhood, adolescence, ordinary adulthood, quiet stretches,
persistent-instance continuation, a filed candidacy, campaign sessions, an
election won and an election lost on separate seeds, and the measure briefing
reached after the win. Each seed reports what it _actually_ demonstrated, not
what it intended. No state is fabricated to make a scene eligible.

## The review packet and the 95 blank pages

The old packet (`9d57f8d`) shipped HTML containing **zero** server-rendered
review items: its entire body was a `DATA` array that client script built with
`createElement` after `root.innerHTML = ""`. That is the inspected structure,
recorded as evidence.

It is deliberately **not** written down as the cause. Nobody demonstrated the
mechanism, and canonizing a guess is how a wrong explanation becomes repository
truth.

The new generator pre-renders every item server-side, so reading and printing do
not depend on script running first, and `reviewPacketStats` asserts what the
file contains — 1,872 rendered items for 1,872 records, and a small empty tail.

**Stated limitation.** No dependency in this repository rasterizes HTML into
paged output, so nothing here can programmatically prove a page count or assert
"no blank page N". What is proved is the absence of a large empty trailing
allocation and the presence of the content without script. Confirming
pagination needs a real browser print, which remains an owner check.

## Old #92 material

Diagnostic donor only. Extraction concepts, review-UI ideas and historical lint
patterns were salvaged. Its positional IDs, stale corpus and old playthrough
assumptions were not, and none of it is current authority.

LEARN: prove coverage with a mechanism that does not share the inventory's own
assumptions. An extractor asked whether it extracted everything always says yes.
The syntax-tree sweep is the durable form of that lesson, and the count it
cannot classify is the part worth reading.
