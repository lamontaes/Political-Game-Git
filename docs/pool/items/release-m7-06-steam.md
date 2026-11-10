---
id: release-m7-06-steam
title: "M7-06 Steam"
area: release
kind: feature
priority: 3
size: L
status: blocked
claimed-by:
pr:
blocked-on: release-m7-06-part-1-store-text, release-m7-06-part-2-minimum-specs, release-m7-06-part-3-trailer-and-price
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-06"
standard: 2
model: sonnet
effort: medium
root: none
lead: cto
after:
---

**What.** Roadmap M7-06: the Steam store page text, the trailer, the early-access FAQ, minimum specs and the price. The owner signs off. It is too large for one session, so it is split into the parts named in Waits on. The price and the trailer are owner decisions: build the simplest proposal and flag it for him.

**Cause.** Design: docs/roadmap/later-specs-draft.md section M7-06 (approved by the owner Oct 12) and docs/packages/M7-early-access.md.

**Fix.** Store page text and early-access FAQ drafted from the shipped game, minimum specs measured, a trailer shot list and a price proposal for the owner. Take the parts below one at a time once early-access preparation starts.

**Time box.** 16 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Spec approved by the owner Oct 12. Owner decisions are flagged, never waited on: the price and the trailer go to him as a proposal under OWNER DECISIONS NEEDED. Look before you ask: read OWNER-DECISIONS.md and docs/packages/M7-early-access.md before drafting. No hand-written player text applies to the game, not to the store page.

**Done when.** A second session reads the store text and the FAQ against the shipped game in a drawn place and finds every claim true, finds minimum specs measured with npm run speed:year on the desktop package, and finds the trailer shot list and price proposal ready for the owner, who signs off. Each part records its own evidence.

**Waits on.** Its parts: release-m7-06-part-1-store-text, release-m7-06-part-2-minimum-specs, release-m7-06-part-3-trailer-and-price. Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** docs/roadmap/later-specs-draft.md, docs/packages/M7-early-access.md, docs/coordination/OWNER-DECISIONS.md

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.
