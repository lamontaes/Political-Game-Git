---
id: words-director-one-path-part-4-opening-address-by-events
title: "The opening address differs by party, traits, stances and world events"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #8512
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-story-director
source: split from words-director-one-path in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-words-director-one-path-part-4-opening-address-by-events
---

**What.** Part of words-director-one-path. The opening address should differ by who the player is and what is happening in the world, as the owner approved on Oct 28; today it is assembled from a small fixed set. Build it from parts the English banks hold, chosen by records, and test two worlds against each other. Seen: the opening address differs by your party, traits and the world's events (owner, Oct 28).

**Cause.** Design: docs/reports/words-director-plan-2026-10-28.md (owner approved Oct 28), section 3: the opening address assembled in parts by party, traits, stances and world events; src/director/opening-story.ts and src/director/data/opening-address.json hold the opening today.

**Fix.** Assemble the opening address in parts chosen from the player's party, traits and stances and the world events of the day, through the English banks.

**Time box.** 6 hours for one Sonnet session.

**Rules.** Replace, never layer: the duplicate is deleted in the same change and the PR body counts it. A scene is staged from the record that causes it (scene-producers). No hand-written player text: words come from the English banks. One rule, all 56 places.

**Done when.** A second session starts two drawn worlds (named with seeds) with different parties and world events and sees the opening address differ between the two worlds by party, traits, stances and events, each part citing the record that chose it, and a test in src/director/opening-address.test.ts holds the difference in a played world.

**Waits on.** Nothing.

**Files.** src/director/opening-story.ts, src/director/data/opening-address.json, src/director/opening-address.test.ts

**Notes.** Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:10 UTC) on branch claude/pool-words-director-one-path-part-4-opening-address-by-events.

Released by next (2026-11-13): no push to claude/pool-words-director-one-path-part-4-opening-address-by-events since 2026-11-11 03:10 UTC, more than twice its 6-hour time box. Continue on branch claude/pool-words-director-one-path-part-4-opening-address-by-events and pull request #8512.
