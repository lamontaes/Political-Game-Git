---
name: trusted-review-pass
description: >
  How to run and judge a review pass over many lines, rows or items for Our
  Civic Duty (line banks, stopgap rows, pool items) so the result can be
  trusted: chunks of about 150 rows, planted calibration rows, Opus at medium
  effort, and throwing out a pass that says yes to everything. Use when
  ordering or reading any bulk reviewer, grader or second-reader pass. Not
  for the Words lead's own reads (words-reads) or for one PR's review
  (checker).
---

# A review pass you can trust

1. **Chunks of about 150 rows.** A bigger chunk gets skimmed.
2. **Plant calibration rows in every chunk:** a few rows known to be wrong and a few known to be right, with the verdicts the lead gave. Keep them in a separate file the reviewer does not see.
3. **Judge the pass by the plants first.** If it passes a known-wrong row or fails a known-right one, throw out the whole chunk and rerun; do not fix by hand.
4. **A pass that says yes to everything in seconds is thrown out.** Real reads quote the rows they send back and say why.
5. **Opus at medium effort** for judgment passes; Sonnet for mechanical checks; never a model that wrote the rows.
6. **Report counts and quotes:** how many agreed with you, and every row you do not, quoted. A line the owner graded good is never narrowed except as the lead listed.
7. Read lines as played, whole, in three drawn places on a fresh seed, never a diff alone.
8. A builder never grades its own lines or pairs. Send the sheet to the planted review (`npm run words:review` once #9221 folds).
9. **A sheet the review tool cannot plant is planted by hand.** When `npm run words:review` stops on a rule with no plants (narration-assumes-no-reason did on Nov 14 and 15), copy three plant lines from an earlier batch of that rule (two that pass, one that fails, the failing one an owner's own example) into `b/01.md` under their neutral ids, between the real entries, keep `key.json` beside it, and check each plant's verdict against the key yourself before you copy the real verdicts out.
10. **Read the code that places a line, not only the sheet.** A line can read well and still say more than the record holds. On Nov 15 (#9384) "He wasn't sick. He was just gone." was placed by a fact set when the illness had no condition name, though every full person's death in the health engine comes from a case with an onset. That is a no on the fact, written with the file and line, and the builder chooses between placing it on the right fact and deleting it.
11. **The judge may overrule one verdict, never quietly, and overrules hold across rounds.** Write the reviewer's reason and yours in the verdict's `why`, with "M5 overrules the reviewer" (or your role), and say so in the message to the builder. When an earlier round of the same sheet overruled a line in the same place (a money put-off where nobody asked, a partner's statement after "{opponent} ran a dirty race."), give the same verdict in the next round and write "as in earlier rounds" in the why, so two rounds never disagree on one pair.
12. **A re-sent sheet whose pair ids were already judged needs no new reading.** A pair's id is fixed by its two lines, so when a builder sends a smaller or restored sheet after a merge (#9416 on Nov 15: 48, then 38, then 10), check every id against your earlier verdicts and copy those verdicts out, filtered to the sheet. Read again only the ids you have not judged.
13. **Give the reviewer the trigger when a line's truth depends on it.** A narration line that reads as a guess ("you haven't worked out how the money lasts") can be a plain record fact when it plays only on one fact (#9442, `stake-money`). Add one context line above the entries, naming when the line plays, and put the condition in your message: if the line ever plays without that fact, it fails.
14. **A second-move sheet says nothing about fit.** reply-second-move-follows-the-first judges only a reply's own two moves. On #9416 (Nov 15) two pairs it passed were later caught by the second reader for not fitting the line before. The guard listed no reply-follows-the-line-before pairs, so none had been judged. When a builder reworks lines and sends only a second-move sheet, also build a hand batch for reply-follows-the-line-before from the same pairs (A, then B), with three plants, and say in your message which rules you judged.

15. **`words:review --check <dir>` treats every `.md` in the batch folder as a batch.** The reviewer's file must be `NN.verdicts.json` beside `NN.md`. Move any other `.md` out of that folder first, such as a reviewer's notes file, or the check stops with "no reviewer file".
