---
id: laws-counsel-unpaid-is-not-owed
title: "A tenant's lawyer the paying treasury cannot afford is never paid or owed"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/counsel-owed
pr: #6216
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T03:56:01.006Z
---

**What.** Under the right to counsel in eviction, `payCounsel` in `src/core2/modules/housing.ts` pays the tenant's lawyer with `transferCash` from the government whose statute governs, and records whatever that transfer paid. When the treasury holds no cash, the transfer pays 0, the case still records the law with a lawyer present, and nothing is owed afterward, so the lawyer is never paid. CI's housing family run on seed ef7362489c9d17517723c5c83d6faab4ce63e972 drew Derry, New Hampshire (3317860): five eviction hearings on 2025-02-06 had counsel under the state's law and 0 paid. Election costs under #5582 handle the same shortfall by carrying the cost as owed until cash arrives.

**Rules.** An effect is a read: a law's cost is paid or owed by the government it names, never silently dropped; one rule, all 56 places.

**Done when.** A hearing's counsel cost that the paying treasury cannot cover is owed and paid as cash arrives, with the household's applied row naming the amount, and a played world (`buildBenchWorld`) in Derry, New Hampshire on seed ef7362489c9d17517723c5c83d6faab4ce63e972 shows the 2025-02-06 hearings' lawyers paid later by journal id; `src/core2/law-wiring-housing.test.ts` then checks every hearing with a lawyer, not only the paid ones. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/modules/housing.ts, src/core2/law-wiring-housing.test.ts

**Notes.** From the laws lead, Oct 25. Why New Hampshire's state treasury held no cash on 2025-02-06 is not traced.
