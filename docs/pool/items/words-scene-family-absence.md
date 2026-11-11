---
id: words-scene-family-absence
title: "A family member's absence is a scene when a record explains it, silent otherwise"
area: words
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: added by the acting CTO, Oct 25 (owner ruling)
lead: words
milestone: play-first
claimed-at:
standard: 2
model: sonnet
effort: medium
root: design-story-director
checked: fable 2026-11-10
branch: claude/pool-words-scene-family-absence
---

**What.** The owner ruled Oct 25 that a family member's absence is told to the player as a scene when a record explains it: moved away, in the hospital, jailed, died. Today a household member who leaves simply stops appearing, and the player learns nothing. The scene reads the record that took them (a move event, a hospital admission, a justice case's custody, a death record) and stages one moment in the house or by message from a kin member who says what happened, with the player's reply from controls and the result in the journal. Where no record explains the absence, nothing is said; the engine never invents a reason, and an absence with no record is a defect to file, not a line to fill.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Oct 25 (a family member's absence is told as a scene when a record explains it: moved, hospital, jailed, died), and LAW.md section 2 (docs/play-first/LAW.md). The situation types "departure" (src/director/data/situation-types.json, line 195) and "funeral" (line 1140) exist, but none tells a household member's absence by hospital stay or custody; the "family-absence" type (line 4694) is about the player's own absence.

**Fix.** Add a scene that reads the move, hospital admission, custody or death record that took a household member and stages one kin moment citing it, with the player's reply and the result in the journal; say nothing when no record explains the absence.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Serves LAW.md §2, Scenes like Wildermyth: scenes come out of what is actually happening in the world, narrated into a moment. Ask why: the scene cites the record (move, admission, custody, death) that earns it. No hand-written player text: the kin member's lines come from the English engine's bank. Silent otherwise: no record, no scene, never a placeholder.

**Done when.** A second session, not the builder, plays a world (buildBenchWorld) in a drawn place and a seed nobody chose (named) and sees a household member whose record shows a move, hospital stay, jailing or death told in one scene citing that record id, a member with no such record producing no scene, and a bench screenshot at 1440x900 of the scene with the place and seed under it.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/scene.ts, src/director/scene-talk.ts, src/core2/household-mix.ts, data/english/parts, src/bench/play.mjs

**You will see.** When someone in your house is gone for a reason the world recorded, a family member tells you what happened and you answer; when there is no reason on record, no one says anything.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Notes.** Owner, Oct 25; build all three scenes without asking (OWNER-DECISIONS, Oct 25). Pairs with the Oct 24 read that people in the house need a reason to be there.

Oct 29 (CTO, second account): PR #6130 closed as stale under the owner's standing approval; back to open. Branch `play-first/words-scene-family-absence` is kept; claiming this item takes it over.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-10 23:52 UTC) on branch claude/pool-words-scene-family-absence.

Released (2026-11-10): Needs four new situation types and their bank lines under data/english/parts (Story session only); a builder cannot play it without them. Continue on branch claude/pool-words-scene-family-absence.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:52 UTC) on branch claude/pool-words-scene-family-absence.

Released (2026-11-10): needs bank lines under data/english/parts (Story only) and a design-level cause with no code cause. Continue on branch claude/pool-words-scene-family-absence.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-10 23:53 UTC) on branch claude/pool-words-scene-family-absence.

Released (2026-11-10): Needs bank lines under data/english/parts, which only the Story session writes; nothing a builder can play. Continue on branch claude/pool-words-scene-family-absence.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:54 UTC) on branch claude/pool-words-scene-family-absence.

Released (2026-11-10): words item: needs lines under data/english/parts, which only Story writes. Continue on branch claude/pool-words-scene-family-absence.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:54 UTC) on branch claude/pool-words-scene-family-absence.

Released (2026-11-10): words item: needs lines under data/english/parts, which only Story writes. Continue on branch claude/pool-words-scene-family-absence.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:55 UTC) on branch claude/pool-words-scene-family-absence.

Released (2026-11-10): Needs the kin lines under data/english/parts (Story session only); same as two earlier releases, nothing a builder can build or play without them. Continue on branch claude/pool-words-scene-family-absence.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:55 UTC) on branch claude/pool-words-scene-family-absence.

Released by next (2026-11-11): no push to claude/pool-words-scene-family-absence since 2026-11-10 23:52 UTC, more than twice its 4-hour time box. Continue on branch claude/pool-words-scene-family-absence.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 09:06 UTC) on branch claude/pool-words-scene-family-absence.

Released (2026-11-11): The move case is already told (circumstance moved-away-farewell, src/director/moving-goodbye-scene.test.ts); the hospital, custody and death scenes need new kin lines under data/english/parts, which builders other than the Words session may not write, so this item needs the Words session. Continue on branch claude/pool-words-scene-family-absence.
