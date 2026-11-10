---
id: words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge
title: "The words machine, part 7: rules a program cannot judge read saved verdicts, one per line, and pull the lines judged bad"
area: words
kind: feature
priority: 1
size: M
status: merged
standard: 2
claimed-by:
pr: #8206
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-words-machine
source: written by Fable, Nov 10, 2026, from the CTO's line of 18:50Z on issue 7365 (the saved-verdict store for the meaning-and-tone rules is part of the test parts) and docs/design/words-machine.md
checked: fable 2026-11-10
merged-at: 2026-11-10T20:23:10.401Z
---

**What.** Most of the owner's rules about words are about meaning and tone: whether a line names something specific, explains itself, or sounds like the person saying it. A program cannot judge those. The design has a reviewer judge each line once and save the verdict, and the run then reads the saved verdicts. One rule already works this way, the rule that a reply follows the line before it. This part makes that one store serve every such rule, so each of them can start pulling lines.

**Cause.** Found in code: `breaks` in src/english/line-rules.ts (line 188) returns false for every rule whose test is `{ kind: "judged" }`, so such a rule flags nothing. data/english/line-rules.json holds 53 of them on main at f04686d130, all `status: awaiting-test` (17 judge one line, 24 a piece in its spot, 8 a set and 4 an exchange). The only saved verdicts are for one rule, `reply-follows-the-line-before`: sheets written by scripts/words/reply-pairs.ts (`npm run words:pairs`), folded by scripts/words/reply-verdicts.ts and scripts/words/fold-verdicts.ts (`npm run words:verdicts`) into data/english/judged/reply-follows.json, and read through src/english/reply-follows.ts. Nothing writes a sheet, folds a verdict or reads one for any other rule.

**Fix.** Extend that one store; build no second one. Read docs/design/words-machine.md (the section on three kinds of test) and `.agents/skills/words-engine/SKILL.md` first.

1. **Sheets.** Make the sheet writer take a rule: `npm run words:pairs -- --rule <id> --out <dir>` writes, outside the repository, the lines that rule applies to and nobody has judged for it, each with what a reviewer needs: the line, its bank, key, kind and move, the rule's `says`, and the owner's words behind the rule. A rule that judges a piece in its spot also gets the tags of each use. The sheet's rubric is the rule's `says`, word for word.
2. **The fold.** `npm run words:verdicts -- --from <dir>` folds a reviewer's file into data/english/judged/`<rule id>`.json in the shape reply-follows.json has: only the "no" verdicts listed, each with its one-sentence reason, a hash of the lines judged "yes", and the count judged. A verdict is tied to the line's exact text: the fold drops a verdict whose line the bank no longer holds in those words. Folding twice changes nothing.
3. **The run.** In `runRules`, a `judged` rule flags every line with a "no" verdict, and from there it is any other rule: `sample` lists the line for the owner, `enforced` pulls it, a line the owner graded good is never pulled and is listed under Conflicts, and a spot is never left with no line. A line nobody has judged for a rule passes that rule and keeps playing (docs/play-first/LAW.md, section 7: ungraded is not rejected), and the report counts it, per rule, as waiting for a verdict.
4. **The gate on new lines.** Keep each rule's count of lines waiting for a verdict in the file the run writes, and make the English guard (tests/guards/english/line-rules.test.ts) fail, by the rule's name, when that count is higher than the committed one. So a new or changed line must come with its verdicts, and the backlog can only fall.
5. **Status.** A `judged` rule moves from `awaiting-test` to `sample` when its row holds one line it must catch and one it must leave alone and its first verdicts are folded, and to `enforced` by the same step the other rules use. The report shows, for each such rule, lines judged, lines judged bad and lines waiting.
6. **Sets and exchanges.** The 12 `judged` rules about a set or an exchange use this same store, keyed by the set or pair that words-machine-part-3-checks-for-rules-that-judge-a-set-or-an-exchange builds. Build the store so a key can be a line, a pair or a set; do not build their sheets here.
7. **The skill.** Add to `.agents/skills/words-engine/SKILL.md` (and its byte-for-byte mirror under `.claude/skills/`) how a reviewer takes a sheet, judges it and folds it. Nothing is judged while the game is played, and the run calls no model.

Write no verdicts beyond the examples the tests need, and change no bank line: Story judges the lines and writes every line.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No hand-written player text: this part judges bank lines and writes none, and Story writes every line (CTO, Nov 10). Replace, never layer: the reply rule's sheets, fold and reader become one case of the general store in the same change, with no second path left. One engine per mechanic: one store, one fold and one reader for every judged rule. Rules, checks and skills merge before the work they judge (owner, Nov 10). A rule may not pull a line the owner graded good. American English.

**Done when.** A second session, not the builder, on main: writes a sheet for one `judged` rule, marks one line bad with a reason, folds it and runs `npm run words:rules`; the line is in data/english/pulled.json under that rule with the owner's note behind it, and a second run changes no file. It changes that line's words in the bank and the verdict no longer applies. It adds a new line the rule applies to with no verdict, and the English guards fail by that rule's name. It builds a year of scenes in a drawn place with the crew's scene tool (scripts/dialogue-batch/scene-year.ts), names the place and seed, and the line judged bad does not play. The reply rule still passes its own tests through the same store.

**Waits on.** Nothing. words-machine-part-1-tests-for-rules-that-judge-one-line and words-machine-part-2-tests-for-rules-that-judge-a-piece-in-its-spot edit the same two files (data/english/line-rules.json and src/english/line-rules.ts): merge main in before pushing.

**Files.** src/english/line-rules.ts, src/english/line-rules.test.ts, src/english/reply-follows.ts, scripts/words/reply-pairs.ts, scripts/words/fold-verdicts.ts, scripts/words/run-rules.ts, data/english/judged/, tests/guards/english/line-rules.test.ts, .agents/skills/words-engine/SKILL.md, .claude/skills/words-engine/SKILL.md