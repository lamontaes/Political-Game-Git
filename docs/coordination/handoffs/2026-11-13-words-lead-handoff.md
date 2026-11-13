# Words and story lead: handoff to the other account (Nov 13, 2026)

The first account stopped for the week at 97%, with Fable A as words lead. This page hands the words and story work to a new Fable session on the owner's other account. Main was at fa34439db8 when it was written.

## The job (owner's rulings, standing)

- Every word a player reads is yours: scenes, the director, the Journal, the newspaper, speeches, people's cards and histories (OWNER-DECISIONS.md, Nov 12 afternoon: "the words lead owns the words, scenes, director, Journal and newspaper").
- Every line goes through the English engine and composer with many versions and inserts. A stock line from a bank doesn't count (memory engine-only-text; OWNER-DECISIONS Oct 6 and Nov 11).
- Read each words change as played, in drawn places, on a fresh draw, before it goes to the train. Quote the lines you read. A scene must write something back (the Wildermyth bar).
- Plain American English. No captions under anything on screen. Lines come from people's lives and records.

## Where it stands

- **Fixed lines left on main: 5,258** (scene-talk 4,704, conversation 228, opening speech 265, Journal 51, speech stages 10). The count is the line-inserts guard, baseline `tests/guards/english/line-inserts-baseline.json`. It was 6,687 on Nov 12 morning. The biggest drop was the deleted scenes (#8922).
- Fable A's rulings from Nov 12 and 13 are numbered rules (13, 15, 17, 22 and others) in its lines on GitHub issue #8928. Read every `Fable A:` line on #8928 from Nov 12 on before you start; that's the record of the queue, the rules and the reasons.

## Open words and story PRs (state as of Fable A's last lines)

- **Base the rest sits on:** #8879 conversation engine and house talk (seventh round; an older test file it broke is being traced). After it: #8924, #8941, #8950, #8959, #8974, #8979 (W1 conversation lines, six branches waiting behind it).
- **Read and passed, with a merger when the account stopped:** #9029 (the filing counter as one scene).
- **Built, on Fable A's read list:** #8961 Journal (draft; "the first version I would hand you"; last round was the repeated-sentence fix), #8878 speeches (two fresh-seed failures fixed; checks running), #8943 office hours (draft), #8956 the bribe (draft; waits on #8879), #8910 a reporter's call.
- **New from the W2 and W3 builders:** #9040, #9044, #9045, #9046, #9048, #9049.
- **Older, check before using:** #8792, #8800, #8803, #8805, #8812, #8816, #8831, #8688, #8671, #8642, #8607, #8527, #8522 (words machine part 7).
- Sent back by Fable A: #9016 (the street stop: people tell news the way they talk, never by reading the headline aloud).

## How it runs now

- The other account's Account lead runs a **train**. Nothing merges into main. When a PR passes the gate (START-A-MERGER step 8) and your read, post `Words lead: train-ready #N <full sha>` on #8928, and the Train thread folds it in. When the owner says go, the whole train merges at once.
- Post updates for the owner as `Words lead: for the owner` lines on #8928: short patch notes on what a player now sees. You may also send the owner artifacts directly on that account.
- Run building threads on Sonnet and your own reading on Fable at medium effort.
