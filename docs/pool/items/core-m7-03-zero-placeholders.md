---
id: core-m7-03-zero-placeholders
title: "M7-03 Zero placeholders"
area: core
kind: feature
priority: 3
size: L
status: claimed
claimed-by: claude/pool-m7-03
pr:
blocked-on:
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-03"
claimed-at: 2026-10-20T02:31:16.946Z
---

**What.** Every registered shortcut replaced, or turned into a sourced or marked estimate. (Owner: Every session, in its own area.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** The release build passes with zero open stopgaps.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Counted Oct 20 (claude/pool-m7-03) from `src/core2/data/stopgaps.json`: 402 rows, 262 open (the director keeps its own file, `src/director/data/stopgaps.json`). By kind, the open rows are 40 missing-mechanic, 28 uncalibrated-tunable, 24 faked-mechanic, 22 missing-engine, 18 missing-data, 17 assumed-data, 12 estimated-behavior, 12 missing-record, and 29 in smaller kinds. By author tag, 56 are SOL-1258's (the Oct 9 prototype pass), 37 OPUS-GOV, 27 OPUS-WORLD, 26 OPUS-PEOPLE, 29 from the two GOV sub-agents, 13 OPUS-CORE and 12 OPUS-DRIVES. Each is already a per-engine pool item (`core-stopgap-*`, `gov-stopgap-*`, `world-stopgap-*`, `laws-reach-b-*`) or a `research-*-sourced-parameters` item, so splitting this L item again would only duplicate them. This item is done when those are; it is blocked on them, not a separate build. Several rows measured this session turned out to be stale (their symptom no longer reproduces: `SG-P8-school-acquaintance-contact-frequency`, `SG-CORE-outside-market`, `SG-P8-family-network-coverage` narrowed, `SG-CORE-counted-drift` rows already resolved), so a sweep that re-measures each row's symptom before building is the cheapest next step.
