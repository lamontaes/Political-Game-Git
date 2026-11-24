---
id: words-set-rules-lost-their-reply-sets-and-their-good-verdicts
title: "Give three set rules back their reply sets and the good verdicts that were dropped"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead / Account lead, Nov 14, 2026: later-replies-move-the-talk-on and replies-may-be-long-and-substantive held no good verdicts after the padded-names pull request folded
checked:
---

**What.** After the padded-names pull request (#9213) folded into the train, the judged stores for later-replies-move-the-talk-on, replies-may-be-long-and-substantive and escalation-can-be-answered-in-kind held 0 good verdicts (they held 928, 716 and 196), so three rules said nothing had been judged good. Three rules that judge replies in scene-talk therefore showed nothing judged good, and the review queue grew by every reply set again. Seen: `npm run words:rules` reports good verdicts for all three rules again, and the guard names any set rule that loses its reply sets or its good verdicts.

**Cause.** Found in code: merges of the train into the padded-names branch took `data/english/line-rules.json` without the `sets` and `applies` fields of those three rules, so `subjectsOf` in `scripts/words/verdicts.ts` found no reply sets to judge and `foldVerdicts` dropped every good verdict as one about a line the bank no longer held.

**Fix.** The three rules get their `sets` and `applies` back; the verdicts whose scene-path id is unchanged (1,417: 763, 541, 113) are restored from the train before the merge; the 619 whose lines changed words (the padded names came out) go to M5 in planted batches, and only their yeses are folded; `tests/guards/english/line-rules.test.ts` fails when a set rule with saved verdicts has no `sets` or `applies`, or has verdicts and none judged good.

**Time box.** 2 hours, Sonnet.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; a builder never judges its own lines, so M5 judges the changed-text paths and only yeses are folded.

**Done when.** `npm run words:rules` reports good verdicts for all three rules and the guard passes; with `sets` removed from one rule the guard fails by rule name. In three drawn places (the 240 built scenes the sheet maker plays), no path judged before stays unjudged for a reason other than changed words. A second session, on main, runs `npm run words:rules` and `npm run words:verdicts` and sees the three rules keep their good verdicts.

**Waits on.** M5's verdicts for the 619 changed-text paths.

**Files.** data/english/line-rules.json, data/english/judged/later-replies-move-the-talk-on.json, data/english/judged/later-replies-move-the-talk-on.yes.txt, data/english/judged/replies-may-be-long-and-substantive.json, data/english/judged/replies-may-be-long-and-substantive.yes.txt, data/english/judged/escalation-can-be-answered-in-kind.yes.txt, tests/guards/english/line-rules.test.ts

**Notes.** Changed-text counts: later-replies 129 yes and 147 no, replies-may-be-long 148 yes and 114 no, escalation 81 yes. Gone with the train's rebuilt scenes: 36, 27 and 2 yes.
