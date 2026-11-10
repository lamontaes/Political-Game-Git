---
id: words-rejected-nov8-scene-still-plays
title: "The President's-speech small talk the owner called terrible on Nov 8 played again on Nov 9, and none of its lines carries a grade (Blodgett Landing, New Hampshire)"
area: words
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: story/words-rejected-nov8-scene-still-plays
pr: 8170
after:
blocked-on:
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, the grading section and "Reported done that is not done" items 9 and 11)
---

**What.** The owner rejected a scene by voice on Nov 8 and it played unchanged the next day. Measured in the audit's browser play on main as of Nov 9 (Blodgett Landing, New Hampshire, a 17-year-old, no seed kept): the mother "stops in at the house" to say a county budget passed, then "Did you catch the President's speech?" "You and me both." "Then we agree on something for once." "I'll let you get back to it." Measured by the audit in the engine: none of the scene's lines is graded, so none is held, and they weigh more than a neutral line's 1.0: "Then we agree on something for once" carries 1.44, "That's what they're saying" 1.52, "I'll talk to you later" 1.34 and "I liked what the President had to say" 1.31. Checked by me on Nov 10's main (commit 8ac2262853): data/english/part-grades.json still has no entry for "Did you catch the President's speech?", "Did you watch the President's speech?", "I liked what the President had to say.", "You and me both.", "Then we agree on something for once." or "I'll let you get back to it."; data/english/grades/ holds three files and none is from Nov 8. The cause, read by the audit: only whole-line grade files put a line on the held list (`readGradedBatches` and `isSpanGradeFile`, scripts/dialogue-batch/apply-grades.ts, near line 504), and what the owner says while playing is written down nowhere as a grade. Fix it at that cause: record his Nov 8 spoken rejection as whole-line grades in a grade file, fold it, and the lines are held the same day. Then name the route every spoken playtest rejection takes from now on (the in-play grade control, src/bench/grade-line.ts, or a grade file written from the playtest log the same day), so the next one does not wait for a session to notice.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the lines are held by the owner's grades through the one grade ledger, not deleted by hand or filtered in code, and a held line's place is taken by another bank piece or by nothing. Look before you ask: the rejection is already on record (docs/coordination/playtest/2026-11-08-1.md, point P37, and the verbatim file beside it), so it is built, not asked again. A rewrite never deletes a line the owner graded good: "Did you see the President's speech?" carries his good grade of Oct 27 ("I did like that") and stays; where his Nov 8 words and that grade pull apart, write the conflict into the grade note and message the CTO, and scripts/dialogue-batch/liked-lines-kept.test.ts must still pass. Owner, Nov 8, 2026: "this is a terrible scene. And this should have been taken out of the game a long time ago." Owner, Nov 8, 2026 (2:10 p.m. playtest), on English engine updates: they "should impact the entire game".

**Done when.** A different session runs `node --import tsx scripts/dialogue-batch/apply-grades.ts` and sees the count of held parts rise by the lines graded, then runs scripts/dialogue-batch/grade-reach.test.ts and liked-lines-kept.test.ts green. It starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and for the first 14 days after the opening address talks to every member of the household each day and opens every scene, with a screenshot of each talk. None of the held lines appears. It runs the crew's life tool (`npm run dialogue:report -- --lives 3 --days 60 --seed <seed> --out <file>`) and finds none of the held lines in the report. It repeats the browser check in the audit's place, Blodgett Landing, New Hampshire (typed into the Place field; the audit kept no seed). The grade file names, for each row, the owner's words, the date and the playtest file they came from. The owner plays it: the talk he called terrible does not come up, on day one or two weeks after the speech.

**Files.** data/english/grades/voice-notes-oct15-28.json, data/english/part-grades.json, data/english/grade-reach.json, scripts/dialogue-batch/apply-grades.ts, src/bench/grade-line.ts, data/english/parts/conversation.json, data/english/parts/scene-talk.json

**Notes.** From the Fable audit: Pillar 4 ("What a player sees": "That is the scene you rejected on November 8, unchanged"), the grading section ("Lines from the scene you rejected, and lines like them, are boosted", "What you say while playing still goes nowhere") and "Reported done that is not done" item 11: "'The I liked what the President had to say scene was fixed.' It played unchanged on November 9 (measured)."

The owner's words, Nov 8 (docs/coordination/playtest/2026-11-08-1.md, P37, on "your son has been waiting for you to get home. I liked what the president had to say"): "this is a terrible scene... I said this multiple playthroughs ago... I know from the batches that I was grading that this shit was way better... how the words still aren't updated."

Piece keys checked on Nov 10's main, none in part-grades.json: conversation.address-ask-seen.did-you-catch-the-president-s-speech, conversation.address-ask-seen.did-you-watch-the-president-s-speech, conversation.address-view-raise-for.i-liked-what-the-president-had-to-say, conversation.address-view-answer-agree.you-and-me-both, scene-talk.follow-agree.then-we-agree-on-something-for-once, conversation.farewell-leave-home.i-ll-let-you-get-back-to-it. Graded good on Oct 27: conversation.address-ask-seen.did-you-see-the-president-s-speech (data/english/grades/voice-notes-oct15-28.json, row 32).

What changed since the audit's play: on Nov 9 evening a story read at home became a scene with lines of its own, so the road the Nov 8 playtest took (a story read at home, then small talk about the address) no longer ends in this talk. The lines can still play in any everyday talk within 14 days of an address and in any scene that still falls back on everyday talk (director-no-borrowed-small-talk). I did not replay Blodgett Landing on Nov 10's main, and I did not recompute the four weights; they are the audit's.

Related: words-voice-note-reader (in-pr; the reader for voice notes on a batch, which is not this playtest route), words-after-address-talk-follows (done; marked done, still shows), release-audit-13-grade-always-wins (open).
