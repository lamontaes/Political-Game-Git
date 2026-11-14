---
id: words-pairs-since-misses-old-line-pairs
title: "words:pairs --since misses the pairs an arc change opens between two older lines"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: S6 (PR #9324, serve-sought fix), Nov 14 2026
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** On #9324, `npm run words:pairs -- --rule reply-second-move-follows-the-first --since <the train>` wrote 106 pairs, and M5 judged them. Then `npm run words:rules` still said 236 more pairs waited than were committed. The sheet had missed them, so the line-rules guard stayed red with no sheet that named them.

Guards: tests/guards/english/line-rules.test.ts, which a builder can now keep green from the sheet alone.

**Cause.** Found in code: scripts/words/reply-pairs.ts keeps only the subjects that have a line new or reworded since `--since` (`changedSince`, near line 241, used near line 590). A change to an arc in src/director/data/purpose-arcs.json can open pairs between two lines that both predate the base. On #9324, ask-to-serve gained the reply `ask`, and its `again` row was re-keyed to `answer`. All 236 missed pairs were in ask-to-serve, between lines older than the base.

**Fix.** Choose the sheet by pair id, not by line age, when `--since` is given:

1. Build the waiting pairs at the head.
2. Build the waiting pairs at the ref, in a temporary checkout of the ref or from the ref's bank and arcs read through git.
3. Write the pairs whose id is waiting at the head and not at the ref.

This is the method that worked by hand on #9324:

1. `npm run words:pairs -- --rule <rule> --out <dir>` with no `--since`, at the head and again at the base (a detached checkout).
2. Collect every `after[].id` from each sheet's `lines`.
3. Keep the head's pairs whose id the base's sheet lacks. That gave the 236, all of ask-to-serve, which M5 then passed.

Add one line to the words-engine skill's "Keeping line-rules green" saying that an arc change needs this.

**Time box.** 2 hours for one sonnet session.

**Rules.** Look before you ask: read the words-engine skill's line-rules section and scripts/words/reply-pairs.ts first. Never edit pulled.json by hand.

**Done when.** On a branch that changes only an arc row in purpose-arcs.json (for example, adding a reply move to one purpose), `npm run words:pairs -- --rule reply-second-move-follows-the-first --since <base>` writes every pair that `npm run words:rules` counts as newly waiting. The count on the sheet equals the rise that `words:rules` reports. A second session checks it on such a branch, against a build of the branch head, with a test in scripts/words that changes one arc row and compares the counts. Nothing changes for a player in any place, so there is nothing to see in the game.

**Waits on.** Nothing.

**Files.** scripts/words/reply-pairs.ts, .agents/skills/words-engine/SKILL.md, .claude/skills/words-engine/SKILL.md
