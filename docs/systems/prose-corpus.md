# Prose corpus and review system

Status: **development-time diagnostic**. Nothing here runs in play.

## What it answers

What player-facing prose the game currently has, where each line comes from,
how it is reached, what canonical data grounds it, what recurring defects it
carries, and how a later prose change differs from this baseline.

It is a _description_ of the production banks, in the same spirit as the
content index in `src/content/`: an adapter reads a bank that already exists
and reports what that bank declares. Nothing here authors prose, selects it,
decides simulation truth, or changes eligibility.

## The one-way boundary

The corpus lives under `scripts/prose-corpus/` and reads `src/`. **No module
under `src/` may import it.** That direction is enforced by
`no-restricted-imports` in `eslint.config.js` and re-checked by a test, not
left to convention — a review tool that became a runtime dependency could let a
diagnostic decide what a player sees.

The old #92 harness put its runner in `src/presentation/playthrough-transcript.ts`,
inside the production tree. That is the arrangement this replaces.

## Semantic identity

`prose:<domain>:<bank>:<stable-key>#<field>`

```
prose:life:episode:school.the-thing-you-got-blamed-for/cubby-space#line:0
prose:life:episode:companionship.the-friend-you-named/best-friend-pact#option:agree:label
prose:setup:questionnaire:kitchen-table#prompt
```

Coordinates, never positions. The old corpus numbered strings globally —
`S-0001`, `C-0251` — so inserting one line renumbered every mark after it and an
owner's note came to point at a different sentence. Here:

- adding an unrelated line changes no existing ID;
- seed order and page position cannot reach an ID;
- array position appears only inside a stage's own key, where the bank has no
  per-sentence key to borrow, so an insertion's blast radius is that one stage;
- identical text at two semantic locations keeps two distinct IDs;
- collision detection fails closed.

A dynamic realization keeps its **template** ID and carries its own text hash
beside it. A rendered-content hash is never the primary identity.

### Computed sites are anchored, not derived

Prose a function composes has no key of its own to borrow. The first version
derived one from the sentence's first eight words plus an encounter-order
suffix, and P125-REPAIR-02 reproduced two defects in that against the real
extractor: inserting a sentence sharing another's eight-word prefix handed the
existing sentence's ID to the new one, moving an owner's mark onto text they
never read; and editing past the eighth word left the ID untouched, so an
approval kept standing over changed text.

Identity is now minted once per site into
`scripts/prose-corpus/computed-anchors.json` and **matched**, never computed.
Matching is on the site's full text inside its own (file, symbol) group.
An unmapped site, an orphaned anchor, or a changed repeat count is a hard error.
Re-minting keeps an anchor across a rewording only when exactly one site changed
and exactly one anchor went stale; anything less certain is refused with nothing
written. Run `npm run corpus:prose -- anchors` after editing a computed surface.

### Identity, wording and grounding are three things

Records carry `textRevision` and `contextRevision` beside their ID. A review
mark pins to all three, so a reworded line keeps its identity and shows earlier
feedback as **stale** rather than as approval. Marks predating versioning are
kept as **historical** and flagged for revalidation; the old storage key is
never deleted. The differential separates a rewording from an added or removed
site.

## Reachability

Read from the banks, never inferred.

| Class                   | Meaning                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `PLAYER_REACHABLE`      | Ordinary play can arrive at it.                                                                          |
| `WITHHELD_BY_GROUNDING` | The stage declares a PR #119 `withheld` requirement; the reason is the bank's own.                       |
| `DEV_FIXTURE_ONLY`      | A fixture or development route is the only way in. A test opening something is not a player reaching it. |
| `LEGACY_OR_WITHDRAWN`   | Withdrawn from selection, kept so existing saves stay readable.                                          |
| `CURRENTLY_UNREACHABLE` | Authored, with nothing currently offering it.                                                            |
| `UNKNOWN`               | The banks do not say, and the corpus will not guess.                                                     |

## Coverage is proved, not declared

The coverage check does not ask the adapters what they found. It walks the
production source, pulls every string literal out of the TypeScript syntax
tree, and asks of each whether the inventory has it. Verdicts are
`INVENTORIED`, `INTENTIONALLY_NON_PLAYER_FACING`, `DIAGNOSTIC_OR_TEST` and
`NEEDS_CLASSIFICATION`, and every exclusion states what the file _is_.

**100% coverage is not claimed.** Forcing debug strings, identifiers and
fixtures into the inventory to reach a round number is the old failure wearing
a new one. The honest output is the count still needing a person's judgement.

## Hard errors and review warnings

A **hard error** is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason, non-deterministic
regeneration. These fail the run.

A **review warning** is a place worth an owner's eye, and none of them is a ban.
A grounded character may legitimately say "something"; a good sentence may
legitimately contain "rather than". Lint that fails a build on wording produces
prose written to satisfy a regex, which is a worse defect than the one it was
aimed at.

## Commands

- `npm run corpus:prose` — build every artifact into `docs/prose-inventory/`.
- `npm run corpus:prose -- check` — rebuild and fail on drift or a hard error.
- `npm run corpus:prose -- diff` — differential against the committed baseline.

## Grounding

`grounding-map.md` records what canonical data licenses each family's claims and
the exact evidence every withheld scene is missing. The PR #119 rule holds
throughout: **missing facts mean omit the detail or withhold the scene**, never
a vague rescue. The harness manufactures no facts.

## Reproducibility and provenance

Ten generated artifacts regenerate byte-identically. `review-packet.html`
records the commit it was generated from, so it cannot be byte-identical across
two commits — that is embedded provenance, not nondeterminism. The field is
marked `data-provenance="head-sha"` and `npm run corpus:prose -- check`
regenerates every artifact and compares, blanking that one field. Claiming all
eleven were byte-identical was an overstatement, and this is what replaces it.

Toolchain for the recorded measurements: Node 22.22.2, TypeScript 5.9.3.

## Classification is verified through consumers

A string is player-facing because a player surface renders it, traced. The
conversation `COMMIT_CONTRACTS` constants read like prose but write event
context, and the only surface that renders them is `EventHistory`, mounted by
`DeveloperViewer` and shown only for `?view=developer`. They are classified
`DEV_FIXTURE_ONLY` for that reason, not because of how they read.

Transcript claims are held to the same standard. Multi-year persistent-cast
continuation is claimed only from an instance with a bound role spanning five or
more years, and the 92C childhood-pact callback is claimed only when the pact
stage and a later stage of the same instance are both actually played. No
current seed demonstrates that callback, and the matrix says so rather than
reading it off generic continuation.

## Old #92 material

The overnight narrative audit branch and its Reading Copy are diagnostic donors
only. Extraction concepts, review-UI ideas and historical lint patterns were
salvaged. Its positional IDs, its stale corpus and its old playthrough
assumptions were not, and none of it is current authority.
