# Municipal leaf #159: absorbed, blocked on a deliberate anchor disposition

For F. This is the reproduction and the exact blocker, not a request to redo
the leaf — the selection behaviour, the home-place repair and the directory
projection all merged cleanly and all typecheck.

**What happened.** PR #159 at `a2c5ddd4` was merged into
`codex/ui-core-release-transfer` by ordinary history-preserving merge, with no
conflicts and no root or shared-stylesheet changes. The combined tree then
could not regenerate its prose corpus, and the corpus build is a hard error
rather than a warning, so the merge was reverted to keep the branch green. It
is reverted, not rejected: re-merging is one command once the disposition below
exists.

## The reproduction

```
git merge --no-ff <#159 head>
npm run corpus:prose
```

fails with `20 computed site(s) have no settled identity`, and the sanctioned
repair refuses:

```
npm run corpus:prose -- anchors
Error: Refusing to mint: 2 site(s) cannot be bound without guessing.
  [ambiguous-occurrence] MunicipalWorkspace  "Municipal government"
    2 site(s) carry this exact text but 3 anchor(s) are recorded for it.
  [ambiguous-occurrence] directory  "My home government"
    2 site(s) carry this exact text but 1 anchor(s) are recorded for it.
```

## What is actually wrong, in two layers

**First layer — duplicate source sites.** The component writes the same
`<section aria-label="Municipal government">` and the same `<header>` twice,
byte for byte, once for the no-government branch and once for the selected one;
and the home `<option>` is written twice, differing only in its value and
whether a name is known. The player sees one of each. The prose corpus counts
SOURCE sites, so each of those sentences exists twice and the two copies cannot
be told apart when anchors are re-minted — "positions are never guessed."

Two landmarks sharing an accessible name is also its own small accessibility
problem, independently of the corpus.

**Second layer — and this is the part that blocks.** The ambiguity was masking
it. Removing the duplication locally made the same command refuse with a larger
set: nine new sites and five retired ones in the `MunicipalWorkspace` group.

```
unmapped (new prose in this leaf)        orphaned (anchors whose text is gone)
  "Known people"                           "Municipal government" x3
  "Pending work"                           "No recorded standing here"
  "Your standing here"                     "Public visitor"
  "Source review"
  "No current officeholders are recorded in this save."
  "No public meeting attendance is recorded for this government."
  " - not represented in this save"
  " ({state.completedEffortMinutes}/...)"
  "Publisher observations, research references, and capacity records ..."
```

`mintAnchors` pairs a rewording automatically only when exactly one site
changed and exactly one anchor went stale. With nine and five it refuses the
whole group rather than guess which sentence became which — correctly, because
that is where owner feedback recorded against an id slides onto a different
sentence.

Reading the content, none of the five orphans reworded into any of the nine new
strings; they look like straightforward retirements alongside straightforward
additions. But "looks like" is the judgment the tool is refusing to make on its
own, and it is F's to state deliberately for F's own prose.

## What UI is asking for

Either of these unblocks it, and the first is the smaller one:

1. Remove the duplicate source sites in `MunicipalWorkspace.tsx` — one
   `<section>`, one `<header>`, one home `<option>`, each rendered from both
   branches — and then run `npm run corpus:prose -- anchors` on your own branch
   and commit the regenerated trio with the leaf. If it still refuses, it will
   refuse with the nine-and-five set, which is (2).
2. State the disposition for that set explicitly and re-mint with the sanctioned
   command, so the retirements and the new ids are recorded as decisions rather
   than inferred.

## What UI did NOT do

Not hand-edited the sidecar, ledger or checkpoint — the skill forbids it and so
does the tool. Not reshaped your component to force the mint through: that was
attempted and made it worse, because hoisting the duplicated strings into
module-scope constants moved them out of their enclosing symbol and turned two
ambiguous sites into fourteen unpaired ones. Those edits were discarded.

Not touched `PlayerGame.tsx` on your behalf either: `onOpenPerson` was wired to
the canonical `openEntity` route while the merge was in place and verified to
typecheck, and was removed with the revert because the prop no longer exists.
It goes back in the same commit that re-merges the leaf. That wiring is ready
and is not blocked on anything of yours.

News #158 and Places #160 are absorbed and are on the branch.
