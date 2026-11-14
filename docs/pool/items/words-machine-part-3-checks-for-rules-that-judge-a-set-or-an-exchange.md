---
id: words-machine-part-3-checks-for-rules-that-judge-a-set-or-an-exchange
title: "The words machine, part 3: rules about a set of choices or a line and its reply get checks that read them together"
area: words
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/project-thread-jwna62
pr:
after:
blocked-on:
lead: words
model: opus
effort: high
root: design-words-machine
source: split from words-machine-rules-from-the-owners-notes by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
---

**What.** Some of the owner's rulings cannot be seen in any one line: four replies must be four different answers; a reply must answer what was said; a talk must not end the same way every time. Sixteen such rules are written down. One has a check that reads the lines together.

**Cause.** Found in code: `runRules` (src/english/line-rules.ts line 300) runs every rule in data/english/line-rules.json, which holds 25 rules with `status: awaiting-test` on main at 756370e86b, and 61 once pull request 8154 merges (17 judge one line, 28 a piece in its spot, 9 a set and 7 an exchange); a rule with that status pulls nothing. The check that a reply follows the line before it is `src/english/reply-follows.ts`, and the four-replies rule (branch claude/fable-four-replies, Nov 10) is the first check that reads a choice set together.

**Fix.** For each rule whose `judges` is `set` or `exchange`, write a check on the model of those two: it builds the sets or pairs the composer can actually produce for a spot, reads them together, and lists the spots that break the rule with the lines involved. A set rule pulls nothing by itself: it writes the spot and what is missing to the list Story writes from. Each check runs inside `npm run words:rules` and has a test with one set that passes and one that fails. Of these 16 rules, 12 carry the test `{ kind: "judged" }` on main: for those, build the sets or pairs and write them as sheets for a reviewer through the store of words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge (one store for every judged rule), and write no second store.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No hand-written player text: a check lists the gap and Story fills it in the banks. Four dynamic choices, always (owner, Oct 14); the four replies each move the talk somewhere (Oct 15); four replies are four different answers, never one reworded (Oct 27). Story writes every line (CTO, Nov 10). A check never reorders or drops a choice in play to pass; it reports the gap.

**Done when.** A second session, on main, runs `npm run words:rules` and reads each of these rules with the spots it lists. In the running game in a drawn place it names with its seed, it has three conversations and, for each rule that names a spot it reaches, sees the gap the report lists; after Story's lines for those spots merge, the same spots pass in the report and in play.

**Waits on.** Pull request 8154 on main and the four-replies rule on main.

**Files.** data/english/line-rules.json, src/english/line-rules.ts, src/english/reply-follows.ts, scripts/words/run-rules.ts, src/director/conversation.ts
