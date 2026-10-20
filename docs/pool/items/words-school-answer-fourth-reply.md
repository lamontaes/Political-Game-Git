---
id: words-school-answer-fourth-reply
title: "School question: the engine writes a fourth reply"
area: words
kind: feature
priority: 1
size: M
status: blocked
claimed-by:
pr:
blocked-on: PR 5647 (words-authored-parts-shippable-sweep) is an unmerged draft, 'do not merge as is'; on main the lines still ship as authored shippable parts, so the slot is not empty and the rewritten test in the done-when does not exist yet. Needs the owner to grade the lines (the 5647 decision).
source: added with npm run pool -- add
---

**What.** The held hand-written sentences in data/english/parts/conversation.json left the fourth reply to where did you go to school with no shippable part, so the game shows nothing there until the English engine writes it. Compose or mine the line for the fourth reply to where did you go to school from the person's school past fact, as engine-written bank parts with their source, and have the director use it. The player would read the line again, written by the engine from the record.

**Rules.** No hand-written player text: the line is composed or mined by the English engine, never typed (owner, Oct 6, EN-1 to EN-3). No dice: which part is said follows the record and the speaker's traits. American English. One rule, all 56 places: the part names no place.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, named in the PR body, the slot the fourth reply to where did you go to school is worded from engine or mined parts in data/english/parts/conversation.json and cites the person's school past fact by record id; the rewritten director test that now asserts the slot is empty asserts the real line instead, and tests/english-parts-banks.test.ts passes.

**Files.** data/english/parts/conversation.json, src/director/mined/conversation-bank.ts, src/director/school-answers.test.ts

**Notes.** Filed by fs11vb while rewriting the 17 director tests for PR #5647, as the CTO required for every slot left without engine parts.
