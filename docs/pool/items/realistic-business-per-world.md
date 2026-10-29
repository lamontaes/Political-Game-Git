---
id: realistic-business-per-world
title: "Business closure rates, union shares, business counts and books, outlets and ad prices open drawn per world"
area: core
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/realistic-business-rows
pr: #6600
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
claimed-at: 2026-10-28T07:21:38.436Z
---

**What.** Rows 21 to 24, 26 and 27 of docs/reports/real-statistics-in-play-2026-10-27.md: BDS closure rates and outside ownership, union membership, businesses per resident, IRS margins and pay shares, local news outlets and campaign ad prices. Each opens on the published value. The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed.

**Rules.** Estimate, never UNKNOWN: Each value starts from the published one as the center of a per-world spread drawn from the world seed at Start, tagged in its parameter table. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In two played worlds on drawn places and seeds, each listed statistic differs between the worlds and from its published row, named by record id; the guard covers it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/modules/business.ts, src/core2/membership-dues.ts, src/simulation/local-business-counts.ts, src/core2/modules/press.ts, src/core2/modules/campaigns.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.

Oct 29 (CTO): set done; PR #6600 merged (the done flip failed while branch protection refused the flip job's push).
