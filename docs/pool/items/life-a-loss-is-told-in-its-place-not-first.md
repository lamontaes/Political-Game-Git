---
id: life-a-loss-is-told-in-its-place-not-first
title: "A life story tells a loss before school, because losses share the first paragraph with partner and children"
area: play
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/pool-life-a-loss-is-told-in-its-place-not-first
pr: #8298
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: design-life-record
source: the life record's second session, Nov 10 (not seen; its note is on core-life-record); cause found by Fable
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:32:44.926Z
branch: claude/pool-life-a-loss-is-told-in-its-place-not-first
merged-at: 2026-11-11T02:56:40.020Z
---

**What.** My life and a person's card group a life into paragraphs. The first paragraph holds partner, children and losses together, so "I lost my parent" is read before the school sentences even when the parent died last year. A loss should come late in the story, where it falls for nearly everyone.

**Cause.** Found in code: `lifeGroups` in src/bench/data/controls.json (line 662) lists the paragraphs in order, and its first group is `["partner", "child", "loss"]`. The life list itself is in date order (`lifeOf`, src/core2/person-life.ts, the sort at lines 479 to 483); only the grouping moves the loss to the front. Measured: the second session's acceptance check on main b094bee1 (Notes on docs/pool/items/core-life-record.md): in Rock Hill, Missouri (seed 0cf1896a-28d6-4915-b0d4-7cf95baa3efd), My life listed "I lost my parent" before the school sentences.

**Fix.** In src/bench/data/controls.json take `loss` out of the first group and give it a group of its own after the last one. When life-a-dead-persons-own-card-says-they-died adds the life kind `death`, it goes in a final group after `loss`. Change nothing else about the paragraphs: a partner still comes before the children. Add a case to src/bench/card-life.test.ts that fails when a loss dated after the last school year is told before a school sentence.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The lane owns src/bench. No hand-written player text: only the order changes, never a word. One rule for My life and every card: they read the same groups.

**Done when.** A second session, on main in a drawn place (place and seed named), opens the card of an adult who has lost a parent, or My life after a death in the family, and sees the loss told after school and work, with a screenshot at 1440 by 900 set beside the approved mock for the person card.

**Waits on.** Nothing.

**Files.** src/bench/data/controls.json, src/bench/card-life.test.ts

**Notes.** Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:32 UTC) on branch claude/pool-life-a-loss-is-told-in-its-place-not-first.
