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

## P125-REPAIR-02 — review identity repair and evidence reconciliation

The independent audit (P125-AUDIT-01) returned ACCEPT, but its stability probes
sorted already-built records and used non-colliding example sentences. It never
ran the real computed extractor over two sentences sharing their first eight
words. That gap was reproduced and is closed here.

### Reproduced, against the real extractor

With `A = "You meet with your old friend again after work."` and
`B = "...again after school."` in the same enclosing symbol:

- inserting B ahead of A gave B **A's semantic ID**, and moved A to `--2`. An
  owner's mark on A silently became a mark on B.
- editing A past its eighth word left the ID **unchanged**, so a prior approval
  kept standing over text that had changed underneath it.

Both were driven through `computedProseRecords`, not a reimplementation of the
key function, using a labelled synthetic fixture that is restored after each run.

### Repaired

Identity is no longer derived. Each computed site gets an anchor minted once
into `scripts/prose-corpus/computed-anchors.json`; extraction matches sites to
anchors on **full text** within the site's own (file, symbol) group. An unmapped
site, an orphaned anchor or a changed repeat count is a hard error, never a
quiet rematch. Re-minting preserves an anchor across a rewording only when
exactly one site changed and exactly one anchor went stale; anything less
certain is refused with nothing written.

Identity, wording and grounding are now three separate things. Records carry
`textRevision` and `contextRevision`; review marks pin to all three, so a
reworded line keeps its ID and shows earlier feedback as stale. Pre-versioning
marks migrate as historical and flagged for revalidation, and the old storage
key is deliberately left in place. The differential separates a rewording from
an added or removed site.

### Evidence reconciled

- **Counts.** The PR body's 48,382 literals / 1,904 INVENTORIED were **stale** —
  carried over from a measurement taken before the template-span fix in
  `scan.ts` (commit `aa7e547`). The audit's 48,066 / 1,902 were correct.
  `scan.ts`, `coverage.ts` and all of `src/` are byte-identical between the PR
  head and this repair, so the PR head produces the audit's numbers too. A test
  now pins the reported figures to a live measurement.
- **The review-packet.html diff.** Ten artifacts regenerate byte-identically.
  The packet differs in exactly one token: the git HEAD SHA it records. The
  committed copy at the PR head embeds `0a74bd4`, an ancestor, because the SHA
  is read before the commit carrying the artifact exists. That is embedded
  generation provenance, not nondeterminism, and it explains an unexplained
  diff-then-checkout in the audit log without inventing a cause. The field is
  now marked in the markup and the check compares the packet with it blanked.
  "All artifacts byte-identical" was an overstatement and is retired.
- **Classification.** `COMMIT_CONTRACTS` reads like prose but writes event
  context, and the only surface rendering it is `EventHistory`, mounted by
  `DeveloperViewer` and shown only for `?view=developer`. 76 records moved from
  PLAYER_REACHABLE to DEV_FIXTURE_ONLY. Total is unchanged at 1,872; the
  reclassification changes those records' bank segment and the differential
  names every affected ID rather than hiding the move.
- **Transcript claims.** The long-tail lane's stated intent claimed the 92C
  childhood-pact callback. It does not play it — `best-friend-pact` never
  appears. What it genuinely shows is persistent cast across years: the same
  bound person at ages 7, 17 and 18. The claim is narrowed, and the callback is
  now asserted only from an actual matching stage trace. No seed currently
  demonstrates it, and the matrix says so.

Preserved: no `src/` change, no production prose rewrite, no runtime import of
corpus tooling, #119 withholding intact at 104 templates and ten stages, no
World/save/history change, no art change, no weakened test or timeout, no
runtime model call. The 2,786-candidate coverage backlog remains visible. The
old packet's blank-tail cause remains unproven and unclaimed.

LEARN: a stability probe that sorts already-built records tests the sorter, not
the identity function. Attack the real extractor with inputs chosen to collide
under its actual key, and keep the fixture in the repository so the next change
has to answer it.
