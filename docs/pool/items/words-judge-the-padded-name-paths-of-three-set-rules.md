---
id: words-judge-the-padded-name-paths-of-three-set-rules
title: "Record M5's fresh verdicts on the 619 reply sets whose names came out"
area: words
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-set-rules-lost-their-reply-sets-and-their-good-verdicts
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Coordinator, Nov 14, 2026, second pull request after the verdict-loss fix
checked:
---

**What.** Taking the padded names out of scene-talk lines gave 619 reply sets in three review rules a new id, so their old verdicts no longer applied. M5 judged all 619 fresh with planted entries, and every plant was caught. Seen: the three rules show 864, 675 and 187 judged good after this change, and 391, 603 and 21 judged bad.

**Cause.** Found in code: `verdictId` in `src/english/judged.ts` hashes each line's key and exact text, so a changed name moves the id of every reply set through the line.

**Fix.** Fold the 309 good verdicts with `npm run words:verdicts -- --from <dir>` from the reviewer files, record the 310 noes as noes, and group them by scene in padding/verdict-loss/noes-by-scene.md for the scenes' builders. No line's text changes here.

**Time box.** 1 hour, Sonnet.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; a builder never judges its own lines, so only M5's verdicts are folded and no no is ever turned into a yes.

**Done when.** `npm run words:rules` shows the counts above. In three drawn places (name each place and seed), the reply sets the sheet maker finds for these rules are all judged. A second session on main runs `npm run words:verdicts` and sees them unchanged.

**Waits on.** Pull request #9322 folding into the train.

**Files.** data/english/judged/later-replies-move-the-talk-on.json, data/english/judged/replies-may-be-long-and-substantive.json, data/english/judged/escalation-can-be-answered-in-kind.json
