---
id: words-grades-calibrate-by-trait-and-register
title: "One graded line calibrates the whole engine: a grade attaches to the pattern, trait and register, not to the line"
area: words
kind: feature
priority: 1
size: M
status: done
claimed-by: words/grade-reach
pr: #6223
blocked-on:
source: "owner, Oct 27, to the CTO"
lead: words
milestone: play-first
claimed-at: 2026-10-27T05:29:30.004Z
---

**What.** The owner, Oct 27: "when they give me like 100 lines to grade, and I grade 17, that should calibrate the entire engine, at least to some extent. If I give feedback on the opening speech, certain phrases, certain words said by a trait or whatever calibrates other parts of the engine... a butterfly effect, and calibrates a concession speech later on. That's what I mean by the English engine constantly upgrading." Today a grade sits on one bank piece (128 of 5,318 carry one) and changes nothing else. This item makes a grade attach to what the piece is made of: its pattern (the sentence shape), the speaker trait and tie it was written for, its register (newscaster, plain speaker, polished, floor speech) and its words, so that a grade on an opening-speech line moves the weight of every piece sharing that pattern, trait and register across every bank, including a concession speech never graded. The owner grades inside play: his sitting notes and a grade control on a scene (thumbs, or a one-word note) write a grade record; no batch is laid out for him.

**Rules.** Serves `words-engine` (every piece plays unless the owner's grades hold it; a grade run sets every bank at once) and `scene-standard` rule 4 (lines vary by trait and tie). Sliding scales: a grade shifts weights, it never bans a pattern at a threshold. Ask why: the report says which grade moved which pieces and by how much. No hand-written player text: nothing here writes lines; it weights them.

**Done when.** A grade written on one piece in a drawn place's played year (place and seed named) changes the selection weight of at least ten other pieces that share its pattern, trait and register across at least three banks, shown by `docs/reports/grade-reach.md` naming the graded piece id and the pieces moved with their before and after weights; a scene rendered after the grade picks differently from before on a fixed seed, and a test fails when the grade's reach is removed; the 128 existing grades are re-applied through this path and the report shows their reach.

**Time box.** 4 hours for the grade record, the reach across banks and the report; the in-play grade control is its own 2-hour follow-up item if it does not fit. If not done, push what exists, open the draft PR, write the handoff.

**You will see.** When you grade a line or leave a note on a scene, the next scenes of that kind, by that kind of person, change with it, not just that one line.

**Screenshot.** Not a screen; the `grade-reach.md` report in the PR body.

**Files.** src/english/ (grading and selection), data/english/parts/, data/english/grades/, docs/reports/grade-reach.md, src/bench (the grade control on a scene)

**Notes.** Owner, Oct 27 (OWNER-DECISIONS.md). Batch 22 was the Oct 15 lines; no grading batch is owed (Oct 26). Lead: words.
