# Order: the Words line's grading page for batches 21 and 22 (weekend of Oct 24, 2026)

Current as of 2026-10-24 (written by the acting CTO)

The owner ruled on Oct 24: the Words session builds a grading page and he grades there; nobody asks him to grade in chat.

## Who

- **The Words session,** Opus, as the owner set the Words line (AGENTS.md, "Models, effort and helpers"). At most two Sonnet helpers (3-2-1 rule), read-only unless this order says otherwise.
- **Item:** `words-grading-page-batches-21-22` (p1).
- **Channel:** the "Words" section of `docs/coordination/LEADS-2026-10-24.md`, every two hours.

## Where it stands (checked Oct 23, night)

- **Batch 22** (#5846, `words-batch-22`, in review): the 141 held hand-written lines in 90 moves across 7 banks, `docs/grading/words-batch-22.md` and `data/english/batches/batch-22.json`, with `apply-grades.ts` counting a grade against its one part.
- **Batch 21** rides the word pack, #4626 (`words/word-pack`, batches 15 to 21), which waits on #4459.
- **Tools on main:** `scripts/dialogue-batch/grading-bench.ts` (`npm run words:bench`), `scene-page.ts`, `grading-batch.ts`, `apply-grades.ts`.

## What to build

1. **One page for both batches,** built by a script from the batch files (never by hand), opened in the bench or as one file under `docs/grading/`. For every line: the batch and item number, the move it makes, the line exactly as the engine composes it, its context (the scene, the speaker and listener, and each slot with the record it reads, by id) and a yes or no control. Lines group by move (owner, Oct 15: one grade carries to every scene that uses the move).
2. **Grades go back by file:** the page writes `data/english/grades/batch-21.json` and `batch-22.json` in the shape `apply-grades.ts` reads (`{"i": 12, "grade": "good"}`; yes is good, no is bad). A test shows a yes and a no reaching the part ledger against their one part each.
3. **The CTO screens it before the owner sees it** (`cto`, "The Words line"): post the page's path in your channel section and the CTO links it for the owner.
4. **Then the Words stack:** #4459, #4626, #5358 in that order, through the mergers; the CTO puts them on `MERGE-FIRST.md` when you ask in the channel.

## Rules that bind this

No hand-written player text: the page shows what the engine composes; the builder words nothing, and authored parts stay `shippable: false` until graded. Ask why: each line's context names its records. American English.

**How the owner will grade it:** he opens one page on his phone or Mac, reads each line with where it plays and why, taps yes or no, and the next build says only what he passed.
