---
id: words-verdict-ids-move-when-a-line-changes-words
title: "Keep a judged verdict when a line inside the judged path changes words"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 14, 2026, after the verdict loss on the padded-names pull request
checked:
---

**What.** A verdict id is a hash of the subject's keys, each with its exact text (`verdictId` in `src/english/judged.ts`), and a scene path or reply set is the scene's lines up to the point judged. So taking one name out of one line gives every path through that line a new id, and every verdict about those paths (619 on the padded-names pull request) must be judged again, though the change was one comma and a name. Seen: after a name comes out of a line, the verdicts about paths through it stay good unless a reviewer has changed the answer.

**Cause.** Design: docs/design/words-machine.md keeps the review machine, and the id hashes the exact text so that a reworded line is never judged by an old verdict; there is no way to tell a change that cannot alter the verdict (a vocative name, a comma) from one that can.

**Fix.** Design: store with each verdict a hash of the text with its listener-name slots and their commas stripped (the same reading `padsTheListenersName` in `tests/guards/english/line-inserts.test.ts` uses), and let a verdict stand when only that part differs; every other change still moves the id. The Words lead rules whether that reading is safe for every rule (a plea's name is a reason; a letter's greeting is not).

**Time box.** 3 hours, Opus.

**Rules.** Follow the standing rule "No dice" and the other standing rules in AGENTS.md; a verdict never stands for a change that adds or removes a fact, a number or a word other than the name.

**Done when.** In three drawn places (name each place and seed), after the padded names are taken out of a bank copy, the number of verdicts that fall off a scene-path rule is the number of lines whose words changed beyond the name. A second session, on main, takes a name out of one line and sees no verdict dropped.

**Waits on.** The Words lead's ruling on which names are safe to strip.

**Files.** src/english/judged.ts, scripts/words/verdicts.ts, tests/guards/english/line-rules.test.ts

**Notes.** Filed with the verdict-loss fix; that fix only restores what could be restored and sends the rest to M5.
