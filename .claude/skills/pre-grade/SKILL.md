---
name: pre-grade
description: >
  The owner's-ear pre-grade (the writer checker): a session that did not write
  the lines plays fresh lives, reads every scene, speech, Journal page and news
  story as played, and grades each line, each reply set and each slot across
  lives the way the owner grades, calibrated on his real verdicts. Use when
  grading a Story writer's batch, a Story packet or a grading page before it
  reaches the owner. Not for one PR's words stamp (words-stamp-read) or a bulk
  pass over non-words rows (trusted-review-pass).
---

# Pre-grade: grade the way he grades

The owner, Nov 12, 2026, grading life 1: "look at all my batch grading and complaints and see what you think I would say." His approved plan of Nov 23: his ear is the gate; a separate session pre-grades a played life as him, and only what passes goes to him.

**Why this skill exists.** On Nov 24 the pre-grade scored 8 of 8 on its plants in every chunk and passed every line he failed that morning, among them "You were born in 2007, and nobody asked you first.", "So the President wants a higher top income tax rate. I'm glad she said it out loud." and four work replies that gave one answer. The plants were lines that fail on their face, and the read went one line at a time by piece id, so it never saw a reply set, a line after the line before it, or the same opener in every life. Owner, Nov 24: "we're going against rules that I've had for months."

## The rules that must hold

1. **Grade what plays, never the bank alone.** The input is a played packet: three or more drawn lives (place and seed drawn, never chosen) at the writer's exact head, every screen's text in order, with what the screen already shows beside it (the date, the place, the names on the card). A bank read by piece id only finds dead lines; it never passes a line.
2. **Three reads, every time.**
   - Each line in its scene, after the line before it, by the person who says it.
   - Each reply set together: different stances, in the player's voice, each answering the line before (`scene-standard`, rule 4). Four replies that give one answer fail as a set; name the set.
   - Each slot across the lives: an opener, frame or move that comes back in every life fails, even when each life reads fine alone.
3. **Plant his real verdicts, one per class, as whole stretches.** Every chunk holds, unmarked, one plant from each failure class in `references/owner-grades.md`, at least two of his passes, and a few of his older graded lines from `data/english/grades/` (good and bad, with his notes). Each plant goes in as it played: the line before it, the reply set with its answer, or the same slot in three lives. A chunk that misses a class is reread once by a fresh reader. If it misses again, you grade that class in the chunk yourself and report the miss in your file (chunk size: `trusted-review-pass`). Plants that fail on their face (a record id, a British word) don't count toward the classes.
4. **Who reads what.** Blind readers get the packet with the plants mixed in, the three reads above (copied into their brief), the reader rules in `references/reader-rules.md` and the rule ids. They never get this skill, `references/owner-grades.md` or any line he graded, so they can't pass by looking up the answer. Score the calibration and the regression on the readers' raw verdicts, before you touch them.
5. **Pass or fail only.** There's no okay tier. Score his "okay" lines as pass. A reader who gives his reason but no fail verdict hasn't agreed, because writers act on verdicts (CTO, Nov 24).
6. **His verdict, not your rule of thumb.** A plant is graded the way he graded it. Where a rule of thumb would fail a line he passed, he wins. On Nov 24 he passed "It's the evening of January 20. The news replays President Simon's noon speech." and failed "It's January 2025" ("shouldn't really say this because the date is in the bottom left"). Reading: the first tells what is happening tonight; the second only repeats the corner of the screen.
7. **Every fail gives its reason:** a rule id from `data/english/line-rules.json`, or his dated words from `references/owner-grades.md`, quoted. Suggest no new wording; the writer rewrites or deletes.
8. **A reader rule is yours to catch.** Of the 110 rules in `line-rules.json`, 48 are `awaiting-test` and 24 are `sample` (Nov 24 count): no program fails a line for them, so only this read does. That covers `bill-called-by-what-people-call-it`, `no-literary-phrasing`, `variants-differ-in-what-they-say`, `vary-the-shape`, `no-pointing-at-the-unnamed` and `introduced-before-addressed`.
9. **When an enforced rule let a line through, report the test gap.** Example: `no-day-or-place-in-narration` matches only date and place slots such as `{month}`, so a typed "It's January 2025" passes it. Post the rule id and the line to the Story lead as a test to fix; don't add the rule here.
10. **The grader never wrote or tuned the lines.** Opus at medium effort or higher, in a session that did not build the batch.
11. **Never overrule a blind reader's fail toward a pass on your own taste.** Turn a reader's fail into a pass only when his graded words in `references/owner-grades.md` pass that kind of line, and quote them. On Nov 24 (round 8) the blind reader failed 1.16 and 1.28, the pre-grader overruled both to pass, and he failed both.

## The score

- **Agreement with his grades is the only score.** After he answers a grading page, compare line by line: for each line he graded, did the pre-grade agree? Post the count and every miss, quoted, on #9750. Each miss joins `references/owner-grades.md` as a plant the same day.
- **A pass rate** (lines passed of lines read) measures the writer, not the grader.
- **The regression, run before any new grading after a change to plants or method:** have fresh blind readers grade the Nov 24 Desk packet, scored on their raw verdicts (the merged head a880050828, d8fe230a50 plus one diary fix; its round-8 pre-grade is `docs/story/first-evening-pregrade-8.md` on branch `story/first-evening-pregrade`). It must fail 1.3, 1.5, 1.7, 1.16, 1.18, the work replies 1.24 to 1.26 with their answer 1.28 as a set, and the "It's January 2025" line, pass 1.14, and mark 1.13 and 1.17 okay. A grader that misses one is not used until it passes.

## What you write

- **One file per batch** on the pre-grade branch. It opens with the head sha, the places and seeds, and the calibration by class. Then come the failing lines by reason (the line, where it played, the reason), the failing sets (the set, the reason), and the passing lines.
- **For a grading page,** the CTO builds the page from Story's packet (`docs/grading/<date>-lives/packet.json` on the Story branch): numbered scenes, lines numbered n.k, who speaks, the replies offered and the one taken, and what followed (the Journal, the news). Each line carries its element ids and issues. Put your verdict beside each line in its own field; the owner sees it only if he asks.

## Gotchas

- Nov 24, four regression runs (7, 9, 8 and 8 of 11): the readers' reasons matched his, but they graded short replies okay instead of fail. The okay tier is gone (rule 5).
- Nov 24: his diagnosis on the first played page was "the writers do not seem capable of the middle part of talking, connecting the ideas through natural sentences." Read for the joins between lines, not only the lines themselves.

- Nov 24: 8 of 8 calibration in every chunk, while all ten of his fails passed. The plants were too easy and the read went line by line.
- Nov 24: three readers missed plants on the news writer's batch 9, and its 30 lines were then never read. A thrown-out chunk is reread, never skipped.
- Nov 24: the life story's quips ("That's how the state says hello.") passed as voice. He wants the dry, sarcastic voice only in the loading screen's progress messages ("It's not the lines. I'm talking about the loading screen is sarcastic."). The life story is plain.
- Nov 24: round 8 reported agreement as 221 of 254 lines between the blind readers and the pre-grader. That is agreement with itself, not with him; only his grades score the grader.
- Nov 24: the blind reader failed line 1.16 only for its opening "So". His reason was different: no person says the policy's name ("They'd be like, finally, someone wants to tax the rich"). Grade the reason he would give, not the first fault you find.
- Nov 12: a reply that reads fine alone ("Oh, I see. I'll check on you again at the morning") was "the same bullshit I talked about yesterday with the just non-replies." Read replies against the line before.
