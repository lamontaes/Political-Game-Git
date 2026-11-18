---
id: words-journal-promise-line-says-hard-red-on-the-train
title: "Red on the train: the journal bank's 'names no feeling' test fails on 'I promised {other} I'd look hard at {about}.'"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: found while gating #9199 on the train head 6738bf84
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** `src/english/mined/journal-bank.test.ts` "names no feeling anywhere in the bank" fails on the pushed train head (6738bf84, seed words-journal, Chefornak, Alaska): the part `journal.scene-line-view-promise.i-promised-other-i-d-look-hard-at-about` in data/english/parts/journal.json reads "I promised {other} I'd look hard at {about}.", and the test's feeling list holds the word "hard". The line is a journal entry the game writes after the player promised someone to look into a question. Seen: the player's journal after such a promise.

**Cause.** Found in code: data/english/parts/journal.json holds the line, which uses "hard" as an adverb ("look hard at"), and the test (line 91) matches the whole-word list happy, sad, glad, proud, angry, afraid, scared, lonely, loved, hated, missed, grief, joy, upset, worried, excited, difficult, hard, tough, terrible, wonderful, relieved, relief, rough, nervous, anxious, lucky, painful, awful, heartbreaking, overwhelmed against every part's text. It is not a feeling, but the rule is a program the Words lead owns, so the line is reworded, not the test.

**Fix.** Reword the line without "hard", for example "I promised {other} I'd take a close look at {about}.", under the Story session's ownership of lines; keep the key's meaning and rerun `npm run words:rules` twice.

**Time box.** 1 hour for a Sonnet session at medium effort.

**Rules.** American English, no feeling named in a journal line. Never loosen the test.

**Done when.** A second session runs `src/english/mined/journal-bank.test.ts` at a drawn place (Chefornak, Alaska, seed words-journal, and one other named with its seed) and sees it pass, and sees the promise line in a played journal in the running game.

**Waits on.** Nothing.

**Files.** data/english/parts/journal.json
