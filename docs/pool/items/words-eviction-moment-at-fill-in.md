---
id: words-eviction-moment-at-fill-in
title: "A homeless household filled in when the player meets it never mentions its eviction (no director moment from its case)"
area: words
kind: wiring
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-words-eviction-moment-at-fill-in
pr: #8477
blocked-on:
after: core-evicted-counted-stays-counted
lead: words
model: sonnet
effort: medium
root: design-life-record
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:14:23.919Z
branch: claude/pool-words-eviction-moment-at-fill-in
---

**What.** Since evicted counted households stay counted (core-evicted-counted-stays-counted), a household evicted while counted holds its housing case and status row but no director moment labeled feeling:event:housing.eviction. When the player later meets one of its people and they are filled in, nothing they say brings up the eviction or where they are staying. The gap is registered as SG-WORDS-eviction-moment-at-fill-in, with its marker in src/director/conversation.ts.

**Cause.** Found in code: src/director/conversation.ts (line 633) carries the marker for SG-WORDS-eviction-moment-at-fill-in (src/director/data/stopgaps.json, line 460): a counted household evicted while counted keeps its housing case and status row (event:housing.eviction:<caseId>, removedAt) but no director moment, so a filled-in person never mentions it.

**Fix.** At fill-in, build a feeling:event:housing.eviction moment dated from the case, citing the case and event record ids, so the person's talk can bring it up; clear the stopgap.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Wire to the world: the person's own records (the eviction case's removedAt and its event id event:housing.eviction:<caseId>) give the moment at fill-in, so the director tells what happened to them. Ask why: the line cites the case record, not a typed reason.

**Done when.** A second session plays buildBenchWorld in a drawn place (place and seed named), redrawing until a counted household has been evicted within the year (Storrs, Connecticut, key 0973980, is a place where it happens and may be one of the tries), meets a person of a homeless counted household and sees them filled in with a feeling:event:housing.eviction moment dated from the case, by case and event record id, and their talk able to bring it up (a test in src/director shows it); SG-WORDS-eviction-moment-at-fill-in is cleared.

**Waits on.** Nothing. (core-evicted-counted-stays-counted is done.)

**Files.** src/director/conversation.ts, src/director/ledger.ts, src/director/data/stopgaps.json

**Notes.** Lead: words. Filed by the speed lead, Nov 1, from the second review of speed/evicted-stay-counted.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:14 UTC) on branch claude/pool-words-eviction-moment-at-fill-in.
