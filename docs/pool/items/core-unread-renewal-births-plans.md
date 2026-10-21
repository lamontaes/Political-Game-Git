---
id: core-unread-renewal-births-plans
title: "Renewal's births and plans tables are written and only tests read them"
area: people
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/birth-honor-scene
pr: #4828
blocked-on:
milestone:
source: "found by the static scan in core-wiring-gaps (Oct 15, 2026)"
claimed-at: 2026-10-16T21:26:57.298Z
---

**What.** The renewal engine writes a `births` row for each birth and a `plans` row for each couple's plan to have a child (the decisions that led to it). Only renewal's own tests read them; the child and the couple records carry the facts. Have the director's journal or a person's card read the plan (why they had the child), or drop the tables.

**Rules.** An effect is a read, not a record: a table nobody reads is an unregistered placeholder. Replace, never layer: wire a read, or delete the writer and the table in the same change.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place) a birth or plan record id is read by the director or a card, or the tables and their writers are gone.

**Files.** src/core2/modules/renewal.ts

**Notes.** Found by scanning every `.table("name")` use in `src`: the table has writes and no read in any engine. Verify against main before starting; the scan cannot see a read made through a helper that builds the table name.

Looked at 2026-10-16, not built. Checked against main: `plans` and `births` are written in `modules/renewal.ts` (lines near 103 and 208) and read only by renewal's own tests (`births-people.test.ts` reads `births`), as the item says. Two things make "drop the tables" the wrong default. First, `plans` holds both partners' recorded chooser decisions for having a child, and each `pregnancies` row points back to its plan by `planId`: it is the only record of why a couple had a child, which the owner's ask-why rule (Oct 14) asks to be answerable by record, so deleting it removes that trail. Second, wiring a read means the director's journal or a person card quoting the plan, and `src/director/` and the English engine belong to the Words session, so a core builder cannot do it. Suggested split: (a) a Words item that has the director read a couple's plan for the line "why they had the child" (its done-when is the one above); (b) only after that, delete `births` if it is still unread, since the child's own record carries the same facts. Do not delete `plans` without (a).
