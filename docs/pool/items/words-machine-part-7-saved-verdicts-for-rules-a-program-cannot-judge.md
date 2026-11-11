---
id: words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge
title: "Each judged rule covers only the lines it is about, so its saved verdicts can be judged and start pulling lines"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge
pr: #8522
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: written by Fable, Nov 10, 2026, from the CTO's line of 18:50Z on issue 7365 (the saved-verdict store for the meaning-and-tone rules is part of the test parts) and docs/design/words-machine.md
checked: fable 2026-11-10
merged-at:
claimed-at: 2026-11-11T06:30:48.188Z
branch: claude/pool-words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge
---

**What.** Most of the owner's rules about words are about meaning and tone, which a program cannot judge. A reviewer judges each line once, the verdict is saved, and the run reads it. That one store is built for every such rule (src/english/judged.ts, scripts/words/verdicts.ts, `npm run words:pairs -- --rule`, the guard and the skill). But no judged rule pulls a single line yet, because each rule's sheet is the whole bank, so the judging never gets anywhere. Narrow each rule to the lines it is about, then judge the first rules and move them to `sample`. Guards: lines that break the owner's rules on meaning and tone stop playing in scenes, the journal and the news.

**Cause.** Measured: `npm run words:rules` on main d64255aa (Nov 11). Every one of the 34 `judged` rules that judge a line or a piece in its spot reports about 11,999 lines "waiting for a verdict", the whole bank. That includes rules about only pleas and bargains (`stake-is-named`), only the journal (`journal-names-no-feeling`) or only the news (`news-reads-as-a-story`). Found in code: `lineSubjects` in src/english/line-rules.ts narrows a rule only by its optional `applies` (banks, kinds, moves; `ruleApplies`). None of the 34 rows in data/english/line-rules.json has an `applies`, so a sheet holds about 408,000 judgments in all. Only five rules have any verdicts: the same 150 lines each (`yesHash` 0ludmyc767v in all five files under data/english/judged/), all "yes". All 34 are still `awaiting-test`, and `runRules` flags lines only for `sample` and `enforced` rules. The tests/guards/english/line-rules.test.ts check lets a judged rule leave `awaiting-test` only with a catch, a spare and folded verdicts, and only 6 of the 34 have both a catch and a spare. That is why the second session's bad verdict pulled nothing on Nov 11. The store itself works.

**Fix.** Change no code in the store. Change no bank line, and never write under data/english/parts/. (1) In data/english/line-rules.json, give each of the 34 judged line rules an `applies` read from its own `says` and `from` words, using the bank names, kinds and move names the pieces carry. For example: `stake-is-named` gets moves matching `plea|bargain|complain` and their reply and follow forms; `commitment-names-who-what-why` gets `promise|refuse|threaten` and their forms; the journal rules get bank `journal`; the news rules get `newscast`; the speech rules get `speech-stages` and `opening-speech`; narration rules get kind narration. A rule whose `says` applies to every spoken line (for example `no-literary-phrasing`) keeps no `applies` and says so in a note. (2) List in the PR body, for the CTO, the rules that are not a test of a line at all: a writing method (`look-up-how-real-people-say-it`), or a generator's output (`business-names-sound-real`, `bill-called-by-what-people-call-it`). Leave their status as is. (3) Run `npm run words:verdicts` with no `--from`, which drops verdicts on lines a rule no longer applies to, then `npm run words:rules` twice, the second changing no file. Put each rule's new waiting count in the PR body. (4) Take the six rules that have a catch and a spare. For the two with the smallest waiting counts, write sheets with `npm run words:pairs -- --rule <id> --out <dir outside the repository>`. Hand them to a reviewer session that did not write the lines, as the words-engine skill says. Fold the verdicts, and move those two rules to `sample` so their "no" lines are listed for the owner. Add one line to .agents/skills/words-engine/SKILL.md and its mirror under .claude/skills/: narrow a judged rule with `applies` before writing its first sheet.

**Time box.** 5 hours for one Sonnet session, plus the reviewer's pass. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No hand-written player text: this part judges bank lines and writes none, and Story writes every line (CTO, Nov 10). Replace, never layer: the reply rule's sheets, fold and reader become one case of the general store in the same change, with no second path left. One engine per mechanic: one store, one fold and one reader for every judged rule. Rules, checks and skills merge before the work they judge (owner, Nov 10). A rule may not pull a line the owner graded good. American English.

**Done when.** A second session, not the builder, runs `npm run words:rules` on main. Every judged rule with an `applies` reports fewer lines waiting than the whole bank (each count named). Two rules are `sample`, with their "no" lines listed under the sample in data/english/pulled.json and each line's verdict reason in data/english/judged/. A second run changes no file. It builds a year of scenes in a drawn place with scripts/dialogue-batch/scene-year.ts, names the place and seed, and every line it hears that one of those two rules judged "no" is shown in dev mode with that rule's flag.

**Waits on.** Nothing. words-machine-part-1-tests-for-rules-that-judge-one-line and words-machine-part-2-tests-for-rules-that-judge-a-piece-in-its-spot edit data/english/line-rules.json too: merge main in before pushing.

**Files.** data/english/line-rules.json, data/english/judged/, data/english/pulled.json, src/english/line-rules.ts, scripts/words/verdicts.ts, scripts/words/reply-pairs.ts, tests/guards/english/line-rules.test.ts, .agents/skills/words-engine/SKILL.md, .claude/skills/words-engine/SKILL.md

**Notes.** Not seen in the game (2026-11-11, second-session-2): no place (words machine, no-explaining rule), seed none, main 170bd92c: marked one no-explaining line bad, folded it, ran words:rules: pulled.json stayed empty because every judged rule is awaiting-test; only the reply rule is enforced

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:28 UTC) on branch claude/pool-words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge.

Released (2026-11-11): Its Fix is already on main (judged.ts store, words:pairs --rule, six verdict files, guard, skill); see PR #8522. Continue on branch claude/pool-words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge and pull request #8522.

Nov 11 (cause finder for Fable B): the store from the earlier Fix is on main and works. The open part is coverage. All 34 judged line rules apply to the whole bank (no `applies` on any row), the five rules with verdicts share the same 150 "yes" lines, and no judged rule has left `awaiting-test`. The earlier Fix's seven steps are built. This Fix replaces them with the narrowing and the first two rules' judging, so a "no" can reach the owner's sample.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:26 UTC) on branch claude/pool-words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge.

Released (2026-11-11): Held by my own next loop while walking the queue; not worked (see the item's own size and Fix: M-sized or needs Story/Words lines, not started this pass). Continue on branch claude/pool-words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge and pull request #8522.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 06:30 UTC) on branch claude/pool-words-machine-part-7-saved-verdicts-for-rules-a-program-cannot-judge.
