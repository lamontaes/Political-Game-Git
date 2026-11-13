---
id: words-director-one-path-part-2-one-presence-decider
title: "One presence decider and one picker"
area: director
kind: cleanup
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-story-director
source: split from words-director-one-path in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-words-director-one-path-part-2-one-presence-decider
---

**What.** Part of words-director-one-path. The bench decides who is present in a scene on its own, and two small pickers keep their own copies of the director's choice. Reduce them to the director's one path, and delete the copies in the same change. The same people must stand in a scene whichever screen asks.

**Cause.** Design: docs/reports/words-director-plan-2026-10-28.md (owner approved Oct 28), section 1: three who-is-present deciders and two small pickers; the bench's presentIds (src/bench/scene.ts) and the pickers screenLine (src/english/screen-words.ts, line 33) and choiceName (src/bench/words.ts, line 64) keep their own copies.

**Fix.** Make the bench's day scenes and place visits read the director's one presence decider, and route screenLine and choiceName through the director's one picker; delete the duplicates.

**Time box.** 6 hours for one Sonnet session.

**Rules.** Replace, never layer: the duplicate is deleted in the same change and the PR body counts it. A scene is staged from the record that causes it (scene-producers). No hand-written player text: words come from the English banks. One rule, all 56 places.

**Done when.** A second session plays a drawn place (named with seed) and sees the same people present in a day scene and a place visit as the director's cast gives, and a grep shows presentIds, screenLine and choiceName no longer keep their own pickers; the scene and english tests pass.

**Waits on.** Nothing.

**Files.** src/bench/scene.ts, src/english/screen-words.ts, src/bench/words.ts, src/bench/story.ts

**Notes.** Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:09 UTC) on branch claude/pool-words-director-one-path-part-2-one-presence-decider.

Released (2026-11-11): Claimed by my own next loop but not worked: see my earlier release notes (replay-only or heavy-run items); words-director part 2 is a six-hour refactor of presence deciders across bench and english pickers that I did not start. Continue on branch claude/pool-words-director-one-path-part-2-one-presence-decider.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:19 UTC) on branch claude/pool-words-director-one-path-part-2-one-presence-decider.

Released (2026-11-11): Claimed by my own next loop, not worked; see earlier notes (needs dedicated machine / six-hour presence-decider refactor). Continue on branch claude/pool-words-director-one-path-part-2-one-presence-decider.
