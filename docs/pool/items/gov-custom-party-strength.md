---
id: gov-custom-party-strength
title: "A custom world's party strength and lean shift reach voters"
area: gov
kind: wiring
priority: 3
size: M
status: claimed
claimed-by: claude/custom-party-strength
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-16T10:54:34.242Z
---

**What.** `politics.partyStrength` is validated and read nowhere; `leanShift` moves district lean in campaigns but counted voters' lean in the electorate ignores it. Make the elections and the counted voter groups read both.

**Rules.** One model, two tiers; an effect is a read.

**Done when.** A one-year run of the played world (buildBenchWorld, a drawn place) with partyStrength doubled for one party shows a changed vote share and counted voter lean by election record id, and a test passes.

**Files.** src/core2/electorate.ts, src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/world-settings.ts

**Notes.** core.md line 213, checked Oct 15.
