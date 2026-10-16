---
id: core-unread-renewal-births-plans
title: "Renewal's births and plans tables are written and only tests read them"
area: people
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found by the static scan in core-wiring-gaps (Oct 15, 2026)"
---

**What.** The renewal engine writes a `births` row for each birth and a `plans` row for each couple's plan to have a child (the decisions that led to it). Only renewal's own tests read them; the child and the couple records carry the facts. Have the director's journal or a person's card read the plan (why they had the child), or drop the tables.

**Rules.** An effect is a read, not a record: a table nobody reads is an unregistered placeholder. Replace, never layer: wire a read, or delete the writer and the table in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place) a birth or plan record id is read by the director or a card, or the tables and their writers are gone.

**Files.** src/core2/modules/renewal.ts

**Notes.** Found by scanning every `.table("name")` use in `src`: the table has writes and no read in any engine. Verify against main before starting; the scan cannot see a read made through a helper that builds the table name.
