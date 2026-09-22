# The prose gate was failing on clean main, and it blocked everything

Measured and fixed 2026-09-22. Merged to `main` as #301 at head `74970f85`.

## What was wrong

On a clean worktree at `origin/main` `445441a5`, `npm run corpus:prose` threw
outright:

> 2 computed site(s) have no settled identity. This is a hard error: an
> unanchored site is where owner feedback slides onto another sentence.

Both sites were `describeBriefing` in
`src/presentation/conversation-subjects.ts` — one anchor orphaned, one site
unmapped, which is the same sentence seen from both ends.

The cause was a change working as intended. The briefing sentence had been
rewritten to draw its constituent description, referral count and ordinal from
the fact packet instead of naming Lexington tenants by hand. That is exactly the
de-hardcoding the work set out to do. What was missed was re-minting the
sentence's anchor, so the corpus still recorded the old wording.

## Why it mattered beyond one test

Every lane is told that any branch adding a file under `src/` or `scripts/` must
run `corpus:prose` and commit the result. That instruction could not be
followed, because the command threw before it wrote anything. CI also runs it on
the browser shard carrying the prose review packet. So a single stale anchor was
blocking every branch in flight rather than one.

## The measurement, both ways

|                       | `npm run corpus:prose`                 | `corpus.test.ts` + `anchor-cli.test.ts` |
| --------------------- | -------------------------------------- | --------------------------------------- |
| clean main `445441a5` | throws, writes nothing                 | 10 failed, 82 passed                    |
| fix head `74970f85`   | exits 0, 3267 templates, 0 hard errors | 92 passed, 0 failed                     |

That second column is the number that made the fix worth landing on local
evidence: a gate that stops throwing but leaves ten red tests would not have
unblocked anyone.

## What the fix was, and what it deliberately was not

`npm run corpus:prose -- anchors`, which reported **0 minted, 1 reworded, 0
retired**, keeping the same anchor id `describeBriefing-0005`.

Those numbers are the whole point. The id is unchanged, so no owner feedback
moves onto a different sentence. Exactly one sentence was touched. Re-minting
broadly would have recorded other people's revisions under this change, which is
the failure mode the anchor system exists to prevent.

No prose was edited. The briefing text reads exactly as it did; what changed is
that its anchor records the wording the sentence actually has.

The `docs/prose-inventory` refresh in the same commit is the gate's own output.
Its counts moved because seven files had been merged since the inventory was
last regenerated, not because of anything in the fix. `metrics-baseline.json`
was included because it carries the same anchor's text revision and would
otherwise have disagreed with `computed-anchors.json`.

## The lesson worth keeping

A de-hardcoding change that replaces a literal sentence with a generated one has
a second half: the corpus has to be told the sentence changed. The tooling
catches it, loudly, and the cost of not doing it in the same commit is borne by
every other branch rather than by the branch that caused it.
