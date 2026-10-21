---
id: pool-todo-shells-need-spec
title: "Pool items gov-standins-elections, gov-standins-other, gov-standins-laws are empty TODO shells at priority 2"
area: docs
kind: cleanup
priority: 3
size: S
status: in-pr
claimed-by: claude/todo-shells
pr: #5199
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:18:02.183Z
---

**What.** Three priority 2 items were empty TODO shells: gov-standins-elections, gov-standins-other and gov-standins-laws. Checked Oct 19: gov-standins-elections and gov-standins-laws are now in a PR and gov-standins-other is blocked, so those three no longer need a spec. The one shell from the same family still empty is gov-standins-housing; its spec is written in this change from the sent-back PR #4146.

**Rules.** Look before you ask: the housing spec cites what was decided in docs/coordination/DECISION-REGISTER.md and the Placeholders rule that a stopgap row is never closed by deleting it. Replace, never layer: the housing spec says what is deleted.

**Done when.** `npm run pool -- --check` raises no problem for gov-standins-housing or this item, and the three shells it names are no longer empty or are in a PR.

**Files.** docs/pool/items/gov-standins-housing.md, docs/pool/items/pool-todo-shells-need-spec.md

**Notes.** Oct 19 (claude/todo-shells). Other priority 2 shells remain on main (for example the people-partnerships sub-items, fixed in PR #5189, and the laws-outcome items, fixed in PR #5181).
