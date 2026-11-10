---
id: words-housing-moved-lines
title: "A household's move into a new home has journal and scene words from the English engine"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5708
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: rc3-thin-life-record
lead: words
checked: fable 2026-11-10
---

**What.** A household's move into a new home has journal and scene words from the English engine. The housing engine writes the move and the director can fire a situation from it, but no banked piece words 'we moved into a new place' for the journal or the scene. Mine and grade pieces for the move from the real home and rent records, and wire them through the English engine so the player reads who moved where and what it cost.

**Cause.** Needs cause. Looked at src/core2/modules/housing.ts (it writes only housing.purchase, housing.completed, housing.eviction and the homeless count, no household-move event) and src/director/data/journal-rows.json (the "moved" row at line 183 covers a person moving between places): no within-town household-move record exists to word, and it is unclear which record the item means.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session, to find which record the item means (a purchase, a lease start or a person move) and rewrite this item with Found in code and a real Fix.

**Rules.** No hand-written player text: every word comes from the English engine's banks in data/english/parts/, nothing is typed into code or a screen. Ask why: each line cites the move and the home record that earns it. American English (npm run spelling). An effect is a read, not a record: wording a record nothing writes proves nothing, so find the record first.

**Done when.** A second session, not the builder, reads the rewritten item and finds a cause that names a record id the housing or people engines write in a played year (place and seed named), a Fix in plain words, and no `Needs cause.` left; or the item is dropped with the reason.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/director/data/journal-rows.json, data/english/parts/journal.json, data/english/parts/scene-words.json, src/director/journal.ts, src/director/scene.ts, src/director/journal.test.ts

**Notes.** Words and director line. Grade with the owner's bench once the pieces exist.

Sent back 2026-10-20 from PR #5178 (branch claude/political-game-pool-khi2o3): edits src/director by a session that is not the Words session; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5708 (branch claude/political-game-pool-yucp92-bp): src/director/data/situation-types.json:133 is a Words-owned path, and the body explicitly identifies this as a non-Words pool-session edit. The merger morning check refuses it. The body also says the required departure scene in an ordinary drawn played world was not proven, and the move-into-home words remain unbuilt. Route the change through Words and provide the named proof.; finish on that branch, merge main into it first.

Looked at Oct 21 (claude, Sonnet, non-Words session): not taken. The two send-backs (PRs #5178 and #5708) both refused edits to Words-owned paths (`src/director/`, `data/english/parts/`) from a non-Words session, so this belongs to the Words line. Claim released.

Claim released by the Oct 25 audit: no push in 72 hours (branch claude/political-game-pool-yucp92-bp last pushed Oct 20; PR #5708 stays open for the next builder).

Oct 25 audit: cleared a stale blocked-on (its item or PR is done, or the acting CTO's Oct 20 ruling lets any builder build the director side while every word comes from the English engine).

**Notes (Fable's check, Nov 10).** **Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as a duplicate of world-new-homes-moves-read. The record this item could not find is `housing.moved`, written in src/core2/housing-occupancy.ts (line 383) with the household's members, and read by nothing. world-new-homes-moves-read has that record written to the life record and read by the journal and the director, with Story writing the lines.
