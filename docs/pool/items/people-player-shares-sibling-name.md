---
id: people-player-shares-sibling-name
title: "A new life can share a first name with a living sibling"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a drawn life in Mazomanie, Wisconsin (bench new life, Advanced, seed b37762f4-7895-40f5-8d83-0634db5b60cb, Oct 28) the player Evelyn Underwood (person_526f98c72f070459, born 2007) has a living sister also named Evelyn Underwood (person_f277a01c09158a60, age 23). Their mother's card history now lists both births, which reads as a mistake. The player's name is drawn without looking at the siblings' names.

**Rules.** No dice decides a person's choice, but seeded generation of who exists is allowed; a family does not give two living children the same first name. One rule for all 56 places.

**Done when.** Across 20 drawn new lives (place and seed named for each), no player shares a first name with a living sibling, shown by a test on drawn places, and the Mazomanie seed's player gets a different name or the sibling does.

**Files.** src/bench (new life), src/core2/past-family.ts

**Notes.** TODO
