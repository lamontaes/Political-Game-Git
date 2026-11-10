---
id: words-machine-rules-from-the-owners-notes
title: "Every owner note becomes a rule with a detector, run over every line after each grading and gating new lines"
area: words
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
after:
blocked-on:
lead: fable
source: Fable build brief, Nov 9, 2026, piece 4 (docs/audits/fable-build-brief-2026-11-09.md on branch audit/fable-vision); Fable audit, root cause 4 and "The words and grading system"
standard: 2
model: fable
effort: high
root: design-words-machine
---

**What.** The audit's root cause 4: the words are a pile of hand-written lines picked by weights, and a grade removes one line or shifts odds. Measured over all 10,612 lines on main, November 9: a bad grade holds back 39 lines; lines from the scene the owner rejected on November 8 carry 1.31 to 1.52 times a neutral line's chance; the owner's reasons are stored in a note field no code reads; 13 of the 26 hand-written rules have a detector and a detector only moves odds between 0.6 and 1.4; 3,186 of 5,661 spots have a single line, where odds mean nothing. The open batch 2 and 3 grade pull requests record every batch 2 grade three times, and four times in the later ones, because each run of the grading script adds the batch again. This item turns each of the owner's notes into a rule a program can test, runs every rule over every line after each grading (a line that breaks a rule is pulled and queued for rewrite), gates new lines on the same rules, keeps the check that protects lines he graded good, removes the borrowed small talk, and fixes or replaces the miscounting grade pull requests.

**Cause.** Design: docs/design/words-machine.md; owner rulings in docs/coordination/OWNER-DECISIONS.md, Nov 9 (a grade pulls matching lines; "im not grading 6000 lines and 800 conversations individually") and Nov 10 (words work is split by role: Fable builds the rules, checks, run and pulled list; Story writes the lines). Measured by the Fable audit over all 10,612 lines on main, Nov 9: a bad grade holds back 39 lines; lines of the scene the owner rejected on Nov 8 weigh 1.31 to 1.52 times a neutral line; 13 of 26 hand-written rules have a detector that moves odds only between 0.6 and 1.4; 3,186 of 5,661 spots have a single line.

**Fix.** Turn each owner note into a testable rule with a detector, run all rules over every bank line after each grading, pull and queue failing lines for rewrite, gate new lines on the same rules by rule name, count each grade once in the ledger, keep the check that protects lines graded good, and remove the borrowed small talk and the odds that favor ungraded lines. This item is for the lead to split; the parts are: the rule registry, pull and gate, the grade ledger counted once, removing borrowed small talk and odds, and the played-year proof.

**Time box.** 80 hours for Fable with helpers on the same model, the design first (ten days). When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: every line stays in the English engine's banks, and the rules judge bank lines, never text typed into code. Replace, never layer: the weights that favor ungraded lines and the grade map's unread rewrite list are replaced by the rules in the same work, not kept beside them. An effect is a read, not a record: a note counts only when a detector reads it over every line and a line stops playing or is rewritten because of it. American English everywhere: the detectors run beside the spelling guard, on the same lines. Owner, October 23: "every time I update a batch or something, it should update through the entire game"; November 8: "im not grading 6000 lines and 800 conversations individually"; November 9: "so that these shitty lines don't happen again".

**Done when.** A second session, not Fable, on main: runs the rules over every bank line and reads a report that lists, for each of the owner's notes, the rule it became and the lines it pulled; adds a line that breaks a rule to a bank and sees the check refuse it by rule name in a test; then plays a year in a drawn place it names with its seed, and the same year in Tesuque, New Mexico, seed 8a5d1fba28fc, with the crew's scene tool, and finds none of the lines the owner rejected by voice on November 8 ("Then we agree on something for once", "I'll let you get back to it", "I liked what the President had to say") and no scene that fell back on small talk it does not own, with a screenshot of one scene that used to borrow it. Every grade in the ledger is counted once: the report shows each batch 2 row at 1. The 79 lines graded good are all still in the banks. The owner plays it: he grades a small batch, and the next build has stopped playing every line in the game that breaks what he said.

**Waits on.** The owner rulings of Nov 9 and Nov 10 in docs/coordination/OWNER-DECISIONS.md (recorded), and three calls put to the owner on Nov 10 in Fable's session: whether a lesson pulls matching lines for rewrite or plays them less; what "kind of weird" means as a grade; whether the batch pages he grades from stay off main.

**Files.** docs/design/words-machine.md, data/english/writing-rules.json, data/english/part-grades.json, data/english/grade-reach.json, data/english/grade-map.json, scripts/dialogue-batch/apply-grades.ts, scripts/dialogue-batch/grade-map.ts, scripts/dialogue-batch/voice-note-reader.ts, src/english/english-grades.ts, src/english/calibration.ts, src/english/bank-parts.ts

**Notes.** Fable is building this on branch `claude/political-game-audit-build-h6d7tg`, with the Words session's review (`Review: words`), since it changes `data/english` and `src/english`. Three owner calls come first and were put to him on Nov 10 in Fable's session: whether a lesson pulls matching lines for rewrite or plays them less; what "kind of weird" means as a grade (read today three ways: half a bad mark, a full bad, held from play); and whether the batch pages he grades from stay off main with his voice notes (he said on Nov 9: "I don't know why like my notes and stuff need to be merged into main"). Read: OWNER-DECISIONS (through Nov 9), DECISION-REGISTER, prior-rulings/words.md, LAW, every file in docs/coordination/voice-notes and docs/coordination/playtest; searched docs/ and pool for: rewrite, how often, weight, kind of weird, batch file, off main; Drive: searched. Related items filed the same night for the Words session: `director-no-borrowed-small-talk`, `words-rejected-nov8-scene-still-plays`.
